import { json, methodNotAllowed } from '../server/deal-desk.js';

function buildVersion() {
  return String(
    process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GITHUB_SHA
    || process.env.VERCEL_DEPLOYMENT_ID
    || 'local',
  ).slice(0, 12);
}

export default {
  async fetch(request) {
    if (request.method !== 'GET') return methodNotAllowed(['GET']);
    return json(
      {
        ok: true,
        service: 'the-420-lobby-hacks',
        buildVersion: buildVersion(),
        checkedAt: new Date().toISOString(),
      },
      200,
      { 'cache-control': 'public, max-age=0, s-maxage=30, stale-while-revalidate=60' },
    );
  },
};
