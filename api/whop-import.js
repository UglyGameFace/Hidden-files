import {
  handleError,
  HttpError,
  json,
  methodNotAllowed,
  requireAuth,
  requireSameOrigin,
} from '../server/deal-desk.js';
import { discoverWhopGuides } from '../server/whop-discovery.js';
import { importWhopDrafts } from '../server/whop-import.js';
import { requireWhopSession } from '../server/whop-oauth.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'POST') return methodNotAllowed(['POST']);
      requireSameOrigin(request);
      requireAuth(request);
      const body = await request.json().catch(() => ({}));
      const sourceKeys = Array.isArray(body.sourceKeys)
        ? [...new Set(body.sourceKeys.map((value) => String(value || '').trim()).filter(Boolean))]
        : [];
      if (!sourceKeys.length) throw new HttpError(422, 'Approve at least one Whop post before importing.');
      if (sourceKeys.length > 50) throw new HttpError(422, 'Import at most 50 Whop posts at once.');

      const { session, setCookie } = await requireWhopSession(request);
      const discovery = await discoverWhopGuides(session, {
        experienceId: body.experienceId || body.source,
      });
      if (discovery.approvalRequired) throw new HttpError(403, 'Approve this Whop source before importing its posts.');

      const byKey = new Map(discovery.items.map((item) => [item.sourceKey, item]));
      const selected = sourceKeys.map((key) => byKey.get(key)).filter(Boolean);
      if (selected.length !== sourceKeys.length) {
        throw new HttpError(409, 'One or more approved posts changed or are no longer available. Scan the group again.');
      }
      if (selected.some((item) => item.integrity?.blocked)) {
        throw new HttpError(422, 'A selected post is blocked by the formatting integrity check. Review the scan results.');
      }

      const result = await importWhopDrafts({
        category: body.category,
        rightsConfirmed: body.rightsConfirmed === true,
        items: selected,
      });
      const response = json({
        ...result,
        experience: discovery.experience,
        message: result.imported
          ? `${result.imported} approved Whop post${result.imported === 1 ? '' : 's'} imported as hidden drafts.`
          : 'Every approved Whop post is already up to date.',
      });
      if (setCookie) response.headers.append('set-cookie', setCookie);
      return response;
    } catch (error) {
      return handleError(error);
    }
  },
};
