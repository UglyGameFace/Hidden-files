import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  nextAutomaticMethodOrder,
  resolveAutomaticMethodOrder,
} from '../server/method-order.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

assert.equal(nextAutomaticMethodOrder([]), 10, 'The first managed method should receive order 10.');
assert.equal(nextAutomaticMethodOrder([10, 20]), 30, 'New methods should be appended after existing methods.');
assert.equal(nextAutomaticMethodOrder([7]), 10, 'Automatic ordering should use clean ten-point spacing.');
assert.equal(nextAutomaticMethodOrder([9991]), 9999, 'Automatic ordering must stay inside the content schema limit.');
assert.equal(resolveAutomaticMethodOrder(20, [10, 30]), 20, 'Editing a method must preserve its existing order.');
assert.equal(resolveAutomaticMethodOrder(null, [10, 20]), 30, 'Creating a method must receive the next automatic order.');

const shell = read('src/components/LobbyControlCenter.astro');
const saveApi = read('api/deal-desk-save.js');
const homepage = read('src/pages/index.astro');
const guideServer = read('server/deal-desk.js');

assert.ok(!shell.includes('name="order"'), 'The normal method form still exposes the internal order field.');
assert.ok(!shell.includes('<span>Sort order</span>'), 'The normal method form still labels an internal sort value.');
assert.ok(saveApi.includes("resolveAutomaticMethodOrder"), 'Method saves do not use the automatic order resolver.');
assert.ok(saveApi.includes("listGuideFiles"), 'New method ordering is not based on the persisted guide collection.');
assert.ok(saveApi.includes("parseGuideFile(provisionalGuide.id, current.content).order"), 'Existing method edits do not preserve their current order.');
assert.ok(saveApi.includes("validateGuide({ ...body, order: 0 }"), 'Client-provided order values are not being replaced before validation.');
assert.ok(!saveApi.includes('order: body.order'), 'The save API still trusts a client-provided method order.');
assert.ok(homepage.includes('a.data.order - b.data.order'), 'The homepage no longer honors the internal automatic order.');
assert.ok(guideServer.includes('`order: ${guide.order}`'), 'Saved guide frontmatter no longer persists the automatic order.');

console.log('\nAUTOMATIC METHOD ORDER AUDIT PASSED\n');
console.log('✓ The normal posting form no longer asks the owner for a sort number.');
console.log('✓ New methods receive the next available spaced order automatically.');
console.log('✓ Editing an existing method preserves its current placement.');
console.log('✓ The homepage still uses the internal order after featured placement.');
