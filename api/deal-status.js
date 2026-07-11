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
        { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=30' },
      );
    } catch (error) {
      return handleError(error);
    }
  },
};
