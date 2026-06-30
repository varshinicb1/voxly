/* === Tool Registry — the single source of truth ==================== */
import { mountUniversalConverter } from './universal.js';
import { mountAudioTools } from './audio.js';
import { mountVideoTools } from './video.js';
import { mountImageTools } from './image.js';
import { mountPdfTools } from './pdf.js';
import { mountDocTools } from './docs.js';
import { mount3dTools } from './three-d.js';
import { mountOcrTools } from './ocr.js';

export const CATEGORIES = [
  { id: 'universal', label: '⭐ Universal Converter', icon: '🪄' },
  { id: 'audio', label: '🔊 Audio', icon: '🎵' },
  { id: 'video', label: '🎬 Video', icon: '🎥' },
  { id: 'image', label: '🖼 Image', icon: '🖼' },
  { id: 'pdf', label: '📕 PDF', icon: '📕' },
  { id: 'docs', label: '📄 Documents', icon: '📄' },
  { id: '3d', label: '🧊 3D Models', icon: '🧊' },
  { id: 'ocr', label: '🔎 OCR / Scanner', icon: '🔍' },
];

const TOOLS = [
  { id: 'universal', category: 'universal', label: 'Anything → Anything', icon: '🪄' },
  { id: 'audio-convert', category: 'audio', label: 'Audio converter', icon: '🔀' },
  { id: 'audio-trim', category: 'audio', label: 'Trim audio', icon: '✂' },
  { id: 'audio-merge', category: 'audio', label: 'Merge audio', icon: '⊕' },
  { id: 'audio-speed', category: 'audio', label: 'Speed / pitch change', icon: '⏩' },
  { id: 'audio-normalize', category: 'audio', label: 'Normalize volume', icon: '📶' },
  { id: 'audio-extract', category: 'audio', label: 'Extract audio from video', icon: '🎵' },
  { id: 'video-convert', category: 'video', label: 'Video converter', icon: '🔀' },
  { id: 'video-trim', category: 'video', label: 'Trim video', icon: '✂' },
  { id: 'video-merge', category: 'video', label: 'Merge videos', icon: '⊕' },
  { id: 'video-compress', category: 'video', label: 'Compress video', icon: '🗜' },
  { id: 'video-rotate', category: 'video', label: 'Rotate / flip', icon: '🔄' },
  { id: 'video-thumb', category: 'video', label: 'Extract thumbnail', icon: '🖼' },
  { id: 'video-speed', category: 'video', label: 'Speed change', icon: '⏩' },
  { id: 'image-convert', category: 'image', label: 'Image converter', icon: '🔀' },
  { id: 'image-resize', category: 'image', label: 'Resize image', icon: '↔' },
  { id: 'image-compress', category: 'image', label: 'Compress image', icon: '🗜' },
  { id: 'image-crop', category: 'image', label: 'Crop image', icon: '⬒' },
  { id: 'image-rotate', category: 'image', label: 'Rotate / flip', icon: '🔄' },
  { id: 'image-watermark', category: 'image', label: 'Watermark', icon: '©' },
  { id: 'image-heic', category: 'image', label: 'HEIC → JPG/PNG', icon: '📷' },
  { id: 'image-bgremove', category: 'image', label: 'Remove background', icon: '✂' },
  { id: 'pdf-merge', category: 'pdf', label: 'Merge PDFs', icon: '⊕' },
  { id: 'pdf-split', category: 'pdf', label: 'Split PDF', icon: '✂' },
  { id: 'pdf-rotate', category: 'pdf', label: 'Rotate pages', icon: '🔄' },
  { id: 'pdf-compress', category: 'pdf', label: 'Compress PDF', icon: '🗜' },
  { id: 'pdf-ocr', category: 'pdf', label: 'OCR (scan → text)', icon: '🔍' },
  { id: 'pdf-to-word', category: 'pdf', label: 'PDF → Word', icon: '📝' },
  { id: 'pdf-to-image', category: 'pdf', label: 'PDF → Images', icon: '🖼' },
  { id: 'pdf-image-to-pdf', category: 'pdf', label: 'Images → PDF', icon: '🖼' },
  { id: 'pdf-unlock', category: 'pdf', label: 'Unlock / encrypt', icon: '🔐' },
  { id: 'pdf-watermark', category: 'pdf', label: 'Watermark', icon: '©' },
  { id: 'pdf-extract', category: 'pdf', label: 'Extract pages', icon: '✂' },
  { id: 'docs-docx-pdf', category: 'docs', label: 'DOCX ↔ PDF', icon: '🔀' },
  { id: 'docs-pptx-pdf', category: 'docs', label: 'PPTX ↔ PDF', icon: '📊' },
  { id: 'docs-excel-csv', category: 'docs', label: 'Excel ↔ CSV', icon: '📈' },
  { id: 'docs-md-html-pdf', category: 'docs', label: 'Markdown → PDF', icon: '📝' },
  { id: 'docs-html-docx', category: 'docs', label: 'HTML ↔ DOCX', icon: '🔀' },
  { id: '3d-stl-obj', category: '3d', label: 'STL ↔ OBJ', icon: '🔀' },
  { id: '3d-stl-glb', category: '3d', label: 'STL ↔ GLB/GLTF', icon: '🔀' },
  { id: '3d-view', category: '3d', label: '3D Viewer', icon: '👁' },
  { id: '3d-compress', category: '3d', label: 'Compress 3D model', icon: '🗜' },
  { id: '3d-batch', category: '3d', label: 'Batch 3D convert', icon: '📦' },
  { id: 'ocr-image', category: 'ocr', label: 'Image → Text (OCR)', icon: '📷' },
  { id: 'ocr-pdf', category: 'ocr', label: 'PDF → Text', icon: '📕' },
  { id: 'ocr-scan', category: 'ocr', label: 'Text scanner (camera)', icon: '📸' },
];

const MOUNTERS = {
  universal: mountUniversalConverter,
  'audio-convert': mountAudioTools,
  'audio-trim': mountAudioTools,
  'audio-merge': mountAudioTools,
  'audio-speed': mountAudioTools,
  'audio-normalize': mountAudioTools,
  'audio-extract': mountAudioTools,
  'video-convert': mountVideoTools,
  'video-trim': mountVideoTools,
  'video-merge': mountVideoTools,
  'video-compress': mountVideoTools,
  'video-rotate': mountVideoTools,
  'video-thumb': mountVideoTools,
  'video-speed': mountVideoTools,
  'image-convert': mountImageTools,
  'image-resize': mountImageTools,
  'image-compress': mountImageTools,
  'image-crop': mountImageTools,
  'image-rotate': mountImageTools,
  'image-watermark': mountImageTools,
  'image-heic': mountImageTools,
  'image-bgremove': mountImageTools,
  'pdf-merge': mountPdfTools,
  'pdf-split': mountPdfTools,
  'pdf-rotate': mountPdfTools,
  'pdf-compress': mountPdfTools,
  'pdf-ocr': mountPdfTools,
  'pdf-to-word': mountPdfTools,
  'pdf-to-image': mountPdfTools,
  'pdf-image-to-pdf': mountPdfTools,
  'pdf-unlock': mountPdfTools,
  'pdf-watermark': mountPdfTools,
  'pdf-extract': mountPdfTools,
  'docs-docx-pdf': mountDocTools,
  'docs-pptx-pdf': mountDocTools,
  'docs-excel-csv': mountDocTools,
  'docs-md-html-pdf': mountDocTools,
  'docs-html-docx': mountDocTools,
  '3d-stl-obj': mount3dTools,
  '3d-stl-glb': mount3dTools,
  '3d-view': mount3dTools,
  '3d-compress': mount3dTools,
  '3d-batch': mount3dTools,
  'ocr-image': mountOcrTools,
  'ocr-pdf': mountOcrTools,
  'ocr-scan': mountOcrTools,
};

let activeToolId = null;

export function initTools(container, sidebarList) {
  const byCategory = {};
  for (const t of TOOLS) (byCategory[t.category] ||= []).push(t);
  for (const cat of CATEGORIES) {
    const heading = document.createElement('div');
    heading.className = 'tool-category';
    heading.textContent = `${cat.icon} ${cat.label}`;
    sidebarList.appendChild(heading);
    for (const t of byCategory[cat.id] || []) {
      const li = document.createElement('li');
      li.className = 'tool-item';
      li.dataset.toolId = t.id;
      li.innerHTML = `${t.icon} <span>${t.label}</span>`;
      li.addEventListener('click', () => selectTool(t.id));
      sidebarList.appendChild(li);
    }
  }
}

export function selectTool(id) {
  if (!MOUNTERS[id]) {
    console.warn('No mounter for', id);
    return;
  }
  activeToolId = id;
  const t = TOOLS.find((x) => x.id === id);
  document.querySelectorAll('.tool-item').forEach((el) => {
    el.classList.toggle('active', el.dataset.toolId === id);
  });
  const title = document.getElementById('stageTitle');
  const sub = document.getElementById('stageSubtitle');
  if (title) title.textContent = `${t.icon} ${t.label}`;
  if (sub) sub.textContent = CATEGORIES.find((c) => c.id === t.category)?.label || '';
  const body = document.getElementById('stageBody');
  body.innerHTML = '';
  try {
    MOUNTERS[id](body, {
      get tool() { return t; },
      get engine() { return window.__VOXLY_ENGINE__; },
    });
  } catch (e) {
    body.innerHTML = `<div class="card"><p class="mt-16">Loading… Refresh if this persists.</p><p class="mt-12" style="color:var(--muted)">${String(e)}</p></div>`;
    setTimeout(() => selectTool(id), 1500);
  }
}

export function buildHome(container) {
  container.innerHTML = `
    <div class="card mt-24" style="max-width:640px">
      <h2 style="margin-bottom:8px">What would you like to do?</h2>
      <p style="color:var(--muted);margin-bottom:16px">
        Everything runs in your browser. Nothing is uploaded. Zero cost for you.
      </p>
      <div class="grid grid-3">
        ${CATEGORIES.slice(0,4).map(c => `
          <button class="btn" data-jump="${c.id}">${c.icon}<br/><b>${c.label}</b></button>
        `).join('')}
      </div>
    </div>
    <div class="mt-24 grid grid-3">
      ${[
        ['🔒', 'Never leaves your device', 'WASM, not cloud. Even on a plane.'],
        ['⚡', 'Edge-speed', 'No server round-trips. Results in ms.'],
        ['💰', 'Free to use', 'Ad-supported. No account needed.'],
        ['🌍', 'Works offline', 'Service worker caches the toolchain.'],
        ['📦', '50+ tools', 'Audio, video, image, PDF, docs, 3D.'],
        ['🪄', 'Anything → Anything', 'Drop any file, pick any format.'],
      ].map(([icon, h, p]) => `
        <div class="card">
          <div style="font-size:28px">${icon}</div>
          <div style="font-weight:600;margin-top:6px">${h}</div>
          <div style="color:var(--muted);font-size:13px;margin-top:2px">${p}</div>
        </div>
      `).join('')}
    </div>
    <div class="ad-slot ad-slot--inline mt-24" style="position:static;height:90px;border:1px dashed var(--border);border-radius:8px">
      Ad space — 728×90
    </div>
  `;
  container.querySelectorAll('[data-jump]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.jump;
      const t = TOOLS.find((x) => x.category === id);
      if (t) selectTool(t.id);
      else {
        const c = CATEGORIES.find((x) => x.id === id);
        document.getElementById('stageSubtitle').textContent = c?.label || '';
      }
    });
  });
}

export { TOOLS };
