import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { runConvert } from '../workers/ffmpeg.js';

const PRESETS = [
  { label: 'Convert format', id: 'convert', args: [] },
  { label: 'Compress', id: 'compress', args: ['-crf','28','-preset','fast'] },
  { label: 'Trim', id: 'trim', args: [] },
  { label: 'Rotate 90°', id: 'rotate', args: ['-vf','transpose=1'] },
  { label: 'Extract thumbnail', id: 'thumb', args: ['-ss','00:00:01','-vframes','1'] },
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
      outExtSel.innerHTML = '';
      const allowed = picked.id === 'thumb' ? ['.jpg','.png'] : ['.mp4','.webp','.gif','.mp3'];
      allowed.forEach((e) => {
        const o = document.createElement('option'); o.value = e; o.textContent = e.toUpperCase().slice(1); outExtSel.appendChild(o);
      });
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  }, 'video/*,.mp4,.webm,.mov,.avi,.mkv,.flv,.wmv,.m4v');
  const info = h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, '');
  card.appendChild(info);

  const outRow = h('div', { class: 'flex mt-12' });
  outRow.appendChild(h('span', { style: { fontSize: '12px', color: 'var(--muted)', marginRight: '8px' } }, 'Output:'));
  const outExtSel = document.createElement('select');
  ['.mp4','.webp','.gif','.mp3'].forEach((e) => {
    const o = document.createElement('option'); o.value = e; o.textContent = e.toUpperCase().slice(1); outExtSel.appendChild(o);
  });
  outRow.appendChild(outExtSel);
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
    if (!currentFile) { status.setText('Pick a file first', 'error'); return; }
    runBtn.disabled = true;
    prog.style.display = '';
    if (!consumeQuota()) { showUpgradeIfNeeded(); return; } fill.style.width = '5%';
    result.style.display = 'none';
    try {
      const outExt = outExtSel.value;
      const isImage = outExt === '.jpg' || outExt === '.png';
      const mime = isImage ? `image/${outExt.slice(1)}` : `video/${outExt.slice(1)}`;
      const args = [...picked.args];
      if (picked.id !== 'thumb' && picked.id !== 'compress') args.push('-crf','23');
      currentBlob = await runConvert({
        inputBytes: new Uint8Array(await currentFile.arrayBuffer()),
        inputName: currentFile.name,
        outputExt: outExt.slice(1),
        args,
        onProgress: (p) => { fill.style.width = `${Math.round(p*100)}%`; },
        mimeType: mime,
      });
      fill.style.width = '100%';
      const name = `voxly-video-${Date.now()}${outExt}`;
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
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
