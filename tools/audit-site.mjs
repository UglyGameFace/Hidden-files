import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const notes = [];

function read(path) {
  return readFileSync(join(root, path), 'utf8');
}

function fail(message) {
  failures.push(message);
}

function note(message) {
  notes.push(message);
}

function walk(directory, predicate = () => true) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  const output = [];
  for (const name of readdirSync(absolute)) {
    const path = join(absolute, name);
    const metadata = statSync(path);
    if (metadata.isDirectory()) output.push(...walk(relative(root, path), predicate));
    else if (predicate(path)) output.push(relative(root, path));
  }
  return output;
}

function count(text, pattern) {
  return [...text.matchAll(pattern)].length;
}

function checkBalancedCss(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const character of css) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) return fail(`${path} closes a CSS block before it opens one.`);
  }
  if (depth !== 0) fail(`${path} has unbalanced CSS braces (${depth}).`);
}

const legacyStyles = [
  'src/styles/deal-desk-overlay.css',
  'src/styles/deal-desk-control-polish.css',
  'src/styles/deal-desk-mobile-flow.css',
];

for (const path of legacyStyles) {
  if (existsSync(join(root, path))) fail(`Obsolete stylesheet still exists: ${path}`);
}

const sourceFiles = walk('src', (path) => /\.(astro|css|ts|js)$/.test(path));
const sourceText = sourceFiles.map((path) => `${path}\n${read(path)}`).join('\n');
for (const path of legacyStyles) {
  const basename = path.split('/').at(-1);
  if (sourceText.includes(basename)) fail(`Obsolete stylesheet is still referenced: ${basename}`);
}

const controlPage = read('src/pages/control-center.astro');
for (const expected of [
  "../styles/deal-desk.css",
  "../styles/method-manager.css",
  "../styles/control-center.css",
]) {
  if (!controlPage.includes(expected)) fail(`Control Center is missing canonical stylesheet ${expected}.`);
}

const legacyRoute = read('src/pages/deal-desk.astro');
if (!legacyRoute.includes("Astro.redirect('/control-center', 308)")) {
  fail('The legacy /deal-desk route must be a permanent redirect, not a duplicate editor page.');
}

const cssFiles = walk('src/styles', (path) => path.endsWith('.css'));
for (const path of cssFiles) checkBalancedCss(path);

const canonicalConflictFiles = [
  'src/styles/deal-desk.css',
  'src/styles/method-manager.css',
  'src/styles/control-center.css',
  'src/styles/home-compact.css',
  'src/styles/site-settings.css',
  'src/styles/site-hardening.css',
];

for (const path of canonicalConflictFiles) {
  const css = read(path);
  if (css.includes('!important')) fail(`${path} contains !important; fix specificity at the source instead.`);
}

const allCss = cssFiles.map((path) => read(path)).join('\n');
if (count(allCss, /\.desk-modal-backdrop\s*\{/g) !== 1) {
  fail('The method modal backdrop must have exactly one canonical base selector.');
}

if (count(allCss, /\.cc-preview-backdrop\s*,\s*\n?\.cc-confirm-backdrop\s*\{/g) !== 1) {
  fail('The Control Center modal backdrops must share exactly one canonical base selector.');
}

const component = read('src/components/LobbyControlCenter.astro');
const tabs = [...component.matchAll(/data-control-tab="([^"]+)"/g)].map((match) => match[1]);
const settingsPanels = read('src/components/SiteSettingsPanels.astro');
const panels = [
  ...component.matchAll(/data-control-panel="([^"]+)"/g),
  ...settingsPanels.matchAll(/data-control-panel="([^"]+)"/g),
].map((match) => match[1]);

if (new Set(tabs).size !== tabs.length) fail('Control Center contains duplicate section-tab identifiers.');
if (new Set(panels).size !== panels.length) fail('Control Center contains duplicate panel identifiers.');
for (const tab of tabs) {
  if (!panels.includes(tab)) fail(`Control Center tab has no matching panel: ${tab}`);
}
for (const panel of panels) {
  if (!tabs.includes(panel)) fail(`Control Center panel has no matching tab: ${panel}`);
}

const settings = JSON.parse(read('src/data/site-settings.json'));
for (const key of ['branding', 'homepage', 'navigation', 'categories', 'discord', 'footer', 'seo', 'theme']) {
  if (!settings[key] || typeof settings[key] !== 'object') fail(`site-settings.json is missing object: ${key}`);
}

const categoryKeys = Object.keys(settings.categories || {}).sort();
const expectedCategoryKeys = ['cashback-loops', 'food-hacks', 'retail-deals'];
if (JSON.stringify(categoryKeys) !== JSON.stringify(expectedCategoryKeys)) {
  fail(`Unexpected category keys: ${categoryKeys.join(', ')}`);
}

if (!['lime', 'cyan', 'amber', 'violet'].includes(settings.theme?.accentPreset)) {
  fail('site-settings.json uses an unsupported accent preset.');
}
if (!['compact', 'comfortable', 'spacious'].includes(settings.theme?.density)) {
  fail('site-settings.json uses an unsupported density preset.');
}

for (const path of ['public/deal-desk.js', 'public/control-center.js']) {
  const result = spawnSync(process.execPath, ['--check', path], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) fail(`${path} failed node --check:\n${result.stderr.trim()}`);
}

const controlJs = read('public/control-center.js');
for (const required of ['baseFingerprint', 'beforeunload', 'lobby-session-expired', 'baseSha']) {
  if (!controlJs.includes(required)) fail(`Control Center safety behavior is missing: ${required}`);
}

const settingsApi = read('api/control-center-settings.js');
if (!settingsApi.includes('baseSha') || !settingsApi.includes('409')) {
  fail('Control Center API is missing concurrent-edit protection.');
}

if (failures.length) {
  console.error('\nSITE AUDIT FAILED\n');
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

note(`${cssFiles.length} stylesheets passed brace checks.`);
note(`${tabs.length} Control Center tabs map one-to-one with panels.`);
note('Legacy Deal Desk overrides are absent.');
note('JavaScript syntax and draft/concurrency safeguards passed.');

console.log('\nSITE AUDIT PASSED\n');
notes.forEach((message) => console.log(`✓ ${message}`));
