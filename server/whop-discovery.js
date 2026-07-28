import { HttpError } from './deal-desk.js';
import { prepareGuideBody } from './guide-content-integrity.js';
import {
  assertApprovedWhopSource,
  readWhopSourcePolicy,
  whopExperienceId,
  whopSourceDecision,
  whopSourceOptions,
} from './whop-source-policy.js';

const API_BASE = 'https://api.whop.com/api/v1';
const REQUEST_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const MAX_ITEMS = 1000;

function plainExcerpt(value, limit = 240) {
  return String(value || '')
    .replace(/^ {0,3}#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, limit);
}

function fallbackTitle(content, prefix) {
  const heading = String(content || '').match(/^ {0,3}#{1,6}\s+(.+)$/m)?.[1]?.trim();
  if (heading) return heading.slice(0, 140);
  return plainExcerpt(content, 100) || prefix;
}

function normalizedAttachments(value) {
  return (Array.isArray(value) ? value : []).map((attachment) => ({
    id: String(attachment?.id || ''),
    filename: String(attachment?.filename || 'attachment'),
    contentType: String(attachment?.content_type || ''),
    url: /^https:\/\//i.test(String(attachment?.url || '')) ? String(attachment.url) : null,
  })).filter((attachment) => attachment.id || attachment.url);
}

async function requestWhop(session, path, query = {}) {
  const url = new URL(`${API_BASE}/${String(path || '').replace(/^\/+/, '')}`);
  for (const [key, value] of Object.entries(query)) {
    if (value === null || value === undefined || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(url, {
      headers: { authorization: `Bearer ${session.accessToken}` },
      cache: 'no-store',
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted || error?.name === 'AbortError') {
      throw new HttpError(504, 'Whop did not respond in time while scanning posts.');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || `Whop request failed (${response.status}).`;
    const status = response.status === 401 ? 401 : response.status === 403 ? 403 : response.status === 404 ? 404 : response.status === 429 ? 503 : response.status >= 500 ? 502 : 422;
    throw new HttpError(status, message, payload);
  }
  return payload;
}

async function allPages(session, path, query) {
  const items = [];
  let after = '';
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const payload = await requestWhop(session, path, {
      ...query,
      first: PAGE_SIZE,
      ...(after && { after }),
    });
    const data = Array.isArray(payload?.data) ? payload.data : [];
    items.push(...data);
    if (items.length > MAX_ITEMS) throw new HttpError(422, `That Whop group contains more than ${MAX_ITEMS} posts. Narrow the source before importing.`);
    if (!payload?.page_info?.has_next_page) return items;
    const next = String(payload?.page_info?.end_cursor || '');
    if (!next || next === after) throw new HttpError(502, 'Whop returned an invalid pagination cursor.');
    after = next;
  }
  throw new HttpError(502, 'Whop pagination exceeded the safe page limit.');
}

function experienceSummary(experience, fallbackId) {
  return {
    id: String(experience?.id || fallbackId),
    name: String(experience?.name || 'Whop experience'),
    app: experience?.app ? { id: experience.app.id || null, name: experience.app.name || null } : null,
    company: experience?.company ? {
      id: experience.company.id || null,
      title: experience.company.title || experience.company.name || null,
      route: experience.company.route || null,
    } : null,
    isPublic: Boolean(experience?.is_public),
  };
}

function normalizeForumPost(post, experience) {
  const item = {
    sourceType: 'forum-post',
    sourceId: String(post?.id || ''),
    sourceKey: `forum-post:${String(post?.id || '')}`,
    experienceId: String(experience.id || ''),
    experienceName: String(experience.name || ''),
    company: experience.company || null,
    title: String(post?.title || fallbackTitle(post?.content, 'Untitled forum post')).trim().slice(0, 140),
    body: String(post?.content || ''),
    description: '',
    createdAt: post?.created_at || null,
    updatedAt: post?.updated_at || post?.created_at || null,
    author: post?.user ? {
      id: post.user.id || null,
      name: post.user.name || null,
      username: post.user.username || null,
    } : null,
    attachments: normalizedAttachments(post?.attachments),
    sourceMeta: {
      pinned: Boolean(post?.is_pinned),
      edited: Boolean(post?.is_edited),
      posterAdmin: Boolean(post?.is_poster_admin),
    },
  };

  try {
    const integrity = prepareGuideBody(item.body, { source: `forum post ${item.sourceId}` });
    return {
      ...item,
      body: integrity.body,
      description: plainExcerpt(integrity.body),
      decision: 'pending',
      integrity: {
        fingerprint: integrity.fingerprint,
        repairs: integrity.repairs,
        structure: integrity.structure,
        blocked: false,
      },
    };
  } catch (error) {
    return {
      ...item,
      description: plainExcerpt(item.body),
      decision: 'blocked',
      integrity: {
        fingerprint: null,
        repairs: [],
        structure: null,
        blocked: true,
        error: String(error?.message || 'Content integrity validation failed.'),
        code: error?.code || 'invalid_content',
      },
    };
  }
}

export async function resolveWhopExperience(session, input = {}) {
  const experienceId = whopExperienceId(input.experienceId || input.source);
  if (!experienceId) throw new HttpError(422, 'Paste a Whop experience ID beginning with exp_.');
  const experience = await requestWhop(session, `experiences/${encodeURIComponent(experienceId)}`);
  return { experience, experienceId };
}

export async function discoverWhopGuides(session, input = {}) {
  const { experience, experienceId } = await resolveWhopExperience(session, input);
  const policy = await readWhopSourcePolicy();
  const source = whopSourceDecision(experience, experienceId, policy.registry);
  const summary = experienceSummary(experience, experienceId);

  if (source.decision !== 'approved') {
    return {
      experience: summary,
      source,
      sourceOptions: whopSourceOptions(policy.registry),
      approvalRequired: true,
      items: [],
      errors: [],
      counts: { total: 0, ready: 0, blocked: 0, forum: 0 },
    };
  }

  assertApprovedWhopSource(policy.registry, experienceId);
  const posts = await allPages(session, 'forum_posts', { experience_id: experienceId });
  const items = posts
    .filter((post) => !post?.parent_id)
    .map((post) => normalizeForumPost(post, summary));
  items.sort((left, right) => {
    const pinned = Number(Boolean(right.sourceMeta?.pinned)) - Number(Boolean(left.sourceMeta?.pinned));
    return pinned || String(right.updatedAt || '').localeCompare(String(left.updatedAt || '')) || left.title.localeCompare(right.title);
  });

  return {
    experience: summary,
    source,
    sourceOptions: whopSourceOptions(policy.registry),
    approvalRequired: false,
    items,
    errors: [],
    counts: {
      total: items.length,
      ready: items.filter((item) => !item.integrity.blocked).length,
      blocked: items.filter((item) => item.integrity.blocked).length,
      forum: items.length,
    },
  };
}
