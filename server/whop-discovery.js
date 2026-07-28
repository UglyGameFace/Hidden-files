import { HttpError } from './deal-desk.js';
import { prepareGuideBody } from './guide-content-integrity.js';

const API_BASE = 'https://api.whop.com/api/v1';
const REQUEST_TIMEOUT_MS = 20_000;
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const MAX_ITEMS = 1000;

function experienceIdFrom(value) {
  const match = String(value || '').match(/\bexp_[A-Za-z0-9_-]+\b/);
  return match?.[0] || '';
}

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
  const excerpt = plainExcerpt(content, 100);
  return excerpt || prefix;
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
      throw new HttpError(504, 'Whop did not respond in time while scanning guides.');
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
    if (items.length > MAX_ITEMS) throw new HttpError(422, `That Whop page contains more than ${MAX_ITEMS} importable items. Narrow the source before importing.`);
    if (!payload?.page_info?.has_next_page) return items;
    const next = String(payload?.page_info?.end_cursor || '');
    if (!next || next === after) throw new HttpError(502, 'Whop returned an invalid pagination cursor.');
    after = next;
  }
  throw new HttpError(502, 'Whop pagination exceeded the safe page limit.');
}

function normalizeSourceItem(item) {
  const source = `${item.sourceType} ${item.sourceId}`;
  try {
    const integrity = prepareGuideBody(item.body, { source });
    return {
      ...item,
      body: integrity.body,
      description: item.description || plainExcerpt(integrity.body),
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
      body: String(item.body || ''),
      description: item.description || plainExcerpt(item.body),
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

async function discoverForum(session, experience) {
  const posts = await allPages(session, 'forum_posts', { experience_id: experience.id });
  return posts
    .filter((post) => !post?.parent_id)
    .map((post) => normalizeSourceItem({
      sourceType: 'forum-post',
      sourceId: String(post.id || ''),
      experienceId: experience.id,
      experienceName: experience.name,
      company: experience.company,
      title: String(post.title || fallbackTitle(post.content, 'Untitled forum guide')).trim().slice(0, 140),
      body: String(post.content || ''),
      description: '',
      createdAt: post.created_at || null,
      updatedAt: post.updated_at || post.created_at || null,
      author: post.user ? {
        id: post.user.id || null,
        name: post.user.name || null,
        username: post.user.username || null,
      } : null,
      attachments: normalizedAttachments(post.attachments),
      sourceMeta: {
        pinned: Boolean(post.is_pinned),
        edited: Boolean(post.is_edited),
        posterAdmin: Boolean(post.is_poster_admin),
      },
    }));
}

async function discoverCourses(session, experience) {
  const courses = await allPages(session, 'courses', { experience_id: experience.id });
  const output = [];
  for (const course of courses) {
    const lessons = await allPages(session, 'course_lessons', { course_id: course.id });
    for (const lesson of lessons) {
      output.push(normalizeSourceItem({
        sourceType: 'course-lesson',
        sourceId: String(lesson.id || ''),
        experienceId: experience.id,
        experienceName: experience.name,
        company: experience.company,
        courseId: String(course.id || ''),
        courseTitle: String(course.title || 'Course'),
        title: String(lesson.title || 'Untitled course lesson').trim().slice(0, 140),
        body: String(lesson.content || ''),
        description: String(course.tagline || course.description || ''),
        createdAt: lesson.created_at || course.created_at || null,
        updatedAt: lesson.updated_at || course.updated_at || lesson.created_at || null,
        author: null,
        attachments: normalizedAttachments(lesson.attachments),
        sourceMeta: {
          lessonType: lesson.lesson_type || null,
          visibility: lesson.visibility || null,
          courseOrder: course.order ?? null,
          lessonOrder: lesson.order ?? null,
          thumbnail: lesson.thumbnail?.url || null,
          embedType: lesson.embed_type || null,
          embedId: lesson.embed_id || null,
        },
      }));
    }
  }
  return output;
}

export async function discoverWhopGuides(session, input = {}) {
  const experienceId = experienceIdFrom(input.experienceId || input.source);
  if (!experienceId) throw new HttpError(422, 'Paste a Whop experience ID beginning with exp_.');
  const experience = await requestWhop(session, `experiences/${encodeURIComponent(experienceId)}`);
  const requested = new Set(Array.isArray(input.types) ? input.types : ['courses', 'forum']);
  const items = [];
  const errors = [];

  if (requested.has('courses')) {
    try { items.push(...await discoverCourses(session, experience)); }
    catch (error) {
      if (error instanceof HttpError && [403, 404, 422].includes(error.status)) errors.push({ type: 'courses', message: error.message });
      else throw error;
    }
  }
  if (requested.has('forum')) {
    try { items.push(...await discoverForum(session, experience)); }
    catch (error) {
      if (error instanceof HttpError && [403, 404, 422].includes(error.status)) errors.push({ type: 'forum', message: error.message });
      else throw error;
    }
  }

  items.sort((left, right) => {
    const courseCompare = String(left.courseTitle || '').localeCompare(String(right.courseTitle || ''));
    if (courseCompare) return courseCompare;
    const orderCompare = Number(left.sourceMeta?.lessonOrder ?? 0) - Number(right.sourceMeta?.lessonOrder ?? 0);
    return orderCompare || String(left.title).localeCompare(String(right.title));
  });

  return {
    experience: {
      id: String(experience.id || experienceId),
      name: String(experience.name || 'Whop experience'),
      app: experience.app ? { id: experience.app.id || null, name: experience.app.name || null } : null,
      company: experience.company ? {
        id: experience.company.id || null,
        title: experience.company.title || null,
        route: experience.company.route || null,
      } : null,
      isPublic: Boolean(experience.is_public),
    },
    items,
    errors,
    counts: {
      total: items.length,
      ready: items.filter((item) => !item.integrity.blocked).length,
      blocked: items.filter((item) => item.integrity.blocked).length,
      courses: items.filter((item) => item.sourceType === 'course-lesson').length,
      forum: items.filter((item) => item.sourceType === 'forum-post').length,
    },
  };
}
