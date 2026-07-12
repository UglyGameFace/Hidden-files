(() => {
  const CACHE_KEY = 'lobby-live-status-v1';
  const FRESH_FOR_MS = 15_000;
  const REFRESH_EVERY_MS = 60_000;
  let memory = null;
  let inflight = null;
  let timer = null;

  function safeRead() {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object' || !parsed.payload || !parsed.savedAt) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  function safeWrite(entry) {
    try {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // Storage can be unavailable in private browsing. Memory caching still works.
    }
  }

  function publish(payload, source) {
    const entry = { payload, savedAt: Date.now(), source };
    memory = entry;
    safeWrite(entry);
    window.dispatchEvent(new CustomEvent('lobby-status-change', { detail: payload }));
    return payload;
  }

  function isFresh(entry) {
    return Boolean(entry && Date.now() - Number(entry.savedAt) < FRESH_FOR_MS);
  }

  async function fetchFresh() {
    const response = await fetch('/api/deal-status', {
      credentials: 'same-origin',
      headers: { accept: 'application/json' },
      cache: 'default',
    });
    if (!response.ok) throw new Error(`Live status request failed (${response.status}).`);
    const payload = await response.json();
    return publish({
      statuses: payload.statuses || {},
      checkedAt: payload.checkedAt || new Date().toISOString(),
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

    const stored = safeRead();
    if (!force && isFresh(stored)) {
      memory = stored;
      return stored.payload;
    }

    if (!force && stored?.payload) {
      memory = stored;
      refresh().catch(() => {});
      return stored.payload;
    }

    return refresh();
  }

  function effectiveStatus(entry) {
    if (!entry) return 'active';
    if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return 'expired';
    return entry.status || 'active';
  }

  function subscribe(callback) {
    const listener = (event) => callback(event.detail || { statuses: {} });
    window.addEventListener('lobby-status-change', listener);
    return () => window.removeEventListener('lobby-status-change', listener);
  }

  window.LobbyStatus = {
    get,
    refresh,
    subscribe,
    effectiveStatus,
  };

  window.dispatchEvent(new Event('lobby-status-ready'));
})();
