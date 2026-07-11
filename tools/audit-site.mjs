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
];
for (const path of canonicalCss) {
  if (read(path).includes('!important')) fail(`${path} contains !important; fix specificity at the source.`);
}

const allCss = cssFiles.map(read).join('\n');
if ((allCss.match(/\.desk-modal-backdrop\s*\{/g) || []).length !== 1) {
  fail('The method modal backdrop must have exactly one canonical base selector.');
}
if ((allCss.match(/\.cc-preview-backdrop\s*,\s*\.cc-confirm-backdrop\s*\{/g) || []).length !== 1) {
  fail('The Control Center modal backdrops must have exactly one canonical base selector.');
}

const shell = read('src/components/LobbyControlCenter.astro');
const panelsSource = `${shell}\n${read('src/components/SiteSettingsPanels.astro')}`;
const tabs = [...shell.matchAll(/data-control-tab="([^"]+)"/g)].map((match) => match[1]);
const panels = [...panelsSource.matchAll(/data-control-panel="([^"]+)"/g)].map((match) => match[1]);
if (new Set(tabs).size !== tabs.length) fail('Control Center has duplicate tab identifiers.');
if (new Set(panels).size !== panels.length) fail('Control Center has duplicate panel identifiers.');
for (const tab of tabs) if (!panels.includes(tab)) fail(`Tab has no matching panel: ${tab}`);
for (const panel of panels) if (!tabs.includes(panel)) fail(`Panel has no matching tab: ${panel}`);

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

for (const path of ['public/deal-desk.js', 'public/control-center.js']) {
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
passed.push(`${tabs.length} editor tabs map one-to-one with panels.`);
passed.push('Legacy Deal Desk overrides are absent and unreferenced.');
passed.push('JavaScript syntax, draft recovery, concurrent publishing, and dynamic viewport safeguards passed.');
console.log('\nSITE AUDIT PASSED\n');
passed.forEach((message) => console.log(`✓ ${message}`));
