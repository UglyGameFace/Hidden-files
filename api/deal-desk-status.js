import {
  handleError,
  HttpError,
  json,
  methodNotAllowed,
  normalizeStatus,
  readStatusDocument,
  requireAuth,
  requireSameOrigin,
  slugify,
  writeStatusDocument,
} from '../server/deal-desk.js';

const ALLOWED = new Set(['active', 'paused', 'expired']);

export default {
  async fetch(request) {
    try {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      requireSameOrigin(request);
      requireAuth(request);

      const body = await request.json().catch(() => ({}));
      const id = slugify(body.id);
      const status = String(body.status || '');
      if (!id) throw new HttpError(422, 'Choose a method first.');
      if (!ALLOWED.has(status)) throw new HttpError(422, 'Invalid method status.');

      let expiresAt = body.expiresAt ? String(body.expiresAt) : null;
      if (expiresAt && !Number.isFinite(Date.parse(expiresAt))) {
        throw new HttpError(422, 'Expiration time is invalid.');
      }
      if (status === 'expired') expiresAt = expiresAt || new Date().toISOString();

      const document = await readStatusDocument();
      const next = {
        status,
        expiresAt,
        verifiedAt: body.verifiedAt ? String(body.verifiedAt) : document.entries[id]?.verifiedAt || null,
        note: String(body.note || document.entries[id]?.note || '').slice(0, 240),
      };
      document.entries[id] = next;
      await writeStatusDocument(document.entries, document.sha, `Deal Desk: ${id} → ${status}`);
      return json({ id, live: normalizeStatus(next) });
    } catch (error) {
      return handleError(error);
    }
  },
};
