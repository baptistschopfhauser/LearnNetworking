import { THREE, createStage, starfield, glowSprite, C3, toScreen, gridFloor, easeInOut } from './common.js';
import { loop, onCleanup, shuffle, pick, store, h, $, esc } from '../core.js';

const LAYERS = [
  { key: 'app', name: 'Application', color: '#ff5c9a' },
  { key: 'tr', name: 'Transport', color: '#5cf2c2' },
  { key: 'net', name: 'Network', color: '#4cc9ff' },
  { key: 'link', name: 'Link', color: '#8b7bff' },
];

const SCENARIOS = [
  {
    id: 'web', title: 'Load a web page', icon: '🌐', payload: 'GET /index.html',
    app: 'HTTP GET /index.html (inside TLS)', tr: 'TCP 51514 → 443, SEQ 1, ACK 1', net: 'IPv4 192.168.1.10 → 93.184.215.14, proto 6', link: 'Ethernet → gateway MAC, type 0x0800',
    port: 443, program: 'Web server (nginx)', proto: 'Protocol 6 → TCP', ethertype: 'EtherType 0x0800 → IPv4',
  },
  {
    id: 'dns', title: 'Look up a name', icon: '📇', payload: 'A? example.com',
    app: 'DNS query: A example.com', tr: 'UDP 53001 → 53', net: 'IPv4 192.168.1.10 → 1.1.1.1, proto 17', link: 'Wi‑Fi 802.11 frame → access point',
    port: 53, program: 'DNS resolver', proto: 'Protocol 17 → UDP', ethertype: 'EtherType 0x0800 → IPv4',
  },
  {
    id: 'mail', title: 'Send an email (IPv6)', icon: '✉️', payload: 'MAIL FROM:<ada@lovelace.org>',
    app: 'SMTP MAIL FROM:<ada@…>', tr: 'TCP 60123 → 587, SYN done', net: 'IPv6 2001:db8::5 → 2001:db8::25, next‑hdr 6', link: 'Ethernet → router MAC, type 0x86DD',
    port: 587, program: 'Mail server (SMTP)', proto: 'Next Header 6 → TCP', ethertype: 'EtherType 0x86DD → IPv6',
  },
  {
    id: 'call', title: 'Join a video call', icon: '🎥', payload: '[20 ms of audio]',
    app: 'RTP media frame (SRTP encrypted)', tr: 'UDP 50000 → 3478', net: 'IPv4 10.0.0.7 → 142.250.0.10, proto 17', link: 'Wi‑Fi 802.11 frame → access point',
    port: 3478, program: 'Video call app (WebRTC)', proto: 'Protocol 17 → UDP', ethertype: 'EtherType 0x0800 → IPv4',
  },
  {
    id: 'ping', title: 'Ping a server', icon: '📡', payload: 'echo request #7',
    app: 'No app header — the ping tool builds ICMP directly', tr: 'None — ICMP rides directly inside IP', net: 'IPv4 → 8.8.8.8, proto 1 + ICMP Echo Request', link: 'Ethernet → gateway MAC, type 0x0800',
    port: null, program: 'Kernel ICMP handler', proto: 'Protocol 1 → ICMP', ethertype: 'EtherType 0x0800 → IPv4',
  },
];
const PROGRAMS = ['Web server (nginx)', 'DNS resolver', 'Mail server (SMTP)', 'Video call app (WebRTC)', 'SSH daemon', 'Kernel ICMP handler'];

function encapQuestion(sc, layer) {
  const right = sc[layer.key];
  const pool = [];
  SCENARIOS.forEach((o) => { if (o[layer.key] !== right) pool.push(o[layer.key]); });
  LAYERS.forEach((l) => { if (l.key !== layer.key) pool.push(sc[l.key]); });
  const wrong = shuffle([...new Set(pool)].filter((x) => x !== right)).slice(0, 3);
  return { q: `${layer.name} layer — which header gets added?`, opts: shuffle([right, ...wrong]), right };
}
function decapQuestion(sc, layer) {
  if (layer.key === 'link') {
    const right = sc.ethertype;
    return { q: 'Link layer: dest MAC is ours. Which field says what is inside the frame?', opts: shuffle([right, sc.ethertype.includes('86DD') ? 'EtherType 0x0800 → IPv4' : 'EtherType 0x86DD → IPv6', 'TTL 64 → keep it', 'Dest port → hand to app']), right };
  }
  if (layer.key === 'net') {
    const right = sc.proto;
    const all = ['Protocol 6 → TCP', 'Protocol 17 → UDP', 'Protocol 1 → ICMP', 'Next Header 6 → TCP'];
    return { q: 'Network layer: dest IP is ours. Which transport gets the payload?', opts: shuffle([right, ...shuffle(all.filter((x) => x !== right && !(x.endsWith('TCP') && right.endsWith('TCP')))).slice(0, 2), 'Source MAC → reply']), right };
  }
  if (layer.key === 'tr') {
    const right = sc.program;
    return { q: sc.port ? `Transport layer: destination port ${sc.port}. Which program receives it?` : 'No transport header here. Who handles an ICMP Echo Request?', opts: shuffle([right, ...shuffle(PROGRAMS.filter((p) => p !== right)).slice(0, 3)]), right };
  }
  return { q: 'Application layer: what does the program finally read?', opts: shuffle([sc.payload, ...shuffle(SCENARIOS.filter((s) => s !== sc).map((s) => s.payload)).slice(0, 3)]), right: sc.payload };
}

export function mountTower(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 0.9, bloomRadius: 0.5, bloomThreshold: 0.15, fogDensity: 0.014 });
  scene.add(starfield(1400, 200));
  scene.add(gridFloor(300, 90, -1));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.8));
  const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(8, 20, 12); scene.add(dl);

  const FLOOR_H = 4.2, GAP = 26;
  const towerX = [-GAP / 2, GAP / 2];
  const floorY = (i) => (LAYERS.length - i) * FLOOR_H + 1; // i=0 app (top)
  const labels = [];
  const addLabel = (pos, html, cls = '') => { const el = document.createElement('div'); el.className = 'label3d ' + cls; el.innerHTML = html; hud.appendChild(el); labels.push({ pos, el }); return el; };

  // towers
  const floorMeshes = [[], []];
  towerX.forEach((x, ti) => {
    LAYERS.forEach((l, i) => {
      const y = floorY(i);
      const col = new THREE.Color(l.color);
      const slab = new THREE.Mesh(new THREE.BoxGeometry(9, 0.35, 9), new THREE.MeshStandardMaterial({ color: 0x141b33, emissive: col, emissiveIntensity: 0.06, metalness: 0.6, roughness: 0.4, transparent: true, opacity: 0.92 }));
      slab.position.set(x, y - FLOOR_H / 2 + 0.2, 0);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(9, FLOOR_H - 0.3, 9)), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.35 }));
      edges.position.set(x, y, 0);
      scene.add(slab, edges);
      floorMeshes[ti].push({ slab, edges, col });
      addLabel(new THREE.Vector3(x + (ti ? 5.6 : -5.6), y, 0), `<span style="color:${l.color}">L${i === 0 ? '7–5' : 4 - i + 1}</span> ${l.name}`);
    });
    // physical base
    const base = new THREE.Mesh(new THREE.BoxGeometry(10, 0.6, 10), new THREE.MeshStandardMaterial({ color: 0x0f1428, emissive: 0xb4bdd3, emissiveIntensity: 0.06 }));
    base.position.set(x, 0.3, 0);
    scene.add(base);
    addLabel(new THREE.Vector3(x, -0.2, 6), `<span style="color:#b4bdd3">L1</span> Physical`);
    addLabel(new THREE.Vector3(x, floorY(0) + FLOOR_H / 2 + 1.6, 0), ti ? '🖥 Receiver' : '💻 Sender', 'cur');
  });
  // cable
  const cableCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(towerX[0], 0.6, 0), new THREE.Vector3(-4, 0.4, 4), new THREE.Vector3(4, 0.4, -4), new THREE.Vector3(towerX[1], 0.6, 0)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(cableCurve, 64, 0.18, 8, false), new THREE.MeshStandardMaterial({ color: 0x222a44, emissive: 0xffd166, emissiveIntensity: 0.25 }));
  scene.add(cable);

  // bits for the physical hop
  const BITS = 60;
  const bitGeo = new THREE.BoxGeometry(0.25, 0.25, 0.25);
  const bits = Array.from({ length: BITS }, (_, i) => {
    const m = new THREE.Mesh(bitGeo, new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5cf2c2 : 0xffd166 }));
    m.visible = false; scene.add(m); return m;
  });

  // packet
  const pkt = new THREE.Group();
  scene.add(pkt);
  const core = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), new THREE.MeshStandardMaterial({ color: 0xdfe6ff, emissive: 0xffffff, emissiveIntensity: 0.35 }));
  pkt.add(core, glowSprite(C3.white, 2.2));
  let shells = [];
  function addShell(layer) {
    const n = shells.length + 1;
    const s = 1.2 + n * 0.55;
    const col = new THREE.Color(layer.color);
    const g = new THREE.Group();
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshPhysicalMaterial({ color: col, emissive: col, emissiveIntensity: 0.35, transparent: true, opacity: 0.18, roughness: 0.2, metalness: 0, depthWrite: false }));
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(s, s, s)), new THREE.LineBasicMaterial({ color: col }));
    g.add(m, e);
    g.scale.setScalar(0.01);
    g.userData = { grow: 0, layer };
    pkt.add(g);
    shells.push(g);
  }
  let peeling = [];
  function peelShell() {
    const g = shells.pop();
    if (g) { g.userData.peel = 0; peeling.push(g); }
  }

  /* ---------- HUD ---------- */
  hud.innerHTML = '';
  labels.forEach((l) => hud.appendChild(l.el));
  const top = h(`<div class="hud hud-top">
    <div class="hud-pill"><span>ROUND</span><b id="t-round">1/3</b></div>
    <div class="hud-pill dest"><span>MISSION</span><b id="t-mission">—</b></div>
    <div class="hud-pill"><span>SCORE</span><b id="t-score">0</b></div>
    <div class="hud-pill ttl"><span>COMBO</span><b id="t-combo">×1</b></div>
  </div>`);
  const qpanel = h(`<div class="hud" style="left:50%;bottom:20px;transform:translateX(-50%);width:min(680px,calc(100% - 32px))"><div class="hud-panel" id="t-q" style="display:none"></div></div>`);
  const stackPanel = h(`<div class="hud hud-side" style="top:96px"><div class="hud-panel"><h4>Packet on the wire</h4><div class="packet-vis" id="t-stack" style="height:auto;min-height:44px;flex-wrap:wrap"></div><div id="t-note" style="font-size:.78rem"></div></div></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, qpanel, stackPanel, overlay);
  if (window.innerWidth < 760) stackPanel.style.display = 'none';

  let round = 0, score = 0, combo = 1, sc, phase = 'intro', step = 0, qStart = 0, wrongThis = 0, totalWrong = 0;
  const rounds = shuffle(SCENARIOS).slice(0, 3);
  let move = null; // {from,to,t,dur,done}
  let bitRun = null;
  const target = new THREE.Vector3(towerX[0], floorY(0) + FLOOR_H / 2 + 0.5, 0);
  pkt.position.copy(target);

  const set = (id, t) => { const e = shell.querySelector('#' + id); if (e) e.textContent = t; };
  const updHud = () => { set('t-round', `${Math.min(round + 1, 3)}/3`); set('t-mission', sc ? `${sc.icon} ${sc.title}` : '—'); set('t-score', String(score)); set('t-combo', '×' + combo); };
  function renderStack(note = '') {
    const parts = shells.map((s) => s.userData.layer);
    const hdrs = [...parts].reverse();
    $('#t-stack', stackPanel).innerHTML = hdrs.map((l) => `<div style="background:${l.color};padding:6px 8px">${l.key === 'link' ? 'L2' : l.key === 'net' ? 'IP' : l.key === 'tr' ? (sc.tr.startsWith('UDP') ? 'UDP' : sc.tr.startsWith('TCP') ? 'TCP' : '—') : 'APP'}</div>`).join('') + `<div style="background:#e9edf7;flex:1;padding:6px 8px">${esc(sc.payload)}</div>${parts.some((p) => p.key === 'link') ? '<div style="background:#8b7bff;padding:6px 8px">FCS</div>' : ''}`;
    $('#t-note', stackPanel).innerHTML = note;
  }

  function ask(question, onRight) {
    const panel = $('#t-q', qpanel);
    panel.style.display = 'block';
    qStart = performance.now(); wrongThis = 0;
    panel.innerHTML = `<h4>${phase === 'encap' ? '⬇ Encapsulate' : '⬆ Decapsulate'} · ${esc(sc.title)}</h4><div style="color:var(--text);font-weight:600;font-size:1rem;margin-bottom:10px;font-family:var(--font-body)">${esc(question.q)}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px">${question.opts.map((o, i) => `<button class="hop-btn" style="justify-content:flex-start;text-align:left" data-o="${esc(o)}"><kbd>${i + 1}</kbd>${esc(o)}</button>`).join('')}</div>`;
    panel.querySelectorAll('.hop-btn').forEach((b) => (b.onclick = () => pickOpt(b)));
    current = { question, onRight };
  }
  let current = null;
  function pickOpt(b) {
    if (!current || move) return;
    const o = b.dataset.o;
    if (o === current.question.right) {
      const secs = (performance.now() - qStart) / 1000;
      const pts = Math.max(20, Math.round((100 + Math.max(0, 40 - secs * 5)) * combo - wrongThis * 40));
      score += pts;
      if (wrongThis === 0) combo = Math.min(5, combo + 1); else combo = 1;
      b.style.borderColor = 'var(--mint)'; b.style.color = 'var(--mint)';
      const cb = current.onRight; current = null;
      setTimeout(() => { $('#t-q', qpanel).style.display = 'none'; cb(); }, 350);
    } else {
      wrongThis++; totalWrong++; combo = 1;
      b.style.borderColor = 'var(--danger)'; b.style.color = 'var(--danger)'; b.disabled = true;
      const p = $('#t-q', qpanel); p.classList.add('shake'); setTimeout(() => p.classList.remove('shake'), 400);
    }
    updHud();
  }
  const onKey = (e) => { const n = +e.key; if (n >= 1 && n <= 4 && current) { const b = $('#t-q', qpanel).querySelectorAll('.hop-btn')[n - 1]; if (b && !b.disabled) pickOpt(b); } };
  window.addEventListener('keydown', onKey);
  onCleanup(() => window.removeEventListener('keydown', onKey));

  const goTo = (pos, dur = 0.9) => new Promise((res) => (move = { from: pkt.position.clone(), to: pos.clone(), t: 0, dur, done: res }));

  async function startRound() {
    sc = rounds[round];
    shells.forEach((s) => pkt.remove(s)); shells = []; peeling.forEach((s) => pkt.remove(s)); peeling = [];
    pkt.visible = true;
    pkt.position.set(towerX[0], floorY(0) + FLOOR_H / 2 + 2, 0);
    phase = 'encap'; step = 0;
    updHud();
    renderStack(`Payload: <b style="color:var(--text)">${esc(sc.payload)}</b>`);
    overlay.style.display = 'none';
    await goTo(new THREE.Vector3(towerX[0], floorY(0), 0), 0.8);
    encapStep();
  }
  function encapStep() {
    const layer = LAYERS[step];
    ask(encapQuestion(sc, layer), async () => {
      const isNone = sc[layer.key].startsWith('None') || sc[layer.key].startsWith('No app');
      if (!isNone) addShell(layer);
      renderStack(isNone ? `<span style="color:var(--yellow)">${layer.name}: no header added here — that's the trick!</span>` : `<span style="color:${layer.color}">+ ${esc(sc[layer.key])}</span>`);
      flashFloor(0, step);
      step++;
      if (step < LAYERS.length) { await goTo(new THREE.Vector3(towerX[0], floorY(step), 0)); encapStep(); }
      else { await goTo(new THREE.Vector3(towerX[0], 1.2, 0)); wire(); }
    });
  }
  function flashFloor(ti, i) { const f = floorMeshes[ti][i]; f.flash = 1; }
  function wire() {
    phase = 'wire';
    renderStack('<span style="color:var(--yellow)">Physical layer: the frame becomes a stream of bits on the cable…</span>');
    pkt.visible = false;
    bitRun = { t: 0 };
  }
  async function afterWire() {
    pkt.visible = true;
    pkt.position.set(towerX[1], 1.2, 0);
    phase = 'decap';
    step = LAYERS.length - 1;
    renderStack('<span style="color:var(--mint)">Bits re‑assembled into a frame. FCS checks out ✓</span>');
    await goTo(new THREE.Vector3(towerX[1], floorY(step), 0));
    decapStep();
  }
  function decapStep() {
    const layer = LAYERS[step];
    ask(decapQuestion(sc, layer), async () => {
      const hasShell = shells.length && shells[shells.length - 1].userData.layer.key === layer.key;
      if (hasShell) peelShell();
      flashFloor(1, step);
      renderStack(hasShell ? `<span style="color:${layer.color}">− ${layer.name} header read & stripped</span>` : `<span style="color:var(--yellow)">nothing to strip at ${layer.name}</span>`);
      step--;
      if (step >= 0) { await goTo(new THREE.Vector3(towerX[1], floorY(step), 0)); decapStep(); }
      else { await goTo(new THREE.Vector3(towerX[1], floorY(0) + FLOOR_H / 2 + 1.5, 0)); roundDone(); }
    });
  }
  function roundDone() {
    round++;
    store.award(`tower-${sc.id}`, 10, `${sc.title}: delivered`);
    if (round >= 3) return finish();
    overlay.innerHTML = `<div class="panel"><span class="tag mint">delivered</span><h2 style="margin-top:14px">${sc.icon} ${esc(sc.title)} ✓</h2><p>Score so far: <b style="color:var(--mint)">${score}</b>. Next mission: <b>${rounds[round].icon} ${esc(rounds[round].title)}</b></p><div class="btn-row"><button class="btn" id="t-next">Continue →</button></div></div>`;
    overlay.style.display = 'grid';
    $('#t-next', overlay).onclick = startRound;
  }
  function finish() {
    phase = 'done';
    const best = store.setBest('tower', score);
    if (totalWrong === 0) store.award('tower-perfect', 40, 'Flawless encapsulation');
    store.award('tower-win', 30, 'Encapsulation Elevator complete');
    overlay.innerHTML = `<div class="panel"><span class="tag mint">all missions complete</span><h2 style="margin-top:14px">Stack master</h2><div class="big-score">${score}</div><p>${best ? '🏆 New personal best! ' : `Best: ${store.best('tower')}. `}${totalWrong ? `${totalWrong} wrong pick${totalWrong === 1 ? '' : 's'}.` : 'Not a single mistake!'}</p><div class="btn-row"><button class="btn" id="t-again">Play again</button><a class="btn ghost" href="#/learn/layers">Review layers</a></div></div>`;
    overlay.style.display = 'grid';
    $('#t-again', overlay).onclick = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">3D · layers game</span><h2 style="margin-top:14px">Encapsulation Elevator</h2>
    <p>Ride a message down the sender's network stack, across the wire, and up the receiver's stack.</p>
    <div class="how"><div>⬇ <b>Sender:</b> at each layer pick the header that gets added. Watch the packet grow shells.</div><div>〰 <b>Physical:</b> your frame turns into bits on the cable.</div><div>⬆ <b>Receiver:</b> each layer reads a field to decide who gets the payload next — then strips its header.</div><div>🔥 Answer without mistakes to build a combo (up to ×5). Keys <kbd>1</kbd>–<kbd>4</kbd> work.</div></div>
    <div class="btn-row"><button class="btn" id="t-start">Start ▶</button><a class="btn ghost" href="#/learn/layers">Learn first</a></div>
    ${store.best('tower') ? `<p style="margin:16px 0 0;font-size:.85rem">Your best: <b style="color:var(--mint)">${store.best('tower')}</b></p>` : ''}</div>`;
  $('#t-start', overlay).onclick = startRound;

  // orbit camera
  let theta = 0.35, phi = 1.2, dist = window.innerWidth < 760 ? 72 : 50, dragging = false, lx = 0, ly = 0;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; theta -= (e.clientX - lx) * 0.006; phi = Math.max(0.3, Math.min(1.5, phi - (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; });
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(18, Math.min(80, dist + e.deltaY * 0.03)); }, { passive: false });
  const look = new THREE.Vector3(0, 8, 0);

  loop((dt, t) => {
    if (move) {
      move.t += dt / move.dur;
      const k = easeInOut(Math.min(1, move.t));
      pkt.position.lerpVectors(move.from, move.to, k);
      if (move.t >= 1) { const m = move; move = null; m.done(); }
    }
    pkt.rotation.y += dt * 0.9; pkt.rotation.x = Math.sin(t) * 0.2;
    shells.forEach((s, i) => { s.userData.grow = Math.min(1, s.userData.grow + dt * 2.5); s.scale.setScalar(easeInOut(s.userData.grow)); s.rotation.y = Math.sin(t * 0.8 + i) * 0.15; });
    for (let i = peeling.length - 1; i >= 0; i--) {
      const s = peeling[i]; s.userData.peel += dt * 1.6;
      s.scale.setScalar(1 + s.userData.peel * 1.5); s.position.y = s.userData.peel * 2;
      s.children.forEach((c) => { c.material.opacity = Math.max(0, (c.material.type === 'LineBasicMaterial' ? 1 : 0.18) * (1 - s.userData.peel)); c.material.transparent = true; });
      if (s.userData.peel >= 1) { pkt.remove(s); peeling.splice(i, 1); }
    }
    floorMeshes.forEach((tw) => tw.forEach((f) => {
      f.flash = Math.max(0, (f.flash || 0) - dt * 1.2);
      f.slab.material.emissiveIntensity = 0.06 + f.flash * 0.9;
      f.edges.material.opacity = 0.35 + f.flash * 0.65;
    }));
    if (bitRun) {
      bitRun.t += dt * 0.55;
      bits.forEach((b, i) => {
        const k = bitRun.t - i * 0.012;
        b.visible = k > 0 && k < 1;
        if (b.visible) { const p = cableCurve.getPoint(k); b.position.set(p.x, p.y + 0.5 + Math.sin(i * 1.7 + t * 9) * 0.15, p.z); b.rotation.x += dt * 5; }
      });
      if (bitRun.t > 1 + BITS * 0.012) { bitRun = null; bits.forEach((b) => (b.visible = false)); afterWire(); }
    }
    // camera follows packet softly
    const focus = phase === 'wire' && bitRun ? cableCurve.getPoint(Math.min(1, bitRun.t)) : pkt.position;
    look.lerp(new THREE.Vector3(focus.x * 0.3, Math.max(4, focus.y * 0.8), 0), 0.04);
    if (phase === 'intro' || phase === 'done') theta += dt * 0.1;
    const off = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)).multiplyScalar(dist);
    camera.position.lerp(look.clone().add(off), 0.07);
    camera.lookAt(look);
    render();
    labels.forEach((l) => { const s = toScreen(l.pos, camera, canvas); l.el.style.opacity = s.behind ? '0' : '1'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; });
  }, canvas);
  void pick;
}
