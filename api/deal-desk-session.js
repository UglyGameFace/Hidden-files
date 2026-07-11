import {
  clearSessionCookie,
  createSessionCookie,
  handleError,
  isAuthenticated,
  json,
  methodNotAllowed,
  requireSameOrigin,
  verifyPassword,
} from '../server/deal-desk.js';

export default {
  async fetch(request) {
    try {
      if (request.method === 'GET') {
        return json({ authenticated: isAuthenticated(request) });
      }

      if (request.method === 'POST') {
        requireSameOrigin(request);
        const body = await request.json().catch(() => ({}));
        if (!verifyPassword(body.password)) {
          await new Promise((resolve) => setTimeout(resolve, 450));
          return json({ error: 'Incorrect Deal Desk password.' }, 401);
        }
        return json(
          { authenticated: true },
          200,
          { 'set-cookie': createSessionCookie() },
        );
      }

      if (request.method === 'DELETE') {
        requireSameOrigin(request);
        return json(
          { authenticated: false },
          200,
          { 'set-cookie': clearSessionCookie() },
        );
      }

      return methodNotAllowed(['GET', 'POST', 'DELETE']);
    } catch (error) {
      return handleError(error);
    }
  },
};
