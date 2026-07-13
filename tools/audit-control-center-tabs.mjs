import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const page = read('src/pages/control-center.astro');
const tabs = read('public/control-center-tabs.js');
const vercel = JSON.parse(read('vercel.json'));

for (const required of [
  '/deal-desk.js?v=${buildVersion}',
  '/control-center.js?v=${buildVersion}',
  '/control-center-tabs.js?v=${buildVersion}',
]) {
  if (!page.includes(required)) fail(`Control Center page is missing versioned script: ${required}`);
}

for (const required of [
  "document.addEventListener('click'",
  "closest?.(TAB_SELECTOR)",
  "panel.hidden = !selected",
  "button.classList.toggle('active', selected)",
  "button.setAttribute('aria-selected'",
  "history.replaceState",
  "window.LobbyControlSections",
]) {
  if (!tabs.includes(required)) fail(`Resilient section switching is missing: ${required}`);
}

if (tabs.includes('CSS.escape')) {
  fail('Fallback section switching must not depend on CSS.escape browser support.');
}

const headerSources = new Set((vercel.headers || []).map((entry) => entry.source));
for (const source of ['/deal-desk.js', '/control-center.js', '/control-center-tabs.js']) {
  if (!headerSources.has(source)) fail(`Vercel revalidation header is missing: ${source}`);
}

const syntax = spawnSync(process.execPath, ['--check', 'public/control-center-tabs.js'], { encoding: 'utf8' });
if (syntax.status !== 0) fail(`control-center-tabs.js failed syntax validation:\n${syntax.stderr.trim()}`);

if (failures.length) {
  console.error('\nCONTROL CENTER TAB AUDIT FAILED\n');
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log('\nCONTROL CENTER TAB AUDIT PASSED\n');
console.log('✓ Section clicks use delegated browser-safe switching.');
console.log('✓ All Control Center scripts are deployment-versioned and revalidated.');
console.log('✓ Panel visibility, active state, accessibility state, and URL hash stay synchronized.');
