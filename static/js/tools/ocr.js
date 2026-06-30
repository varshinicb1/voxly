import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { tesseract } from '../engine.js';

const PRESETS = [
  { label: 'Image → Text', id: 'image-text' },
  { label: 'PDF → Text', id: 'pdf-text' },
];

export default function mount(root) {
  root.innerHTML = '';
  const card = h('div', { class: 'card' });
  const presetRow = h('div', { class: 'grid grid-3 mt-12' });
  let picked = PRESETS[0];
  for (const p of PRESETS) {
    const b = h('button', { class: 'btn', 'data-p': p.id }, p.label);
    b.addEventListener('click', () => {
      picked = p;
      document.querySelectorAll('[data-p]').forEach((x) => x.classList.remove('btn--primary'));
      b.classList.add('btn--primary');
      input.accept = picked.id === 'pdf-text' ? 'application/pdf,.pdf' : 'image/*,.png,.jpg,.jpeg,.webp';
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const accept = 'image/*,.png,.jpg,.jpeg,.webp,application/pdf,.pdf';
  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  }, accept);
  const info = h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, '');
  card.appendChild(info);

  const actions = h('div', { class: 'flex mt-12' });
  const runBtn = h('button', { class: 'btn btn--primary', id: 'runBtn' }, '▶ Scan');
  actions.appendChild(runBtn);
  card.appendChild(actions);

  const prog = h('div', { class: 'progress mt-12', style: { display: 'none' } });
  const fill = h('span', { style: { width: '0%' } });
  prog.appendChild(fill);
  card.appendChild(prog);
  const status = statusBox('Ready');
  card.appendChild(status.el);

  const result = h('div', { class: 'result-card mt-16 hidden' });
  const meta = h('div', { class: 'result-meta' });
  result.appendChild(meta);
  const body = h('div', { class: 'card mt-12', style: { whiteSpace: 'pre-wrap' } });
  result.appendChild(body);
  const dlWrap = h('div', { class: 'flex mt-12' });
  result.appendChild(dlWrap);
  card.appendChild(result);
  root.appendChild(card);

  let currentFile = null;
  input.addEventListener('change', () => {
    const f = input.files?.[0]; if (!f) return;
    currentFile = f; info.textContent = `${f.name} · ${fmtSize(f.size)}`; result.style.display = 'none';
  });

  async function run() {
    if (isOverQuota()) { showUpgradeIfNeeded(); return; }
    if (!currentFile) { status.setText('Pick a file', 'error'); return; }
    runBtn.disabled = true; prog.style.display = ''; fill.style.width = '5%'; result.style.display = 'none';
    try {
      const mod = await tesseract();
      const resultData = await mod.recognize(currentFile);
      const text = resultData?.data?.text || '';
      fill.style.width = '100%';
      const name = `voxly-ocr-${Date.now()}.txt`;
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
      `;
      body.textContent = text || 'No readable text found.';
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, '⬇ Download TXT');
      dlBtn.addEventListener('click', () => downloadBlob(new Blob([text], { type: 'text/plain' }), name));
      dlWrap.appendChild(dlBtn);
      result.style.display = '';
      status.setText('Done ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);
}
