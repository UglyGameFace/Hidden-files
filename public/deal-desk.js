const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const E = {
  login: $('[data-login-panel]'), loginForm: $('[data-login-form]'), loginError: $('[data-login-error]'), app: $('[data-desk-app]'),
  editor: $('[data-editor]'), empty: $('[data-empty-editor]'), selected: $('[data-selected-label]'), selectedLive: $('[data-selected-live]'),
  liveDot: $('[data-live-dot]'), liveLabel: $('[data-live-label]'), liveDetail: $('[data-live-detail]'), liveSummary: $('[data-live-control-summary]'),
  mode: $('[data-editor-mode]'), title: $('[data-editor-title]'), id: $('[data-editor-id]'), public: $('[data-open-public]'), quick: $('[data-quick-controls]'),
  picker: $('[data-picker-backdrop]'), search: $('[data-picker-search]'), list: $('[data-method-list]'), pickerEmpty: $('[data-picker-empty]'),
  pickerCount: $('[data-picker-result-count]'), confirm: $('[data-confirm-backdrop]'), confirmTitle: $('[data-confirm-title]'),
  confirmCopy: $('[data-confirm-copy]'), confirmGo: $('[data-confirm-go]'), toast: $('[data-desk-toast]'), feature: $('[data-feature-toggle]'), draft: $('[data-draft-toggle]'),
};
const S = { guides: [], selectedId: null, working: null, category: 'food-hacks', featured: false, draft: false, filter: 'all', confirm: null };

async function api(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { if (response.status === 401) lock(); throw new Error(data.error || `Request failed (${response.status}).`); }
  return data;
}
function notify(message, type = 'ok') {
  if (!E.toast) return; E.toast.textContent = message; E.toast.dataset.type = type; E.toast.hidden = false;
  clearTimeout(window.__deskToast); window.__deskToast = setTimeout(() => { E.toast.hidden = true; }, 4200);
}
function lock() { if (E.app) E.app.hidden = true; if (E.login) E.login.hidden = false; closePicker(); closeConfirm(); }
function unlock() { if (E.login) E.login.hidden = true; if (E.app) E.app.hidden = false; }
function status(g) { const l = g?.live || {}; return l.expiresAt && Date.parse(l.expiresAt) <= Date.now() ? 'expired' : (l.status || 'active'); }
function expiring(g) { const d = g?.live?.expiresAt ? Date.parse(g.live.expiresAt) - Date.now() : 0; return status(g) === 'active' && d > 0 && d <= 21600000; }
function remain(iso) { const d = Date.parse(iso) - Date.now(); if (d <= 0) return 'Expired now'; const m = Math.ceil(d / 60000); if (m < 60) return `Expires in ${m}m`; const h = Math.ceil(m / 60); return h < 48 ? `Expires in ${h}h` : `Expires in ${Math.ceil(h / 24)}d`; }
function label(g) { return status(g) === 'expired' ? 'Expired' : status(g) === 'paused' ? 'Paused' : expiring(g) ? 'Expiring soon' : 'Active'; }
function esc(v) { return String(v ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[c]); }

function renderStats() {
  const counts = {
    all: S.guides.length,
    active: S.guides.filter(g => status(g) === 'active' && !expiring(g)).length,
    expiring: S.guides.filter(expiring).length,
    paused: S.guides.filter(g => status(g) === 'paused').length,
    expired: S.guides.filter(g => status(g) === 'expired').length,
  };
  for (const key of ['active','expiring','paused','expired']) { const el = $(`[data-stat-${key}]`); if (el) el.textContent = counts[key]; }
  $$('[data-filter-count]').forEach(el => { el.textContent = counts[el.dataset.filterCount] ?? 0; });
}
function passes(g) {
  if (S.filter === 'expiring') return expiring(g);
  if (S.filter === 'active') return status(g) === 'active' && !expiring(g);
  return S.filter === 'all' || status(g) === S.filter;
}
function renderPicker() {
  if (!E.list) return;
  const q = E.search?.value.trim().toLowerCase() || '';
  const rows = S.guides.filter(g => passes(g) && (!q || [g.title,g.description,g.id,g.category,...(g.keywords||[])].join(' ').toLowerCase().includes(q)));
  E.list.innerHTML = rows.map(g => `<button type="button" class="desk-method-option status-${status(g)}${expiring(g)?' is-expiring':''}" data-method-id="${esc(g.id)}">
    <span class="method-status-dot"></span><span class="method-option-copy"><small>${esc(g.category.replaceAll('-',' '))}</small><strong>${esc(g.title)}</strong><em>${esc(g.description)}</em></span>
    <span class="method-option-meta"><b>${esc(label(g))}</b><small>${g.live?.expiresAt?esc(remain(g.live.expiresAt)):'No auto-expiration'}</small><i>Choose →</i></span></button>`).join('');
  if (E.pickerCount) E.pickerCount.textContent = `${rows.length} method${rows.length===1?'':'s'}`;
  if (E.pickerEmpty) E.pickerEmpty.hidden = rows.length !== 0;
  $$('[data-method-id]', E.list).forEach(b => b.onclick = () => select(b.dataset.methodId));
}
function toggle(el, active, yes, no) { if (!el) return; el.classList.toggle('active',active); el.ariaPressed=String(active); const b=$('b',el); if(b)b.textContent=active?yes:no; }
function renderLive(g) {
  const isNew = !g.id; if (E.quick) E.quick.hidden=isNew; if(E.selectedLive)E.selectedLive.hidden=isNew; if(isNew)return;
  const st=status(g); if(E.selectedLive)E.selectedLive.dataset.status=st; if(E.liveDot)E.liveDot.dataset.status=st;
  if(E.liveLabel)E.liveLabel.textContent=label(g); const details=[]; if(g.live?.expiresAt)details.push(remain(g.live.expiresAt)); if(g.live?.verifiedAt)details.push(`Verified ${new Date(g.live.verifiedAt).toLocaleString()}`);
  if(E.liveDetail)E.liveDetail.textContent=details.join(' • ')||'No expiration set'; if(E.liveSummary)E.liveSummary.textContent=g.live?.expiresAt?remain(g.live.expiresAt):label(g);
}
function populate(g) {
  if (!(E.editor instanceof HTMLFormElement)) return; S.working=structuredClone(g); S.selectedId=g.id||null; S.category=g.category||'food-hacks'; S.featured=!!g.featured; S.draft=!!g.draft;
  if(E.empty)E.empty.hidden=true; E.editor.hidden=false; if(E.selected)E.selected.textContent=g.title||'New method'; if(E.mode)E.mode.textContent=g.id?'Edit method':'Create method';
  if(E.title)E.title.textContent=g.title||'New method'; if(E.id)E.id.textContent=g.id?`Guide ID: ${g.id}`:'A guide ID will be generated from the title.';
  const f=E.editor.elements; for(const [n,v] of Object.entries({title:g.title||'',description:g.description||'',badge:g.badge||'',readTime:g.readTime||'5 min',keywords:(g.keywords||[]).join(', '),order:String(g.order??999),body:g.body||''})) f.namedItem(n).value=v;
  $$('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===S.category)); toggle(E.feature,S.featured,'Featured','Not featured'); toggle(E.draft,S.draft,'Hidden draft','Public'); renderLive(g);
  if(E.public){E.public.hidden=!g.id;E.public.onclick=g.id?()=>window.open(`/guides/${g.id}/`,'_blank','noopener'):null;}
}
function select(id) { const g=S.guides.find(x=>x.id===id); if(!g)return; populate(g); closePicker(); E.editor?.scrollIntoView({behavior:'smooth',block:'start'}); }
function createNew() { populate({id:'',title:'',description:'',category:'food-hacks',featured:false,draft:false,badge:'New',keywords:[],published:new Date().toISOString().slice(0,10),readTime:'4 min',order:20,body:'## The deal\n\nDescribe the method.\n\n## Steps\n\n1. Add the first step.\n2. Add the next step.\n\n## Important notes\n\nAdd expiration details and restrictions.',live:{status:'active',expiresAt:null,verifiedAt:null}}); closePicker(); }
function openPicker(){if(!E.picker)return;renderPicker();E.picker.hidden=false;document.body.classList.add('desk-modal-open');setTimeout(()=>E.search?.focus(),30);}
function closePicker(){if(E.picker)E.picker.hidden=true;if(!E.confirm||E.confirm.hidden)document.body.classList.remove('desk-modal-open');}
function openConfirm(title,copy,action,text='Confirm'){S.confirm=action;if(E.confirmTitle)E.confirmTitle.textContent=title;if(E.confirmCopy)E.confirmCopy.textContent=copy;if(E.confirmGo)E.confirmGo.textContent=text;if(E.confirm)E.confirm.hidden=false;document.body.classList.add('desk-modal-open');}
function closeConfirm(){S.confirm=null;if(E.confirm)E.confirm.hidden=true;if(!E.picker||E.picker.hidden)document.body.classList.remove('desk-modal-open');}
async function setLive(st,expiresAt=null,verifiedAt=null){if(!S.selectedId)return;const out=await api('/api/deal-desk-status',{method:'POST',body:JSON.stringify({id:S.selectedId,status:st,expiresAt,verifiedAt})});const g=S.guides.find(x=>x.id===S.selectedId);if(g)g.live=out.live;if(S.working)S.working.live=out.live;renderStats();renderPicker();renderLive(S.working);notify(`${S.working?.title||'Method'} is now ${st}.`);}
async function load(){const out=await api('/api/deal-desk-guides');S.guides=out.guides||[];renderStats();renderPicker();if(S.selectedId){const g=S.guides.find(x=>x.id===S.selectedId);if(g)populate(g);}}

E.loginForm?.addEventListener('submit',async e=>{e.preventDefault();E.loginError.hidden=true;const b=$('button[type="submit"]',E.loginForm);b.disabled=true;b.textContent='Unlocking...';try{await api('/api/deal-desk-session',{method:'POST',body:JSON.stringify({password:new FormData(E.loginForm).get('password')})});unlock();await load();E.loginForm.reset();}catch(err){E.loginError.textContent=err.message;E.loginError.hidden=false;}finally{b.disabled=false;b.textContent='Unlock Deal Desk';}});
$$('[data-open-picker]').forEach(b=>b.onclick=openPicker);$$('[data-close-picker]').forEach(b=>b.onclick=closePicker);$$('[data-new-method]').forEach(b=>b.onclick=createNew);E.search?.addEventListener('input',renderPicker);
$$('[data-picker-filter]').forEach(b=>b.onclick=()=>{S.filter=b.dataset.pickerFilter;$$('[data-picker-filter]').forEach(x=>x.classList.toggle('active',x===b));renderPicker();});
$$('[data-category]').forEach(b=>b.onclick=()=>{S.category=b.dataset.category;$$('[data-category]').forEach(x=>x.classList.toggle('active',x===b));});
E.feature?.addEventListener('click',()=>{S.featured=!S.featured;toggle(E.feature,S.featured,'Featured','Not featured');});E.draft?.addEventListener('click',()=>{S.draft=!S.draft;toggle(E.draft,S.draft,'Hidden draft','Public');});
$$('[data-extend-hours]').forEach(b=>b.onclick=async()=>{try{const h=Number(b.dataset.extendHours);await setLive('active',new Date(Date.now()+h*3600000).toISOString(),new Date().toISOString());}catch(e){notify(e.message,'error');}});
$$('[data-status-action]').forEach(b=>b.onclick=async()=>{const a=b.dataset.statusAction;if(a==='expire')return openConfirm('Expire this method now?',`${S.working?.title||'This method'} will disappear from the public library immediately.`,async()=>{closeConfirm();try{await setLive('expired',new Date().toISOString(),S.working?.live?.verifiedAt||null);}catch(e){notify(e.message,'error');}},'Expire now');try{if(a==='pause')await setLive('paused',S.working?.live?.expiresAt||null,S.working?.live?.verifiedAt||null);if(a==='verify'){const x=S.working?.live?.expiresAt&&Date.parse(S.working.live.expiresAt)>Date.now()?S.working.live.expiresAt:null;await setLive('active',x,new Date().toISOString());}}catch(e){notify(e.message,'error');}});
E.confirmGo?.addEventListener('click',()=>S.confirm?.());$('[data-confirm-back]')?.addEventListener('click',closeConfirm);
E.editor?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(E.editor),save=$('[data-save-method]');save.disabled=true;save.textContent='Saving...';try{const out=await api('/api/deal-desk-save',{method:'POST',body:JSON.stringify({id:S.selectedId||'',title:f.get('title'),description:f.get('description'),category:S.category,featured:S.featured,draft:S.draft,badge:f.get('badge'),readTime:f.get('readTime'),keywords:f.get('keywords'),order:f.get('order'),published:S.working?.published||new Date().toISOString().slice(0,10),body:f.get('body')})});S.selectedId=out.guide.id;notify(out.message);await load();}catch(err){notify(err.message,'error');}finally{save.disabled=false;save.textContent='Save method';}});
$('[data-refresh]')?.addEventListener('click',()=>load().then(()=>notify('Deal Desk refreshed.')).catch(e=>notify(e.message,'error')));$('[data-logout]')?.addEventListener('click',async()=>{try{await api('/api/deal-desk-session',{method:'DELETE',body:'{}'});}catch{}lock();});
E.picker?.addEventListener('click',e=>{if(e.target===E.picker)closePicker();});E.confirm?.addEventListener('click',e=>{if(e.target===E.confirm)closeConfirm();});document.addEventListener('keydown',e=>{if(e.key==='Escape')!E.confirm?.hidden?closeConfirm():closePicker();});
(async()=>{try{const s=await api('/api/deal-desk-session',{method:'GET',headers:{}});if(!s.authenticated)return lock();unlock();await load();}catch{lock();}})();
