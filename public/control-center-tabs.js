(() => {
  const ROOT_SELECTOR = '[data-control-center]';
  const TAB_SELECTOR = '[data-control-tab]';
  const PANEL_SELECTOR = '[data-control-panel]';

  function findTab(section) {
    return [...document.querySelectorAll(TAB_SELECTOR)]
      .find((button) => button.dataset.controlTab === section) || null;
  }

  function switchControlSection(section, { updateUrl = true } = {}) {
    const root = document.querySelector(ROOT_SELECTOR);
    const selectedTab = findTab(section);
    if (!root || !(selectedTab instanceof HTMLButtonElement)) return false;

    const resolved = selectedTab.dataset.controlTab || 'methods';
    const panels = [...root.querySelectorAll(PANEL_SELECTOR)];
    const tabs = [...root.querySelectorAll(TAB_SELECTOR)];

    panels.forEach((panel) => {
      const selected = panel.dataset.controlPanel === resolved;
      panel.hidden = !selected;
      panel.setAttribute('aria-hidden', String(!selected));
    });

    tabs.forEach((button) => {
      const selected = button.dataset.controlTab === resolved;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    const title = root.querySelector('[data-cc-section-title]');
    const description = root.querySelector('[data-cc-section-description]');
    if (title) title.textContent = selectedTab.dataset.title || selectedTab.textContent.trim();
    if (description) description.textContent = selectedTab.dataset.description || '';

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.hash = resolved;
      history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }

    window.dispatchEvent(new CustomEvent('lobby-control-section-change', {
      detail: { section: resolved },
    }));
    return true;
  }

  document.addEventListener('click', (event) => {
    const tab = event.target.closest?.(TAB_SELECTOR);
    if (!(tab instanceof HTMLButtonElement) || !tab.closest(ROOT_SELECTOR)) return;
    event.preventDefault();
    switchControlSection(tab.dataset.controlTab || 'methods');
  });

  window.addEventListener('hashchange', () => {
    switchControlSection(window.location.hash.slice(1) || 'methods', { updateUrl: false });
  });

  const initial = window.location.hash.slice(1)
    || document.querySelector(`${TAB_SELECTOR}.active`)?.dataset.controlTab
    || 'methods';
  switchControlSection(initial, { updateUrl: false });

  window.LobbyControlSections = {
    open: switchControlSection,
  };
})();
