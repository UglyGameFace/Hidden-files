import {
  handleError,
  HttpError,
  json,
  methodNotAllowed,
  requireAuth,
  requireSameOrigin,
} from '../server/deal-desk.js';
import {
  readSiteSettings,
  sanitizeSiteSettings,
  writeSiteSettings,
} from '../server/site-settings.js';

export default {
  async fetch(request) {
    try {
      requireAuth(request);

      if (request.method === 'GET') {
        const document = await readSiteSettings();
        return json({
          settings: document.settings,
          sha: document.sha,
          loadedAt: new Date().toISOString(),
        });
      }

      if (request.method === 'POST') {
        requireSameOrigin(request);
        const body = await request.json().catch(() => ({}));
        const current = await readSiteSettings();
        const baseSha = body.baseSha ? String(body.baseSha) : null;

        if (baseSha && current.sha && baseSha !== current.sha) {
          throw new HttpError(
            409,
            'The website changed in another tab or device. Refresh the Control Center before publishing so newer changes are not overwritten.',
          );
        }

        const clean = sanitizeSiteSettings(body.settings || body);
        const result = await writeSiteSettings(clean, current.sha);
        return json({
          settings: result.settings,
          sha: result.sha,
          commit: result.commit,
          publishedAt: new Date().toISOString(),
          message: 'Site settings published. Vercel is rebuilding the public site.',
        });
      }

      return methodNotAllowed(['GET', 'POST']);
    } catch (error) {
      return handleError(error);
    }
  },
};
