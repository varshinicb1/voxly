/* === Shared FFmpeg wrapper =========================================== */

let loadedOnce = false;
const loadPromises = new Map();

async function ffmpeg() {
  if (!loadedOnce) {
    const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { toBlobURL, fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.11/dist/esm/index.js');
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
    const ff = new FFmpeg();
    ff.on('progress', ({ progress, time }) => {
      const ev = new CustomEvent('ffmpeg:progress', {
        detail: { progress: Math.max(0, Math.min(1, progress || 0)), time: time || 0 },
      });
      window.dispatchEvent(ev);
    });
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    window.__VOXLY_FFMPEG__ = ff;
    loadedOnce = true;
  }
  return window.__VOXLY_FFMPEG__;
}

async function ensureFFmpeg(onProgress) {
  const ff = await ffmpeg();
  if (onProgress) {
    const h = (e) => onProgress(e.detail.progress, e.detail.time);
    window.addEventListener('ffmpeg:progress', h);
    return { ff, cleanup: () => window.removeEventListener('ffmpeg:progress', h) };
  }
  return { ff, cleanup: () => {} };
}

async function runFFmpeg(args, onProgress) {
  const { ff, cleanup } = await ensureFFmpeg(onProgress);
  try {
    await ff.exec(args);
  } finally {
    cleanup();
  }
}

async function writeInput(ff, name, bytes) {
  await ff.writeFile(name, bytes);
}

async function readOutput(ff, name) {
  return ff.readFile(name);
}

async function removeFile(ff, name) {
  await ff.deleteFile(name).catch(() => {});
}

async function runConvert({
  inputBytes,
  inputName,
  outputExt,
  args = [],
  onProgress,
  mimeType,
}) {
  const { ff, cleanup } = await ensureFFmpeg(onProgress);
  try {
    const outName = `out-${Date.now()}.${outputExt}`;
    await ff.writeFile(inputName, inputBytes);
    await ff.exec([...args, '-i', inputName, ...(args.filter((a) => !a.startsWith('-i'))), outName]);
    const data = await ff.readFile(outName);
    const blob = new Blob([data.buffer], { type: mimeType || 'application/octet-stream' });
    await ff.deleteFile(outName).catch(() => {});
    return blob;
  } finally {
    cleanup();
  }
}

export { runFFmpeg, writeInput, readOutput, removeFile, runConvert, ensureFFmpeg };
