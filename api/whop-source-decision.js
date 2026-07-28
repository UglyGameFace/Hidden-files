import {
  handleError,
  json,
  methodNotAllowed,
  requireAuth,
  requireSameOrigin,
} from '../server/deal-desk.js';
import { resolveWhopExperience } from '../server/whop-discovery.js';
import { requireWhopSession } from '../server/whop-oauth.js';
import {
  readWhopSourcePolicy,
  saveWhopSourceDecision,
  whopSourceOptions,
} from '../server/whop-source-policy.js';

export default {
  async fetch(request) {
    try {
      requireAuth(request);
      if (request.method === 'GET') {
        const policy = await readWhopSourcePolicy();
        return json({ sources: whopSourceOptions(policy.registry) });
      }
      if (request.method !== 'POST') return methodNotAllowed(['GET', 'POST']);
      requireSameOrigin(request);
      const body = await request.json().catch(() => ({}));
      const decision = String(body.decision || '').trim();
      const { session, setCookie } = await requireWhopSession(request);
      const { experience, experienceId } = await resolveWhopExperience(session, body);
      const result = await saveWhopSourceDecision(experience, experienceId, decision);
      const policy = await readWhopSourcePolicy();
      const response = json({
        ...result,
        sources: whopSourceOptions(policy.registry),
        message: decision === 'approved'
          ? `${result.source.label} is approved for Whop post scans.`
          : `${result.source.label} is disapproved and cannot be scanned or imported.`,
      });
      if (setCookie) response.headers.append('set-cookie', setCookie);
      return response;
    } catch (error) {
      return handleError(error);
    }
  },
};
