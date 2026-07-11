import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE_NAME = 'lobby_deal_desk';
const STATUS_PATH = 'src/data/deal-status.json';
const GUIDE_DIR = 'src/content/hacks';
const CATEGORIES = new Set(['cashback-loops', 'food-hacks', 'retail-deals']);

export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store, max-age=0',
      'x-content-type-options': 'nosniff',
      ...extraHeaders,
    },
  });
}

export function methodNotAllowed(allowed) {
  return json({ error: 'Method not allowed.' }, 405, { allow: allowed.join(', ') });
}

function config() {
  const repository = process.env.GITHUB_REPOSITORY || '';
  const [repoOwnerFromPair, repoNameFromPair] = repository.includes('/') ? repository.split('/', 2) : [];
  const owner = process.env.GITHUB_REPO_OWNER || process.env.VERCEL_GIT_REPO_OWNER || repoOwnerFromPair || 'UglyGameFace';
  const repo = process.env.GITHUB_REPO_NAME || process.env.VERCEL_GIT_REPO_SLUG || repoNameFromPair || 'Hidden-files';
  const branch = process.env.GITHUB_BRANCH || 'main';
  const token = process.env.GITHUB_TOKEN || '';
  return { owner, repo, branch, token };
}

function requireGitHubToken() {
  const value = config();
  if (!value.token) {
    throw new HttpError(503, 'GITHUB_TOKEN is not configured in Vercel.');
  }
  return value;
}

function sessionSecret() {
  const secret = process.env.DEAL_DESK_SESSION_SECRET || process.env.DEAL_DESK_PASSWORD || '';
  if (!secret) throw new HttpError(503, 'DEAL_DESK_PASSWORD is not configured in Vercel.');
  return secret;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  if (a.length !== b.length) {
    timingSafeEqual(a, Buffer.alloc(a.length));
    return false;
  }
  return timingSafeEqual(a, b);
}

function sign(payload) {
  return createHmac('sha256', sessionSecret()).update(payload).digest('base64url');
}

export function createSessionCookie() {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ exp, v: 1 })).toString('base64url');
  const token = `${payload}.${sign(payload)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=43200`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

function readCookie(request, name) {
  const cookie = request.headers.get('cookie') || '';
  for (const part of cookie.split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return '';
}

export function isAuthenticated(request) {
  try {
    const token = readCookie(request, COOKIE_NAME);
    const [payload, signature] = token.split('.', 2);
    if (!payload || !signature || !safeEqual(signature, sign(payload))) return false;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return parsed?.v === 1 && Number(parsed.exp) > Date.now();
  } catch {
    return false;
  }
}

export function requireAuth(request) {
  if (!isAuthenticated(request)) throw new HttpError(401, 'Deal Desk login required.');
}

export function verifyPassword(password) {
  const expected = process.env.DEAL_DESK_PASSWORD || '';
  if (!expected) throw new HttpError(503, 'DEAL_DESK_PASSWORD is not configured in Vercel.');
  return safeEqual(String(password || ''), expected);
}

export function requireSameOrigin(request) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const expected = new URL(request.url).origin;
  if (origin !== expected) throw new HttpError(403, 'Cross-origin request blocked.');
}

async function github(path, options = {}, needsToken = true) {
  const cfg = needsToken ? requireGitHubToken() : config();
  const headers = {
    accept: 'application/vnd.github+json',
    'x-github-api-version': '2022-11-28',
    'user-agent': 'the-420-lobby-deal-desk',
    ...options.headers,
  };
  if (cfg.token) headers.authorization = `Bearer ${cfg.token}`;

  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers,
    cache: 'no-store',
  });

  const text = await response.text();
  let payload = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload?.message || `GitHub request failed (${response.status}).`;
    throw new HttpError(response.status === 404 ? 404 : 502, message, payload);
  }
  return payload;
}

function repoPath(path) {
  const { owner, repo } = config();
  return `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}

export async function readRepoFile(path, { allowMissing = false, publicRead = false } = {}) {
  const { branch } = config();
  try {
    const payload = await github(`${repoPath(path)}?ref=${encodeURIComponent(branch)}`, {}, !publicRead);
    if (Array.isArray(payload)) throw new HttpError(400, `${path} is a directory.`);
    return {
      sha: payload.sha,
      content: Buffer.from(String(payload.content || '').replace(/\n/g, ''), 'base64').toString('utf8'),
    };
  } catch (error) {
    if (allowMissing && error instanceof HttpError && error.status === 404) return { sha: null, content: '' };
    throw error;
  }
}

export async function listGuideFiles() {
  const { branch } = requireGitHubToken();
  const payload = await github(`${repoPath(GUIDE_DIR)}?ref=${encodeURIComponent(branch)}`);
  if (!Array.isArray(payload)) throw new HttpError(502, 'GitHub did not return the guide directory.');
  return payload.filter((item) => item.type === 'file' && /\.mdx?$/i.test(item.name));
}

export async function writeRepoFile(path, content, message, sha = null) {
  const { branch } = requireGitHubToken();
  const body = {
    message,
    content: Buffer.from(content, 'utf8').toString('base64'),
    branch,
  };
  if (sha) body.sha = sha;
  return github(repoPath(path), {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function deleteRepoFile(path, message, sha) {
  const { branch } = requireGitHubToken();
  return github(repoPath(path), {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message, sha, branch }),
  });
}

function parseValue(raw) {
  const value = raw.trim();
  if (!value) return '';
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
  if ((value.startsWith('[') && value.endsWith(']')) || (value.startsWith('"') && value.endsWith('"'))) {
    try { return JSON.parse(value); } catch { return value.replace(/^"|"$/g, ''); }
  }
  return value;
}

export function parseGuideFile(id, raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/);
  if (!match) throw new HttpError(422, `Guide ${id} has invalid frontmatter.`);
  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const pair = line.match(/^([A-Za-z][A-Za-z0-9]*):\s*(.*)$/);
    if (pair) data[pair[1]] = parseValue(pair[2]);
  }
  return {
    id,
    title: String(data.title || id),
    description: String(data.description || ''),
    category: CATEGORIES.has(data.category) ? data.category : 'retail-deals',
    featured: Boolean(data.featured),
    draft: Boolean(data.draft),
    badge: String(data.badge || ''),
    keywords: Array.isArray(data.keywords) ? data.keywords.map(String) : [],
    published: String(data.published || new Date().toISOString().slice(0, 10)),
    updated: data.updated ? String(data.updated) : '',
    readTime: String(data.readTime || '5 min'),
    order: Number.isFinite(Number(data.order)) ? Number(data.order) : 999,
    body: match[2].trim(),
  };
}

function quoted(value) {
  return JSON.stringify(String(value || ''));
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export function validateGuide(input) {
  const title = String(input.title || '').trim();
  const description = String(input.description || '').trim();
  const category = String(input.category || '');
  const body = String(input.body || '').trim();
  if (title.length < 3 || title.length > 140) throw new HttpError(422, 'Title must be 3–140 characters.');
  if (description.length < 8 || description.length > 260) throw new HttpError(422, 'Description must be 8–260 characters.');
  if (!CATEGORIES.has(category)) throw new HttpError(422, 'Choose a valid category.');
  if (body.length < 8 || body.length > 100000) throw new HttpError(422, 'Guide content is missing or too large.');

  const existingId = slugify(input.id || '');
  const id = existingId || slugify(title);
  if (!id) throw new HttpError(422, 'A valid guide slug could not be created.');
  const keywords = Array.isArray(input.keywords)
    ? input.keywords.map((item) => String(item).trim()).filter(Boolean).slice(0, 24)
    : String(input.keywords || '').split(',').map((item) => item.trim()).filter(Boolean).slice(0, 24);

  return {
    id,
    title,
    description,
    category,
    featured: Boolean(input.featured),
    draft: Boolean(input.draft),
    badge: String(input.badge || '').trim().slice(0, 36),
    keywords,
    published: /^\d{4}-\d{2}-\d{2}$/.test(String(input.published || ''))
      ? String(input.published)
      : new Date().toISOString().slice(0, 10),
    updated: new Date().toISOString().slice(0, 10),
    readTime: /^\d+\s*min$/i.test(String(input.readTime || '').trim())
      ? String(input.readTime).trim()
      : '5 min',
    order: Math.max(0, Math.min(9999, Number.parseInt(input.order, 10) || 999)),
    body,
  };
}

export function composeGuideFile(guide) {
  const lines = [
    '---',
    `title: ${quoted(guide.title)}`,
    `description: ${quoted(guide.description)}`,
    `category: ${quoted(guide.category)}`,
    `featured: ${guide.featured ? 'true' : 'false'}`,
    `draft: ${guide.draft ? 'true' : 'false'}`,
  ];
  if (guide.badge) lines.push(`badge: ${quoted(guide.badge)}`);
  lines.push(`keywords: ${JSON.stringify(guide.keywords)}`);
  lines.push(`published: ${guide.published}`);
  lines.push(`updated: ${guide.updated}`);
  lines.push(`readTime: ${quoted(guide.readTime)}`);
  lines.push(`order: ${guide.order}`);
  lines.push('---', '', guide.body.trim(), '');
  return lines.join('\n');
}

export async function readStatusDocument({ publicRead = false } = {}) {
  const file = await readRepoFile(STATUS_PATH, { allowMissing: true, publicRead });
  let entries = {};
  if (file.content.trim()) {
    try { entries = JSON.parse(file.content); } catch { throw new HttpError(502, 'The deal status file contains invalid JSON.'); }
  }
  return { sha: file.sha, entries: entries && typeof entries === 'object' ? entries : {} };
}

export function normalizeStatus(entry = {}) {
  const allowed = new Set(['active', 'paused', 'expired']);
  const status = allowed.has(entry.status) ? entry.status : 'active';
  const expiresAt = entry.expiresAt ? String(entry.expiresAt) : null;
  const expiredByTime = expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) <= Date.now();
  return {
    status: expiredByTime ? 'expired' : status,
    expiresAt,
    verifiedAt: entry.verifiedAt ? String(entry.verifiedAt) : null,
    note: entry.note ? String(entry.note).slice(0, 240) : '',
  };
}

export async function writeStatusDocument(entries, sha, message) {
  const content = `${JSON.stringify(entries, null, 2)}\n`;
  return writeRepoFile(STATUS_PATH, content, message, sha);
}

export function guidePath(id) {
  return `${GUIDE_DIR}/${slugify(id)}.md`;
}

export function handleError(error) {
  if (error instanceof HttpError) return json({ error: error.message, details: error.details || undefined }, error.status);
  console.error(error);
  return json({ error: 'Unexpected Deal Desk error.' }, 500);
}
