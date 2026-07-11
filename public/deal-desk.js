const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const elements = {
  root: $('[data-deal-desk]'),
  login: $('[data-login-panel]'),
  loginForm: $('[data-login-form]'),
  loginError: $('[data-login-error]'),
  app: $('[data-desk-app]'),
  editor: $('[data-editor]'),
  empty: $('[data-empty-editor]'),
  selected: $('[data-selected-label]'),
  selectedLive: $('[data-selected-live]'),
  liveDot: $('[data-live-dot]'),
  liveLabel: $('[data-live-label]'),
  liveDetail: $('[data-live-detail]'),
  liveSummary: $('[data-live-control-summary]'),
  editorMode: $('[data-editor-mode]'),
  editorTitle: $('[data-editor-title]'),
  editorId: $('[data-editor-id]'),
  publicGuide: $('[data-open-public]'),
  quickControls: $('[data-quick-controls]'),
  picker: $('[data-picker-backdrop]'),
  pickerSearch: $('[data-picker-search]'),
  methodList: $('[data-method-list]'),
  pickerEmpty: $('[data-picker-empty]'),
  pickerCount: $('[data-picker-result-count]'),
  confirm: $('[data-confirm-backdrop]'),
  confirmTitle: $('[data-confirm-title]'),
  confirmCopy: $('[data-confirm-copy]'),
  confirmGo: $('[data-confirm-go]'),
  toast: $('[data-desk-toast]'),
  featureToggle: $('[data-feature-toggle]'),
  draftToggle: $('[data-draft-toggle]'),
  customExpiry: $('[data-custom-expiry]'),
};

const state = {
  guides: [],
  selectedId: null,
  working: null,
  category: 'food-hacks',
  featured: false,
  draft: false,
  filter: 'all',
  confirmAction: null,
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) lockDesk();
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data;
}

function notify(message, type = 'ok') {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.dataset.type = type;
  elements.toast.hidden = false;
  clearTimeout(window.__dealDeskToast);
  window.__dealDeskToast = window.setTimeout(() => {
    elements.toast.hidden = true;
  }, 4200);
}

function lockDesk() {
  if (elements.app) elements.app.hidden = true;
  if (elements.login) elements.login.hidden = false;
  elements.root?.classList.remove('is-unlocked');
  closePicker();
  closeConfirm();
}

function unlockDesk() {
  if (elements.login) elements.login.hidden = true;
  if (elements.app) elements.app.hidden = false;
  elements.root?.classList.add('is-unlocked');
}

function methodStatus(guide) {
  const live = guide?.live || {};
  if (live.expiresAt && Date.parse(live.expiresAt) <= Date.now()) return 'expired';
  return live.status || 'active';
}

function isExpiringSoon(guide) {
  const difference = guide?.live?.expiresAt
    ? Date.parse(guide.live.expiresAt) - Date.now()
    : 0;
  return methodStatus(guide) === 'active' && difference > 0 && difference <= 6 * 60 * 60 * 1000;
}

function statusGroup(guide) {
  const current = methodStatus(guide);
  if (current === 'expired') return 'expired';
  if (current === 'paused') return 'paused';
  if (isExpiringSoon(guide)) return 'expiring';
  return 'active';
}

function statusLabel(guide) {
  const group = statusGroup(guide);
  if (group === 'expiring') return 'Expiring soon';
  return group.charAt(0).toUpperCase() + group.slice(1);
}

function remainingLabel(iso) {
  const difference = Date.parse(iso) - Date.now();
  if (difference <= 0) return 'Expired now';
  const minutes = Math.ceil(difference / 60000);
  if (minutes < 60) return `Expires in ${minutes}m`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 48) return `Expires in ${hours}h`;
  return `Expires in ${Math.ceil(hours / 24)}d`;
}

function localExpiryValue(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function filterCounts() {
  return {
    all: state.guides.length,
    active: state.guides.filter((guide) => statusGroup(guide) === 'active').length,
    expiring: state.guides.filter((guide) => statusGroup(guide) === 'expiring').length,
    paused: state.guides.filter((guide) => statusGroup(guide) === 'paused').length,
    expired: state.guides.filter((guide) => statusGroup(guide) === 'expired').length,
  };
}

function renderStats() {
  const counts = filterCounts();
  for (const key of ['active', 'expiring', 'paused', 'expired']) {
    const count = $(`[data-stat-${key}]`);
    if (count) count.textContent = String(counts[key]);
  }

  $$('[data-filter-count]').forEach((count) => {
    count.textContent = String(counts[count.dataset.filterCount] ?? 0);
  });
}

function syncFilterControls() {
  $$('[data-picker-filter]').forEach((button) => {
    const selected = button.dataset.pickerFilter === state.filter;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });

  $$('[data-stat-filter]').forEach((button) => {
    const selected = button.dataset.statFilter === state.filter;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}

function setPickerFilter(filter, { open = false } = {}) {
  const allowed = new Set(['all', 'active', 'expiring', 'paused', 'expired']);
  state.filter = allowed.has(filter) ? filter : 'all';
  syncFilterControls();
  renderPicker();
  if (open) openPicker();
}

function methodOptionMarkup(guide) {
  return `<button type="button" class="desk-method-option status-${methodStatus(guide)}${isExpiringSoon(guide) ? ' is-expiring' : ''}" data-method-id="${escapeHtml(guide.id)}">
    <span class="method-status-dot"></span>
    <span class="method-option-copy">
      <small>${escapeHtml(guide.category.replaceAll('-', ' '))}</small>
      <strong>${escapeHtml(guide.title)}</strong>
      <em>${escapeHtml(guide.description)}</em>
    </span>
    <span class="method-option-meta">
      <b>${escapeHtml(statusLabel(guide))}</b>
      <small>${guide.live?.expiresAt ? escapeHtml(remainingLabel(guide.live.expiresAt)) : 'No auto-expiration'}</small>
      <i>Choose →</i>
    </span>
  </button>`;
}

function renderPicker() {
  if (!elements.methodList) return;

  const search = elements.pickerSearch?.value.trim().toLowerCase() || '';
  const searched = state.guides.filter((guide) => {
    const haystack = [
      guide.title,
      guide.description,
      guide.id,
      guide.category,
      ...(guide.keywords || []),
    ].join(' ').toLowerCase();
    return !search || haystack.includes(search);
  });

  const definitions = [
    ['active', 'Active'],
    ['expiring', 'Expiring soon'],
    ['paused', 'Paused'],
    ['expired', 'Expired'],
  ];
  const visibleDefinitions = state.filter === 'all'
    ? definitions
    : definitions.filter(([key]) => key === state.filter);

  const groups = visibleDefinitions
    .map(([key, title]) => ({
      key,
      title,
      rows: searched.filter((guide) => statusGroup(guide) === key),
    }))
    .filter((group) => group.rows.length > 0);

  const total = groups.reduce((sum, group) => sum + group.rows.length, 0);
  elements.methodList.innerHTML = groups.map((group) => `
    <section class="desk-method-group" data-method-group="${group.key}">
      <div class="desk-method-group-title"><span>${escapeHtml(group.title)}</span><b>${group.rows.length}</b></div>
      <div class="desk-method-group-list">${group.rows.map(methodOptionMarkup).join('')}</div>
    </section>
  `).join('');

  if (elements.pickerCount) {
    elements.pickerCount.textContent = `${total} method${total === 1 ? '' : 's'}`;
  }
  if (elements.pickerEmpty) elements.pickerEmpty.hidden = total !== 0;

  $$('[data-method-id]', elements.methodList).forEach((button) => {
    button.addEventListener('click', () => selectMethod(button.dataset.methodId));
  });
}

function setToggle(button, active, activeLabel, inactiveLabel) {
  if (!button) return;
  button.classList.toggle('active', active);
  button.setAttribute('aria-pressed', String(active));
  const label = $('b', button);
  if (label) label.textContent = active ? activeLabel : inactiveLabel;
}

function renderLiveStatus(guide) {
  const isNew = !guide.id;
  if (elements.quickControls) elements.quickControls.hidden = isNew;
  if (elements.selectedLive) elements.selectedLive.hidden = isNew;
  if (isNew) return;

  const current = methodStatus(guide);
  if (elements.selectedLive) elements.selectedLive.dataset.status = current;
  if (elements.liveDot) elements.liveDot.dataset.status = current;
  if (elements.liveLabel) elements.liveLabel.textContent = statusLabel(guide);

  const details = [];
  if (guide.live?.expiresAt) details.push(remainingLabel(guide.live.expiresAt));
  if (guide.live?.verifiedAt) details.push(`Verified ${new Date(guide.live.verifiedAt).toLocaleString()}`);

  if (elements.liveDetail) elements.liveDetail.textContent = details.join(' • ') || 'No expiration set';
  if (elements.liveSummary) {
    elements.liveSummary.textContent = guide.live?.expiresAt
      ? remainingLabel(guide.live.expiresAt)
      : statusLabel(guide);
  }
  if (elements.customExpiry) {
    elements.customExpiry.value = localExpiryValue(guide.live?.expiresAt);
  }
}

function populateEditor(guide) {
  if (!(elements.editor instanceof HTMLFormElement)) return;

  state.working = structuredClone(guide);
  state.selectedId = guide.id || null;
  state.category = guide.category || 'food-hacks';
  state.featured = Boolean(guide.featured);
  state.draft = Boolean(guide.draft);

  if (elements.empty) elements.empty.hidden = true;
  elements.editor.hidden = false;
  if (elements.selected) elements.selected.textContent = guide.title || 'New method';
  if (elements.editorMode) elements.editorMode.textContent = guide.id ? 'Edit method' : 'Create method';
  if (elements.editorTitle) elements.editorTitle.textContent = guide.title || 'New method';
  if (elements.editorId) {
    elements.editorId.textContent = guide.id
      ? `Guide ID: ${guide.id}`
      : 'A guide ID will be generated from the title.';
  }

  const fields = elements.editor.elements;
  const values = {
    title: guide.title || '',
    description: guide.description || '',
    badge: guide.badge || '',
    readTime: guide.readTime || '5 min',
    keywords: (guide.keywords || []).join(', '),
    order: String(guide.order ?? 999),
    body: guide.body || '',
  };

  for (const [name, value] of Object.entries(values)) {
    const field = fields.namedItem(name);
    if (field) field.value = value;
  }

  $$('[data-category]').forEach((button) => {
    button.classList.toggle('active', button.dataset.category === state.category);
  });
  setToggle(elements.featureToggle, state.featured, 'Featured', 'Not featured');
  setToggle(elements.draftToggle, state.draft, 'Hidden draft', 'Public');
  renderLiveStatus(guide);

  if (elements.publicGuide) {
    elements.publicGuide.hidden = !guide.id;
    elements.publicGuide.onclick = guide.id
      ? () => window.open(`/guides/${guide.id}/`, '_blank', 'noopener')
      : null;
  }
}

function selectMethod(id) {
  const guide = state.guides.find((item) => item.id === id);
  if (!guide) return;
  populateEditor(guide);
  closePicker();
  elements.editor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function createNewMethod() {
  populateEditor({
    id: '',
    title: '',
    description: '',
    category: 'food-hacks',
    featured: false,
    draft: false,
    badge: 'New',
    keywords: [],
    published: new Date().toISOString().slice(0, 10),
    readTime: '4 min',
    order: 20,
    body: '## The deal\n\nDescribe the method.\n\n## Steps\n\n1. Add the first step.\n2. Add the next step.\n\n## Important notes\n\nAdd expiration details and restrictions.',
    live: { status: 'active', expiresAt: null, verifiedAt: null },
  });
  closePicker();
  elements.editor?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openPicker() {
  if (!elements.picker) return;
  syncFilterControls();
  renderPicker();
  elements.picker.hidden = false;
  document.body.classList.add('desk-modal-open');
  window.setTimeout(() => elements.pickerSearch?.focus(), 30);
}

function closePicker() {
  if (elements.picker) elements.picker.hidden = true;
  if (!elements.confirm || elements.confirm.hidden) {
    document.body.classList.remove('desk-modal-open');
  }
}

function openConfirm(title, copy, action, buttonText = 'Confirm') {
  state.confirmAction = action;
  if (elements.confirmTitle) elements.confirmTitle.textContent = title;
  if (elements.confirmCopy) elements.confirmCopy.textContent = copy;
  if (elements.confirmGo) elements.confirmGo.textContent = buttonText;
  if (elements.confirm) elements.confirm.hidden = false;
  document.body.classList.add('desk-modal-open');
}

function closeConfirm() {
  state.confirmAction = null;
  if (elements.confirm) elements.confirm.hidden = true;
  if (!elements.picker || elements.picker.hidden) {
    document.body.classList.remove('desk-modal-open');
  }
}

async function setLiveStatus(status, expiresAt = null, verifiedAt = null) {
  if (!state.selectedId) return;
  const output = await api('/api/deal-desk-status', {
    method: 'POST',
    body: JSON.stringify({ id: state.selectedId, status, expiresAt, verifiedAt }),
  });

  const guide = state.guides.find((item) => item.id === state.selectedId);
  if (guide) guide.live = output.live;
  if (state.working) state.working.live = output.live;

  renderStats();
  renderPicker();
  renderLiveStatus(state.working);
  notify(`${state.working?.title || 'Method'} is now ${status}.`);
}

async function loadGuides() {
  const output = await api('/api/deal-desk-guides');
  state.guides = output.guides || [];
  renderStats();
  syncFilterControls();
  renderPicker();

  if (state.selectedId) {
    const guide = state.guides.find((item) => item.id === state.selectedId);
    if (guide) populateEditor(guide);
  }
}

elements.loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (elements.loginError) elements.loginError.hidden = true;
  const button = $('button[type="submit"]', elements.loginForm);
  if (button) {
    button.disabled = true;
    button.textContent = 'Unlocking...';
  }

  try {
    await api('/api/deal-desk-session', {
      method: 'POST',
      body: JSON.stringify({ password: new FormData(elements.loginForm).get('password') }),
    });
    unlockDesk();
    await loadGuides();
    elements.loginForm.reset();
  } catch (error) {
    if (elements.loginError) {
      elements.loginError.textContent = error.message;
      elements.loginError.hidden = false;
    }
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Unlock Deal Desk';
    }
  }
});

$$('[data-open-picker]').forEach((button) => button.addEventListener('click', openPicker));
$$('[data-close-picker]').forEach((button) => button.addEventListener('click', closePicker));
$$('[data-new-method]').forEach((button) => button.addEventListener('click', createNewMethod));

elements.pickerSearch?.addEventListener('input', renderPicker);

$$('[data-picker-filter]').forEach((button) => {
  button.addEventListener('click', () => setPickerFilter(button.dataset.pickerFilter));
});

$$('[data-stat-filter]').forEach((button) => {
  button.addEventListener('click', () => {
    setPickerFilter(button.dataset.statFilter, { open: true });
  });
});

$$('[data-category]').forEach((button) => {
  button.addEventListener('click', () => {
    state.category = button.dataset.category;
    $$('[data-category]').forEach((item) => {
      item.classList.toggle('active', item === button);
    });
  });
});

elements.featureToggle?.addEventListener('click', () => {
  state.featured = !state.featured;
  setToggle(elements.featureToggle, state.featured, 'Featured', 'Not featured');
});

elements.draftToggle?.addEventListener('click', () => {
  state.draft = !state.draft;
  setToggle(elements.draftToggle, state.draft, 'Hidden draft', 'Public');
});

$$('[data-extend-hours]').forEach((button) => {
  button.addEventListener('click', async () => {
    try {
      const hours = Number(button.dataset.extendHours);
      await setLiveStatus(
        'active',
        new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
        new Date().toISOString(),
      );
    } catch (error) {
      notify(error.message, 'error');
    }
  });
});

$('[data-set-custom-expiry]')?.addEventListener('click', async () => {
  try {
    if (!elements.customExpiry?.value) throw new Error('Choose an expiration date and time.');
    const when = new Date(elements.customExpiry.value);
    if (Number.isNaN(when.getTime())) throw new Error('That expiration time is invalid.');
    if (when.getTime() <= Date.now()) throw new Error('Choose a future expiration time.');
    await setLiveStatus('active', when.toISOString(), new Date().toISOString());
  } catch (error) {
    notify(error.message, 'error');
  }
});

$('[data-clear-expiry]')?.addEventListener('click', async () => {
  try {
    await setLiveStatus('active', null, new Date().toISOString());
  } catch (error) {
    notify(error.message, 'error');
  }
});

$$('[data-status-action]').forEach((button) => {
  button.addEventListener('click', async () => {
    const action = button.dataset.statusAction;
    if (action === 'expire') {
      openConfirm(
        'Expire this method now?',
        `${state.working?.title || 'This method'} will disappear from the public library immediately.`,
        async () => {
          closeConfirm();
          try {
            await setLiveStatus(
              'expired',
              new Date().toISOString(),
              state.working?.live?.verifiedAt || null,
            );
          } catch (error) {
            notify(error.message, 'error');
          }
        },
        'Expire now',
      );
      return;
    }

    try {
      if (action === 'pause') {
        await setLiveStatus(
          'paused',
          state.working?.live?.expiresAt || null,
          state.working?.live?.verifiedAt || null,
        );
      }
      if (action === 'verify') {
        const futureExpiry = state.working?.live?.expiresAt
          && Date.parse(state.working.live.expiresAt) > Date.now()
          ? state.working.live.expiresAt
          : null;
        await setLiveStatus('active', futureExpiry, new Date().toISOString());
      }
    } catch (error) {
      notify(error.message, 'error');
    }
  });
});

elements.confirmGo?.addEventListener('click', () => state.confirmAction?.());
$('[data-confirm-back]')?.addEventListener('click', closeConfirm);

elements.editor?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = new FormData(elements.editor);
  const saveButton = $('[data-save-method]');
  if (saveButton) {
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
  }

  try {
    const output = await api('/api/deal-desk-save', {
      method: 'POST',
      body: JSON.stringify({
        id: state.selectedId || '',
        title: form.get('title'),
        description: form.get('description'),
        category: state.category,
        featured: state.featured,
        draft: state.draft,
        badge: form.get('badge'),
        readTime: form.get('readTime'),
        keywords: form.get('keywords'),
        order: form.get('order'),
        published: state.working?.published || new Date().toISOString().slice(0, 10),
        body: form.get('body'),
      }),
    });
    state.selectedId = output.guide.id;
    notify(output.message);
    await loadGuides();
  } catch (error) {
    notify(error.message, 'error');
  } finally {
    if (saveButton) {
      saveButton.disabled = false;
      saveButton.textContent = 'Save method';
    }
  }
});

$('[data-refresh]')?.addEventListener('click', () => {
  loadGuides()
    .then(() => notify('Deal Desk refreshed.'))
    .catch((error) => notify(error.message, 'error'));
});

$('[data-logout]')?.addEventListener('click', async () => {
  try {
    await api('/api/deal-desk-session', { method: 'DELETE', body: '{}' });
  } catch {
    // Lock locally even if the request fails.
  }
  lockDesk();
});

elements.picker?.addEventListener('click', (event) => {
  if (event.target === elements.picker) closePicker();
});

elements.confirm?.addEventListener('click', (event) => {
  if (event.target === elements.confirm) closeConfirm();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  if (elements.confirm && !elements.confirm.hidden) closeConfirm();
  else closePicker();
});

(async () => {
  try {
    const session = await api('/api/deal-desk-session', { method: 'GET', headers: {} });
    if (!session.authenticated) {
      lockDesk();
      return;
    }
    unlockDesk();
    await loadGuides();
  } catch {
    lockDesk();
  }
})();
