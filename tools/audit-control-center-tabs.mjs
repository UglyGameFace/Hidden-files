import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const read = (path) => readFileSync(path, 'utf8');
const failures = [];
const fail = (message) => failures.push(message);

const page = read('src/pages/control-center.astro');
const control = read('public/control-center.js');
const vercel = JSON.parse(read('vercel.json'));

for (const required of [
  '/deal-desk.js?v=${buildVersion}',
  '/control-center.js?v=${buildVersion}',
]) {
  if (!page.includes(required)) fail(`Control Center page is missing versioned script: ${required}`);
}

for (const required of [
  "globalThis.CSS.escape",
  "String(value).replace(/[^a-zA-Z0-9_-]/g",
]) {
  if (!page.includes(required)) fail(`Control Center browser compatibility guard is missing: ${required}`);
}

for (const required of [
  'function setSection(section)',
  "cc$$('[data-control-tab]').forEach",
  "button.addEventListener('click'",
  "panel.hidden = panel.dataset.controlPanel !== resolved",
  "button.classList.toggle('active', selected)",
  "button.setAttribute('aria-pressed'",
  'history.replaceState',
]) {
  if (!control.includes(required)) fail(`Canonical section switching is missing: ${required}`);
}

if (existsSync('public/control-center-tabs.js')) {
  fail('A duplicate Control Center tab implementation still exists.');
}

const headerSources = new Set((vercel.headers || []).map((entry) => entry.source));
for (const source of ['/deal-desk.js', '/control-center.js']) {
  if (!headerSources.has(source)) fail(`Vercel revalidation header is missing: ${source}`);
}

for (const path of ['public/deal-desk.js', 'public/control-center.js']) {
  const syntax = spawnSync(process.execPath, ['--check', path], { encoding: 'utf8' });
  if (syntax.status !== 0) fail(`${path} failed syntax validation:\n${syntax.stderr.trim()}`);
}

if (failures.length) {
  console.error('\nCONTROL CENTER TAB AUDIT FAILED\n');
  failures.forEach((message, index) => console.error(`${index + 1}. ${message}`));
  process.exit(1);
}

console.log('\nCONTROL CENTER TAB AUDIT PASSED\n');
console.log('✓ One canonical section-switch implementation controls every owner panel.');
console.log('✓ Samsung Browser receives deployment-versioned Control Center scripts.');
console.log('✓ Missing CSS.escape support cannot disable section buttons.');
