import {
  composeGuideFile,
  guidePath,
  handleError,
  HttpError,
  json,
  methodNotAllowed,
  readRepoFile,
  readStatusDocument,
  requireAuth,
  requireSameOrigin,
  validateGuide,
  writeRepoFile,
  writeStatusDocument,
} from '../server/deal-desk.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      requireSameOrigin(request);
      requireAuth(request);

      const body = await request.json().catch(() => ({}));
      const guide = validateGuide(body);
      const path = guidePath(guide.id);
      const current = await readRepoFile(path, { allowMissing: true });

      if (!current.sha && body.id) {
        throw new HttpError(409, 'That guide no longer exists. Refresh the Deal Desk and try again.');
      }

      const statusDocument = await readStatusDocument();
      if (!statusDocument.entries[guide.id]) {
        statusDocument.entries[guide.id] = {
          status: 'active',
          expiresAt: null,
          verifiedAt: new Date().toISOString(),
          note: '',
        };
        await writeStatusDocument(
          statusDocument.entries,
          statusDocument.sha,
          `Deal Desk: register ${guide.id}`,
        );
      }

      const file = composeGuideFile(guide);
      const action = current.sha ? 'Update' : 'Add';
      const result = await writeRepoFile(path, file, `${action} guide: ${guide.title}`, current.sha);

      return json({
        guide,
        commit: result.commit?.sha || null,
        message: current.sha
          ? 'Method saved. Vercel will rebuild the full guide page.'
          : 'Method created. Vercel will publish it after the next build.',
      });
    } catch (error) {
      return handleError(error);
    }
  },
};
