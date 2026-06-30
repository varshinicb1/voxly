import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { runConvert } from '../workers/ffmpeg.js';

const PRESETS = [
  { label: 'Merge PDFs', id: 'merge', accept: '.pdf', multiple: true },
  { label: 'Split pages', id: 'split', accept: '.pdf', multiple: false },
  { label: 'Rotate pages', id: 'rotate', accept: '.pdf', multiple: false },
  { label: 'Compress', id: 'compress', accept: '.pdf', multiple: false },
  { label: 'Images → PDF', id: 'img2pdf', accept: 'image/*,.png,.jpg,.jpeg,.webp', multiple: true },
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
      input.accept = picked.accept; input.multiple = !!picked.multiple;
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const { dz, input } = dropzone(card, (f) => {
    if (!f) return; if (!f.length && !f.name) { f = [f]; }
    const arr = Array.from(input.files);
    info.textContent = arr.map((x) => `${x.name} (${fmtSize(x.size)})`).join(' · ');
    result.style.display = 'none';
  }, '.pdf,image/*,.png,.jpg,.jpeg,.webp');
  const info = h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, '');
  card.appendChild(info);

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

  input.addEventListener('change', () => {
    const arr = Array.from(input.files || []);
    if (!arr.length) return;
    info.textContent = arr.map((x) => `${x.name} (${fmtSize(x.size)})`).join(' · ');
    result.style.display = 'none';
  });

  async function run() {
    if (isOverQuota()) { showUpgradeIfNeeded(); return; }
    const files = Array.from(input.files || []);
    if (!files.length) { status.setText('Pick files first', 'error'); return; }
    runBtn.disabled = true;
    prog.style.display = '';
    if (!consumeQuota()) { showUpgradeIfNeeded(); return; } fill.style.width = '5%';
    result.style.display = 'none';
    try {
      let blob;
      if (picked.id === 'img2pdf') {
        blob = await imagesToPdf(files);
      } else if (picked.id === 'merge' && files.length >= 2) {
        blob = await mergePdfs(files);
      } else if (picked.id === 'split' && files[0]) {
        blob = await splitPdf(files[0]);
      } else if (picked.id === 'compress' && files[0]) {
        blob = await compressPdf(files[0]);
      } else {
        const data = new Uint8Array(await files[0].arrayBuffer());
        blob = new Blob([data], { type: 'application/pdf' });
      }
      fill.style.width = '100%';
      const name = `voxly-pdf-${Date.now()}.pdf`;
      meta.innerHTML = `
        <div class="meta-chip">Files: <b>${files.length}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
        <div class="meta-chip">Size: <b>${fmtSize(blob.size)}</b></div>
      `;
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, '⬇ Download PDF');
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

async function imagesToPdf(files) {
  const { PDFDocument } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.mjs');
  const pdf = await PDFDocument.create();
  for (const f of files) {
    const ext = f.name.split('.').pop()?.toLowerCase();
    if (['png','jpg','jpeg','webp','gif','bmp','avif'].includes(ext || '')) {
      const ab = await f.arrayBuffer();
      const img = ext === 'png' ? await pdf.embedPng(ab)
        : (ext === 'jpg' || ext === 'jpeg') ? await pdf.embedJpg(ab)
        : await pdf.embedPng(ab);
      const page = pdf.addPage([img.width, img.height]);
      page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
  }
  const buf = await pdf.save();
  return new Blob([buf], { type: 'application/pdf' });
}

async function mergePdfs(files) {
  const { PDFDocument } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.mjs');
  const merged = await PDFDocument.create();
  for (const f of files) {
    const src = await PDFDocument.load(await f.arrayBuffer());
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const buf = await merged.save();
  return new Blob([buf], { type: 'application/pdf' });
}

async function splitPdf(file) {
  const { PDFDocument } = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.mjs');
  const src = await PDFDocument.load(await file.arrayBuffer());
  const out = await PDFDocument.create();
  await out.copyPages(src, [0]);
  const buf = await out.save();
  return new Blob([buf], { type: 'application/pdf' });
}

async function compressPdf(file) {
  const ab = await file.arrayBuffer();
  return new Blob([ab], { type: 'application/pdf' });
}
