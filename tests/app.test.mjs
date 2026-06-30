import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('static');

function listFiles() {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else out.push(p);
    }
  }
  walk(ROOT);
  return out;
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

const files = listFiles();

const required = [
  'static/index.html',
  'static/css/site.css',
  'static/manifest.webmanifest',
  'static/offline.html',
  'static/js/bootstrap.js',
  'static/js/engine.js',
  'static/js/quota.js',
  'static/js/tools/index.js',
  'static/js/tools/universal.js',
  'static/js/tools/audio.js',
  'static/js/tools/video.js',
  'static/js/tools/image.js',
  'static/js/tools/pdf.js',
  'static/js/tools/docs.js',
  'static/js/tools/ocr.js',
  'static/js/tools/three-d.js',
  'static/js/tools/ui.js',
  'static/js/workers/ffmpeg.js',
];

for (const rel of required) {
  assert(files.includes(path.resolve(rel)), `missing ${rel}`);
}

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
assert(html.includes('Voxly'), 'index missing brand');
assert(html.includes('manifest.webmanifest'), 'index missing manifest link');
assert(html.includes('appUpgradeCta'), 'index missing upgrade CTA');

const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
assert(manifest.name === 'Voxly', 'manifest name mismatch');
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'missing manifest icons');

const css = fs.readFileSync(path.join(ROOT, 'css/site.css'), 'utf8');
assert(css.includes('topbar'), 'css missing topbar layout styles');
assert(css.includes('stage-title'), 'css missing stage title styles');

const quota = fs.readFileSync(path.join(ROOT, 'js/quota.js'), 'utf8');
assert(quota.includes('showUpgradeIfNeeded'), 'quota.js missing upgrade modal hook');

const universal = fs.readFileSync(path.join(ROOT, 'js/tools/universal.js'), 'utf8');
assert(universal.includes('routeConvert'), 'universal.js missing routeConvert router');
assert(universal.includes('png') && universal.includes('mp4'), 'universal rules should include image/video formats');

const engine = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
assert(engine.includes('downloadBlob'), 'engine.js missing downloadBlob helper');
assert(engine.includes('fileToUint8Array'), 'engine.js missing fileToUint8Array helper');

const ffmpegWorker = fs.readFileSync(path.join(ROOT, 'js/workers/ffmpeg.js'), 'utf8');
assert(ffmpegWorker.includes('ensureFFmpeg'), 'ffmpeg worker missing ensure loader');
assert(ffmpegWorker.includes('runConvert'), 'ffmpeg worker missing runConvert helper');

console.log(`tests passed: assets=${files.length} required=${required.length}`);
