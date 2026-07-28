import {
  handleError,
  json,
  methodNotAllowed,
  requireAuth,
  requireSameOrigin,
} from '../server/deal-desk.js';
import {
  readWhopSession,
  revokeWhopSession,
  whopSessionSummary,
} from '../server/whop-oauth.js';

function attachCookie(response, cookie) {
  if (cookie) response.headers.append('set-cookie', cookie);
  return response;
}

export default {
  async fetch(request) {
    try {
      requireAuth(request);
      if (request.method === 'GET') {
        const result = await readWhopSession(request);
        return attachCookie(json({
          configured: Boolean(process.env.WHOP_CLIENT_ID),
          connected: Boolean(result.session),
          session: whopSessionSummary(result.session),
        }), result.setCookie);
      }
      if (request.method === 'DELETE') {
        requireSameOrigin(request);
        const cookie = await revokeWhopSession(request);
        return attachCookie(json({ connected: false }), cookie);
      }
      return methodNotAllowed(['GET', 'DELETE']);
    } catch (error) {
      return handleError(error);
    }
  },
};
