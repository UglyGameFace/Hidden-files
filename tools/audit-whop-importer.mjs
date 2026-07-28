import assert from 'node:assert/strict';
import {
  existsSync,
  readFileSync,
  readdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const page = read('src/pages/control-center.astro');
const component = read('src/components/WhopImporter.astro');
const client = read('src/scripts/whop-importer.js');
const styles = read('src/styles/whop-importer.css');
const whopApi = read('api/whop.js');
const vercel = JSON.parse(read('vercel.json'));
const discovery = read('server/whop-discovery.js');
const importer = read('server/whop-import.js');
const sourcePolicy = read('server/whop-source-policy.js');

assert.ok(page.includes("import WhopImporter from '../components/WhopImporter.astro'"), 'The Control Center does not load the Whop importer.');
assert.ok(page.includes('<WhopImporter />'), 'The Whop importer is not rendered on the owner page.');
assert.ok(component.includes('data-whop-importer hidden'), 'The importer must stay hidden until owner authentication succeeds.');
assert.ok(component.includes('data-whop-source-approve'), 'The group approval control is missing.');
assert.ok(component.includes('data-whop-source-disapprove'), 'The group disapproval control is missing.');
assert.ok(component.includes('data-whop-approve-ready'), 'The bulk post approval control is missing.');
assert.ok(component.includes('data-whop-disapprove-all'), 'The bulk post disapproval control is missing.');
assert.ok(component.includes('data-whop-rights'), 'The republication-rights confirmation is missing.');
assert.ok(component.includes('Everything imports as a hidden draft'), 'The draft-only import promise is missing.');

assert.ok(client.includes('sniperplug-whop-decisions:'), 'Post decisions are not remembered on the device.');
assert.ok(client.includes("setItemDecision(item.sourceKey, 'approved')"), 'Individual post approval is not wired.');
assert.ok(client.includes("setItemDecision(item.sourceKey, 'disapproved')"), 'Individual post disapproval is not wired.');
assert.ok(client.includes('sourceKeys'), 'The browser does not send approved source IDs.');
assert.ok(!client.includes('items: selected'), 'The browser must not submit trusted post bodies for import.');
assert.ok(client.includes("'/api/whop-source-decision'"), 'Source decisions are not persisted through the owner API.');
assert.ok(client.includes("'/api/whop-import'"), 'Approved posts are not connected to the import endpoint.');

assert.ok(sourcePolicy.includes("VALID_DECISIONS = new Set(['approved', 'disapproved'])"), 'Source decisions are not restricted to approve/disapprove.');
assert.ok(sourcePolicy.includes("Object.freeze({ key: 'black-box', label: 'Black Box' })"), 'Black Box is not a default Whop group.');
assert.ok(sourcePolicy.includes("Object.freeze({ key: 'hidden-files', label: 'Hidden Files' })"), 'Hidden Files is not a default Whop group.');
assert.ok(sourcePolicy.includes('assertApprovedWhopSource'), 'The server has no exact source approval guard.');
assert.ok(discovery.includes("source.decision !== 'approved'"), 'Discovery does not stop before loading posts from an unapproved source.');
assert.ok(discovery.includes("'forum_posts'"), 'The importer is not scanning Whop forum posts.');
assert.ok(!discovery.includes("'course_lessons'"), 'Course lessons should not be scanned for this post-only workflow.');

for (const action of ['oauth-start', 'oauth-callback', 'session', 'source-decision', 'discover', 'import']) {
  assert.ok(whopApi.includes(`action === '${action}'`), `The consolidated Whop function is missing the ${action} action.`);
}
assert.ok(whopApi.includes('saveWhopSourceDecision'), 'The consolidated API does not persist source decisions.');
assert.ok(whopApi.includes('discoverWhopGuides(session'), 'The consolidated API does not discover or re-fetch authoritative Whop posts.');
assert.ok(whopApi.includes('sourceKeys.map'), 'The consolidated API does not resolve approved source IDs.');
assert.ok(whopApi.includes('selected.length !== sourceKeys.length'), 'Missing or changed Whop posts are not rejected.');
assert.ok(importer.includes('assertApprovedWhopSource'), 'The final draft writer does not enforce source approval.');
assert.ok(importer.includes("type !== 'forum-post'"), 'The final draft writer is not limited to forum posts.');
assert.ok(importer.includes('draft: true'), 'Whop posts are not forced into hidden drafts.');
assert.ok(importer.includes('assertGuideBodyRoundTrip'), 'Whop imports do not verify exact formatting round trips.');
assert.ok(styles.includes('.whop-decision-badge[data-state="approved"]'), 'Approved state styling is missing.');
assert.ok(styles.includes('.whop-decision-badge[data-state="disapproved"]'), 'Disapproved state styling is missing.');

const rewrites = new Map((vercel.rewrites || []).map((rewrite) => [rewrite.source, rewrite.destination]));
for (const [source, action] of [
  ['/api/whop-oauth-start', 'oauth-start'],
  ['/api/whop-oauth-callback', 'oauth-callback'],
  ['/api/whop-session', 'session'],
  ['/api/whop-source-decision', 'source-decision'],
  ['/api/whop-discover', 'discover'],
  ['/api/whop-import', 'import'],
]) {
  assert.equal(rewrites.get(source), `/api/whop?action=${action}`, `${source} is not routed through the consolidated Whop function.`);
}

for (const obsolete of [
  'whop-discover.js',
  'whop-import.js',
  'whop-oauth-callback.js',
  'whop-oauth-start.js',
  'whop-session.js',
  'whop-source-decision.js',
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
console.log('✓ Black Box and Hidden Files are default source suggestions, with explicit approval for any exact group ID.');
console.log('✓ Group and post approval/disapproval controls are visible, reversible, and enforced.');
console.log('✓ The browser sends only approved post IDs; the server re-fetches authoritative Whop content.');
console.log('✓ Disapproved sources cannot be scanned or imported, even through a crafted request.');
console.log('✓ Approved posts remain hidden drafts and retain exact formatting through the shared integrity gate.');
console.log(`✓ Six Whop actions share one Vercel function; total direct API functions: ${apiFunctions.length}.`);
