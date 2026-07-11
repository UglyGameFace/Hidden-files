import {
  handleError,
  json,
  listGuideFiles,
  methodNotAllowed,
  normalizeStatus,
  parseGuideFile,
  readRepoFile,
  readStatusDocument,
  requireAuth,
} from '../server/deal-desk.js';

export default {
  async fetch(request) {
    try {
      if (request.method !== 'GET') return methodNotAllowed(['GET']);
      requireAuth(request);

      const [files, statusDoc] = await Promise.all([
        listGuideFiles(),
        readStatusDocument(),
      ]);

      const guides = await Promise.all(files.map(async (file) => {
        const raw = await readRepoFile(`src/content/hacks/${file.name}`);
        const id = file.name.replace(/\.mdx?$/i, '');
        const guide = parseGuideFile(id, raw.content);
        return {
          ...guide,
          sha: raw.sha,
          live: normalizeStatus(statusDoc.entries[id]),
        };
      }));

      guides.sort((a, b) => {
        const rank = { active: 0, paused: 1, expired: 2 };
        return (rank[a.live.status] - rank[b.live.status]) || a.order - b.order || a.title.localeCompare(b.title);
      });

      return json({ guides });
    } catch (error) {
      return handleError(error);
    }
  },
};
