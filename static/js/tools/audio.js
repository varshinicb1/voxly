import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { runConvert } from '../workers/ffmpeg.js';

const PRESETS = [
  { label: 'Convert format', id: 'convert', args: [] },
  { label: 'Trim', id: 'trim', args: [] },
  { label: 'Normalize', id: 'normalize', args: ['-af','loudnorm=I=-16:TP=-1.5:LRA=11'] },
  { label: 'Speed change', id: 'speed', args: [] },
  { label: 'Extract from video', id: 'extract', args: ['-vn'] },
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
      if (p.id === 'extract') { input.accept = 'video/*,.mp4,.mov,.avi,.mkv,.webm'; }
      else { input.accept = 'audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.wma'; }
      info.textContent = '';
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  }, 'audio/*,.mp3,.wav,.ogg,.flac,.aac,.m4a,.wma');
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
  let currentBlob = null;
  input.addEventListener('change', () => {
    const f = input.files?.[0]; if (!f) return;
    currentFile = f;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  });

  async function run() {
    if (isOverQuota()) { showUpgradeIfNeeded(); return; }
    if (!currentFile) { status.setText('Pick a file first', 'error'); return; }
    runBtn.disabled = true;
    prog.style.display = '';
    if (!consumeQuota()) { showUpgradeIfNeeded(); return; } fill.style.width = '5%';
    result.style.display = 'none';
    try {
      const inExt = '.' + (currentFile.name.split('.').pop() || '').toLowerCase();
      let outExt = inExt;
      let mimeType = `audio/${inExt.slice(1)}`;
      let outName = `voxly-audio-${Date.now()}${inExt}`;
      if (picked.id === 'convert') {
        outExt = '.mp3'; mimeType = 'audio/mpeg'; outName = outName.replace(inExt, '.mp3');
      }
      if (picked.id === 'extract') { outExt = '.mp3'; mimeType = 'audio/mpeg'; outName = outName.replace(/\.\w+$/, '.mp3'); }
      currentBlob = await runConvert({
        inputBytes: new Uint8Array(await currentFile.arrayBuffer()),
        inputName: currentFile.name,
        outputExt: outExt.slice(1),
        args: picked.args.length ? [...picked.args] : (outExt === '.mp3' ? ['-acodec','libmp3lame','-q:a','2'] : []),
        onProgress: (p) => { fill.style.width = `${Math.round(p*100)}%`; },
        mimeType,
      });
      fill.style.width = '100%';
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
        <div class="meta-chip">Size: <b>${fmtSize(currentBlob.size)}</b></div>
      `;
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, `⬇ Download ${outExt.toUpperCase().slice(1)}`);
      dlBtn.addEventListener('click', () => downloadBlob(currentBlob, outName));
      dlWrap.appendChild(dlBtn);
      result.style.display = '';
      status.setText('Done ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);
}
