const cc$ = (selector, root = document) => root.querySelector(selector);
const cc$$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const control = {
  root: cc$('[data-control-center]'),
  form: cc$('[data-site-settings-form]'),
  sectionTitle: cc$('[data-cc-section-title]'),
  sectionDescription: cc$('[data-cc-section-description]'),
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
};

const controlState = {
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

const LOCAL_DRAFT_KEY = 'lobby-control-center-draft-v1';
const accentValues = {
  lime: '#b7ff3c',
  cyan: '#55dff4',
  amber: '#ffbd4a',
  violet: '#a78bfa',
};

function deepClone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function stable(value) {
  return JSON.stringify(value);
}

function getPath(object, path) {
  return String(path).split('.').reduce((value, key) => value?.[key], object);
}

function setPath(object, path, value) {
  const parts = String(path).split('.');
  let current = object;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    const nextKey = parts[index + 1];
    if (current[key] == null) current[key] = /^\d+$/.test(nextKey) ? [] : {};
    current = current[key];
  }
  current[parts.at(-1)] = value;
}

async function controlApi(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status}).`);
  return payload;
}

function controlToast(message, type = 'ok') {
  if (!control.toast) return;
  control.toast.textContent = message;
  control.toast.dataset.type = type;
  control.toast.hidden = false;
  clearTimeout(window.__controlToast);
  window.__controlToast = setTimeout(() => {
    control.toast.hidden = true;
  }, 4200);
}

function setText(selector, value) {
  cc$$(selector).forEach((element) => {
    element.textContent = String(value ?? '');
  });
}

function setSection(section) {
  controlState.activeSection = section;
  cc$$('[data-control-panel]').forEach((panel) => {
    panel.hidden = panel.dataset.controlPanel !== section;
  });
  cc$$('[data-control-tab]').forEach((button) => {
    const selected = button.dataset.controlTab === section;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
    if (selected) {
      if (control.sectionTitle) control.sectionTitle.textContent = button.dataset.title || button.textContent.trim();
      if (control.sectionDescription) control.sectionDescription.textContent = button.dataset.description || '';
    }
  });
  history.replaceState({}, '', `${window.location.pathname}#${section}`);
}

function saveLocalDraft() {
  if (!controlState.dirty || !controlState.draft) {
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    return;
  }
  localStorage.setItem(LOCAL_DRAFT_KEY, JSON.stringify({
    settings: controlState.draft,
    savedAt: new Date().toISOString(),
  }));
}

function updateSaveState(detailOverride = '') {
  controlState.dirty = Boolean(
    controlState.published
    && controlState.draft
    && stable(controlState.published) !== stable(controlState.draft),
  );

  if (control.publish) control.publish.disabled = !controlState.dirty || controlState.loading;
  if (control.discard) control.discard.disabled = !controlState.dirty || controlState.loading;
  if (control.undo) control.undo.disabled = controlState.undo.length === 0 || controlState.loading;
  if (control.redo) control.redo.disabled = controlState.redo.length === 0 || controlState.loading;
  control.root?.classList.toggle('has-draft', controlState.dirty);

  if (control.saveState) {
    control.saveState.textContent = controlState.loading
      ? 'Working'
      : controlState.dirty ? 'Unpublished draft' : 'Published';
  }
  if (control.saveDetail) {
    control.saveDetail.textContent = detailOverride || (
      controlState.loading
        ? 'Please keep this page open'
        : controlState.dirty
          ? 'Autosaved on this device'
          : 'No unpublished site changes'
    );
  }

  saveLocalDraft();
}

function pushUndo(force = false, path = '') {
  const now = Date.now();
  const sameTypingRun = !force
    && path
    && path === controlState.lastEditPath
    && now - controlState.lastEditAt < 700;

  if (!sameTypingRun && controlState.draft) {
    controlState.undo.push(deepClone(controlState.draft));
    if (controlState.undo.length > 50) controlState.undo.shift();
    controlState.redo = [];
  }
  controlState.lastEditPath = path;
  controlState.lastEditAt = now;
}

function mutateSetting(path, value, { forceUndo = false } = {}) {
  if (!controlState.draft) return;
  pushUndo(forceUndo, path);
  setPath(controlState.draft, path, value);
  syncControls();
  renderPreview();
  updateSaveState();
}

function inputValue(element) {
  if (element instanceof HTMLInputElement && element.type === 'number') {
    return Number.parseInt(element.value || '0', 10);
  }
  return element.value;
}

function populateForm() {
  if (!controlState.draft) return;
  cc$$('[data-setting]').forEach((field) => {
    const value = getPath(controlState.draft, field.dataset.setting);
    field.value = value ?? '';
  });
  syncControls();
  renderPreview();
}

function syncControls() {
  if (!controlState.draft) return;

  cc$$('[data-setting-toggle]').forEach((button) => {
    const active = Boolean(getPath(controlState.draft, button.dataset.settingToggle));
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
    if (button.closest('[data-category-editor]')) button.textContent = active ? 'Visible' : 'Hidden';
  });

  cc$$('[data-setting-choice]').forEach((button) => {
    const active = getPath(controlState.draft, button.dataset.settingChoice) === button.dataset.choiceValue;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const accent = accentValues[controlState.draft.theme?.accentPreset] || accentValues.lime;
  document.documentElement.style.setProperty('--cc-preview-accent', accent);
}

function renderPreview() {
  const settings = controlState.draft;
  if (!settings) return;

  setText('[data-preview-brand-mark]', settings.branding.brandMark);
  setText('[data-preview-brand-name]', settings.branding.name);
  setText('[data-preview-product-name]', settings.branding.productName);
  setText('[data-preview-eyebrow]', settings.homepage.eyebrow);
  setText('[data-preview-headline-prefix]', settings.homepage.headlinePrefix);
  setText('[data-preview-headline-highlight]', settings.homepage.headlineHighlight);
  setText('[data-preview-headline-suffix]', settings.homepage.headlineSuffix);
  setText('[data-preview-lead]', settings.homepage.lead);
  setText('[data-preview-primary]', settings.homepage.primaryCtaLabel);
  setText('[data-preview-secondary]', settings.homepage.secondaryCtaLabel);
  setText('[data-preview-terminal-status]', `SYSTEM ${settings.homepage.terminalStatus}`);
  setText('[data-preview-library-kicker]', settings.homepage.libraryKicker);
  setText('[data-preview-library-title]', settings.homepage.libraryTitle);
  setText('[data-preview-library-description]', settings.homepage.libraryDescription);
  setText('[data-preview-banner-kicker]', settings.discord.bannerKicker);
  setText('[data-preview-banner-title]', settings.discord.bannerTitle);
  setText('[data-preview-banner-button]', settings.discord.bannerButtonLabel);
  setText('[data-preview-footer-name]', settings.branding.name);
  setText('[data-preview-footer-description]', settings.footer.description);

  const terminal = cc$('[data-preview-terminal]');
  if (terminal) terminal.hidden = !settings.homepage.showTerminal;
  const discord = cc$('[data-preview-discord]');
  if (discord) discord.hidden = !settings.homepage.showDiscordBanner;

  const categories = cc$('[data-preview-categories]');
  if (categories) {
    categories.hidden = !settings.homepage.showCategories;
    categories.innerHTML = Object.values(settings.categories)
      .filter((category) => category.visible)
      .sort((a, b) => a.order - b.order)
      .map((category) => `<span>${escapePreview(category.label)}</span>`)
      .join('');
  }

  const accent = accentValues[settings.theme.accentPreset] || accentValues.lime;
  if (control.previewFrame) {
    control.previewFrame.style.setProperty('--preview-accent', accent);
    control.previewFrame.dataset.density = settings.theme.density;
  }
}

function escapePreview(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function openPreview() {
  if (!control.preview) return;
  renderPreview();
  control.preview.hidden = false;
  document.body.classList.add('cc-modal-open');
}

function closePreview() {
  if (control.preview) control.preview.hidden = true;
  document.body.classList.remove('cc-modal-open');
}

function setPreviewDevice(device) {
  if (!control.previewFrame) return;
  control.previewFrame.classList.remove('device-phone', 'device-tablet', 'device-desktop');
  control.previewFrame.classList.add(`device-${device}`);
  cc$$('[data-preview-device]').forEach((button) => {
    button.classList.toggle('active', button.dataset.previewDevice === device);
  });
}

function undoDraft() {
  if (!controlState.undo.length || !controlState.draft) return;
  controlState.redo.push(deepClone(controlState.draft));
  controlState.draft = controlState.undo.pop();
  populateForm();
  updateSaveState('Previous edit restored');
}

function redoDraft() {
  if (!controlState.redo.length || !controlState.draft) return;
  controlState.undo.push(deepClone(controlState.draft));
  controlState.draft = controlState.redo.pop();
  populateForm();
  updateSaveState('Edit reapplied');
}

function discardDraft() {
  if (!controlState.published) return;
  controlState.draft = deepClone(controlState.published);
  controlState.undo = [];
  controlState.redo = [];
  localStorage.removeItem(LOCAL_DRAFT_KEY);
  populateForm();
  updateSaveState('Draft discarded');
  controlToast('Unpublished website changes were discarded.');
}

async function publishDraft() {
  if (!controlState.dirty || !controlState.draft) return;
  controlState.loading = true;
  updateSaveState('Publishing through GitHub and Vercel');
  if (control.publishConfirm) control.publishConfirm.hidden = true;

  try {
    const output = await controlApi('/api/control-center-settings', {
      method: 'POST',
      body: JSON.stringify({ settings: controlState.draft }),
    });
    controlState.published = deepClone(output.settings);
    controlState.draft = deepClone(output.settings);
    controlState.undo = [];
    controlState.redo = [];
    localStorage.removeItem(LOCAL_DRAFT_KEY);
    populateForm();
    controlToast(output.message || 'Website changes published.');
    updateSaveState('Vercel deployment started');
  } catch (error) {
    controlToast(error.message, 'error');
    updateSaveState('Publish failed — draft is still saved locally');
  } finally {
    controlState.loading = false;
    updateSaveState();
  }
}

async function loadSettings() {
  if (controlState.loading || controlState.loaded) return;
  controlState.loading = true;
  updateSaveState('Loading website settings');
  try {
    const output = await controlApi('/api/control-center-settings');
    controlState.published = deepClone(output.settings);
    controlState.draft = deepClone(output.settings);
    controlState.sha = output.sha;

    const local = localStorage.getItem(LOCAL_DRAFT_KEY);
    if (local) {
      try {
        const saved = JSON.parse(local);
        if (saved?.settings && stable(saved.settings) !== stable(output.settings)) {
          controlState.draft = saved.settings;
          controlToast('Recovered your unpublished local draft.');
        }
      } catch {
        localStorage.removeItem(LOCAL_DRAFT_KEY);
      }
    }

    controlState.loaded = true;
    populateForm();
    updateSaveState();
  } catch (error) {
    controlToast(error.message, 'error');
    updateSaveState('Unable to load website settings');
  } finally {
    controlState.loading = false;
    updateSaveState();
  }
}

cc$$('[data-control-tab]').forEach((button) => {
  button.addEventListener('click', () => setSection(button.dataset.controlTab));
});

cc$$('[data-setting]').forEach((field) => {
  field.addEventListener('input', () => mutateSetting(field.dataset.setting, inputValue(field)));
  field.addEventListener('change', () => {
    controlState.lastEditPath = '';
    controlState.lastEditAt = 0;
  });
});

cc$$('[data-setting-toggle]').forEach((button) => {
  button.addEventListener('click', () => {
    const path = button.dataset.settingToggle;
    mutateSetting(path, !Boolean(getPath(controlState.draft, path)), { forceUndo: true });
  });
});

cc$$('[data-setting-choice]').forEach((button) => {
  button.addEventListener('click', () => {
    mutateSetting(button.dataset.settingChoice, button.dataset.choiceValue, { forceUndo: true });
  });
});

cc$$('[data-cc-open-preview]').forEach((button) => button.addEventListener('click', openPreview));
cc$$('[data-cc-close-preview]').forEach((button) => button.addEventListener('click', closePreview));
cc$$('[data-preview-device]').forEach((button) => button.addEventListener('click', () => setPreviewDevice(button.dataset.previewDevice)));

control.undo?.addEventListener('click', undoDraft);
control.redo?.addEventListener('click', redoDraft);
control.discard?.addEventListener('click', discardDraft);
control.publish?.addEventListener('click', () => {
  if (control.publishConfirm) {
    control.publishConfirm.hidden = false;
    document.body.classList.add('cc-modal-open');
  }
});
cc$('[data-cc-cancel-publish]')?.addEventListener('click', () => {
  if (control.publishConfirm) control.publishConfirm.hidden = true;
  document.body.classList.remove('cc-modal-open');
});
cc$('[data-cc-confirm-publish]')?.addEventListener('click', publishDraft);

control.preview?.addEventListener('click', (event) => {
  if (event.target === control.preview) closePreview();
});
control.publishConfirm?.addEventListener('click', (event) => {
  if (event.target === control.publishConfirm) {
    control.publishConfirm.hidden = true;
    document.body.classList.remove('cc-modal-open');
  }
});

document.addEventListener('keydown', (event) => {
  const typing = event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z' && !typing) {
    event.preventDefault();
    if (event.shiftKey) redoDraft();
    else undoDraft();
  }
  if (event.key === 'Escape') {
    if (control.preview && !control.preview.hidden) closePreview();
    if (control.publishConfirm && !control.publishConfirm.hidden) {
      control.publishConfirm.hidden = true;
      document.body.classList.remove('cc-modal-open');
    }
  }
});

const requestedSection = window.location.hash.replace('#', '');
if (cc$(`[data-control-tab="${CSS.escape(requestedSection)}"]`)) setSection(requestedSection);
else setSection('methods');

if (control.root?.classList.contains('is-unlocked')) loadSettings();
const unlockObserver = new MutationObserver(() => {
  if (control.root?.classList.contains('is-unlocked')) loadSettings();
});
if (control.root) unlockObserver.observe(control.root, { attributes: true, attributeFilter: ['class'] });
