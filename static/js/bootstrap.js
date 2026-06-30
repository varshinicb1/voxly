/* === Voxly bootstrap ================================================= */
import { initTools, selectTool, buildHome, TOOLS, CATEGORIES } from './tools/index.js';
import { escape } from './tools/ui.js';
import * as engine from './engine.js';
import { getQuota } from './quota.js';

window.__VOXLY_ENGINE__ = engine;

const stageTitle = document.getElementById('stageTitle');
const stageSub = document.getElementById('stageSubtitle');
const stage = document.getElementById('stageBody');
const toolList = document.getElementById('toolList');
const historyDrawer = document.getElementById('historyDrawer');

initTools(stage, toolList);
selectTool('universal');

document.getElementById('historyBtn')?.addEventListener('click', () => {
  historyDrawer.hidden = !historyDrawer.hidden;
  historyDrawer.classList.toggle('open', !historyDrawer.hidden);
  renderHistory();
});
document.getElementById('historyClose')?.addEventListener('click', () => {
  historyDrawer.hidden = true;
  historyDrawer.classList.remove('open');
});

function renderHistory() {
  const body = document.getElementById('historyBody');
  let items = [];
  try { items = JSON.parse(localStorage.getItem('voxly_history') || '[]').slice(0, 40); } catch {}
  if (!items.length) {
    body.innerHTML = '<p style="color:var(--muted);font-size:13px">No history yet. Everything runs local.</p>';
    return;
  }
  body.innerHTML = items.map((it) => `
    <div class="history-item">
      <div><b>${escape(it.tool)}</b> <span style="color:var(--muted)">${escape(it.file)}</span></div>
      <div style="color:var(--muted);font-size:11px;margin-top:2px">${escape(it.time || '')} · ${escape(it.size || '')}</div>
    </div>
  `).join('');
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('installPwa');
  if (btn) { btn.hidden = false; btn.addEventListener('click', async () => { deferredPrompt?.prompt(); }); }
});

(function status() {
  const pill = document.getElementById('engineStatus');
  if (!pill) return;
  const hasGPU = !!('gpu' in navigator);
  const label = hasGPU ? '⚙ WebGPU + WASM ready' : '⚙ WASM ready';
  pill.textContent = label;
  pill.style.color = 'var(--ok)';
})();

const origSelect = selectTool;
window.selectTool = function (id) {
  origSelect(id);
  const q = getQuota();
  try {
    const hist = JSON.parse(localStorage.getItem('voxly_history') || '[]');
    const t = TOOLS.find((x) => x.id === id);
    hist.unshift({ tool: t?.label || id, file: '', time: new Date().toLocaleString(), size: '', quotaRemaining: q.remaining });
    localStorage.setItem('voxly_history', JSON.stringify(hist.slice(0, 200)));
  } catch {}
};

(function quotaBadge() {
  const bar = document.querySelector('.topbar-right');
  if (!bar) return;
  const badge = document.createElement('span');
  badge.id = 'quotaBadge';
  badge.style.cssText = 'font-size:11px;padding:4px 10px;border-radius:999px;background:var(--surface-2);border:1px solid var(--border);margin-left:8px;font-family:ui-monospace,monospace';
  function update() {
    const q = getQuota();
    badge.textContent = `Free: ${q.remaining}/${q.limit}`;
    badge.style.color = q.remaining === 0 ? 'var(--error)' : 'var(--muted)';
  }
  update();
  window.addEventListener('storage', update);
  setInterval(update, 2000);
  bar.appendChild(badge);
})();
