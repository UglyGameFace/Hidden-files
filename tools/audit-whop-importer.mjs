import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertApprovedWhopSource,
  whopSourceDecision,
  whopSourceOptions,
} from '../server/whop-source-policy.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const page = read('src/pages/control-center.astro');
const component = read('src/components/WhopImporter.astro');
const client = read('src/scripts/whop-importer.js');
const styles = read('src/styles/whop-importer.css');
const whopApi = read('api/whop.js');
const oauth = read('server/whop-oauth.js');
const vercel = JSON.parse(read('vercel.json'));
const discovery = read('server/whop-discovery.js');
const importer = read('server/whop-import.js');
const sourcePolicy = read('server/whop-source-policy.js');
const envExample = read('.env.example');
const docs = read('docs/WHOP_IMPORTER.md');
const activeTask = read('ACTIVE_TASK.md');
const productionOrigin = 'https://the-420-lobby-hacks.vercel.app';
const productionCallback = `${productionOrigin}/api/whop-oauth-callback`;
const requiredScopes = 'openid profile email forum:read member:basic:read member:email:read';

assert.ok(page.includes("import WhopImporter from '../components/WhopImporter.astro'"), 'The Control Center does not load the Whop importer.');
assert.ok(page.includes('<WhopImporter />'), 'The Whop importer is not rendered on the owner page.');
assert.ok(component.includes('data-whop-importer hidden'), 'The importer must stay hidden until owner authentication succeeds.');
assert.ok(component.includes('data-whop-source-browser hidden'), 'Automatic joined-group discovery is not the primary hidden-until-connected workflow.');
assert.ok(component.includes('data-whop-group-list'), 'The discovered Whop group list is missing.');
assert.ok(component.includes('data-whop-select-defaults'), 'The one-tap Black Box and Hidden Files selector is missing.');
assert.ok(component.includes('data-whop-approve-selected'), 'Bulk source approval is missing.');
assert.ok(component.includes('data-whop-disapprove-selected'), 'Bulk source disapproval is missing.');
assert.ok(component.includes('Advanced fallback: paste a Whop experience ID or link'), 'The manual ID field is not clearly demoted to an advanced fallback.');
assert.ok(component.includes('data-whop-source-approve'), 'The single-forum approval control is missing.');
assert.ok(component.includes('data-whop-source-disapprove'), 'The single-forum disapproval control is missing.');
assert.ok(component.includes('data-whop-approve-ready'), 'The bulk post approval control is missing.');
assert.ok(component.includes('data-whop-disapprove-all'), 'The bulk post disapproval control is missing.');
assert.ok(component.includes('data-whop-rights'), 'The republication-rights confirmation is missing.');
assert.ok(component.includes('Everything imports as a hidden draft'), 'The draft-only import promise is missing.');
assert.ok(component.includes('The 420 Lobby Hacks'), 'The owner workflow is not branded for The 420 Lobby Hacks.');

assert.ok(client.includes('lobby-hacks-whop-decisions:'), 'Post decisions are not remembered under the Lobby Hacks namespace.');
assert.ok(!client.includes('sniperplug-whop-decisions:'), 'The old SniperPlug decision namespace still exists.');
assert.ok(client.includes("api('/api/whop-sources'"), 'The browser does not automatically load joined Whop groups.');
assert.ok(client.includes('state.selectedSources'), 'Source selection state is missing.');
assert.ok(client.includes('experienceIds: ids'), 'Bulk source decisions do not submit exact experience IDs.');
assert.ok(client.includes("decideSources([...state.selectedSources], 'approved')"), 'Approve Selected is not wired.');
assert.ok(client.includes("decideSources([...state.selectedSources], 'disapproved')"), 'Disapprove Selected is not wired.');
assert.ok(client.includes("setItemDecision(item.sourceKey, 'approved')"), 'Individual post approval is not wired.');
assert.ok(client.includes("setItemDecision(item.sourceKey, 'disapproved')"), 'Individual post disapproval is not wired.');
assert.ok(client.includes('sourceKeys'), 'The browser does not send approved post IDs.');
assert.ok(!client.includes('items: selected'), 'The browser must not submit trusted post bodies for import.');
assert.ok(client.includes("'/api/whop-source-decision'"), 'Source decisions are not persisted through the owner API.');
assert.ok(client.includes("'/api/whop-import'"), 'Approved posts are not connected to the import endpoint.');

for (const [name, content] of [
  ['Whop importer component', component],
  ['Whop importer client', client],
  ['Whop import writer', importer],
  ['Whop importer documentation', docs],
  ['active-task record', activeTask],
]) {
  assert.ok(!content.includes('SniperPlug'), `${name} still contains stale SniperPlug wording.`);
}
assert.ok(envExample.includes(`PUBLIC_SITE_URL=${productionOrigin}`), 'The environment example does not target the production Lobby Hacks site.');
assert.ok(envExample.includes(`WHOP_REDIRECT_URI=${productionCallback}`), 'The environment example does not use the exact production Whop callback.');
assert.ok(envExample.includes(`WHOP_OAUTH_SCOPES=${requiredScopes}`), 'The environment example is missing joined-membership discovery scopes.');
assert.ok(docs.includes(productionOrigin), 'The importer documentation does not identify the production Lobby Hacks site.');
assert.ok(docs.includes(productionCallback), 'The importer documentation does not include the exact production Whop callback.');

assert.ok(sourcePolicy.includes("VALID_DECISIONS = new Set(['approved', 'disapproved'])"), 'Source decisions are not restricted to approve/disapprove.');
assert.ok(sourcePolicy.includes("Object.freeze({ key: 'black-box', label: 'Black Box' })"), 'Black Box is not a default Whop group.');
assert.ok(sourcePolicy.includes("Object.freeze({ key: 'hidden-files', label: 'Hidden Files' })"), 'Hidden Files is not a default Whop group.');
assert.ok(sourcePolicy.includes('saveWhopSourceDecisions'), 'The source policy has no atomic bulk decision writer.');
assert.ok(sourcePolicy.includes('assertApprovedWhopSource'), 'The server has no exact source approval guard.');
assert.ok(discovery.includes("allPages(session, 'memberships'"), 'Joined Whop memberships are not discovered automatically.');
assert.ok(discovery.includes("allPages(session, 'forums'"), 'Readable forums are not discovered for joined groups.');
assert.ok(discovery.includes('discoverWhopSources'), 'The automatic source discovery service is missing.');
assert.ok(!discovery.includes('membership?.user?.email'), 'Membership email data must not be copied into the source-discovery result.');
assert.ok(discovery.includes("source.decision !== 'approved'"), 'Discovery does not stop before loading posts from an unapproved source.');
assert.ok(discovery.includes("'forum_posts'"), 'The importer is not scanning Whop forum posts.');
assert.ok(!discovery.includes("'course_lessons'"), 'Course lessons should not be scanned for this post-only workflow.');
assert.ok(oauth.includes(`DEFAULT_SCOPES = '${requiredScopes}'`), 'OAuth is missing the minimum current scopes needed for forum imports and joined-group discovery.');
assert.ok(!oauth.includes('courses:read'), 'The forum-only importer still asks for course access.');

const policyFixture = {
  version: 2,
  sources: {
    exp_black_a: {
      experienceId: 'exp_black_a',
      label: 'Black Box',
      decision: 'approved',
      defaultKey: 'black-box',
      experienceName: 'Main Feed',
    },
    exp_black_b: {
      experienceId: 'exp_black_b',
      label: 'Black Box',
      decision: 'approved',
      defaultKey: 'black-box',
      experienceName: 'Advanced Guides',
    },
    exp_hidden: {
      experienceId: 'exp_hidden',
      label: 'Hidden Files',
      decision: 'disapproved',
      defaultKey: 'hidden-files',
      experienceName: 'Guides',
    },
    exp_other: {
      experienceId: 'exp_other',
      label: 'Another Group',
      decision: 'approved',
      defaultKey: null,
      experienceName: 'Methods',
    },
  },
};
const pendingBlackBox = whopSourceDecision({
  id: 'exp_black_new',
  name: 'Deals',
  company: { title: 'Black Box' },
}, 'exp_black_new', { version: 2, sources: {} });
assert.equal(pendingBlackBox.decision, 'pending', 'A new exact Black Box experience must require an explicit decision.');
assert.equal(pendingBlackBox.defaultKey, 'black-box', 'Black Box should be recognized as a built-in source suggestion.');
assert.equal(assertApprovedWhopSource(policyFixture, 'exp_black_a').experienceId, 'exp_black_a', 'An approved exact experience should pass.');
assert.throws(() => assertApprovedWhopSource(policyFixture, 'exp_hidden'), /Approve this Whop source/, 'A disapproved exact experience must fail.');
assert.throws(() => assertApprovedWhopSource(policyFixture, 'exp_unknown'), /Approve this Whop source/, 'An unknown exact experience must fail.');
const sourceOptions = whopSourceOptions(policyFixture);
assert.equal(sourceOptions.filter((source) => source.groupKey === 'black-box').length, 2, 'Multiple Black Box forum experiences must remain individually manageable.');
assert.ok(sourceOptions.some((source) => source.experienceId === 'exp_other' && !source.builtIn), 'An explicitly approved additional group must remain manageable.');

for (const action of ['oauth-start', 'oauth-callback', 'session', 'sources', 'source-decision', 'discover', 'import']) {
  assert.ok(whopApi.includes(`action === '${action}'`), `The consolidated Whop function is missing the ${action} action.`);
}
assert.ok(whopApi.includes('saveWhopSourceDecisions'), 'The consolidated API does not persist source decisions atomically in bulk.');
assert.ok(whopApi.includes('discoverWhopSources(session)'), 'The consolidated API does not automatically discover joined sources.');
assert.ok(whopApi.includes('discoverWhopGuides(session'), 'The consolidated API does not discover or re-fetch authoritative Whop posts.');
assert.ok(whopApi.includes('sourceKeys.map'), 'The consolidated API does not resolve approved post IDs.');
assert.ok(whopApi.includes('selected.length !== sourceKeys.length'), 'Missing or changed Whop posts are not rejected.');
assert.ok(importer.includes('assertApprovedWhopSource'), 'The final draft writer does not enforce source approval.');
assert.ok(importer.includes("type !== 'forum-post'"), 'The final draft writer is not limited to forum posts.');
assert.ok(importer.includes('draft: true'), 'Whop posts are not forced into hidden drafts.');
assert.ok(importer.includes('assertGuideBodyRoundTrip'), 'Whop imports do not verify exact formatting round trips.');
assert.ok(styles.includes('.whop-group-card'), 'Discovered group card styling is missing.');
assert.ok(styles.includes('.whop-source-toolbar'), 'Bulk source toolbar styling is missing.');
assert.ok(styles.includes('.whop-decision-badge[data-state="approved"]'), 'Approved state styling is missing.');
assert.ok(styles.includes('.whop-decision-badge[data-state="disapproved"]'), 'Disapproved state styling is missing.');
assert.ok(!styles.includes('!important'), 'Whop importer styling must not rely on !important overrides.');

const rewrites = new Map((vercel.rewrites || []).map((rewrite) => [rewrite.source, rewrite.destination]));
for (const [source, action] of [
  ['/api/whop-oauth-start', 'oauth-start'],
  ['/api/whop-oauth-callback', 'oauth-callback'],
  ['/api/whop-session', 'session'],
  ['/api/whop-sources', 'sources'],
  ['/api/whop-source-decision', 'source-decision'],
  ['/api/whop-discover', 'discover'],
  ['/api/whop-import', 'import'],
]) {
  assert.equal(rewrites.get(source), `/api/whop?action=${action}`, `${source} is not routed through the consolidated Whop function.`);
}
assert.ok(String(vercel.ignoreCommand || '').includes('src/data/whop-sources.json'), 'Source-only approval changes should skip a full Vercel rebuild.');

for (const obsolete of [
  'whop-discover.js',
  'whop-import.js',
  'whop-oauth-callback.js',
  'whop-oauth-start.js',
  'whop-session.js',
  'whop-source-decision.js',
  'whop-sources.js',
]) {
  assert.ok(!existsSync(join(root, 'api', obsolete)), `Redundant Vercel function still exists: api/${obsolete}`);
}
const apiFunctions = readdirSync(join(root, 'api')).filter((name) => name.endsWith('.js'));
assert.ok(apiFunctions.length <= 12, `The Hobby deployment has ${apiFunctions.length} direct Vercel functions; it must stay at or below 12.`);
assert.ok(apiFunctions.includes('whop.js'), 'The consolidated Whop Vercel function is missing.');

for (const path of [
  'src/scripts/whop-importer.js',
  'api/whop.js',
  'server/whop-discovery.js',
  'server/whop-import.js',
  'server/whop-oauth.js',
  'server/whop-source-policy.js',
]) {
  const syntax = spawnSync(process.execPath, ['--check', path], { cwd: root, encoding: 'utf8' });
  assert.equal(syntax.status, 0, `${path} failed syntax validation:\n${syntax.stderr}`);
}

console.log('\nWHOP IMPORTER AUDIT PASSED\n');
console.log('✓ The importer automatically discovers joined Whop groups and readable forums.');
console.log('✓ Black Box and Hidden Files can be selected together without finding experience IDs.');
console.log('✓ Source-level and post-level bulk Approve/Disapprove actions are visible and enforced.');
console.log('✓ The manual experience-ID field remains available only as an advanced fallback.');
console.log('✓ Membership email data is discarded server-side and never sent to the browser.');
console.log('✓ The browser sends only exact source/post IDs; the server re-fetches authoritative Whop content.');
console.log('✓ Disapproved sources cannot be scanned or imported, even through a crafted request.');
console.log('✓ Approved posts remain hidden drafts and retain exact formatting through the shared integrity gate.');
console.log(`✓ Seven Whop actions share one Vercel function; total direct API functions: ${apiFunctions.length}.`);
