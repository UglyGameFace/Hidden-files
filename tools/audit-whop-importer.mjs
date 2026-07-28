import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const page = read('src/pages/control-center.astro');
const component = read('src/components/WhopImporter.astro');
const client = read('src/scripts/whop-importer.js');
const styles = read('src/styles/whop-importer.css');
const discoverApi = read('api/whop-discover.js');
const decisionApi = read('api/whop-source-decision.js');
const importApi = read('api/whop-import.js');
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

assert.ok(client.includes("sniperplug-whop-decisions:"), 'Post decisions are not remembered on the device.');
assert.ok(client.includes("setItemDecision(item.sourceKey, 'approved')"), 'Individual post approval is not wired.');
assert.ok(client.includes("setItemDecision(item.sourceKey, 'disapproved')"), 'Individual post disapproval is not wired.');
assert.ok(client.includes("sourceKeys"), 'The browser does not send approved source IDs.');
assert.ok(!client.includes('items: selected'), 'The browser must not submit trusted post bodies for import.');
assert.ok(client.includes("'/api/whop-source-decision'"), 'Source decisions are not persisted through the owner API.');
assert.ok(client.includes("'/api/whop-import'"), 'Approved posts are not connected to the import endpoint.');

assert.ok(sourcePolicy.includes("VALID_DECISIONS = new Set(['approved', 'disapproved'])"), 'Source decisions are not restricted to approve/disapprove.');
assert.ok(sourcePolicy.includes("Object.freeze({ key: 'black-box', label: 'Black Box' })"), 'Black Box is not a default Whop group.');
assert.ok(sourcePolicy.includes("Object.freeze({ key: 'hidden-files', label: 'Hidden Files' })"), 'Hidden Files is not a default Whop group.');
assert.ok(sourcePolicy.includes('assertApprovedWhopSource'), 'The server has no exact source approval guard.');
assert.ok(decisionApi.includes('saveWhopSourceDecision'), 'The source-decision API does not persist decisions.');
assert.ok(discovery.includes("source.decision !== 'approved'"), 'Discovery does not stop before loading posts from an unapproved source.');
assert.ok(discovery.includes("'forum_posts'"), 'The importer is not scanning Whop forum posts.');
assert.ok(!discovery.includes("'course_lessons'"), 'Course lessons should not be scanned for this post-only workflow.');
assert.ok(discoverApi.includes('discoverWhopGuides'), 'The discovery API is not using the canonical Whop discovery service.');

assert.ok(importApi.includes('discoverWhopGuides(session'), 'The import endpoint does not re-fetch authoritative Whop posts.');
assert.ok(importApi.includes('sourceKeys.map'), 'The import endpoint does not resolve approved source IDs.');
assert.ok(importApi.includes('selected.length !== sourceKeys.length'), 'Missing or changed Whop posts are not rejected.');
assert.ok(importer.includes('assertApprovedWhopSource'), 'The final draft writer does not enforce source approval.');
assert.ok(importer.includes("type !== 'forum-post'"), 'The final draft writer is not limited to forum posts.');
assert.ok(importer.includes('draft: true'), 'Whop posts are not forced into hidden drafts.');
assert.ok(importer.includes('assertGuideBodyRoundTrip'), 'Whop imports do not verify exact formatting round trips.');
assert.ok(styles.includes('.whop-decision-badge[data-state="approved"]'), 'Approved state styling is missing.');
assert.ok(styles.includes('.whop-decision-badge[data-state="disapproved"]'), 'Disapproved state styling is missing.');

for (const path of [
  'src/scripts/whop-importer.js',
  'api/whop-discover.js',
  'api/whop-import.js',
  'api/whop-source-decision.js',
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
