import {
  composeGuideFile,
  guidePath,
  handleError,
  HttpError,
  json,
  methodNotAllowed,
  normalizeStatus,
  readRepoFile,
  readStatusDocument,
  requireAuth,
  requireSameOrigin,
  statusFileContent,
  validateGuide,
  writeRepoFiles,
} from '../server/deal-desk.js';
import {
  readSiteSettings,
  safeCategoryKey,
  sanitizeCategoryDefinition,
  sanitizeSiteSettings,
  serializeSiteSettings,
  SITE_SETTINGS_PATH,
} from '../server/site-settings.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      requireSameOrigin(request);
      requireAuth(request);

      const body = await request.json().catch(() => ({}));
      const categoryKey = safeCategoryKey(body.category);
      const siteDocument = await readSiteSettings();
      let siteSettings = siteDocument.settings;
      let categoryCreated = false;

      if (categoryKey && !siteSettings.categories[categoryKey]) {
        if (!body.categoryDefinition || typeof body.categoryDefinition !== 'object') {
          throw new HttpError(422, 'That category is not registered yet. Add its details or choose another category.');
        }
        const definition = sanitizeCategoryDefinition(body.categoryDefinition, null, categoryKey);
        siteSettings = sanitizeSiteSettings({
          ...siteSettings,
          categories: {
            ...siteSettings.categories,
            [categoryKey]: definition,
          },
        });
        categoryCreated = true;
      }

      const guide = validateGuide(body, Object.keys(siteSettings.categories));
      const path = guidePath(guide.id);
      const [current, statusDocument] = await Promise.all([
        readRepoFile(path, { allowMissing: true }),
        readStatusDocument(),
      ]);

      if (!current.sha && body.id) {
        throw new HttpError(409, 'That guide no longer exists. Refresh the Control Center and try again.');
      }

      const files = [{ path, content: composeGuideFile(guide) }];
      if (!statusDocument.entries[guide.id]) {
        statusDocument.entries[guide.id] = {
          status: 'active',
          expiresAt: null,
          verifiedAt: new Date().toISOString(),
          note: '',
        };
        files.push({
          path: 'src/data/deal-status.json',
          content: statusFileContent(statusDocument.entries),
        });
      }
      if (categoryCreated) {
        files.push({
          path: SITE_SETTINGS_PATH,
          content: serializeSiteSettings(siteSettings),
        });
      }

      const action = current.sha ? 'Update' : 'Add';
      const result = await writeRepoFiles(
        files,
        categoryCreated
          ? `${action} method and category: ${guide.title}`
          : `${action} guide: ${guide.title}`,
      );
      const savedGuide = {
        ...guide,
        sha: result.files[path] || current.sha || null,
        live: normalizeStatus(statusDocument.entries[guide.id]),
      };

      return json({
        guide: savedGuide,
        settings: siteSettings,
        settingsSha: categoryCreated ? result.files[SITE_SETTINGS_PATH] : siteDocument.sha,
        categories: siteSettings.categories,
        categoryCreated,
        commit: result.commit?.sha || null,
        message: categoryCreated
          ? 'Category and method saved together. Vercel is publishing both in one build.'
          : current.sha
            ? 'Method saved. Vercel will rebuild the full guide page.'
            : 'Method created. Vercel will publish it after the next build.',
      });
    } catch (error) {
      return handleError(error);
    }
  },
};
