function effectiveGuideStatus(entry) {
  if (window.LobbyStatus?.effectiveStatus) return window.LobbyStatus.effectiveStatus(entry);
  if (!entry) return 'active';
  if (entry.expiresAt && Date.parse(entry.expiresAt) <= Date.now()) return 'expired';
  return entry.status || 'active';
}

function applyGuideNavigation(payload = {}) {
  const statuses = payload.statuses || {};
  const links = [...document.querySelectorAll('[data-guide-nav-id]')];

  links.forEach((link) => {
    const id = link.getAttribute('data-guide-nav-id');
    const status = effectiveGuideStatus(statuses[id]);
    link.hidden = status === 'paused' || status === 'expired';
    link.dataset.liveStatus = status;
  });
}

async function connectGuideNavigation() {
  const links = [...document.querySelectorAll('[data-guide-nav-id]')];
  if (!links.length) return;

  if (!window.LobbyStatus) {
    window.addEventListener('lobby-status-ready', connectGuideNavigation, { once: true });
    return;
  }

  window.LobbyStatus.subscribe(applyGuideNavigation);
  try {
    applyGuideNavigation(await window.LobbyStatus.get());
  } catch {
    // Static navigation remains available if live status cannot be loaded.
  }
}

function addControlCenterPublicButtons() {
  const actions = document.querySelector('.cc-command-actions');
  if (actions && !actions.querySelector('[data-public-page-shortcut]')) {
    const fragment = document.createDocumentFragment();
    const shortcuts = [
      { href: '/', icon: '⌂', label: 'Live site', className: 'cc-live-site-link' },
      { href: '/#library', icon: '▤', label: 'Guide library', className: '' },
    ];

    shortcuts.forEach((shortcut) => {
      const link = document.createElement('a');
      link.href = shortcut.href;
      link.target = '_blank';
      link.rel = 'noreferrer';
      link.className = shortcut.className;
      link.dataset.publicPageShortcut = '';
      link.innerHTML = `<span aria-hidden="true">${shortcut.icon}</span><b>${shortcut.label}</b>`;
      fragment.append(link);
    });

    actions.prepend(fragment);
  }

  const loginPanel = document.querySelector('[data-login-panel]');
  if (loginPanel && !loginPanel.querySelector('.desk-login-public-link')) {
    const link = document.createElement('a');
    link.href = '/';
    link.className = 'desk-login-public-link';
    link.textContent = '← Back to public website';
    loginPanel.append(link);
  }
}

addControlCenterPublicButtons();
connectGuideNavigation();
