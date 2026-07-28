import {
  handleError,
  methodNotAllowed,
  requireAuth,
} from '../server/deal-desk.js';
import { beginWhopOAuth } from '../server/whop-oauth.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      requireAuth(request);
      return beginWhopOAuth(request);
    } catch (error) {
      return handleError(error);
    }
  },
};
