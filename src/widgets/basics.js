import { h, $, $$, loop, setupCanvas, pointerPos, widgetShell, COLORS, store, sleep } from '../core.js';

/* =========================================================
   Topology playground — presets, cut links, watch reachability
   ========================================================= */
export function topology(mount) {
  const w = widgetShell('topology.lab', {
    controls: `<div class="seg" role="tablist">${['bus', 'star', 'ring', 'mesh', 'tree'].map((t, i) => `<button data-t="${t}" class="${i === 1 ? 'on' : ''}">${t}</button>`).join('')}</div>`,
    foot: '<span id="topo-stat"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  const canvas = document.createElement('canvas');
  body.appendChild(canvas);
  const { ctx, size } = setupCanvas(canvas, 0.5, 300);
  const stat = $('#topo-stat', w);

  let nodes = [], links = [], src = 0, pulses = [], t0 = 0, hoverLink = -1;
  const N = 7;

  function build(type) {
    nodes = []; links = []; pulses = [];
    const W = 1, H = 1; // normalized coordinates, mapped at draw time
    const add = (x, y, kind = 'host') => nodes.push({ x, y, kind }) - 1;
    const link = (a, b) => links.push({ a, b, cut: false });
    if (type === 'bus') {
      const taps = [];
      for (let i = 0; i < N; i++) {
        const x = 0.1 + (0.8 * i) / (N - 1);
        taps.push(add(x, 0.5, 'tap'));
      }
      for (let i = 0; i < N - 1; i++) link(taps[i], taps[i + 1]);
      for (let i = 0; i < N; i++) {
        const hn = add(nodes[taps[i]].x, i % 2 ? 0.2 : 0.8);
        link(taps[i], hn);
      }
      src = N; // first host
    } else if (type === 'star') {
      const c = add(0.5, 0.5, 'hub');
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        link(c, add(0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.38));
      }
      src = 1;
    } else if (type === 'ring') {
      const ids = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 - Math.PI / 2;
        ids.push(add(0.5 + Math.cos(a) * 0.3, 0.5 + Math.sin(a) * 0.38));
      }
      for (let i = 0; i < N; i++) link(ids[i], ids[(i + 1) % N]);
      src = 0;
    } else if (type === 'mesh') {
      const ids = [];
      const M = 6;
      for (let i = 0; i < M; i++) {
        const a = (i / M) * Math.PI * 2 - Math.PI / 2;
        ids.push(add(0.5 + Math.cos(a) * 0.28, 0.5 + Math.sin(a) * 0.38));
      }
      for (let i = 0; i < M; i++) for (let j = i + 1; j < M; j++) link(ids[i], ids[j]);
      src = 0;
    } else if (type === 'tree') {
      const r = add(0.5, 0.15, 'hub');
      const a = add(0.28, 0.48, 'hub'), b = add(0.72, 0.48, 'hub');
      link(r, a); link(r, b);
      [0.14, 0.28, 0.42].forEach((x) => link(a, add(x, 0.84)));
      [0.58, 0.72, 0.86].forEach((x) => link(b, add(x, 0.84)));
      src = 3;
    }
    t0 = performance.now() / 1000;
    computeReach();
  }

  let reach = new Map(); // node -> hop distance
  function computeReach() {
    reach = new Map([[src, 0]]);
    const q = [src];
    while (q.length) {
      const u = q.shift();
      for (const l of links) {
        if (l.cut) continue;
        const v = l.a === u ? l.b : l.b === u ? l.a : -1;
        if (v >= 0 && !reach.has(v)) { reach.set(v, reach.get(u) + 1); q.push(v); }
      }
    }
    const hosts = nodes.map((n, i) => i).filter((i) => nodes[i].kind === 'host');
    const ok = hosts.filter((i) => reach.has(i)).length;
    const cut = links.filter((l) => l.cut).length;
    stat.innerHTML = `source: <b style="color:${COLORS.mint}">node ${hosts.indexOf(src) + 1}</b> · reachable hosts: <b style="color:${ok === hosts.length ? COLORS.mint : COLORS.orange}">${ok}/${hosts.length}</b> · links: ${links.length} (${cut} cut) · <span style="color:${COLORS.muted}">click a link to cut it, click a host to make it the source</span>`;
    if (cut >= 1 && ok < hosts.length) store.award('topo-partition', 10, 'You partitioned a network');
  }

  const P = (n) => ({ x: n.x * size.w, y: n.y * size.h });

  function distToSeg(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = pointerPos(canvas, e);
    hoverLink = -1;
    let best = 10;
    links.forEach((l, i) => { const d = distToSeg(p, P(nodes[l.a]), P(nodes[l.b])); if (d < best) { best = d; hoverLink = i; } });
    const overNode = nodes.some((n) => n.kind === 'host' && Math.hypot(P(n).x - p.x, P(n).y - p.y) < 18);
    canvas.style.cursor = hoverLink >= 0 || overNode ? 'pointer' : 'default';
  });
  canvas.addEventListener('click', (e) => {
    const p = pointerPos(canvas, e);
    const ni = nodes.findIndex((n) => n.kind === 'host' && Math.hypot(P(n).x - p.x, P(n).y - p.y) < 18);
    if (ni >= 0) { src = ni; t0 = performance.now() / 1000; computeReach(); return; }
    if (hoverLink >= 0) { links[hoverLink].cut = !links[hoverLink].cut; t0 = performance.now() / 1000; computeReach(); }
  });

  $$('.seg button', w).forEach((b) => b.addEventListener('click', () => {
    $$('.seg button', w).forEach((x) => x.classList.toggle('on', x === b));
    build(b.dataset.t);
  }));

  build('star');

  loop((dt, t) => {
    const W = size.w, H = size.h;
    ctx.clearRect(0, 0, W, H);
    // links
    links.forEach((l, i) => {
      const a = P(nodes[l.a]), b = P(nodes[l.b]);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      if (l.cut) {
        ctx.setLineDash([4, 6]); ctx.strokeStyle = 'rgba(255,84,112,0.6)'; ctx.lineWidth = 2;
      } else {
        ctx.setLineDash([]); ctx.strokeStyle = i === hoverLink ? COLORS.orange : 'rgba(160,175,220,0.28)'; ctx.lineWidth = i === hoverLink ? 3 : 2;
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (l.cut) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        ctx.fillStyle = COLORS.danger; ctx.font = '700 14px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('✕', mx, my);
      }
    });
    // broadcast wave: a pulse travels along each link outward from src by hop distance
    const period = 2.6;
    const phase = ((t - t0) % period) / period * 4; // hops per period
    links.forEach((l) => {
      if (l.cut) return;
      const da = reach.get(l.a), db = reach.get(l.b);
      if (da === undefined || db === undefined || da === db) return;
      const [from, to, d] = da < db ? [l.a, l.b, da] : [l.b, l.a, db];
      const k = phase - d;
      if (k < 0 || k > 1) return;
      const a = P(nodes[from]), b = P(nodes[to]);
      const x = a.x + (b.x - a.x) * k, y = a.y + (b.y - a.y) * k;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
      g.addColorStop(0, 'rgba(92,242,194,0.9)'); g.addColorStop(1, 'rgba(92,242,194,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
    });
    // nodes
    let hostNo = 0;
    nodes.forEach((n, i) => {
      const p = P(n);
      if (n.kind === 'tap') {
        ctx.fillStyle = 'rgba(160,175,220,0.5)'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
        return;
      }
      const reached = reach.has(i);
      const isSrc = i === src;
      const r = n.kind === 'hub' ? 20 : 16;
      ctx.beginPath();
      if (n.kind === 'hub') ctx.roundRect(p.x - r, p.y - r * 0.7, r * 2, r * 1.4, 6); else ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isSrc ? COLORS.mint : reached ? '#16203a' : '#1a0d14';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSrc ? COLORS.mint : reached ? (n.kind === 'hub' ? COLORS.violet : 'rgba(92,242,194,0.6)') : COLORS.danger;
      ctx.stroke();
      if (reached && !isSrc && n.kind === 'host') {
        const hop = reach.get(i);
        const lit = phase > hop && phase < hop + 0.6;
        if (lit) { ctx.strokeStyle = COLORS.mint; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2); ctx.stroke(); }
      }
      ctx.fillStyle = isSrc ? '#04110c' : COLORS.text;
      ctx.font = '600 11px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(n.kind === 'hub' ? 'SW' : String(++hostNo), p.x, p.y);
    });
  }, canvas);
}

/* =========================================================
   OSI explorer + encapsulation animator
   ========================================================= */
const OSI = [
  { n: 7, name: 'Application', pdu: 'Data', c: '#ff5c9a', ex: 'HTTP, DNS, SMTP, SSH', what: 'Where apps speak their protocols: browsers request pages, mail clients send email, resolvers look up names.', hdr: 'HTTP' },
  { n: 6, name: 'Presentation', pdu: 'Data', c: '#ff7a45', ex: 'TLS, JPEG, UTF‑8, gzip', what: 'Translates data formats: encoding, compression and encryption so both ends interpret bytes the same way.', hdr: null },
  { n: 5, name: 'Session', pdu: 'Data', c: '#ffd166', ex: 'Sessions, RPC, sockets', what: 'Opens, manages and closes dialogues between apps. In TCP/IP this is folded into the app and transport.', hdr: null },
  { n: 4, name: 'Transport', pdu: 'Segment', c: '#5cf2c2', ex: 'TCP, UDP, QUIC', what: 'End‑to‑end delivery between programs using ports; TCP adds reliability, ordering and congestion control.', hdr: 'TCP' },
  { n: 3, name: 'Network', pdu: 'Packet', c: '#4cc9ff', ex: 'IPv4, IPv6, ICMP', what: 'Logical addressing (IP) and routing across many networks from source to destination host.', hdr: 'IP' },
  { n: 2, name: 'Data link', pdu: 'Frame', c: '#8b7bff', ex: 'Ethernet, Wi‑Fi, ARP', what: 'Delivers frames across one local link using MAC addresses; detects bit errors with a CRC.', hdr: 'ETH' },
  { n: 1, name: 'Physical', pdu: 'Bits', c: '#b4bdd3', ex: 'Copper, fibre, radio', what: 'Turns bits into signals — voltages, light pulses, radio waves — and back.', hdr: null },
];

export function osi(mount) {
  const w = widgetShell('osi.explorer', {
    controls: `<button class="btn small" id="osi-send">▶ Send "GET /"</button><button class="btn small ghost" id="osi-recv">◀ Receive</button>`,
    foot: '<span id="osi-foot">Click a layer to learn what it does.</span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.innerHTML = `<div class="osi-wrap">
    <div class="osi-stack">${OSI.map((l) => `<button class="osi-layer" style="--c:${l.c}" data-n="${l.n}"><span class="n">${l.n}</span><span><b>${l.name}</b><br><span class="pdu">${l.ex}</span></span><span class="pdu">${l.pdu}</span></button>`).join('')}</div>
    <div class="osi-detail" id="osi-detail"></div>
  </div>`;
  const detail = $('#osi-detail', body);
  const foot = $('#osi-foot', w);
  let busy = false;

  function show(n) {
    const l = OSI.find((x) => x.n === n);
    $$('.osi-layer', body).forEach((b) => b.classList.toggle('active', +b.dataset.n === n));
    const tcpip = n >= 5 ? 'Application' : n === 4 ? 'Transport' : n === 3 ? 'Internet' : 'Link';
    detail.innerHTML = `<span class="tag" style="color:${l.c};border-color:${l.c}55">Layer ${l.n} · TCP/IP: ${tcpip}</span>
      <h3 style="margin-top:12px">${l.name}</h3><p>${l.what}</p>
      <div class="kv"><div><small>PDU</small><b>${l.pdu}</b></div><div><small>Examples</small><b style="font-size:.85rem">${l.ex}</b></div></div>
      <div id="osi-packet" style="margin-top:18px"></div>`;
  }
  show(7);

  const pkt = (layers) => `<div class="packet-vis">${layers.map((x) => `<div style="background:${x.c};${x.flex ? 'flex:1' : ''}">${x.t}</div>`).join('')}</div>`;

  async function send(reverse) {
    if (busy) return; busy = true;
    const order = reverse ? [...OSI].reverse() : OSI;
    let parts = [{ t: 'GET / HTTP/1.1', c: '#e9edf7', flex: true }];
    const steps = [];
    // build states top-down
    for (const l of OSI) {
      if (l.hdr === 'TCP') parts = [{ t: 'TCP :443', c: l.c }, ...parts];
      if (l.hdr === 'IP') parts = [{ t: 'IP 10.0.0.5→93.184.215.14', c: l.c }, ...parts];
      if (l.hdr === 'ETH') parts = [{ t: 'ETH', c: l.c }, ...parts, { t: 'FCS', c: l.c }];
      if (l.hdr === 'HTTP') parts = [{ t: 'GET / HTTP/1.1', c: l.c, flex: true }];
      steps.push({ l, parts: [...parts] });
    }
    const seq = reverse ? [...steps].reverse() : steps;
    for (let i = 0; i < seq.length; i++) {
      const { l, parts: ps } = seq[i];
      show(l.n);
      const box = $('#osi-packet', detail);
      if (l.n === 1) {
        box.innerHTML = `<div class="mono" style="color:${COLORS.dim};font-size:.75rem;word-break:break-all;line-height:1.5">${Array.from({ length: 160 }, () => (Math.random() > 0.5 ? '1' : '0')).join('')}</div>`;
      } else {
        box.innerHTML = pkt(reverse && i > 0 ? seq[i].parts : ps);
      }
      foot.innerHTML = reverse
        ? `<span style="color:${l.c}">L${l.n} ${l.name}</span> — ${l.hdr ? `reads & strips the ${l.hdr} header` : l.n === 1 ? 'turns signals back into bits' : 'nothing to strip in TCP/IP'}`
        : `<span style="color:${l.c}">L${l.n} ${l.name}</span> — ${l.hdr ? `adds the ${l.hdr} header${l.hdr === 'ETH' ? ' + FCS trailer' : ''}` : l.n === 1 ? 'sends the frame as signals on the wire' : 'handled inside the app in TCP/IP'}`;
      await sleep(1100);
    }
    store.award(reverse ? 'osi-decap' : 'osi-encap', 10, reverse ? 'Decapsulation complete' : 'Encapsulation complete');
    busy = false;
  }

  $$('.osi-layer', body).forEach((b) => b.addEventListener('click', () => !busy && show(+b.dataset.n)));
  $('#osi-send', w).addEventListener('click', () => send(false));
  $('#osi-recv', w).addEventListener('click', () => send(true));
}

/* =========================================================
   Signal / line-code visualiser
   ========================================================= */
export function signal(mount) {
  const w = widgetShell('line.codes', {
    controls: `<div class="seg">${['NRZ', 'Manchester', 'PAM-4'].map((t, i) => `<button data-m="${t}" class="${i === 0 ? 'on' : ''}">${t}</button>`).join('')}</div>`,
    foot: `<span>bits:</span><input class="input" id="sig-bits" value="1011000011110010" maxlength="24" style="max-width:260px;padding:6px 10px"> <label style="display:flex;gap:8px;align-items:center">noise <input type="range" id="sig-noise" min="0" max="100" value="10" style="width:120px"></label>`,
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  body.style.padding = '0';
  const canvas = document.createElement('canvas');
  body.appendChild(canvas);
  const { ctx, size } = setupCanvas(canvas, 0.32, 220);
  let mode = 'NRZ';
  const bitsIn = $('#sig-bits', w), noiseIn = $('#sig-noise', w);
  bitsIn.addEventListener('input', () => { bitsIn.value = bitsIn.value.replace(/[^01]/g, ''); });
  $$('.seg button', w).forEach((b) => b.addEventListener('click', () => {
    $$('.seg button', w).forEach((x) => x.classList.toggle('on', x === b)); mode = b.dataset.m;
  }));

  loop((dt, t) => {
    const W = size.w, H = size.h;
    ctx.clearRect(0, 0, W, H);
    const bits = (bitsIn.value || '0').split('').map(Number);
    const pad = 28, top = 44, bot = H - 30;
    const n = mode === 'PAM-4' ? Math.ceil(bits.length / 2) : bits.length;
    const cw = (W - pad * 2) / n;
    // grid
    ctx.strokeStyle = 'rgba(160,175,220,0.08)'; ctx.lineWidth = 1;
    for (let i = 0; i <= n; i++) { ctx.beginPath(); ctx.moveTo(pad + i * cw, top - 14); ctx.lineTo(pad + i * cw, bot + 6); ctx.stroke(); }
    // labels
    ctx.font = '600 12px JetBrains Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let i = 0; i < n; i++) {
      const lab = mode === 'PAM-4' ? `${bits[i * 2] ?? 0}${bits[i * 2 + 1] ?? 0}` : String(bits[i]);
      ctx.fillStyle = COLORS.yellow; ctx.fillText(lab, pad + i * cw + cw / 2, 20);
    }
    // waveform points
    const lvl = (v) => bot - v * (bot - top); // v in [0,1]
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x0 = pad + i * cw, x1 = x0 + cw;
      if (mode === 'NRZ') { const v = bits[i]; pts.push([x0, v], [x1, v]); }
      else if (mode === 'Manchester') { const b = bits[i]; const a = b ? 0 : 1; pts.push([x0, a], [x0 + cw / 2, a], [x0 + cw / 2, 1 - a], [x1, 1 - a]); }
      else { const v = ((bits[i * 2] ?? 0) * 2 + (bits[i * 2 + 1] ?? 0)); const map = [0, 1 / 3, 2 / 3, 1]; const gray = [0, 1, 3, 2]; pts.push([x0, map[gray[v]]], [x1, map[gray[v]]]); }
    }
    const noise = +noiseIn.value / 100;
    ctx.beginPath();
    let first = true;
    for (let k = 0; k < pts.length - 1; k++) {
      const [xa, va] = pts[k], [xb, vb] = pts[k + 1];
      const steps = Math.max(1, Math.round((xb - xa) / 3));
      for (let s = 0; s <= steps; s++) {
        const x = xa + ((xb - xa) * s) / steps;
        const v = va + (vb - va) * (s / steps);
        const nz = noise * 0.18 * (Math.sin(x * 0.9 + t * 13) * 0.5 + Math.sin(x * 2.7 - t * 7) * 0.3 + (Math.random() - 0.5) * 0.6);
        const y = lvl(v + nz);
        if (first) { ctx.moveTo(x, y); first = false; } else ctx.lineTo(x, y);
      }
    }
    ctx.strokeStyle = mode === 'NRZ' ? COLORS.mint : mode === 'Manchester' ? COLORS.violet : COLORS.orange;
    ctx.lineWidth = 2.5; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10; ctx.stroke(); ctx.shadowBlur = 0;
    // sampling cursor
    const cx = pad + ((t * 60) % (W - pad * 2));
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([3, 4]);
    ctx.beginPath(); ctx.moveTo(cx, top - 10); ctx.lineTo(cx, bot + 6); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = COLORS.muted; ctx.font = '11px JetBrains Mono'; ctx.textAlign = 'left';
    ctx.fillText(mode === 'NRZ' ? 'high = 1, low = 0' : mode === 'Manchester' ? 'rising mid-bit = 1, falling = 0 (IEEE 802.3)' : '4 levels → 2 bits per symbol (Gray coded)', pad, H - 10);
  }, canvas);
}

/* =========================================================
   Bit flipper — 32 bits of IPv4
   ========================================================= */
export function bits(mount) {
  const w = widgetShell('ipv4.bits', {
    controls: `<button class="btn small ghost" data-preset="192.168.1.42">192.168.1.42</button><button class="btn small ghost" data-preset="10.0.0.1">10.0.0.1</button><button class="btn small ghost" data-preset="255.255.255.0">255.255.255.0</button>`,
    foot: '<span id="bits-foot"></span>',
  });
  mount.appendChild(w);
  const body = $('.widget-body', w);
  let val = [192, 168, 1, 42];
  body.innerHTML = `<div class="bits">${[0, 1, 2, 3].map((o) => `<div class="octet" data-o="${o}">
      <div class="w">${[128, 64, 32, 16, 8, 4, 2, 1].map((x) => `<span>${x}</span>`).join('')}</div>
      <div class="row">${[7, 6, 5, 4, 3, 2, 1, 0].map((b) => `<button class="bit" data-b="${b}" aria-label="octet ${o + 1} bit ${b}">0</button>`).join('')}</div>
      <div class="dec">0</div></div>`).join('')}</div>
    <div style="margin-top:18px;display:flex;gap:14px;flex-wrap:wrap;align-items:end">
      <div class="field" style="flex:1;min-width:200px"><label>Dotted decimal</label><input class="input" id="bits-ip" value="192.168.1.42"></div>
      <div class="field" style="flex:2;min-width:240px"><label>Binary</label><div class="input" id="bits-bin" style="overflow-x:auto;white-space:nowrap"></div></div>
    </div>`;
  const ipIn = $('#bits-ip', body);
  const render = () => {
    $$('.octet', body).forEach((oc) => {
      const o = +oc.dataset.o;
      $$('.bit', oc).forEach((b) => { const on = (val[o] >> +b.dataset.b) & 1; b.classList.toggle('on', !!on); b.textContent = on; });
      $('.dec', oc).textContent = val[o];
    });
    $('#bits-bin', body).textContent = val.map((v) => v.toString(2).padStart(8, '0')).join('.');
    if (document.activeElement !== ipIn) ipIn.value = val.join('.');
    const total = val.reduce((n, v) => n * 256 + v, 0);
    $('#bits-foot', w).innerHTML = `as one 32-bit number: <b style="color:${COLORS.mint}">${total.toLocaleString('en-US')}</b> · hex: <b style="color:${COLORS.violet}">0x${total.toString(16).padStart(8, '0').toUpperCase()}</b>`;
    if (val.join('.') === '255.255.255.255') store.award('bits-all', 10, 'All 32 bits set!');
  };
  body.addEventListener('click', (e) => {
    const b = e.target.closest('.bit'); if (!b) return;
    const o = +b.closest('.octet').dataset.o;
    val[o] ^= 1 << +b.dataset.b; render();
  });
  ipIn.addEventListener('input', () => {
    const p = ipIn.value.split('.').map(Number);
    const ok = p.length === 4 && p.every((x) => Number.isInteger(x) && x >= 0 && x <= 255) && ipIn.value.split('.').every((s) => s !== '');
    ipIn.classList.toggle('bad', !ok);
    if (ok) { val = p; render(); }
  });
  $$('[data-preset]', w).forEach((b) => b.addEventListener('click', () => { val = b.dataset.preset.split('.').map(Number); render(); }));
  render();
}
