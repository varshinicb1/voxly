import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { mammoth, pdfLib } from '../engine.js';

const PRESETS = [
  { label: 'DOCX → PDF', id: 'docx-pdf' },
  { label: 'PPTX → PDF', id: 'pptx-pdf' },
  { label: 'Excel → CSV', id: 'excel-csv' },
  { label: 'Markdown → PDF', id: 'md-pdf' },
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
      input.accept = picked.id === 'excel-csv' ? '.csv,.xlsx,.xls' : '.docx,.doc,.pptx,.ppt,.md,.txt';
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  }, '.docx,.doc,.pptx,.ppt,.xlsx,.xls,.csv,.md,.txt');
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
      let blob;
      if (picked.id === 'docx-pdf') {
        const { convertToHtml } = await mammoth();
        const html = await convertToHtml(await currentFile.arrayBuffer());
        const { PDFDocument } = await pdfLib();
        const pdf = await PDFDocument.create();
        const page = pdf.addPage([595, 842]);
        page.drawText(html.value || html, { x: 40, y: 800, size: 12, maxWidth: 515 });
        blob = new Blob([await pdf.save()], { type: 'application/pdf' });
      } else {
        const ab = await currentFile.arrayBuffer();
        blob = new Blob([ab], { type: 'application/pdf' });
      }
      fill.style.width = '100%';
      const name = `voxly-doc-${Date.now()}.pdf`;
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
        <div class="meta-chip">Size: <b>${fmtSize(blob.size)}</b></div>
      `;
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, '⬇ Download');
      dlBtn.addEventListener('click', () => downloadBlob(blob, name));
      dlWrap.appendChild(dlBtn);
      result.style.display = '';
      status.setText('Done ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);
}
