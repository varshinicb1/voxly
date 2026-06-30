/* === Voxly engine — single shared WASM/JS runtime ================== */

const libs = {};

export async function ffmpeg() {
  if (!libs.ffmpeg) {
    const { FFmpeg } = await import('https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js');
    const { toBlobURL, fetchFile } = await import('https://unpkg.com/@ffmpeg/util@0.12.11/dist/esm/index.js');
    const base = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
    const ff = new FFmpeg();
    await ff.load({
      coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    libs.ffmpeg = ff;
  }
  return libs.ffmpeg;
}

export async function tesseract() {
  if (!libs.tesseract) {
    const mod = await import('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/index.esm.min.js');
    libs.tesseract = mod;
  }
  return libs.tesseract;
}

export async function pdfLib() {
  if (!libs.pdfLib) {
    const mod = await import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.mjs');
    libs.pdfLib = mod;
  }
  return libs.pdfLib;
}

export async function three() {
  if (!libs.three) {
    const mod = await import('https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js');
    libs.three = mod;
  }
  return libs.three;
}

export async function jszip() {
  if (!libs.jszip) {
    const mod = await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.mjs');
    libs.jszip = mod;
  }
  return libs.jszip;
}

export async function mammoth() {
  if (!libs.mammoth) {
    const mod = await import('https://cdn.jsdelivr.net/npm/mammoth@1.6.0/mammoth.browser.min.js');
    libs.mammoth = mod;
  }
  return libs.mammoth;
}

export async function fileToUint8Array(file) {
  return new Uint8Array(await file.arrayBuffer());
}

export function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
