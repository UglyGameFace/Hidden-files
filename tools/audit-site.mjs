import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const failures = [];
const passed = [];
const read = (path) => readFileSync(join(root, path), 'utf8');
const fail = (message) => failures.push(message);

function walk(directory, predicate = () => true) {
  const absolute = join(root, directory);
  if (!existsSync(absolute)) return [];
  const output = [];
  for (const name of readdirSync(absolute)) {
    const path = join(absolute, name);
    if (statSync(path).isDirectory()) output.push(...walk(relative(root, path), predicate));
    else if (predicate(path)) output.push(relative(root, path));
  }
  return output;
}

function balancedCss(path) {
  const css = read(path).replace(/\/\*[\s\S]*?\*\//g, '');
  let depth = 0;
  for (const character of css) {
    if (character === '{') depth += 1;
    if (character === '}') depth -= 1;
    if (depth < 0) return fail(`${path} closes a CSS block before opening it.`);
  }
  if (depth !== 0) fail(`${path} has unbalanced CSS braces (${depth}).`);
}

function firstRuleBody(css, selectorPattern) {
  const match = css.match(new RegExp(`${selectorPattern.source}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? '';
}

function cssOwners(cssFiles, selectors) {
  return cssFiles.filter((path) => {
    const css = read(path);
    return selectors.some((selector) => css.includes(selector));
  });
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
  const name = path.split('/').at(-1);
  if (sourceText.includes(name)) fail(`Obsolete stylesheet is still referenced: ${name}`);
}

const controlPage = read('src/pages/control-center.astro');
for (const stylesheet of ['deal-desk.css', 'method-manager.css', 'control-center.css']) {
  if (!controlPage.includes(stylesheet)) fail(`Control Center is missing canonical stylesheet: ${stylesheet}`);
}

if (!read('src/pages/deal-desk.astro').includes("Astro.redirect('/control-center', 308)")) {
  fail('The legacy /deal-desk route must permanently redirect instead of rendering a duplicate editor.');
}

const cssFiles = walk('src/styles', (path) => path.endsWith('.css'));
cssFiles.forEach(balancedCss);

const canonicalCss = [
  'src/styles/deal-desk.css',
  'src/styles/method-manager.css',
  'src/styles/control-center.css',
  'src/styles/home-compact.css',
  'src/styles/site-settings.css',
  'src/styles/site-hardening.css',
  'src/styles/navigation-buttons.css',
];
for (const path of canonicalCss) {
  if (read(path).includes('!important')) fail(`${path} contains !important; fix specificity at the source.`);
}

const allCss = cssFiles.map(read).join('\n');
const methodBackdropOwners = cssOwners(cssFiles, ['.desk-modal-backdrop']);
if (methodBackdropOwners.length !== 1 || methodBackdropOwners[0] !== 'src/styles/method-manager.css') {
  fail(`The method modal backdrop must be owned only by src/styles/method-manager.css. Found: ${methodBackdropOwners.join(', ') || 'none'}.`);
}

const methodBackdropBase = firstRuleBody(
  read('src/styles/method-manager.css'),
  /\.desk-modal-backdrop/,
);
if (!/position:\s*fixed;/.test(methodBackdropBase) || !/inset:\s*0;/.test(methodBackdropBase)) {
  fail('The method modal backdrop is missing its canonical fixed full-viewport base rule.');
}

const controlBackdropOwners = cssOwners(cssFiles, ['.cc-preview-backdrop', '.cc-confirm-backdrop']);
if (controlBackdropOwners.length !== 1 || controlBackdropOwners[0] !== 'src/styles/control-center.css') {
  fail(`The Control Center modal backdrops must be owned only by src/styles/control-center.css. Found: ${controlBackdropOwners.join(', ') || 'none'}.`);
}

const controlBackdropBase = firstRuleBody(
  read('src/styles/control-center.css'),
  /\.cc-preview-backdrop\s*,\s*\.cc-confirm-backdrop/,
);
if (!/position:\s*fixed;/.test(controlBackdropBase) || !/inset:\s*0;/.test(controlBackdropBase)) {
  fail('The Control Center modal backdrops are missing their canonical fixed full-viewport base rule.');
}

const shell = read('src/components/LobbyControlCenter.astro');
const panelsSource = `${shell}\n${read('src/components/SiteSettingsPanels.astro')}`;
const tabs = [...shell.matchAll(/data-control-tab="([^"]+)"/g)].map((match) => match[1]);
const panels = [...panelsSource.matchAll(/data-control-panel="([^"]+)"/g)].map((match) => match[1]);
if (new Set(tabs).size !== tabs.length) fail('Control Center has duplicate tab identifiers.');
if (new Set(panels).size !== panels.length) fail('Control Center has duplicate panel identifiers.');
for (const tab of tabs) if (!panels.includes(tab)) fail(`Tab has no matching panel: ${tab}`);
for (const panel of panels) if (!tabs.includes(panel)) fail(`Panel has no matching tab: ${panel}`);

const navigationRegistry = read('src/navigation.ts');
for (const tab of tabs) {
  if (!navigationRegistry.includes(`id: '${tab}'`)) fail(`Control Center section is missing from the shared navigation registry: ${tab}`);
}
for (const required of ['PUBLIC_PAGE_LINKS', 'OWNER_PAGE_LINK', 'getPublicGuideLinks', 'CONTROL_CENTER_SECTIONS']) {
  if (!navigationRegistry.includes(`export const ${required}`) && !navigationRegistry.includes(`export async function ${required}`)) {
    fail(`Shared navigation registry is missing: ${required}`);
  }
}

const sidebar = read('src/components/Sidebar.astro');
const mobileHeader = read('src/components/MobileHeader.astro');
for (const [name, content] of [['Sidebar', sidebar], ['MobileHeader', mobileHeader]]) {
  for (const required of ['PUBLIC_PAGE_LINKS', 'OWNER_PAGE_LINK', 'getPublicGuideLinks', 'data-guide-nav-id']) {
    if (!content.includes(required)) fail(`${name} is not exposing required navigation source: ${required}`);
  }
}

const baseLayout = read('src/layouts/BaseLayout.astro');
for (const required of ['navigation-buttons.css', '/site-status.js', '/navigation-buttons.js']) {
  if (!baseLayout.includes(required)) fail(`BaseLayout is missing navigation/status asset: ${required}`);
}
if (baseLayout.indexOf('/site-status.js') > baseLayout.indexOf('/navigation-buttons.js')) {
  fail('The shared status runtime must load before public navigation consumes it.');
}

const directStatusConsumers = [
  'src/pages/index.astro',
  'src/pages/guides/[...id].astro',
  'public/navigation-buttons.js',
];
for (const path of directStatusConsumers) {
  if (read(path).includes("fetch('/api/deal-status'")) {
    fail(`${path} bypasses the shared public status cache.`);
  }
}

const siteStatus = read('public/site-status.js');
for (const required of ['sessionStorage', 'inflight', 'lobby-status-change', "fetch('/api/deal-status'", 'FRESH_FOR_MS']) {
  if (!siteStatus.includes(required)) fail(`Shared public status runtime is missing: ${required}`);
}

const settings = JSON.parse(read('src/data/site-settings.json'));
for (const key of ['branding', 'homepage', 'navigation', 'categories', 'discord', 'footer', 'seo', 'theme']) {
  if (!settings[key] || typeof settings[key] !== 'object') fail(`site-settings.json is missing object: ${key}`);
}
const categoryKeys = Object.keys(settings.categories || {}).sort();
if (JSON.stringify(categoryKeys) !== JSON.stringify(['cashback-loops', 'food-hacks', 'retail-deals'])) {
  fail(`Unexpected category keys: ${categoryKeys.join(', ')}`);
}
if (!['lime', 'cyan', 'amber', 'violet'].includes(settings.theme?.accentPreset)) fail('Unsupported accent preset.');
if (!['compact', 'comfortable', 'spacious'].includes(settings.theme?.density)) fail('Unsupported density preset.');

for (const path of ['public/deal-desk.js', 'public/control-center.js', 'public/site-status.js', 'public/navigation-buttons.js']) {
  const result = spawnSync(process.execPath, ['--check', path], { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) fail(`${path} failed syntax validation:\n${result.stderr.trim()}`);
}

const controlJs = read('public/control-center.js');
for (const safety of ['baseFingerprint', 'beforeunload', 'baseSha']) {
  if (!controlJs.includes(safety)) fail(`Required safety behavior is missing: ${safety}`);
}
if (!allCss.includes('100dvh')) fail('Dynamic viewport height protection is missing.');

const settingsApi = read('api/control-center-settings.js');
if (!settingsApi.includes('baseSha') || !settingsApi.includes('409')) {
  fail('Control Center API is missing concurrent-edit protection.');
}

if (failures.length) {
  console.error('\nSITE AUDIT FAILED\n');
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

passed.push(`${cssFiles.length} stylesheets have balanced blocks.`);
passed.push('Modal backdrops have one owning stylesheet each, with responsive overrides allowed inside that owner.');
passed.push(`${tabs.length} editor tabs map one-to-one with panels and the shared navigation registry.`);
passed.push('Public page, guide-page, and owner buttons are wired into desktop and mobile navigation.');
passed.push('Homepage, guide pages, and navigation share one cached live-status request.');
passed.push('Legacy Deal Desk overrides are absent and unreferenced.');
passed.push('JavaScript syntax, draft recovery, concurrent publishing, and dynamic viewport safeguards passed.');
console.log('\nSITE AUDIT PASSED\n');
passed.forEach((message) => console.log(`✓ ${message}`));
