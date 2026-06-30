/* === Voxly bootstrap ================================================= */
import { initTools, selectTool, buildHome, TOOLS, CATEGORIES } from './tools/index.js';
import { escape } from './tools/ui.js';
import * as engine from './engine.js';
import { getQuota, consumeQuota, isOverQuota, showUpgradeIfNeeded } from './quota.js';

window.__VOXLY_ENGINE__ = engine;

const stageTitle = document.getElementById('stageTitle');
const stageSub = document.getElementById('stageSubtitle');
const stage = document.getElementById('stageBody');
const toolList = document.getElementById('toolList');
const historyDrawer = document.getElementById('historyDrawer');

initTools(stage, toolList);
buildHome(stage);

function updateQuotaBadge() {
  const badge = document.getElementById('quotaBadge');
  if (!badge) return;
  const q = getQuota();
  badge.textContent = `Free: ${q.remaining}/${q.limit}`;
  badge.style.color = q.remaining === 0 ? 'var(--error)' : 'var(--ok)';
}

window.addEventListener('storage', updateQuotaBadge);
setInterval(updateQuotaBadge, 1500);
updateQuotaBadge();

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

const origSelect = selectTool;
window.selectTool = function (id) {
  const title = stageTitle;
  const sub = stageSub;
  if (title) title.textContent = `${TOOLS.find(t => t.id === id)?.icon || ''} ${TOOLS.find(t => t.id === id)?.label || id}`;
  if (sub) sub.textContent = CATEGORIES.find((c) => c.id === TOOLS.find(t => t.id === id)?.category)?.label || '';
  const body = document.getElementById('stageBody');
  body.innerHTML = `
    <div class="card mt-12" style="padding:28px 24px;text-align:center">
      <div class="skeleton" style="height:18px;width:90%;margin:8px auto;border-radius:8px"></div>
      <div class="skeleton" style="height:18px;width:70%;margin:8px auto;border-radius:8px"></div>
      <div class="skeleton" style="height:80px;width:100%;margin:18px auto;border-radius:16px"></div>
      <p style="color:var(--muted);font-size:12px;margin-top:8px">Loading tool…</p>
    </div>
  `;
  setTimeout(() => {
    try {
      MOUNTERS[id](body, {
        get tool() { return t; },
        get engine() { return window.__VOXLY_ENGINE__; },
      });
    } catch (e) {
      body.innerHTML = `
        <div class="card" style="padding:28px 24px;text-align:center">
          <div style="font-size:40px;margin-bottom:10px">⚠️</div>
          <h3 style="margin-bottom:6px">This browser doesn't support this tool yet</h3>
          <p style="color:var(--muted);font-size:13px;max-width:420px;margin:0 auto">Try a different conversion or a simpler format.</p>
          <button class="btn mt-16" id="retryToolBtn" style="margin:0 auto;display:block">Retry</button>
        </div>
      `;
      body.querySelector('#retryToolBtn')?.addEventListener('click', () => window.selectTool(id));
    }
  }, 180);
};

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

window.addEventListener('storage', () => {
  try {
    const hist = JSON.parse(localStorage.getItem('voxly_history') || '[]');
    const q = getQuota();
    const entries = hist.slice(0, 200).map((it) => ({ ...it, quotaRemaining: q.remaining }));
    localStorage.setItem('voxly_history', JSON.stringify(entries));
  } catch {}
});
