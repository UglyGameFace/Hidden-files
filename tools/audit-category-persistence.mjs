import assert from 'node:assert/strict';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DEFAULT_SITE_SETTINGS,
  sanitizeSiteSettings,
  serializeSiteSettings,
} from '../server/site-settings.js';
import { validateGuide } from '../server/deal-desk.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');
const fixturePath = join(root, 'src/content/hacks/__category-persistence-regression.md');

const gamingCategory = {
  label: 'Gaming Deals',
  shortLabel: 'Gaming',
  description: 'Console, game, accessory, and subscription methods.',
  icon: 'tag',
  accent: 'violet',
  visible: true,
  order: 4,
};

const sanitized = sanitizeSiteSettings({
  ...structuredClone(DEFAULT_SITE_SETTINGS),
  categories: {
    ...structuredClone(DEFAULT_SITE_SETTINGS.categories),
    'gaming-deals': gamingCategory,
  },
});

assert.deepEqual(
  sanitized.categories['gaming-deals'],
  gamingCategory,
  'The site-settings sanitizer dropped or changed a valid custom category.',
);

const reloaded = sanitizeSiteSettings(JSON.parse(serializeSiteSettings(sanitized)));
assert.deepEqual(
  reloaded.categories['gaming-deals'],
  gamingCategory,
  'A serialized custom category did not survive the save/reload round trip.',
);

const validatedGuide = validateGuide({
  title: 'Gaming Deals Regression Method',
  description: 'A regression-only method used to validate custom categories.',
  category: 'gaming-deals',
  featured: false,
  draft: true,
  badge: 'Test',
  keywords: ['gaming', 'console'],
  published: '2026-07-14',
  readTime: '2 min',
  order: 9999,
  body: '## Test method\n\nThis fixture verifies the custom category content path.',
}, Object.keys(reloaded.categories));
assert.equal(validatedGuide.category, 'gaming-deals');

const settingsApi = read('api/control-center-settings.js');
const settingsServer = read('server/site-settings.js');
const methodClient = read('src/scripts/deal-desk.js');
const controlClient = read('src/scripts/control-center.js');
const controlPage = read('src/pages/control-center.astro');
const saveApi = read('api/deal-desk-save.js');
const config = read('src/config.ts');
const contentSchema = read('src/content.config.ts');
const card = read('src/components/HackCard.astro');
const sidebar = read('src/components/Sidebar.astro');
const mobile = read('src/components/MobileHeader.astro');
const guidePage = read('src/pages/guides/[...id].astro');

for (const required of ['sanitizeSiteSettings', 'writeSiteSettings', 'readSiteSettings']) {
  assert.ok(settingsApi.includes(required), `Settings API is missing ${required}.`);
}
assert.ok(!settingsServer.includes("const CATEGORY_KEYS = ['cashback-loops'"), 'The sanitizer still uses the original fixed category list.');
assert.ok(settingsServer.includes('Object.keys(incoming)'), 'The canonical settings sanitizer does not enumerate custom category keys.');
assert.ok(controlClient.includes('state.draft.categories[key]'), 'The Categories panel is not adding categories to the publish draft.');
assert.ok(controlClient.includes('settingsRuntime().set(output)'), 'Publishing does not update the shared settings runtime.');
assert.ok(methodClient.includes("settingsRuntime().get()"), 'New Method does not load the canonical settings registry.');
assert.ok(methodClient.includes('renderCategoryPicker()'), 'New Method does not render its category picker from runtime categories.');
assert.ok(controlPage.includes("window.addEventListener('lobby-settings-loaded'"), 'The method editor does not synchronize after a category publish.');
assert.ok(controlPage.includes("document.querySelector('[data-refresh]')?.click()"), 'The published registry is not reloaded into the method editor.');
assert.ok(saveApi.includes('validateGuide(body, Object.keys(siteSettings.categories))'), 'Method saves are not validated against the canonical category registry.');
assert.ok(saveApi.includes('writeRepoFiles'), 'Category/method/status writes are not atomic.');
assert.ok(contentSchema.includes('Category must be a safe lowercase slug.'), 'Astro content validation still rejects custom category slugs.');
for (const [name, source] of [
  ['config', config],
  ['guide card', card],
  ['desktop navigation', sidebar],
  ['mobile navigation', mobile],
  ['guide page', guidePage],
]) {
  assert.ok(source.includes('getCategory') || source.includes('CATEGORIES'), `${name} is disconnected from the shared category registry.`);
}

const fixture = `---\ntitle: Gaming Deals Regression Method\ndescription: Regression-only Astro content validation for a custom category.\ncategory: gaming-deals\nmanaged: false\nfeatured: false\ndraft: true\nbadge: Test\nkeywords:\n  - gaming\n  - console\npublished: 2026-07-14\nreadTime: 2 min\norder: 9999\n---\n\n## Test method\n\nThis temporary fixture verifies that Astro accepts a guide using a non-default category.\n`;

if (existsSync(fixturePath)) throw new Error(`Temporary fixture already exists: ${fixturePath}`);
writeFileSync(fixturePath, fixture);
try {
  const astroBin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'astro.cmd' : 'astro');
  const result = spawnSync(astroBin, ['check'], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`Astro rejected a guide using gaming-deals:\n${result.stdout}\n${result.stderr}`);
  }
} finally {
  rmSync(fixturePath, { force: true });
}

console.log('\nCATEGORY PERSISTENCE AUDIT PASSED\n');
console.log('✓ gaming-deals survives sanitizer, serialization, and reload unchanged.');
console.log('✓ New Method reloads the published canonical registry after category publishing.');
console.log('✓ Method validation and atomic save accept the custom category.');
console.log('✓ Astro check accepts a temporary guide using gaming-deals.');
console.log('✓ Public cards, navigation, filters, and guide pages remain registry-driven.');
