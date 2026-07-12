import {
  handleError,
  json,
  methodNotAllowed,
  normalizeStatus,
  readStatusDocument,
} from '../server/deal-desk.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      const document = await readStatusDocument({ publicRead: true });
      const statuses = Object.fromEntries(
        Object.entries(document.entries).map(([id, entry]) => [id, normalizeStatus(entry)]),
      );
      return json(
        { statuses, checkedAt: new Date().toISOString() },
        200,
        {
          'cache-control': 'public, max-age=0, s-maxage=15, stale-while-revalidate=120',
          'x-status-revision': document.sha || 'empty',
        },
      );
    } catch (error) {
      return handleError(error);
    }
  },
};
