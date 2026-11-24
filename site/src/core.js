// Shared helpers: DOM, progress store, toasts.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Tiny hyperscript-ish helper: html`...` returns a DocumentFragment-friendly string. */
export function h(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------------- progress store ---------------- */
const KEY = 'packetcraft.v1';
const defaultState = { xp: 0, done: {}, quiz: {}, games: {}, awarded: {} };
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...defaultState, ...JSON.parse(raw) } : structuredClone(defaultState);
  } catch {
    return structuredClone(defaultState);
  }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
  renderXP();
}

export const store = {
  get: () => state,
  /** Award XP once per unique id. */
  award(id, xp, label) {
    if (state.awarded[id]) return false;
    state.awarded[id] = true;
    state.xp += xp;
    save();
    toast(`<span>${esc(label || 'Nice!')}</span> <b>+${xp} XP</b>`, 'xp');
    return true;
  },
  markDone(moduleId) {
    if (!state.done[moduleId]) {
      state.done[moduleId] = Date.now();
      save();
    }
  },
  isDone: (moduleId) => !!state.done[moduleId],
  setBest(game, score) {
    const prev = state.games[game] || 0;
    if (score > prev) { state.games[game] = score; save(); return true; }
    return false;
  },
  best: (game) => state.games[game] || 0,
  reset() { state = structuredClone(defaultState); save(); },
};

export const LEVEL_XP = 100;
export function levelInfo(xp = state.xp) {
  // Each level needs a bit more XP than the previous one.
  let lvl = 1, need = LEVEL_XP, rest = xp;
  while (rest >= need) { rest -= need; lvl++; need = Math.round(need * 1.25); }
  return { lvl, into: rest, need };
}

export function renderXP() {
  const t = document.getElementById('xp-text');
  const ring = document.getElementById('xp-ring-fg');
  if (!t || !ring) return;
  const { lvl, into, need } = levelInfo();
  t.textContent = `Lv ${lvl} · ${state.xp} XP`;
  ring.style.strokeDashoffset = String(94.25 * (1 - into / need));
  document.getElementById('xp-chip').title = `Level ${lvl} — ${into}/${need} XP to next level`;
}

/* ---------------- toasts ---------------- */
export function toast(html, cls = '') {
  const root = document.getElementById('toast-root');
  if (!root) return;
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.innerHTML = html;
  root.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .4s, transform .4s'; el.style.opacity = '0'; el.style.transform = 'translateY(10px)'; }, 2600);
  setTimeout(() => el.remove(), 3100);
}

/* ---------------- lifecycle for pages ---------------- */
// Pages and widgets register cleanup callbacks so animation loops / listeners stop on navigation.
let cleanups = [];
export function onCleanup(fn) { cleanups.push(fn); }
export function runCleanups() {
  for (const fn of cleanups) { try { fn(); } catch (e) { console.error(e); } }
  cleanups = [];
}

/** requestAnimationFrame loop that auto-stops on navigation and pauses when offscreen. */
export function loop(fn, el) {
  let raf = 0, last = performance.now(), visible = true, alive = true;
  let io;
  if (el && 'IntersectionObserver' in window) {
    io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; });
    io.observe(el);
  }
  const tick = (now) => {
    if (!alive) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (visible && !document.hidden) fn(dt, now / 1000);
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  const stop = () => { alive = false; cancelAnimationFrame(raf); io?.disconnect(); };
  onCleanup(stop);
  return stop;
}

/** Make a canvas crisp on HiDPI and keep it sized to its CSS box. Returns ctx + size getter. */
export function setupCanvas(canvas, aspect = 0.55, minH = 280) {
  const ctx = canvas.getContext('2d');
  const size = { w: 0, h: 0, dpr: 1 };
  const resize = () => {
    const w = canvas.parentElement.clientWidth;
    const hgt = Math.max(minH, Math.round(w * aspect));
    size.dpr = Math.min(2, window.devicePixelRatio || 1);
    size.w = w; size.h = hgt;
    canvas.width = w * size.dpr; canvas.height = hgt * size.dpr;
    canvas.style.height = hgt + 'px';
    ctx.setTransform(size.dpr, 0, 0, size.dpr, 0, 0);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);
  onCleanup(() => ro.disconnect());
  return { ctx, size, resize };
}

/** Canvas pointer position in CSS pixels. */
export function pointerPos(canvas, e) {
  const r = canvas.getBoundingClientRect();
  const p = e.touches ? e.touches[0] : e;
  return { x: p.clientX - r.left, y: p.clientY - r.top };
}

export function widgetShell(title, { controls = '', foot = '' } = {}) {
  return h(`<div class="widget">
    <div class="widget-head"><div class="dots"><i></i><i></i><i></i></div><span class="title">${title}</span><span class="spacer"></span>${controls}</div>
    <div class="widget-body"></div>
    <div class="widget-foot">${foot}</div>
  </div>`);
}

export const COLORS = {
  mint: '#5cf2c2', violet: '#8b7bff', orange: '#ff7a45', pink: '#ff5c9a', yellow: '#ffd166', sky: '#4cc9ff',
  text: '#e9edf7', dim: '#b4bdd3', muted: '#7c86a2', line: 'rgba(160,175,220,0.16)', bg: '#080b16', surface: '#0f1424', danger: '#ff5470',
};

/* ---------------- networking math helpers ---------------- */
export function ipToInt(ip) {
  const p = ip.trim().split('.');
  if (p.length !== 4) return null;
  let n = 0;
  for (const s of p) {
    if (!/^\d{1,3}$/.test(s)) return null;
    const v = +s;
    if (v > 255) return null;
    n = n * 256 + v;
  }
  return n >>> 0;
}
export const intToIp = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
export const maskFromPrefix = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
export function inSubnet(ip, net, prefix) {
  const m = maskFromPrefix(prefix);
  return ((ip & m) >>> 0) === ((net & m) >>> 0);
}
export function subnetInfo(ipInt, prefix) {
  const mask = maskFromPrefix(prefix);
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = 2 ** (32 - prefix);
  const hosts = prefix >= 31 ? (prefix === 32 ? 1 : 2) : total - 2;
  const first = prefix >= 31 ? network : network + 1;
  const last = prefix >= 31 ? broadcast : broadcast - 1;
  return { mask, network, broadcast, total, hosts, first, last };
}
export function ipClass(ipInt) {
  const a = ipInt >>> 24;
  if (a === 10 || (a === 172 && ((ipInt >>> 16) & 255) >= 16 && ((ipInt >>> 16) & 255) <= 31) || (a === 192 && ((ipInt >>> 16) & 255) === 168)) return 'Private (RFC 1918)';
  if (a === 127) return 'Loopback';
  if (a === 169 && ((ipInt >>> 16) & 255) === 254) return 'Link-local (APIPA)';
  if (a === 100 && ((ipInt >>> 16) & 255) >= 64 && ((ipInt >>> 16) & 255) <= 127) return 'Carrier-grade NAT';
  if (a >= 224 && a <= 239) return 'Multicast';
  if (a >= 240) return 'Reserved';
  if (a === 0) return '"This" network';
  return 'Public';
}

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}
