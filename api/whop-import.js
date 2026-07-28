import {
  handleError,
  json,
  methodNotAllowed,
  requireAuth,
  requireSameOrigin,
} from '../server/deal-desk.js';
import { importWhopDrafts } from '../server/whop-import.js';
import { requireWhopSession } from '../server/whop-oauth.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      requireSameOrigin(request);
      requireAuth(request);
      const { setCookie } = await requireWhopSession(request);
      const body = await request.json().catch(() => ({}));
      const result = await importWhopDrafts(body);
      const response = json({
        ...result,
        message: result.imported
          ? `${result.imported} Whop guide${result.imported === 1 ? '' : 's'} imported as hidden drafts.`
          : 'Every selected Whop guide is already up to date.',
      });
      if (setCookie) response.headers.append('set-cookie', setCookie);
      return response;
    } catch (error) {
      return handleError(error);
    }
  },
};
