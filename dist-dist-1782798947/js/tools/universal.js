import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { runConvert } from '../workers/ffmpeg.js';

const AUTO_RULES = [
  { in: ['.pdf'], out: ['.pdf'], label: 'Image / PDF container', mime: 'application/pdf' },
  { in: ['.doc','.docx'], out: ['.pdf'], label: 'DOCX → PDF', mime: 'application/pdf' },
  { in: ['.pptx','.ppt'], out: ['.pdf'], label: 'PPT → PDF', mime: 'application/pdf' },
  { in: ['.png','.jpg','.jpeg','.webp','.avif','.gif','.bmp'], out: ['.png','.jpg','.webp','.avif','.pdf'], label: 'Image → Image / PDF', mime: 'image/*' },
  { in: ['.mp4','.webm','.mov','.avi','.mkv','.flv','.wmv','.m4v'], out: ['.mp4','.webp','.gif','.mp3'], label: 'Video → Video / Image / Audio', mime: 'video/*' },
  { in: ['.mp3','.wav','.ogg','.flac','.aac','.m4a','.wma'], out: ['.mp3','.wav','.ogg','.flac','.aac'], label: 'Audio → Any audio format', mime: 'audio/*' },
];

function detectInputCategory(file) {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  if (/\.(jpg|jpeg|png|webp|avif|gif|bmp|tiff|heic|svg)$/.test(ext)) return 'image';
  if (/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/.test(ext)) return 'video';
  if (/\.(mp3|wav|ogg|flac|aac|m4a|wma)$/.test(ext)) return 'audio';
  if (/\.(pdf)$/.test(ext)) return 'pdf';
  if (/\.(zip|tar|gz|7z)$/.test(ext)) return 'archive';
  return 'unknown';
}

function pickRule(file) {
  const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
  return AUTO_RULES.find((r) => r.in.includes(ext)) || null;
}

export async function routeConvert(file, outExt, quality, onProgress) {
  const name = String(file.name || '').toLowerCase();
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)$/.test(name)) {
    return runConvert({
      inputBytes: bytes,
      inputName: file.name,
      outputExt: outExt.replace(/^\./, ''),
      args: outExt === '.mp3' ? ['-vn', '-acodec', 'libmp3lame', '-q:a', '2'] : [],
      onProgress,
      mimeType: outExt === '.mp3' ? 'audio/mpeg' : 'video/mp4',
    });
  }
  if (/\.(mp3|wav|ogg|flac|aac|m4a|wma)$/.test(name)) {
    return runConvert({
      inputBytes: bytes,
      inputName: file.name,
      outputExt: outExt.replace(/^\./, ''),
      args: [],
      onProgress,
      mimeType: 'audio/mpeg',
    });
  }
  if (/\.(png|jpeg|jpg|webp|avif|gif|bmp)$/.test(name)) {
    return new Promise((resolve) => {
      const blob = new Blob([bytes], { type: 'image/png' });
      resolve(blob);
    });
  }
  return new Promise((resolve) => {
    const blob = new Blob([bytes], { type: 'application/octet-stream' });
    resolve(blob);
  });
}

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

  const outRow = h('div', { class: 'flex mt-12' });
  outRow.appendChild(h('span', { style: { fontSize: '12px', color: 'var(--muted)', marginRight: '8px' } }, 'Convert to:'));
  const outSel = document.createElement('select');
  outSel.style.minWidth = '220px';
  ['.mp4','.webp','.gif','.mp3','.png','.jpg','.pdf'].forEach((e) => {
    const o = document.createElement('option'); o.value = e; o.textContent = e.toUpperCase().slice(1); outSel.appendChild(o);
  });
  outRow.appendChild(outSel);
  card.appendChild(outRow);

  const actions = h('div', { class: 'flex mt-12' });
  const runBtn = h('button', { class: 'btn btn--primary', id: 'runBtn' }, '🪄 Convert now');
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
      const outExt = outSel.value;
      currentBlob = await routeConvert(currentFile, outExt, 'balanced', (p) => { fill.style.width = `${Math.round(p*100)}%`; });
      fill.style.width = '100%';
      const name = `voxly-${Date.now()}${outExt}`;
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Output: <b>${outExt.toUpperCase().slice(1)}</b></div>
        <div class="meta-chip">Size: <b>${fmtSize(currentBlob.size)}</b></div>
      `;
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, `⬇ Download ${outExt.toUpperCase().slice(1)}`);
      dlBtn.addEventListener('click', () => downloadBlob(currentBlob, name));
      dlWrap.appendChild(dlBtn);
      result.style.display = '';
      status.setText('Done ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);
}

