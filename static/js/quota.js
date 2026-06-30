/* === Voxly Quota + Upsell =========================================== */

const QUOTA_KEY = 'voxly_quota';
const FREE_LIMIT = 5;

export function getQuota() {
  try {
    const raw = localStorage.getItem(QUOTA_KEY);
    if (!raw) return { used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT };
    const data = JSON.parse(raw);
    return { used: data.used || 0, limit: FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - (data.used || 0)) };
  } catch { return { used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT }; }
}

export function consumeQuota() {
  const q = getQuota();
  if (q.remaining <= 0) return false;
  const next = { used: q.used + 1, limit: FREE_LIMIT, remaining: q.remaining - 1 };
  localStorage.setItem(QUOTA_KEY, JSON.stringify(next));
  return true;
}

export function isOverQuota() {
  return getQuota().remaining <= 0;
}

export function showUpgradeIfNeeded() {
  if (isOverQuota()) {
    showUpgradeModal();
    return true;
  }
  return false;
}

function showUpgradeModal() {
  const existing = document.getElementById('voxly-upgrade-modal');
  if (existing) return;
  const overlay = document.createElement('div');
  overlay.id = 'voxly-upgrade-modal';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);backdrop-filter:blur(4px)';
  const box = document.createElement('div');
  box.className = 'card';
  box.style.cssText = 'max-width:520px;width:90%;padding:32px;text-align:center';
  box.innerHTML = `
    <div style="font-size:48px;margin-bottom:12px">🚀</div>
    <h2 style="font-size:22px;font-weight:800;margin-bottom:8px">You've used all ${FREE_LIMIT} free conversions</h2>
    <p style="color:var(--muted);font-size:14px;margin-bottom:24px;line-height:1.6">
      Voxly is free for <b>${FREE_LIMIT} conversions per device</b> — no account, no login.<br/>
      Unlock unlimited conversions, batch mode, 3D tools, and priority support.
    </p>
    <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:16px">
      <button id="voxly-go-pro" class="btn btn--primary" style="padding:12px 24px;font-size:15px">⭐ Unlock Batch + No Quota — ₹149</button>
      <button id="voxly-custom" class="btn" style="padding:12px 24px;font-size:15px">💼 Custom / Enterprise</button>
    </div>
    <p style="font-size:12px;color:var(--muted)">
      Pro includes: unlimited conversions · batch mode · 3D tools · no ads · priority processing<br/>
      Custom: white-label, on-premise, or enterprise integrations.
    </p>
  `;
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  box.querySelector('#voxly-go-pro').addEventListener('click', () => {
    alert('Pro subscription coming soon. Meanwhile, contact us for early access!');
    overlay.remove();
  });
  box.querySelector('#voxly-custom').addEventListener('click', () => {
    const subject = encodeURIComponent('Custom Voxly Solution Inquiry');
    const body = encodeURIComponent("Hi, I'm interested in a custom/one-time Voxly solution.\n\nMy use case:\n");
    window.location.href = `mailto:hello@voxly.dev?subject=${subject}&body=${body}`;
  });
}
