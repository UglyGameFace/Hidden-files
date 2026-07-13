const cc$ = (selector, root = document) => root.querySelector(selector);
const cc$$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const ui = {
  root: cc$('[data-control-center]'),
  loginForm: cc$('[data-login-form]'),
  title: cc$('[data-cc-section-title]'),
  description: cc$('[data-cc-section-description]'),
  saveState: cc$('[data-cc-save-state]'),
  saveDetail: cc$('[data-cc-save-detail]'),
  publish: cc$('[data-cc-publish]'),
  discard: cc$('[data-cc-discard]'),
  undo: cc$('[data-cc-undo]'),
  redo: cc$('[data-cc-redo]'),
  preview: cc$('[data-cc-preview-backdrop]'),
  previewFrame: cc$('[data-preview-device-frame]'),
  publishConfirm: cc$('[data-cc-publish-confirm]'),
  toast: cc$('[data-cc-toast]'),
  categoryStack: cc$('[data-category-stack]'),
  categoryCreateLabel: cc$('[data-category-create-label]'),
  categoryCreateShort: cc$('[data-category-create-short]'),
  categoryCreateDescription: cc$('[data-category-create-description]'),
  categoryCreateIcon: cc$('[data-category-create-icon]'),
  categoryCreateAccent: cc$('[data-category-create-accent]'),
  categoryCreateError: cc$('[data-category-create-error]'),
};

const state = {
  published: null,
  draft: null,
  sha: null,
  loaded: false,
  loading: false,
  dirty: false,
  undo: [],
  redo: [],
  activeSection: 'methods',
  lastEditPath: '',
  lastEditAt: 0,
};

const KEYS = {
  draft: 'lobby-control-center-draft-v2',
  staleDraft: 'lobby-control-center-stale-draft-v2',
  previewDevice: 'lobby-control-center-preview-device',
};

const ACCENTS = {
  lime: '#b7ff3c',
  cyan: '#55dff4',
  amber: '#ffbd4a',
  violet: '#a78bfa',
};

const CATEGORY_GLYPHS = {
  loop: '↻',
  food: '⌁',
  tag: '◇',
  spark: '✦',
  book: '▤',
  shield: '⬡',
};

const BUILTIN_CATEGORIES = new Set(['cashback-loops', 'food-hacks', 'retail-deals']);
const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
const fingerprint = (value) => JSON.stringify(value);

function storageGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function storageSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* Private browsing can disable storage. */ }
}

function storageRemove(key) {
  try { localStorage.removeItem(key); } catch { /* Ignore storage restrictions. */ }
}

function getPath(object, path) {
  return String(path).split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const parts = String(path).split('.');
  let target = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    if (target[key] == null) target[key] = /^\d+$/.test(parts[index + 1]) ? [] : {};
    target = target[key];
  }
  target[parts.at(-1)] = value;
}

function settingsRuntime() {
  if (window.LobbySettingsRuntime) return window.LobbySettingsRuntime;
  window.LobbySettingsRuntime = {
    value: null,
    promise: null,
    async get(force = false) {
      if (!force && this.value) return this.value;
      if (!force && this.promise) return this.promise;
      this.promise = request('/api/control-center-settings')
        .then((output) => {
          this.value = output;
          window.dispatchEvent(new CustomEvent('lobby-settings-loaded', { detail: output }));
          return output;
        })
        .finally(() => { this.promise = null; });
      return this.promise;
    },
    set(output) {
      this.value = output;
      window.dispatchEvent(new CustomEvent('lobby-settings-loaded', { detail: output }));
    },
    clear() {
      this.value = null;
      this.promise = null;
    },
  };
  return window.LobbySettingsRuntime;
}

function toast(message, type = 'ok') {
  if (!ui.toast) return;
  ui.toast.textContent = message;
  ui.toast.dataset.type = type;
  ui.toast.hidden = false;
  clearTimeout(window.__controlCenterToast);
  window.__controlCenterToast = setTimeout(() => { ui.toast.hidden = true; }, 4200);
}

function closeModals() {
  for (const modal of [ui.preview, ui.publishConfirm]) {
    if (!modal) continue;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('cc-modal-open');
}

function lockControlCenter() {
  closeModals();
  state.loaded = false;
  state.loading = false;
  settingsRuntime().clear();
  const app = cc$('[data-desk-app]');
  const login = cc$('[data-login-panel]');
  if (app) app.hidden = true;
  if (login) login.hidden = false;
  ui.root?.classList.remove('is-unlocked');
  updateSaveState('Session locked');
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) lockControlCenter();
    throw new Error(payload.error || `Request failed (${response.status}).`);
  }
  return payload;
}

function setSection(section) {
  const selectedTab = cc$(`[data-control-tab="${CSS.escape(section || '')}"]`);
  const resolved = selectedTab ? section : 'methods';
  state.activeSection = resolved;

  cc$$('[data-control-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.controlPanel !== resolved;
  });

  cc$$('[data-control-tab]').forEach((button) => {
    const selected = button.dataset.controlTab === resolved;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
    if (!selected) return;
    if (ui.title) ui.title.textContent = button.dataset.title || button.textContent.trim();
    if (ui.description) ui.description.textContent = button.dataset.description || '';
  });

  history.replaceState({}, '', `${window.location.pathname}#${resolved}`);
}

function saveLocalDraft() {
  if (!state.dirty || !state.draft || !state.published) {
    storageRemove(KEYS.draft);
    return;
  }
  storageSet(KEYS.draft, JSON.stringify({
    version: 2,
    baseFingerprint: fingerprint(state.published),
    settings: state.draft,
    savedAt: new Date().toISOString(),
  }));
}

function updateSaveState(detail = '') {
  state.dirty = Boolean(state.published && state.draft && fingerprint(state.published) !== fingerprint(state.draft));
  if (ui.publish) ui.publish.disabled = !state.dirty || state.loading;
  if (ui.discard) ui.discard.disabled = !state.dirty || state.loading;
  if (ui.undo) ui.undo.disabled = state.undo.length === 0 || state.loading;
  if (ui.redo) ui.redo.disabled = state.redo.length === 0 || state.loading;
  ui.root?.classList.toggle('has-draft', state.dirty);

  if (ui.saveState) ui.saveState.textContent = state.loading ? 'Working' : state.dirty ? 'Unpublished draft' : 'Published';
  if (ui.saveDetail) {
    ui.saveDetail.textContent = detail || (state.loading
      ? 'Please keep this page open'
      : state.dirty ? 'Autosaved on this device' : 'No unpublished site changes');
  }
  saveLocalDraft();
}

function pushUndo(path, force = false) {
  const now = Date.now();
  const sameTypingRun = !force && path && path === state.lastEditPath && now - state.lastEditAt < 700;
  if (!sameTypingRun && state.draft) {
    state.undo.push(clone(state.draft));
    if (state.undo.length > 50) state.undo.shift();
    state.redo = [];
  }
  state.lastEditPath = path;
  state.lastEditAt = now;
}

function mutate(path, value, forceUndo = false) {
  if (!state.draft || state.loading) return;
  pushUndo(path, forceUndo);
  setPath(state.draft, path, value);
  syncControls();
  renderPreview();
  updateSaveState();
}

function fieldValue(field) {
  if (field instanceof HTMLInputElement && field.type === 'number') {
    const value = Number.parseInt(field.value || '0', 10);
    return Number.isFinite(value) ? value : 0;
  }
  return field.value;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function categorySlug(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function categoryOptions(selected, type) {
  const values = type === 'icon'
    ? [['loop', 'Loop'], ['food', 'Food'], ['tag', 'Price tag'], ['spark', 'Spark'], ['book', 'Guide book'], ['shield', 'Shield']]
    : [['lime', 'Lobby Lime'], ['cyan', 'Signal Cyan'], ['amber', 'Alert Amber'], ['violet', 'Discord Violet']];
  return values.map(([value, label]) => `<option value="${value}"${selected === value ? ' selected' : ''}>${label}</option>`).join('');
}

function renderCategoryEditors() {
  if (!ui.categoryStack || !state.draft?.categories) return;
  const entries = Object.entries(state.draft.categories)
    .sort((left, right) => Number(left[1].order) - Number(right[1].order) || String(left[1].label).localeCompare(String(right[1].label)));

  ui.categoryStack.innerHTML = entries.map(([key, category]) => `
    <article class="cc-category-editor accent-${escapeHtml(category.accent || 'lime')}" data-category-editor="${escapeHtml(key)}">
      <header>
        <span>${escapeHtml(CATEGORY_GLYPHS[category.icon] || CATEGORY_GLYPHS.tag)}</span>
        <div><strong>${escapeHtml(category.label)}</strong><small>${BUILTIN_CATEGORIES.has(key) ? 'Core category' : 'Custom category'} · Key: ${escapeHtml(key)}</small></div>
        <button type="button" data-setting-toggle="categories.${escapeHtml(key)}.visible">${category.visible === false ? 'Hidden' : 'Visible'}</button>
      </header>
      <div class="cc-form-grid">
        <label class="cc-field"><span>Full label</span><input data-setting="categories.${escapeHtml(key)}.label" maxlength="48" value="${escapeHtml(category.label)}" /></label>
        <label class="cc-field"><span>Short label</span><input data-setting="categories.${escapeHtml(key)}.shortLabel" maxlength="20" value="${escapeHtml(category.shortLabel)}" /></label>
        <label class="cc-field cc-wide"><span>Description</span><textarea data-setting="categories.${escapeHtml(key)}.description" rows="2" maxlength="180">${escapeHtml(category.description)}</textarea></label>
        <label class="cc-field"><span>Icon</span><select data-setting="categories.${escapeHtml(key)}.icon">${categoryOptions(category.icon, 'icon')}</select></label>
        <label class="cc-field"><span>Accent</span><select data-setting="categories.${escapeHtml(key)}.accent">${categoryOptions(category.accent, 'accent')}</select></label>
        <label class="cc-field"><span>Order</span><input type="number" min="1" max="99" data-setting="categories.${escapeHtml(key)}.order" value="${Number(category.order) || 99}" /></label>
      </div>
      ${BUILTIN_CATEGORIES.has(key) ? '' : '<p class="cc-category-archive-note">Custom categories can be archived with the Visible/Hidden button without breaking older methods.</p>'}
    </article>
  `).join('');
}

function createCategoryFromPanel() {
  if (!state.draft || state.loading) return;
  const label = ui.categoryCreateLabel?.value.trim() || '';
  const key = categorySlug(label);
  const shortLabel = ui.categoryCreateShort?.value.trim() || label.slice(0, 20);
  const description = ui.categoryCreateDescription?.value.trim() || '';
  const showError = (message) => {
    if (!ui.categoryCreateError) return;
    ui.categoryCreateError.textContent = message;
    ui.categoryCreateError.hidden = false;
  };

  if (label.length < 2) return showError('Enter a category name.');
  if (!key) return showError('That name cannot create a safe category key.');
  if (state.draft.categories[key]) return showError('A category with that name already exists.');
  if (description.length < 4) return showError('Add a short description so members know what belongs here.');

  const orders = Object.values(state.draft.categories).map((category) => Number(category.order) || 0);
  pushUndo('categories', true);
  state.draft.categories[key] = {
    label: label.slice(0, 48),
    shortLabel: shortLabel.slice(0, 20) || label.slice(0, 20),
    description: description.slice(0, 180),
    visible: true,
    order: Math.min(99, Math.max(1, ...orders) + 1),
    icon: ui.categoryCreateIcon?.value || 'tag',
    accent: ui.categoryCreateAccent?.value || 'lime',
  };

  if (ui.categoryCreateLabel) ui.categoryCreateLabel.value = '';
  if (ui.categoryCreateShort) ui.categoryCreateShort.value = '';
  if (ui.categoryCreateDescription) ui.categoryCreateDescription.value = '';
  if (ui.categoryCreateIcon) ui.categoryCreateIcon.value = 'tag';
  if (ui.categoryCreateAccent) ui.categoryCreateAccent.value = 'lime';
  if (ui.categoryCreateError) ui.categoryCreateError.hidden = true;

  populateForm();
  updateSaveState('Custom category added to this draft');
  toast(`${state.draft.categories[key].label} added. Publish the site to make it available everywhere.`);
}

function syncControls() {
  if (!state.draft) return;
  cc$$('[data-setting-toggle]').forEach((button) => {
    const active = Boolean(getPath(state.draft, button.dataset.settingToggle));
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    if (button.closest('[data-category-editor]')) button.textContent = active ? 'Visible' : 'Hidden';
  });
  cc$$('[data-setting-choice]').forEach((button) => {
    const active = getPath(state.draft, button.dataset.settingChoice) === button.dataset.choiceValue;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  document.documentElement.style.setProperty('--cc-preview-accent', ACCENTS[state.draft.theme?.accentPreset] || ACCENTS.lime);
}

function populateForm() {
  if (!state.draft) return;
  renderCategoryEditors();
  cc$$('[data-setting]').forEach((field) => {
    field.value = getPath(state.draft, field.dataset.setting) ?? '';
  });
  syncControls();
  renderPreview();
}

function setText(selector, value) {
  cc$$(selector).forEach((element) => { element.textContent = String(value ?? ''); });
}

function renderPreview() {
  const settings = state.draft;
  if (!settings) return;

  const values = {
    '[data-preview-brand-mark]': settings.branding.brandMark,
    '[data-preview-brand-name]': settings.branding.name,
    '[data-preview-product-name]': settings.branding.productName,
    '[data-preview-eyebrow]': settings.homepage.eyebrow,
    '[data-preview-headline-prefix]': settings.homepage.headlinePrefix,
    '[data-preview-headline-highlight]': settings.homepage.headlineHighlight,
    '[data-preview-headline-suffix]': settings.homepage.headlineSuffix,
    '[data-preview-lead]': settings.homepage.lead,
    '[data-preview-primary]': settings.homepage.primaryCtaLabel,
    '[data-preview-secondary]': settings.homepage.secondaryCtaLabel,
    '[data-preview-terminal-status]': `SYSTEM ${settings.homepage.terminalStatus}`,
    '[data-preview-library-kicker]': settings.homepage.libraryKicker,
    '[data-preview-library-title]': settings.homepage.libraryTitle,
    '[data-preview-library-description]': settings.homepage.libraryDescription,
    '[data-preview-banner-kicker]': settings.discord.bannerKicker,
    '[data-preview-banner-title]': settings.discord.bannerTitle,
    '[data-preview-banner-button]': settings.discord.bannerButtonLabel,
    '[data-preview-footer-name]': settings.branding.name,
    '[data-preview-footer-description]': settings.footer.description,
  };
  Object.entries(values).forEach(([selector, value]) => setText(selector, value));

  const terminal = cc$('[data-preview-terminal]');
  const discord = cc$('[data-preview-discord]');
  if (terminal) terminal.hidden = !settings.homepage.showTerminal;
  if (discord) discord.hidden = !settings.homepage.showDiscordBanner;

  const categories = cc$('[data-preview-categories]');
  if (categories) {
    categories.hidden = !settings.homepage.showCategories;
    categories.innerHTML = Object.values(settings.categories)
      .filter((category) => category.visible)
      .sort((left, right) => left.order - right.order)
      .map((category) => `<span class="accent-${escapeHtml(category.accent || 'lime')}">${escapeHtml(CATEGORY_GLYPHS[category.icon] || CATEGORY_GLYPHS.tag)} ${escapeHtml(category.label)}</span>`)
      .join('');
  }

  if (ui.previewFrame) {
    ui.previewFrame.style.setProperty('--preview-accent', ACCENTS[settings.theme.accentPreset] || ACCENTS.lime);
    ui.previewFrame.dataset.density = settings.theme.density;
  }
}

function setPreviewDevice(device) {
  const resolved = ['phone', 'tablet', 'desktop'].includes(device) ? device : 'phone';
  storageSet(KEYS.previewDevice, resolved);
  if (!ui.previewFrame) return;
  ui.previewFrame.classList.remove('device-phone', 'device-tablet', 'device-desktop');
  ui.previewFrame.classList.add(`device-${resolved}`);
  cc$$('[data-preview-device]').forEach((button) => {
    const active = button.dataset.previewDevice === resolved;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

function openPreview() {
  if (!ui.preview || state.loading) return;
  renderPreview();
  ui.preview.hidden = false;
  ui.preview.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cc-modal-open');
  requestAnimationFrame(() => cc$('[data-cc-close-preview]', ui.preview)?.focus());
}

function closePreview() {
  if (ui.preview) {
    ui.preview.hidden = true;
    ui.preview.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('cc-modal-open');
}

function undo() {
  if (!state.undo.length || !state.draft || state.loading) return;
  state.redo.push(clone(state.draft));
  state.draft = state.undo.pop();
  populateForm();
  updateSaveState('Previous edit restored');
}

function redo() {
  if (!state.redo.length || !state.draft || state.loading) return;
  state.undo.push(clone(state.draft));
  state.draft = state.redo.pop();
  populateForm();
  updateSaveState('Edit reapplied');
}

function discard() {
  if (!state.published || state.loading) return;
  state.draft = clone(state.published);
  state.undo = [];
  state.redo = [];
  storageRemove(KEYS.draft);
  populateForm();
  updateSaveState('Draft discarded');
  toast('Unpublished website changes were discarded.');
}

async function publish() {
  if (!state.dirty || !state.draft || state.loading) return;
  state.loading = true;
  if (ui.publishConfirm) {
    ui.publishConfirm.hidden = true;
    ui.publishConfirm.setAttribute('aria-hidden', 'true');
  }
  document.body.classList.remove('cc-modal-open');
  updateSaveState('Publishing through GitHub and Vercel');

  try {
    const output = await request('/api/control-center-settings', {
      method: 'POST',
      body: JSON.stringify({ settings: state.draft, baseSha: state.sha }),
    });
    state.published = clone(output.settings);
    state.draft = clone(output.settings);
    state.sha = output.sha || state.sha;
    state.undo = [];
    state.redo = [];
    storageRemove(KEYS.draft);
    storageRemove(KEYS.staleDraft);
    settingsRuntime().set(output);
    populateForm();
    toast(output.message || 'Website changes published.');
    updateSaveState('Vercel deployment started');
  } catch (error) {
    toast(error.message, 'error');
    updateSaveState('Publish failed — draft is still saved locally');
  } finally {
    state.loading = false;
    updateSaveState();
  }
}

function recoverDraft(published) {
  const raw = storageGet(KEYS.draft);
  if (!raw) return clone(published);
  try {
    const saved = JSON.parse(raw);
    if (!saved?.settings) throw new Error('Invalid draft');
    if (saved.baseFingerprint === fingerprint(published)) {
      const savedAt = saved.savedAt ? new Date(saved.savedAt).toLocaleString() : 'earlier';
      toast(`Recovered your unpublished draft from ${savedAt}.`);
      return saved.settings;
    }
    storageSet(KEYS.staleDraft, raw);
    storageRemove(KEYS.draft);
    toast('An older draft was preserved separately instead of overwriting newer published changes.', 'error');
  } catch {
    storageRemove(KEYS.draft);
  }
  return clone(published);
}

async function loadSettings({ force = false } = {}) {
  if (state.loading || (state.loaded && !force)) return;
  state.loading = true;
  updateSaveState('Loading website settings');
  try {
    const output = await settingsRuntime().get(force);
    state.published = clone(output.settings);
    state.draft = recoverDraft(output.settings);
    state.sha = output.sha;
    state.undo = [];
    state.redo = [];
    state.loaded = true;
    populateForm();
  } catch (error) {
    toast(error.message, 'error');
    updateSaveState('Unable to load website settings');
  } finally {
    state.loading = false;
    updateSaveState();
  }
}

function normalizeUnlockButton() {
  const button = cc$('button[type="submit"]', ui.loginForm);
  if (button && button.textContent.trim() === 'Unlock Deal Desk') button.textContent = 'Unlock Control Center';
}

cc$$('[data-control-tab]').forEach((button) => button.addEventListener('click', () => setSection(button.dataset.controlTab)));

document.addEventListener('input', (event) => {
  const field = event.target.closest?.('[data-setting]');
  if (!field) return;
  mutate(field.dataset.setting, fieldValue(field));
});

document.addEventListener('change', (event) => {
  const field = event.target.closest?.('[data-setting]');
  if (!field) return;
  if (field instanceof HTMLSelectElement) mutate(field.dataset.setting, fieldValue(field), true);
  state.lastEditPath = '';
  state.lastEditAt = 0;
});

document.addEventListener('click', (event) => {
  const toggle = event.target.closest?.('[data-setting-toggle]');
  if (toggle) {
    const path = toggle.dataset.settingToggle;
    mutate(path, !Boolean(getPath(state.draft, path)), true);
    return;
  }
  const choice = event.target.closest?.('[data-setting-choice]');
  if (choice) mutate(choice.dataset.settingChoice, choice.dataset.choiceValue, true);
});

cc$('[data-category-create]')?.addEventListener('click', createCategoryFromPanel);
cc$$('[data-cc-open-preview]').forEach((button) => button.addEventListener('click', openPreview));
cc$$('[data-cc-close-preview]').forEach((button) => button.addEventListener('click', closePreview));
cc$$('[data-preview-device]').forEach((button) => button.addEventListener('click', () => setPreviewDevice(button.dataset.previewDevice)));
ui.undo?.addEventListener('click', undo);
ui.redo?.addEventListener('click', redo);
ui.discard?.addEventListener('click', discard);
ui.publish?.addEventListener('click', () => {
  if (!ui.publishConfirm || !state.dirty || state.loading) return;
  ui.publishConfirm.hidden = false;
  ui.publishConfirm.setAttribute('aria-hidden', 'false');
  document.body.classList.add('cc-modal-open');
  requestAnimationFrame(() => cc$('[data-cc-confirm-publish]', ui.publishConfirm)?.focus());
});
cc$('[data-cc-cancel-publish]')?.addEventListener('click', closeModals);
cc$('[data-cc-confirm-publish]')?.addEventListener('click', publish);
ui.preview?.addEventListener('click', (event) => { if (event.target === ui.preview) closePreview(); });
ui.publishConfirm?.addEventListener('click', (event) => { if (event.target === ui.publishConfirm) closeModals(); });

document.addEventListener('keydown', (event) => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing) {
    event.preventDefault();
    event.shiftKey ? redo() : undo();
  }
  if (event.key === 'Escape') closeModals();
});

window.addEventListener('beforeunload', (event) => {
  if (!state.dirty || state.loading) return;
  event.preventDefault();
  event.returnValue = '';
});
window.addEventListener('pagehide', saveLocalDraft);

setSection(window.location.hash.replace('#', '') || 'methods');
setPreviewDevice(storageGet(KEYS.previewDevice) || 'phone');
normalizeUnlockButton();

if (ui.loginForm) {
  new MutationObserver(normalizeUnlockButton).observe(ui.loginForm, { childList: true, subtree: true, characterData: true });
}

if (ui.root?.classList.contains('is-unlocked')) loadSettings();
if (ui.root) {
  new MutationObserver(() => {
    if (ui.root.classList.contains('is-unlocked')) loadSettings({ force: !state.loaded });
    else {
      closeModals();
      state.loaded = false;
    }
  }).observe(ui.root, { attributes: true, attributeFilter: ['class'] });
}
