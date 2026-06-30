/* === UI helpers ========================================================= */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c == null || c === false) continue;
    if (typeof c === 'string' || typeof c === 'number') el.appendChild(document.createTextNode(c));
    else if (c instanceof HTMLElement) el.appendChild(c);
    else if (typeof c === 'object') el.appendChild(c);
  }
  return el;
}

export function dropzone(root, onFile, accept = '*/*') {
  const dz = h('div', { class: 'dropzone' },
    h('span', { class: 'drop-icon' }, '📥'),
    h('div', { class: 'drop-title' }, 'Drop a file here'),
    h('div', { class: 'drop-sub' }, `or click to browse · ${accept}`),
  );
  const input = document.createElement('input');
  input.type = 'file'; input.accept = accept; input.style.display = 'none';
  input.addEventListener('change', () => onFile(input.files?.[0]));
  dz.addEventListener('click', () => input.click());
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('dragover'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', (e) => {
    e.preventDefault(); dz.classList.remove('dragover');
    const f = e.dataTransfer?.files?.[0];
    if (f) onFile(f);
  });
  root.appendChild(input);
  root.appendChild(dz);
  return { dz, input };
}

export function statusBox(label = 'Idle') {
  const el = h('div', { style: { fontSize: '12px', color: 'var(--muted)', fontFamily: 'ui-monospace,monospace', marginTop: '6px' } });
  el.textContent = label;
  el.__set = (txt, kind) => {
    el.textContent = txt;
    el.style.color = kind === 'ok' ? 'var(--ok)' : kind === 'error' ? 'var(--error)' : 'var(--muted)';
  };
  return { el, setText: el.__set };
}

export function escape(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
