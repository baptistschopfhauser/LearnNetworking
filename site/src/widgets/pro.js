import { $, $$, loop, setupCanvas, pointerPos, widgetShell, COLORS, store, pick, rand } from '../core.js';

/* =========================================================
   Wi‑Fi floor plan: drag APs + laptop, see RSSI / SINR / rate
   ========================================================= */
const WALLS = [
  // [x1,y1,x2,y2,loss dB] in metres on a 20 x 12 m flat
  [0, 0, 20, 0, 0], [20, 0, 20, 12, 0], [20, 12, 0, 12, 0], [0, 12, 0, 0, 0],
  [8, 0, 8, 4.5, 6], [8, 6.5, 8, 12, 6],
  [8, 6, 14, 6, 5], [15.5, 6, 20, 6, 5],
  [14, 0, 14, 3, 10], [14, 4.5, 14, 6, 10],
  [0, 7, 3, 7, 4], [4.5, 7, 8, 7, 4],
];
const ROOMS = [['Living room', 4, 3.4], ['Kitchen', 11, 3], ['Bath', 17, 2.6], ['Bedroom', 4, 9.8], ['Office', 14, 9.5]];
const RATES = [[5, 'BPSK 1/2', 7], [8, 'QPSK 1/2', 14], [11, 'QPSK 3/4', 21], [15, '16-QAM 1/2', 29], [18, '16-QAM 3/4', 43], [22, '64-QAM 2/3', 58], [25, '64-QAM 3/4', 65], [28, '64-QAM 5/6', 72], [32, '256-QAM 3/4', 87], [35, '256-QAM 5/6', 96], [38, '1024-QAM 5/6', 120]];
const segX = (ax, ay, bx, by, cx, cy, dx, dy) => {
  const d = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
  if (!d) return false;
  const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / d;
  const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
};

export function wifi(mount) {
  const w = widgetShell('wifi.planner', {
    controls: `<div class="seg" id="wf-band"><button data-b="2.4" class="on">2.4 GHz</button><button data-b="5">5 GHz</button></div>
      <label class="mono" style="font-size:.72rem;color:var(--muted);display:flex;gap:6px;align-items:center">AP1 ch <select class="input" id="wf-c1" style="width:auto;padding:4px 6px"><option>1</option><option selected>6</option><option>11</option></select></label>
      <label class="mono" style="font-size:.72rem;color:var(--muted);display:flex;gap:6px;align-items:center">AP2 ch <select class="input" id="wf-c2" style="width:auto;padding:4px 6px"><option>1</option><option selected>6</option><option>11</option></select></label>
      <label class="mono" style="font-size:.72rem;color:var(--muted);display:flex;gap:6px;align-items:center"><input type="checkbox" id="wf-ap2" checked> AP2</label>`,
    foot: '<span id="wf-foot"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  const canvas = document.createElement('canvas');
  body.appendChild(canvas);
  canvas.style.touchAction = 'none';
  const { ctx, size } = setupCanvas(canvas, 0.6, 260);
  const W = 20, H = 12;
  const items = { ap1: { x: 4, y: 3, label: 'AP1' }, ap2: { x: 16, y: 9, label: 'AP2' }, lap: { x: 15, y: 2.5, label: '💻' } };
  let band = '2.4', drag = null, heat = null, dirty = true;

  const sx = (x) => (x / W) * size.w, sy = (y) => (y / H) * size.h;
  const rssiAt = (ap, x, y) => {
    const d = Math.max(0.5, Math.hypot(ap.x - x, ap.y - y));
    let loss = 40 + (band === '5' ? 6 : 0) + 30 * Math.log10(d);
    for (const [ax, ay, bx, by, l] of WALLS) if (l && segX(ap.x, ap.y, x, y, ax, ay, bx, by)) loss += l * (band === '5' ? 1.6 : 1);
    return 20 - loss;
  };
  const aps = () => ($('#wf-ap2', w).checked ? [items.ap1, items.ap2] : [items.ap1]);
  const chans = () => [+$('#wf-c1', w).value, +$('#wf-c2', w).value];
  function link(x, y) {
    const list = aps();
    const r = list.map((a) => rssiAt(a, x, y));
    const bi = r[1] !== undefined && r[1] > r[0] ? 1 : 0;
    const noise = -95;
    const [c1, c2] = chans();
    const cochannel = list.length === 2 && (band === '5' ? false : c1 === c2);
    const interf = cochannel ? r[1 - bi] : -200;
    const nPlusI = 10 * Math.log10(10 ** (noise / 10) + 10 ** (interf / 10));
    const sinr = r[bi] - nPlusI;
    let rate = RATES.filter(([s]) => sinr >= s).pop();
    const mult = band === '5' ? 2 * 4.25 : 2;
    return { rssi: r[bi], ap: bi, sinr, cochannel, mcs: rate ? rate[1] : 'no link', mbps: rate ? Math.round(rate[2] * mult * (cochannel ? 0.5 : 1)) : 0 };
  }
  function buildHeat() {
    const step = 10;
    heat = document.createElement('canvas');
    heat.width = Math.ceil(size.w / step); heat.height = Math.ceil(size.h / step);
    const hx = heat.getContext('2d');
    const img = hx.createImageData(heat.width, heat.height);
    for (let j = 0; j < heat.height; j++) for (let i = 0; i < heat.width; i++) {
      const x = ((i + 0.5) * step / size.w) * W, y = ((j + 0.5) * step / size.h) * H;
      const L = link(x, y);
      const q = Math.max(0, Math.min(1, (L.sinr - 5) / 35)); // 0 bad .. 1 great
      const c = q > 0.5 ? [92 + (1 - (q - 0.5) * 2) * 163, 242, 194 - (1 - (q - 0.5) * 2) * 92] : [255, 84 + q * 2 * 125, 112 - q * 2 * 10];
      const k = (j * heat.width + i) * 4;
      img.data[k] = c[0]; img.data[k + 1] = c[1]; img.data[k + 2] = c[2]; img.data[k + 3] = L.mbps ? 70 : 40;
    }
    hx.putImageData(img, 0, 0);
    dirty = false;
  }
  canvas.addEventListener('pointerdown', (e) => {
    const p = pointerPos(canvas, e);
    drag = Object.values(items).find((it) => aps().includes(it) || it === items.lap ? Math.hypot(sx(it.x) - p.x, sy(it.y) - p.y) < 26 : false) || null;
    if (drag) canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = pointerPos(canvas, e);
    if (!drag) { canvas.style.cursor = Object.values(items).some((it) => Math.hypot(sx(it.x) - p.x, sy(it.y) - p.y) < 26) ? 'grab' : 'default'; return; }
    drag.x = Math.max(0.4, Math.min(W - 0.4, (p.x / size.w) * W)); drag.y = Math.max(0.4, Math.min(H - 0.4, (p.y / size.h) * H));
    if (drag !== items.lap) dirty = true;
  });
  canvas.addEventListener('pointerup', () => { if (drag) store.award('wifi-drag', 5, 'Site survey started'); drag = null; });
  $$('#wf-band button', w).forEach((b) => b.addEventListener('click', () => { $$('#wf-band button', w).forEach((x) => x.classList.toggle('on', x === b)); band = b.dataset.b; dirty = true; }));
  ['#wf-c1', '#wf-c2', '#wf-ap2'].forEach((id) => $(id, w).addEventListener('change', () => (dirty = true)));
  let lastSize = 0;

  loop((dt, t) => {
    if (size.w !== lastSize) { lastSize = size.w; dirty = true; }
    if (dirty) buildHeat();
    ctx.clearRect(0, 0, size.w, size.h);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(heat, 0, 0, size.w, size.h);
    ctx.fillStyle = 'rgba(8,11,22,0.25)'; ctx.fillRect(0, 0, size.w, size.h);
    ctx.font = '600 11px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ROOMS.forEach(([n, x, y]) => { ctx.fillStyle = 'rgba(233,237,247,0.35)'; ctx.fillText(n.toUpperCase(), sx(x), sy(y)); });
    WALLS.forEach(([ax, ay, bx, by, l]) => { ctx.strokeStyle = l >= 10 ? '#b4bdd3' : 'rgba(180,189,211,0.75)'; ctx.lineWidth = l >= 10 ? 6 : l ? 3.5 : 5; ctx.beginPath(); ctx.moveTo(sx(ax), sy(ay)); ctx.lineTo(sx(bx), sy(by)); ctx.stroke(); });
    const L = link(items.lap.x, items.lap.y);
    const list = aps();
    const ap = list[L.ap];
    // link line
    ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 30;
    ctx.strokeStyle = L.mbps ? COLORS.mint : COLORS.danger; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx(ap.x), sy(ap.y)); ctx.lineTo(sx(items.lap.x), sy(items.lap.y)); ctx.stroke(); ctx.setLineDash([]);
    list.forEach((a, i) => {
      const x = sx(a.x), y = sy(a.y);
      for (let k = 0; k < 3; k++) { const r = ((t * 30 + k * 22) % 66) + 8; ctx.strokeStyle = `rgba(139,123,255,${0.6 * (1 - r / 74)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); }
      ctx.fillStyle = '#16203a'; ctx.strokeStyle = COLORS.violet; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x - 22, y - 13, 44, 26, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.font = '700 11px JetBrains Mono'; ctx.fillText(a.label, x, y - 1);
      ctx.fillStyle = COLORS.muted; ctx.font = '9px JetBrains Mono'; ctx.fillText(band === '5' ? '5G' : 'ch ' + chans()[i], x, y + 22);
    });
    const lx = sx(items.lap.x), ly = sy(items.lap.y);
    ctx.fillStyle = 'rgba(8,11,22,0.85)'; ctx.strokeStyle = L.mbps ? COLORS.mint : COLORS.danger; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(lx, ly, 20, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.font = '18px sans-serif'; ctx.fillText('💻', lx, ly + 1);
    const q = L.rssi > -55 ? ['Excellent', COLORS.mint] : L.rssi > -67 ? ['Good', COLORS.mint] : L.rssi > -75 ? ['Fair', COLORS.yellow] : ['Poor', COLORS.danger];
    $('#wf-foot', w).innerHTML = `connected to <b>${ap.label}</b> · RSSI <b style="color:${q[1]}">${L.rssi.toFixed(0)} dBm (${q[0]})</b> · SINR <b>${L.sinr.toFixed(0)} dB</b> · ${L.mcs} → <b style="color:${COLORS.mint}">~${L.mbps} Mbps</b>${L.cochannel ? ` · <span style="color:${COLORS.orange}">⚠ both APs on channel ${chans()[0]}: interference + shared airtime</span>` : ''} <span style="color:var(--muted)">· drag the APs and the laptop</span>`;
    if (L.rssi < -80 && list.length === 2 && !L.cochannel) store.award('wifi-deadzone', 5, 'Found a dead zone');
  }, canvas);
}

/* =========================================================
   Load balancer simulator
   ========================================================= */
export function loadbalancer(mount) {
  const w = widgetShell('lb.sim', {
    controls: `<div class="seg" id="lb-alg"><button data-a="rr" class="on">Round robin</button><button data-a="lc">Least conn</button><button data-a="w">Weighted</button><button data-a="hash">IP hash</button></div>`,
    foot: `<label class="mono" style="font-size:.75rem;display:flex;gap:8px;align-items:center">traffic <input type="range" id="lb-rate" min="1" max="14" value="6" style="width:110px"></label>
      <button class="btn small ghost" data-t="slow">🐢 Make B slow</button><button class="btn small ghost" data-t="kill" data-s="2">💀 Kill C</button><button class="btn small ghost" id="lb-reset">↺ Reset stats</button><span id="lb-stats" style="flex-basis:100%"></span>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  const canvas = document.createElement('canvas');
  body.appendChild(canvas);
  const { ctx, size } = setupCanvas(canvas, 0.5, 300);
  const servers = [
    { n: 'A', cap: 4, weight: 2, svc: 0.9, up: true, healthy: true, fails: 0, active: [], queue: [], slow: false },
    { n: 'B', cap: 4, weight: 2, svc: 0.9, up: true, healthy: true, fails: 0, active: [], queue: [], slow: false },
    { n: 'C', cap: 2, weight: 1, svc: 0.9, up: true, healthy: true, fails: 0, active: [], queue: [], slow: false },
  ];
  const clients = ['198.51.100.7', '203.0.113.20', '192.0.2.44', '198.51.100.99', '203.0.113.5'];
  let alg = 'rr', rr = 0, wrr = 0, spawnAcc = 0, hcAcc = 0, now = 0;
  let stats = { ok: 0, fail: 0, lat: [], per: [0, 0, 0] };
  const flying = []; // {kind, from, to, t, dur, req}
  const P = {
    client: (i) => ({ x: size.w * 0.08, y: size.h * (0.15 + i * 0.175) }),
    lb: () => ({ x: size.w * 0.42, y: size.h * 0.5 }),
    srv: (i) => ({ x: size.w * 0.82, y: size.h * (0.2 + i * 0.3) }),
  };
  const fly = (from, to, color, dur, done) => flying.push({ from, to, color, t: 0, dur, done });

  function choose(req) {
    const pool = servers.map((s, i) => ({ s, i })).filter((x) => x.s.healthy);
    if (!pool.length) return -1;
    if (alg === 'rr') { const x = pool[rr++ % pool.length]; return x.i; }
    if (alg === 'lc') return pool.reduce((a, b) => (a.s.active.length + a.s.queue.length <= b.s.active.length + b.s.queue.length ? a : b)).i;
    if (alg === 'w') { const list = pool.flatMap((x) => Array(x.s.weight).fill(x.i)); return list[wrr++ % list.length]; }
    const h = [...req.client].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    return pool[h % pool.length].i;
  }
  function spawn() {
    const ci = rand(0, clients.length - 1);
    const req = { client: clients[ci], ci, born: now };
    fly(P.client(ci), P.lb(), COLORS.sky, 0.45, () => {
      const si = choose(req);
      if (si < 0) { stats.fail++; fly(P.lb(), P.client(ci), COLORS.danger, 0.45, () => {}); return; }
      req.si = si;
      fly(P.lb(), P.srv(si), COLORS.violet, 0.45, () => {
        const s = servers[si];
        if (!s.up) { stats.fail++; fly(P.srv(si), P.client(ci), COLORS.danger, 0.7, () => {}); return; }
        s.queue.push(req);
      });
    });
  }
  $$('#lb-alg button', w).forEach((b) => b.addEventListener('click', () => { $$('#lb-alg button', w).forEach((x) => x.classList.toggle('on', x === b)); alg = b.dataset.a; resetStats(); }));
  const resetStats = () => (stats = { ok: 0, fail: 0, lat: [], per: [0, 0, 0] });
  $('#lb-reset', w).onclick = resetStats;
  $('[data-t="slow"]', w).onclick = (e) => { const s = servers[1]; s.slow = !s.slow; s.svc = s.slow ? 4 : 0.9; e.target.textContent = s.slow ? '⚡ Make B fast' : '🐢 Make B slow'; store.award('lb-slow', 5, 'Introduced a slow backend'); };
  $('[data-t="kill"]', w).onclick = (e) => {
    const s = servers[2]; s.up = !s.up;
    if (!s.up) { s.active.forEach(() => stats.fail++); s.queue.forEach(() => stats.fail++); s.active = []; s.queue = []; }
    e.target.textContent = s.up ? '💀 Kill C' : '💚 Revive C';
    store.award('lb-kill', 5, 'Failure injected');
  };

  loop((dt, t) => {
    now += dt;
    const rate = +$('#lb-rate', w).value;
    spawnAcc += dt * rate;
    while (spawnAcc >= 1) { spawnAcc--; spawn(); }
    hcAcc += dt;
    if (hcAcc > 1) { // health checks every second, 2 failures to mark down, 1 success to restore
      hcAcc = 0;
      servers.forEach((s, i) => {
        fly(P.lb(), P.srv(i), 'rgba(255,209,102,0.9)', 0.3, () => {});
        if (!s.up) { s.fails++; if (s.fails >= 2) s.healthy = false; } else { s.fails = 0; if (!s.healthy) { s.healthy = true; } }
      });
    }
    servers.forEach((s, i) => {
      while (s.up && s.active.length < s.cap && s.queue.length) { const r = s.queue.shift(); r.start = now; r.dur = s.svc * (0.7 + Math.random() * 0.6); s.active.push(r); }
      for (let k = s.active.length - 1; k >= 0; k--) {
        const r = s.active[k];
        if (now - r.start >= r.dur) {
          s.active.splice(k, 1);
          fly(P.srv(i), P.client(r.ci), COLORS.mint, 0.55, () => { stats.ok++; stats.per[i]++; stats.lat.push(now - r.born); if (stats.lat.length > 200) stats.lat.shift(); });
        }
      }
    });
    if (stats.ok > 150 && alg === 'lc' && servers[1].slow) store.award('lb-lc', 15, 'Least-connections tamed the slow server');

    ctx.clearRect(0, 0, size.w, size.h);
    const lb = P.lb();
    ctx.strokeStyle = 'rgba(160,175,220,0.18)'; ctx.lineWidth = 1.5;
    clients.forEach((_, i) => { const c = P.client(i); ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(lb.x, lb.y); ctx.stroke(); });
    servers.forEach((s, i) => { const p = P.srv(i); ctx.setLineDash(s.healthy ? [] : [4, 6]); ctx.strokeStyle = s.healthy ? 'rgba(139,123,255,0.35)' : 'rgba(255,84,112,0.45)'; ctx.beginPath(); ctx.moveTo(lb.x, lb.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    clients.forEach((c, i) => { const p = P.client(i); ctx.fillStyle = '#121a30'; ctx.strokeStyle = 'rgba(160,175,220,.35)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(p.x, p.y, 13, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.font = '12px sans-serif'; ctx.fillText('👤', p.x, p.y + 1); });
    ctx.fillStyle = '#16203a'; ctx.strokeStyle = COLORS.yellow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(lb.x - 46, lb.y - 26, 92, 52, 12); ctx.fill(); ctx.stroke();
    ctx.fillStyle = COLORS.text; ctx.font = '700 12px JetBrains Mono'; ctx.fillText('LOAD', lb.x, lb.y - 8); ctx.fillText('BALANCER', lb.x, lb.y + 8);
    servers.forEach((s, i) => {
      const p = P.srv(i);
      const bw = Math.min(150, size.w * 0.2), bh = 54;
      ctx.fillStyle = s.up ? '#121a30' : '#2a0f18'; ctx.strokeStyle = !s.up ? COLORS.danger : s.slow ? COLORS.orange : COLORS.violet; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(p.x - bw / 2, p.y - bh / 2, bw, bh, 10); ctx.fill(); ctx.stroke();
      ctx.fillStyle = COLORS.text; ctx.font = '700 12px JetBrains Mono'; ctx.textAlign = 'left';
      ctx.fillText(`Server ${s.n}${s.slow ? ' 🐢' : ''}${!s.up ? ' 💀' : ''}`, p.x - bw / 2 + 10, p.y - 14);
      ctx.font = '10px JetBrains Mono'; ctx.fillStyle = COLORS.muted;
      ctx.fillText(`w=${s.weight} cap=${s.cap} ${s.healthy ? '' : 'UNHEALTHY'}`, p.x - bw / 2 + 10, p.y + 1);
      // load bar
      const load = Math.min(1, (s.active.length + s.queue.length) / (s.cap * 3));
      ctx.fillStyle = 'rgba(160,175,220,0.12)'; ctx.fillRect(p.x - bw / 2 + 10, p.y + 12, bw - 20, 6);
      ctx.fillStyle = load > 0.66 ? COLORS.danger : load > 0.33 ? COLORS.yellow : COLORS.mint; ctx.fillRect(p.x - bw / 2 + 10, p.y + 12, (bw - 20) * load, 6);
      ctx.textAlign = 'right'; ctx.fillStyle = COLORS.dim; ctx.fillText(`${s.active.length}+${s.queue.length}q`, p.x + bw / 2 - 8, p.y - 14);
      ctx.textAlign = 'center';
    });
    for (let k = flying.length - 1; k >= 0; k--) {
      const f = flying[k]; f.t += dt / f.dur;
      const e = Math.min(1, f.t);
      const x = f.from.x + (f.to.x - f.from.x) * e, y = f.from.y + (f.to.y - f.from.y) * e;
      ctx.fillStyle = f.color; ctx.shadowColor = f.color; ctx.shadowBlur = 8;
      ctx.beginPath(); ctx.arc(x, y, f.color.startsWith('rgba(255,209') ? 2.5 : 4, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
      if (f.t >= 1) { flying.splice(k, 1); f.done(); }
    }
    const lat = stats.lat.length ? stats.lat.reduce((a, b) => a + b, 0) / stats.lat.length : 0;
    const p95 = stats.lat.length ? [...stats.lat].sort((a, b) => a - b)[Math.floor(stats.lat.length * 0.95)] : 0;
    const el = $('#lb-stats', w);
    if (el && Math.floor(t * 4) !== Math.floor((t - dt) * 4)) el.innerHTML = `served <b style="color:${COLORS.mint}">${stats.ok}</b> · failed <b style="color:${stats.fail ? COLORS.danger : COLORS.dim}">${stats.fail}</b> · avg latency <b>${(lat * 1000).toFixed(0)} ms</b> · p95 <b style="color:${p95 > 3 ? COLORS.orange : COLORS.text}">${(p95 * 1000).toFixed(0)} ms</b> · share A/B/C: ${stats.per.join(' / ')} <span style="color:var(--muted)">· <span style="color:${COLORS.sky}">●</span> request <span style="color:${COLORS.mint}">●</span> response <span style="color:${COLORS.yellow}">●</span> health check</span>`;
  }, canvas);
  void pick;
}
