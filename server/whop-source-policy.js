import { HttpError } from './deal-desk.js';

export const WHOP_ALLOWED_GROUPS = Object.freeze([
  Object.freeze({ key: 'black-box', label: 'Black Box' }),
  Object.freeze({ key: 'hidden-files', label: 'Hidden Files' }),
]);

const LABEL_BY_NORMALIZED_NAME = new Map(
  WHOP_ALLOWED_GROUPS.map((group) => [normalizeGroupName(group.label), group]),
);

function normalizeGroupName(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

function experienceId(value) {
  return String(value || '').match(/\bexp_[A-Za-z0-9_-]+\b/)?.[0] || '';
}

function configuredIdsByGroup() {
  return new Map([
    ['black-box', experienceId(process.env.WHOP_BLACK_BOX_EXPERIENCE_ID)],
    ['hidden-files', experienceId(process.env.WHOP_HIDDEN_FILES_EXPERIENCE_ID)],
  ].filter(([, id]) => Boolean(id)));
}

export function allowedWhopGroupFromExperience(experience) {
  const names = [
    experience?.company?.title,
    experience?.company?.name,
    experience?.name,
  ].map(normalizeGroupName).filter(Boolean);
  for (const name of names) {
    const group = LABEL_BY_NORMALIZED_NAME.get(name);
    if (group) return group;
  }
  return null;
}

export function assertAllowedWhopExperience(experience, requestedExperienceId) {
  const group = allowedWhopGroupFromExperience(experience);
  if (!group) throw new HttpError(403, 'Only Black Box and Hidden Files can be imported.');

  const requested = experienceId(requestedExperienceId || experience?.id);
  if (!requested) throw new HttpError(422, 'A valid Whop forum experience ID is required.');
  const configured = configuredIdsByGroup().get(group.key);
  if (configured && configured !== requested) {
    throw new HttpError(403, `That is not the approved ${group.label} forum experience.`);
  }
  return group;
}

export function assertAllowedWhopImportItem(item) {
  const group = LABEL_BY_NORMALIZED_NAME.get(normalizeGroupName(
    item?.groupLabel || item?.company?.title || item?.experienceName,
  ));
  if (!group) throw new HttpError(403, 'Only Black Box and Hidden Files posts can be imported.');

  const requested = experienceId(item?.experienceId);
  if (!requested) throw new HttpError(422, `${group.label} item is missing its Whop experience ID.`);
  const configured = configuredIdsByGroup().get(group.key);
  if (configured && configured !== requested) {
    throw new HttpError(403, `That post did not come from the approved ${group.label} forum experience.`);
  }
  return group;
}

export function whopGroupOptions() {
  const configured = configuredIdsByGroup();
  return WHOP_ALLOWED_GROUPS.map((group) => ({
    ...group,
    experienceId: configured.get(group.key) || null,
    configured: configured.has(group.key),
  }));
}
