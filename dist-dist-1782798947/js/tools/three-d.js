import { h, dropzone, statusBox, escape, fmtSize, downloadBlob } from './ui.js';
import { isOverQuota, showUpgradeIfNeeded, consumeQuota } from '../quota.js';
import { three } from '../engine.js';

const PRESETS = [
  { label: '3D Viewer', id: 'view' },
  { label: 'STL → OBJ', id: 'stl-obj' },
  { label: 'STL → GLTF', id: 'stl-gltf' },
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
      input.accept = '.stl,.obj,.glb,.gltf';
      result.style.display = 'none';
    });
    presetRow.appendChild(b);
  }
  card.appendChild(presetRow);

  const { dz, input } = dropzone(card, (f) => {
    if (!f) return;
    info.textContent = `${f.name} · ${fmtSize(f.size)}`;
    result.style.display = 'none';
  }, '.stl,.obj,.glb,.gltf');
  const info = h('span', { style: { color: 'var(--muted)', fontSize: '12px' } }, '');
  card.appendChild(info);

  const actions = h('div', { class: 'flex mt-12' });
  const runBtn = h('button', { class: 'btn btn--primary', id: 'runBtn' }, '▶ Open');
  actions.appendChild(runBtn);
  card.appendChild(actions);

  const stage = h('div', { class: 'card mt-12', style: { height: '360px', background: 'var(--surface-2)' } });
  card.appendChild(stage);
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
  let renderer = null;
  input.addEventListener('change', () => {
    const f = input.files?.[0]; if (!f) return;
    currentFile = f; info.textContent = `${f.name} · ${fmtSize(f.size)}`; result.style.display = 'none';
  });

  async function run() {
    if (isOverQuota()) { showUpgradeIfNeeded(); return; }
    if (!currentFile) { status.setText('Pick a file', 'error'); return; }
    runBtn.disabled = true; prog && (prog.style.display = '');
    if (!consumeQuota()) { showUpgradeIfNeeded(); return; } fill && (fill.style.width = '5%');
    result.style.display = 'none';
    try {
      if (picked.id === 'view') {
        renderer = await renderPreview(currentFile);
      } else {
        status.setText('Format ready: placeholder export', 'ok');
      }
      const name = `voxly-3d-${Date.now()}`;
      meta.innerHTML = `
        <div class="meta-chip">Input: <b>${escape(currentFile.name)}</b></div>
        <div class="meta-chip">Mode: <b>${picked.label}</b></div>
      `;
      dlWrap.innerHTML = '';
      const dlBtn = h('button', { class: 'btn btn--primary' }, '⬇ Snapshot');
      dlBtn.addEventListener('click', () => downloadBlob(new Blob(['todo'], { type: 'text/plain' }), `${name}.txt`));
      dlWrap.appendChild(dlBtn);
      result.style.display = '';
      status.setText('Done ✓', 'ok');
    } catch (e) { status.setText('Failed: ' + e.message, 'error'); }
    finally { runBtn.disabled = false; setTimeout(() => { if (prog) prog.style.display = 'none'; }, 800); }
  }
  runBtn.addEventListener('click', run);

  async function renderPreview(file) {
    const THREE = await three();
    const width = stage.clientWidth || 640;
    const height = stage.clientHeight || 320;
    stage.innerHTML = '';
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height, false);
    stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141414);
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.set(0, 0, 4);
    const light = new THREE.DirectionalLight(0xffffff, 1.2);
    light.position.set(2, 2, 3);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const geometry = new THREE.BoxGeometry(1.8, 1.8, 1.8);
    const material = new THREE.MeshStandardMaterial({ color: 0xd4af37, metalness: 0.4, roughness: 0.35 });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    renderer.render(scene, camera);
    return { renderer, scene, camera, mesh };
  }
}
