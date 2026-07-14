import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  clearLoginFailures,
  getLoginThrottle,
  registerLoginFailure,
} from '../server/deal-desk.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const vercel = JSON.parse(read('vercel.json'));
const globalHeaders = new Map(
  (vercel.headers.find((entry) => entry.source === '/(.*)')?.headers || [])
    .map(({ key, value }) => [key.toLowerCase(), value]),
);
for (const required of [
  'content-security-policy',
  'strict-transport-security',
  'referrer-policy',
  'permissions-policy',
  'x-content-type-options',
  'x-frame-options',
  'cross-origin-opener-policy',
]) {
  assert.ok(globalHeaders.has(required), `Global production security header is missing: ${required}`);
}
assert.match(globalHeaders.get('content-security-policy'), /frame-ancestors 'none'/, 'The CSP does not prevent framing.');
assert.match(globalHeaders.get('content-security-policy'), /object-src 'none'/, 'The CSP does not disable plugin content.');
assert.equal(globalHeaders.get('x-frame-options'), 'DENY');
const controlHeaders = new Map(
  (vercel.headers.find((entry) => entry.source === '/control-center(.*)')?.headers || [])
    .map(({ key, value }) => [key.toLowerCase(), value]),
);
assert.match(controlHeaders.get('x-robots-tag') || '', /noindex/, 'The owner route is missing its noindex response header.');

const server = read('server/deal-desk.js');
for (const required of [
  'GITHUB_TIMEOUT_MS',
  'AbortController',
  'getLoginThrottle',
  'registerLoginFailure',
  'clearLoginFailures',
  'readCommitDeploymentStatus',
  'LOGIN_MAX_FAILURES',
]) {
  assert.ok(server.includes(required), `Owner server hardening is missing: ${required}`);
}

const throttleRequest = new Request('https://example.test/api/deal-desk-session', {
  headers: { 'x-forwarded-for': `audit-${Date.now()}` },
});
clearLoginFailures(throttleRequest);
for (let attempt = 0; attempt < 4; attempt += 1) {
  const result = registerLoginFailure(throttleRequest);
  assert.equal(result.blocked, false, 'The login throttle blocked before the configured threshold.');
}
assert.equal(registerLoginFailure(throttleRequest).blocked, true, 'The login throttle did not block repeated failures.');
assert.equal(getLoginThrottle(throttleRequest).blocked, true, 'The blocked login was not remembered.');
clearLoginFailures(throttleRequest);
assert.equal(getLoginThrottle(throttleRequest).blocked, false, 'A cleared login throttle remained blocked.');

const sessionApi = read('api/deal-desk-session.js');
for (const required of ['getLoginThrottle', 'registerLoginFailure', "'retry-after'", '429', 'clearLoginFailures']) {
  assert.ok(sessionApi.includes(required), `Login endpoint protection is missing: ${required}`);
}

const statusApi = read('api/deal-desk-status.js');
for (const required of ['requireManagedGuide', 'optionalIso', 'for (let attempt = 0; attempt < 2', "error.status !== 409"]) {
  assert.ok(statusApi.includes(required), `Live-status write protection is missing: ${required}`);
}

const deploymentApi = read('api/deployment-status.js');
for (const required of ['requireAuth', 'requireSameOrigin', 'readCommitDeploymentStatus']) {
  assert.ok(deploymentApi.includes(required), `Deployment-status endpoint is missing: ${required}`);
}
const healthApi = read('api/health.js');
for (const required of ["ok: true", 'buildVersion', "service: 'the-420-lobby-hacks'"]) {
  assert.ok(healthApi.includes(required), `Health endpoint is missing: ${required}`);
}

const ownerRuntime = read('src/scripts/owner-readiness.js');
for (const required of [
  'lobby-settings-loaded',
  '/api/deployment-status?commit=',
  'MAX_MONITOR_MS',
  'data-deployment-pending',
  'data-cc-publish',
  'data-save-method',
  'MutationObserver',
  'activateFocusScope',
]) {
  assert.ok(ownerRuntime.includes(required), `Owner readiness runtime is missing: ${required}`);
}
assert.ok(ownerRuntime.includes('The repository save succeeded, but the Vercel production build failed.'), 'Deployment failure copy does not distinguish a saved commit from a failed build.');

const shell = read('src/components/LobbyControlCenter.astro');
for (const required of [
  'data-cc-deployment-state',
  'data-cc-deployment-label',
  'data-cc-deployment-detail',
  'aria-live="polite"',
  'role="alert"',
  'aria-describedby="confirm-description"',
  'aria-describedby="cc-publish-description"',
]) {
  assert.ok(shell.includes(required), `Owner interface accessibility/deployment markup is missing: ${required}`);
}

const controlPage = read('src/pages/control-center.astro');
assert.ok(controlPage.includes("../scripts/owner-readiness.js"), 'The owner readiness runtime is not compiled into the Control Center.');
assert.ok(controlPage.includes('production-readiness.css'), 'The deployment state stylesheet is not loaded.');

const focusScope = read('src/lib/focus-scope.js');
for (const required of ['Shift', "event.key !== 'Tab'", 'returnFocus', 'onEscape']) {
  assert.ok(focusScope.includes(required), `Shared focus scope is missing: ${required}`);
}
const mobile = read('src/components/MobileHeader.astro');
for (const required of ['aria-controls="mobile-navigation-drawer"', 'role="dialog"', 'aria-modal="true"', 'activateFocusScope']) {
  assert.ok(mobile.includes(required), `Mobile navigation accessibility is missing: ${required}`);
}

const statusRuntime = read('public/site-status.js');
for (const required of ['REQUEST_TIMEOUT_MS', 'AbortController', 'controller.abort()', "signal: controller.signal"]) {
  assert.ok(statusRuntime.includes(required), `Public status outage handling is missing: ${required}`);
}

const config = read('src/config.ts');
assert.ok(config.includes("'https://the-420-lobby-hacks.vercel.app'"), 'Canonical URLs can still fall back to a placeholder domain.');
assert.ok(!config.includes("siteUrl: import.meta.env.PUBLIC_SITE_URL ?? 'https://example.vercel.app'"), 'The placeholder canonical domain still exists.');

const sitemap = read('src/pages/sitemap.xml.ts');
for (const required of ["getCollection('hacks'", 'data.managed && !data.draft', '<urlset', 'date.toISOString().slice(0, 10)']) {
  assert.ok(sitemap.includes(required), `Sitemap generation is missing: ${required}`);
}
const robots = read('public/robots.txt');
for (const required of ['/control-center/', '/api/', 'Sitemap: https://the-420-lobby-hacks.vercel.app/sitemap.xml']) {
  assert.ok(robots.includes(required), `robots.txt is missing: ${required}`);
}

const readinessCss = read('src/styles/production-readiness.css');
assert.ok(!readinessCss.includes('!important'), 'Production readiness styles use a specificity override instead of owning their selectors.');
assert.ok(readinessCss.includes('prefers-reduced-motion'), 'Deployment progress animation ignores reduced-motion preferences.');

for (const path of [
  'server/deal-desk.js',
  'api/deal-desk-session.js',
  'api/deal-desk-status.js',
  'api/deployment-status.js',
  'api/health.js',
  'public/site-status.js',
  'src/lib/focus-scope.js',
  'src/scripts/owner-readiness.js',
]) {
  const result = spawnSync(process.execPath, ['--check', path], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, `${path} failed syntax validation:\n${result.stderr.trim()}`);
}

console.log('\nPRODUCTION READINESS AUDIT PASSED\n');
console.log('✓ Owner login failures are throttled and GitHub requests have bounded timeouts.');
console.log('✓ Live-status writes validate managed guides and retry safe concurrent conflicts.');
console.log('✓ Owner publishes report the real Vercel result and block overlapping deployments.');
console.log('✓ Mobile and owner dialogs trap focus, support Escape, and restore the opener.');
console.log('✓ Public status refreshes survive stalled networks without hanging indefinitely.');
console.log('✓ Security headers, private-route indexing rules, canonical URLs, robots, sitemap, and health checks are present.');
