import fs from 'node:fs';
import path from 'node:path';

const SRC = 'static';
const DST = 'dist';

function rcopy(src, dst) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const entry of fs.readdirSync(src)) {
      rcopy(path.join(src, entry), path.join(dst, entry));
    }
  } else {
    fs.copyFileSync(src, dst);
  }
}

function walk(p, out) {
  for (const e of fs.readdirSync(p, { withFileTypes: true })) {
    const n = path.join(p, e.name);
    if (e.isDirectory()) walk(n, out);
    else out.push(n);
  }
}

fs.rmSync(path.join(process.cwd(), DST), { recursive: true, force: true });
fs.mkdirSync(path.join(process.cwd(), DST), { recursive: true });
rcopy(path.join(process.cwd(), SRC), path.join(process.cwd(), DST));

fs.rmSync(path.join(process.cwd(), DST, 'index.html'), { force: true });
const indexSrc = fs
  .readFileSync(path.join(process.cwd(), SRC, 'index.html'), 'utf8')
  .replace(/\bhref="\//g, 'href="./')
  .replace(/\bsrc="\//g, 'src="./')
  .replace(
    /<div class="ad-slot ad-slot--bottom"[^>]*>[\s\S]*?<\/div>/,
    `<div class="ad-slot ad-slot--bottom" id="appUpgradeCta" aria-hidden="true"></div>`
  );
fs.writeFileSync(path.join(process.cwd(), DST, 'index.html'), indexSrc, 'utf8');

fs.writeFileSync(
  path.join(process.cwd(), DST, '_routes.json'),
  JSON.stringify(
    {
      version: 1,
      include: ['/*'],
      headers: {
        '/*': {
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=()',
          'Cross-Origin-Opener-Policy': 'same-origin',
          'Cross-Origin-Embedder-Policy': 'require-corp'
        }
      }
    },
    null,
    2
  ),
  'utf8'
);

const out = [];
walk(path.join(process.cwd(), DST), out);
const total = out.reduce((a, p) => a + fs.statSync(p).size, 0);
const kb = Math.round(total / 1024);
console.log(`Built -> ${DST} (${out.length} files, ~${kb} KB)`);
