import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';

const PRESETS = [
  { label: 'Universal converter', id: 'universal' },
];

export default function mount(root) {
  root.innerHTML = '';
  const card = h('div', { class: 'card' });
  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  }, '*/*');
  const info = h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, '');
  card.appendChild(info);

  const actions = h('div', { class: 'flex mt-12' });
  const runBtn = h('button', { class: 'btn btn--primary', id: 'runBtn' }, '🪄 Analyse');
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
  const hint = h('div', { class: 'card mt-12', style: { color: 'var(--muted)' } }, 'Use a dedicated tool for best results. This mode auto-detects input category.');
  result.appendChild(hint);
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
      await new Promise((r) => setTimeout(r, 700));
      fill.style.width = '100%';
      const ext = (currentFile.name.split('.').pop() || '').toLowerCase();
      const category = guessCategory(ext);
      meta.innerHTML = `
        <div class="meta-chip">File: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Category: <b>${category}</b></div>
      `;
      dlWrap.innerHTML = '';
      const openBtn = h('button', { class: 'btn' }, '👁 Inspect locally');
      openBtn.addEventListener('click', () => window.open(URL.createObjectURL(currentFile), '_blank'));
      dlWrap.appendChild(openBtn);
      result.style.display = '';
      status.setText('Detected ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);
}

function guessCategory(ext) {
  if (['mp4','webm','mov','avi','mkv','flv','wmv','m4v'].includes(ext)) return 'Video';
  if (['mp3','wav','ogg','flac','aac','m4a','wma'].includes(ext)) return 'Audio';
  if (['pdf'].includes(ext)) return 'PDF';
  if (['docx','doc','pptx','ppt','xlsx','xls','csv','md','txt'].includes(ext)) return 'Document';
  if (['stl','obj','glb','gltf'].includes(ext)) return '3D model';
  if (['png','jpg','jpeg','webp','avif','gif','bmp','tiff','heic','svg'].includes(ext)) return 'Image';
  if (['zip','tar','gz','7z'].includes(ext)) return 'Archive';
  return 'Unknown';
}
