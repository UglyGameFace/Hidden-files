import {
  HttpError,
  readRepoFile,
  writeRepoFiles,
} from './deal-desk.js';

export const WHOP_SOURCES_PATH = 'src/data/whop-sources.json';
export const WHOP_DEFAULT_GROUPS = Object.freeze([
  Object.freeze({ key: 'black-box', label: 'Black Box' }),
  Object.freeze({ key: 'hidden-files', label: 'Hidden Files' }),
]);

const VALID_DECISIONS = new Set(['approved', 'disapproved']);

export function normalizeWhopGroupName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function whopExperienceId(value) {
  return String(value || '').match(/\bexp_[A-Za-z0-9_-]+\b/)?.[0] || '';
}

function experienceNames(experience) {
  return [
    experience?.company?.title,
    experience?.company?.name,
    experience?.name,
  ].map((value) => String(value || '').trim()).filter(Boolean);
}

function defaultGroupForExperience(experience) {
  const names = new Set(experienceNames(experience).map(normalizeWhopGroupName));
  return WHOP_DEFAULT_GROUPS.find((group) => names.has(normalizeWhopGroupName(group.label))) || null;
}

function sourceLabel(experience) {
  return experienceNames(experience)[0] || 'Whop group';
}

function normalizeRegistry(value) {
  const sources = value?.sources && typeof value.sources === 'object' ? value.sources : {};
  return {
    version: 2,
    sources: Object.fromEntries(Object.entries(sources).flatMap(([id, source]) => {
      const experienceId = whopExperienceId(id || source?.experienceId);
      const decision = VALID_DECISIONS.has(source?.decision) ? source.decision : null;
      if (!experienceId || !decision) return [];
      return [[experienceId, {
        experienceId,
        label: String(source?.label || 'Whop group').slice(0, 120),
        decision,
        defaultKey: String(source?.defaultKey || '') || null,
        companyId: String(source?.companyId || '') || null,
        companyTitle: String(source?.companyTitle || '') || null,
        experienceName: String(source?.experienceName || '') || null,
        updatedAt: String(source?.updatedAt || '') || null,
      }]];
    })),
  };
}

export async function readWhopSourcePolicy() {
  const file = await readRepoFile(WHOP_SOURCES_PATH, { allowMissing: true });
  if (!file.content.trim()) return { sha: file.sha, registry: normalizeRegistry(null) };
  try {
    return { sha: file.sha, registry: normalizeRegistry(JSON.parse(file.content)) };
  } catch {
    throw new HttpError(502, 'The approved Whop source registry contains invalid JSON.');
  }
}

export function serializeWhopSourcePolicy(registry) {
  return `${JSON.stringify(normalizeRegistry(registry), null, 2)}\n`;
}

export function whopSourceDecision(experience, requestedExperienceId, registry) {
  const experienceId = whopExperienceId(requestedExperienceId || experience?.id);
  if (!experienceId) throw new HttpError(422, 'A valid Whop experience ID beginning with exp_ is required.');
  const saved = normalizeRegistry(registry).sources[experienceId] || null;
  const suggested = defaultGroupForExperience(experience);
  return {
    experienceId,
    label: saved?.label || sourceLabel(experience),
    decision: saved?.decision || 'pending',
    suggested: Boolean(suggested),
    defaultKey: saved?.defaultKey || suggested?.key || null,
    builtInLabel: suggested?.label || null,
    saved: Boolean(saved),
  };
}

export function assertApprovedWhopSource(registry, requestedExperienceId) {
  const experienceId = whopExperienceId(requestedExperienceId);
  const source = normalizeRegistry(registry).sources[experienceId];
  if (!source || source.decision !== 'approved') {
    throw new HttpError(403, 'Approve this Whop source in the Control Center before scanning or importing its posts.');
  }
  return source;
}

export async function saveWhopSourceDecision(experience, requestedExperienceId, decision) {
  if (!VALID_DECISIONS.has(decision)) throw new HttpError(422, 'Choose Approve or Disapprove.');
  const current = await readWhopSourcePolicy();
  const state = whopSourceDecision(experience, requestedExperienceId, current.registry);
  const now = new Date().toISOString();
  current.registry.sources[state.experienceId] = {
    experienceId: state.experienceId,
    label: sourceLabel(experience),
    decision,
    defaultKey: state.defaultKey,
    companyId: String(experience?.company?.id || '') || null,
    companyTitle: String(experience?.company?.title || experience?.company?.name || '') || null,
    experienceName: String(experience?.name || '') || null,
    updatedAt: now,
  };
  const write = await writeRepoFiles([
    { path: WHOP_SOURCES_PATH, content: serializeWhopSourcePolicy(current.registry) },
  ], `${decision === 'approved' ? 'Approve' : 'Disapprove'} Whop source: ${state.label}`);
  return {
    source: whopSourceDecision(experience, state.experienceId, current.registry),
    commit: write.commit?.sha || null,
  };
}

export function whopSourceOptions(registry) {
  const normalized = normalizeRegistry(registry);
  const defaults = WHOP_DEFAULT_GROUPS.map((group) => {
    const source = Object.values(normalized.sources).find((entry) => entry.defaultKey === group.key) || null;
    return {
      key: group.key,
      label: group.label,
      experienceId: source?.experienceId || null,
      decision: source?.decision || 'pending',
      builtIn: true,
    };
  });
  const extras = Object.values(normalized.sources)
    .filter((source) => !source.defaultKey)
    .map((source) => ({
      key: source.experienceId,
      label: source.label,
      experienceId: source.experienceId,
      decision: source.decision,
      builtIn: false,
    }));
  return [...defaults, ...extras];
}
