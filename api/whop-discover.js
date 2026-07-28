import {
  handleError,
  json,
  methodNotAllowed,
  requireAuth,
  requireSameOrigin,
} from '../server/deal-desk.js';
import { discoverWhopGuides } from '../server/whop-discovery.js';
import { requireWhopSession } from '../server/whop-oauth.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      requireSameOrigin(request);
      requireAuth(request);
      const body = await request.json().catch(() => ({}));
      const { session, setCookie } = await requireWhopSession(request);
      const result = await discoverWhopGuides(session, body);
      const response = json(result);
      if (setCookie) response.headers.append('set-cookie', setCookie);
      return response;
    } catch (error) {
      return handleError(error);
    }
  },
};
