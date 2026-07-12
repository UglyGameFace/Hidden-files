(() => {
  const CACHE_KEY = 'lobby-live-status-v2';
  const RELOAD_KEY = 'lobby-pending-guide-reloads-v1';
  const FRESH_FOR_MS = 15_000;
  const REFRESH_EVERY_MS = 60_000;
  const PENDING_RELOAD_DELAY_MS = 20_000;
  const MAX_PENDING_RELOADS = 6;
  let memory = readBootstrap();
  let inflight = null;
  let timer = null;
  let pendingReloadTimer = null;

  function readBootstrap() {
    const node = document.getElementById('lobby-status-bootstrap');
    if (!node?.textContent) return null;
    try {
      const payload = JSON.parse(node.textContent);
      if (!payload || typeof payload !== 'object') return null;
      return {
        payload: {
          statuses: payload.statuses || {},
          checkedAt: payload.checkedAt || null,
          buildVersion: payload.buildVersion || '',
        },
        savedAt: 0,
        source: 'build',
      };
    } catch {
      return null;
    }
  }

  function safeRead(key = CACHE_KEY) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  }

  function safeWrite(key, value) {
    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage can be unavailable in private browsing. Memory caching still works.
    }
  }

  function safeRemove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // Ignore storage restrictions.
    }
  }

  function effectiveStatus(entry) {
    if (!entry) return 'active';
    if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return 'expired';
    return entry.status || 'active';
  }

  function knownGuideIds() {
    return new Set(
      [...document.querySelectorAll('[data-guide-id], [data-guide-nav-id]')]
        .map((element) => element.getAttribute('data-guide-id') || element.getAttribute('data-guide-nav-id'))
        .filter(Boolean),
    );
  }

  function pendingGuideIds(payload) {
    if (window.location.pathname !== '/') return [];
    const known = knownGuideIds();
    return Object.entries(payload.statuses || {})
      .filter(([, entry]) => effectiveStatus(entry) === 'active')
      .map(([id]) => id)
      .filter((id) => !known.has(id))
      .sort();
  }

  function maybeReloadForNewGuides(payload) {
    const pending = pendingGuideIds(payload);
    if (!pending.length) {
      safeRemove(RELOAD_KEY);
      if (pendingReloadTimer) window.clearTimeout(pendingReloadTimer);
      pendingReloadTimer = null;
      return;
    }

    const signature = pending.join(',');
    const previous = safeRead(RELOAD_KEY);
    const attempts = previous?.signature === signature ? Number(previous.attempts || 0) : 0;
    if (attempts >= MAX_PENDING_RELOADS || pendingReloadTimer) return;

    safeWrite(RELOAD_KEY, { signature, attempts, scheduledAt: Date.now() });
    pendingReloadTimer = window.setTimeout(() => {
      pendingReloadTimer = null;
      const focusedField = document.activeElement instanceof HTMLInputElement
        || document.activeElement instanceof HTMLTextAreaElement;
      const safeToReload = document.visibilityState === 'visible' && window.scrollY < 160 && !focusedField;
      if (!safeToReload) {
        maybeReloadForNewGuides(payload);
        return;
      }

      safeWrite(RELOAD_KEY, { signature, attempts: attempts + 1, reloadedAt: Date.now() });
      window.location.reload();
    }, PENDING_RELOAD_DELAY_MS);
  }

  function publish(payload, source) {
    const entry = {
      payload: {
        statuses: payload.statuses || {},
        checkedAt: payload.checkedAt || new Date().toISOString(),
        buildVersion: payload.buildVersion || document.documentElement.dataset.buildVersion || '',
      },
      savedAt: Date.now(),
      source,
    };
    memory = entry;
    safeWrite(CACHE_KEY, entry);
    maybeReloadForNewGuides(entry.payload);
    window.dispatchEvent(new CustomEvent('lobby-status-change', { detail: entry.payload }));
    return entry.payload;
  }

  function isFresh(entry) {
    return Boolean(entry?.payload && Date.now() - Number(entry.savedAt || 0) < FRESH_FOR_MS);
  }

  async function fetchFresh() {
    const response = await fetch('/api/deal-status', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      cache: 'no-cache',
    });
    if (!response.ok) throw new Error(`Live status request failed (${response.status}).`);
    const payload = await response.json();
    return publish({
      statuses: payload.statuses || {},
      checkedAt: payload.checkedAt || new Date().toISOString(),
      buildVersion: document.documentElement.dataset.buildVersion || '',
    }, 'network');
  }

  async function refresh() {
    if (inflight) return inflight;
    inflight = fetchFresh().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  function startTimer() {
    if (timer) return;
    timer = window.setInterval(() => {
      refresh().catch(() => {
        // Existing static content and cached status remain usable during outages.
      });
    }, REFRESH_EVERY_MS);
  }

  async function get(options = {}) {
    const force = Boolean(options.force);
    startTimer();

    if (!force && isFresh(memory)) return memory.payload;

    const stored = safeRead(CACHE_KEY);
    if (!force && isFresh(stored)) {
      memory = stored;
      maybeReloadForNewGuides(stored.payload);
      return stored.payload;
    }

    const fallback = stored?.payload ? stored : memory?.payload ? memory : null;
    if (!force && fallback?.payload) {
      memory = fallback;
      maybeReloadForNewGuides(fallback.payload);
      refresh().catch(() => {});
      return fallback.payload;
    }

    return refresh();
  }

  function subscribe(callback) {
    const listener = (event) => callback(event.detail || { statuses: {} });
    window.addEventListener('lobby-status-change', listener);
    return () => window.removeEventListener('lobby-status-change', listener);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !isFresh(memory)) refresh().catch(() => {});
  });

  window.addEventListener('pageshow', (event) => {
    if (event.persisted) refresh().catch(() => {});
  });

  window.LobbyStatus = {
    get,
    refresh,
    subscribe,
    effectiveStatus,
  };

  window.dispatchEvent(new Event('lobby-status-ready'));
})();
