/* === Image tools ========================================================= */
import { h, dropzone, statusBox, escape, fmtSize } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';

const FORMATS = [
  { ext: '.png', mime: 'image/png', label: 'PNG' },
  { ext: '.jpg', mime: 'image/jpeg', label: 'JPG' },
  { ext: '.webp', mime: 'image/webp', label: 'WebP' },
  { ext: '.avif', mime: 'image/avif', label: 'AVIF' },
  { ext: '.gif', mime: 'image/gif', label: 'GIF' },
  { ext: '.bmp', mime: 'image/bmp', label: 'BMP' },
  { ext: '.pdf', mime: 'application/pdf', label: 'PDF' },
];

const PRESETS = [
  { label: 'Convert format', id: 'convert' },
  { label: 'Resize', id: 'resize' },
  { label: 'Compress', id: 'compress' },
  { label: 'Rotate 90°', id: 'rotate' },
  { label: 'Watermark', id: 'watermark' },
  { label: 'Remove background', id: 'bgremove' },
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
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)} · ${f.type || 'image'}`;
    result.style.display = 'none';
  }, 'image/*,.jpg,.jpeg,.png,.webp,.avif,.heic,.gif,.bmp,.tiff,.svg');
  const info = h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, '');
  card.appendChild(info);

  const outRow = h('div', { class: 'flex mt-12' });
  outRow.appendChild(h('span', { style: { fontSize: '12px', color: 'var(--muted)', marginRight: '8px' } }, 'Output:'));
  const outSel = document.createElement('select');
  FORMATS.forEach((f) => { const o = document.createElement('option'); o.value = f.ext; o.textContent = f.label; outSel.appendChild(o); });
  outRow.appendChild(outSel);
  card.appendChild(outRow);

  const actions = h('div', { class: 'flex mt-12' });
  const runBtn = h('button', { class: 'btn btn--primary', id: 'runBtn' }, '▶ Process');
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
  let currentBlob = null;
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
      const fmt = FORMATS.find((x) => x.ext === outExt) || FORMATS[0];
      const bitmap = await createImageBitmap(currentFile);
      const canvas = document.createElement('canvas');
      let w = bitmap.width, h = bitmap.height;
      if (picked.id === 'resize') { w = Math.round(w * 0.5); h = Math.round(h * 0.5); }
      if (picked.id === 'rotate') { canvas.width = h; canvas.height = w; }
      else { canvas.width = w; canvas.height = h; }
      const ctx = canvas.getContext('2d');
      if (picked.id === 'watermark') {
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.font = '24px sans-serif';
        ctx.fillText('Voxly', 20, h - 20);
      }
      if (picked.id === 'bgremove') {
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      if (picked.id === 'rotate') { ctx.translate(w, 0); ctx.rotate(Math.PI / 2); }
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const q = picked.id === 'compress' ? 0.6 : 0.92;
      const blob = await new Promise((res) => canvas.toBlob(res, fmt.mime, q));
      fill.style.width = '100%';
      currentBlob = blob;
      const name = `voxly-img-${Date.now()}${outExt}`;
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
        <div class="meta-chip">Size: <b>${fmtSize(blob.size)}</b></div>
      `;
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, `⬇ Download ${fmt.label}`);
      dlBtn.addEventListener('click', () => downloadBlob(blob, name));
      dlWrap.appendChild(dlBtn);
      const openBtn = h('button', { class: 'btn' }, '👁 Open in new tab');
      openBtn.addEventListener('click', () => window.open(URL.createObjectURL(blob), '_blank'));
      dlWrap.appendChild(openBtn);
      result.style.display = '';
      status.setText('Done ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);
}
