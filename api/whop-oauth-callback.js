import { finishWhopOAuth } from '../server/whop-oauth.js';

function errorRedirect(request, error) {
  const url = new URL('/control-center', request.url);
  url.searchParams.set('whop', 'error');
  url.searchParams.set('message', String(error?.message || 'Whop login failed.').slice(0, 180));
  url.hash = 'methods';
  return new Response(null, {
    status: 302,
    headers: {
      location: url.toString(),
      'cache-control': 'no-store',
    },
  });
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') return new Response('Method not allowed.', { status: 405 });
    try {
      return await finishWhopOAuth(request);
    } catch (error) {
      return errorRedirect(request, error);
    }
  },
};
