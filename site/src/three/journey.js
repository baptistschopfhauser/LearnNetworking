import { THREE, createStage, starfield, glowSprite, C3, toScreen, gridFloor, easeInOut } from './common.js';
import { loop, onCleanup, store, h, $, esc, sleep } from '../core.js';

const NODES = {
  laptop: { pos: [0, 0, 0], name: '💻 Your laptop', sub: '192.168.1.42', color: 0x5cf2c2, kind: 'laptop' },
  router: { pos: [9, 0, -3], name: '📡 Home router', sub: '192.168.1.1 · NAT', color: 0x8b7bff, kind: 'router' },
  isp: { pos: [19, 0, -1], name: '🏢 ISP', sub: 'access network', color: 0x8b7bff, kind: 'tower' },
  resolver: { pos: [22, 7, -13], name: '📇 DNS resolver', sub: '1.1.1.1', color: 0xffd166, kind: 'server' },
  root: { pos: [30, 15, -24], name: '🌳 Root server', sub: 'a.root-servers.net', color: 0xffd166, kind: 'server' },
  tld: { pos: [40, 15, -20], name: '.com TLD', sub: 'a.gtld-servers.net', color: 0xffd166, kind: 'server' },
  auth: { pos: [48, 15, -11], name: 'Authoritative DNS', sub: 'a.iana-servers.net', color: 0xffd166, kind: 'server' },
  ix: { pos: [31, 0, 4], name: '🔀 Internet exchange', sub: 'peering point', color: 0x4cc9ff, kind: 'tower' },
  server: { pos: [44, 0, 7], name: '🖥 example.com', sub: '93.184.215.14 · CDN edge', color: 0xff7a45, kind: 'server' },
};
const LINKS = [['laptop', 'router'], ['router', 'isp'], ['isp', 'resolver'], ['resolver', 'root'], ['resolver', 'tld'], ['resolver', 'auth'], ['isp', 'ix'], ['ix', 'server']];
const TO_SERVER = ['laptop', 'router', 'isp', 'ix', 'server'];
const back = (p) => [...p].reverse();

export function mountJourney(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 0.95, bloomRadius: 0.55, bloomThreshold: 0.12, fogDensity: 0.011 });
  scene.add(starfield(1600, 220));
  scene.add(gridFloor(400, 110, -1.2));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.75));
  const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(10, 30, 20); scene.add(dl);

  const V = (k) => new THREE.Vector3(...NODES[k].pos);
  const nodeObjs = {};
  const labels = [];
  const addLabel = (posFn, html, cls = '') => { const el = document.createElement('div'); el.className = 'label3d ' + cls; el.innerHTML = html; hud.appendChild(el); const l = { posFn, el }; labels.push(l); return l; };

  // laptop screen texture
  const scr = document.createElement('canvas'); scr.width = 512; scr.height = 320;
  const sx = scr.getContext('2d');
  const scrTex = new THREE.CanvasTexture(scr); scrTex.colorSpace = THREE.SRGBColorSpace;
  function drawScreen(state) {
    sx.fillStyle = '#0b1020'; sx.fillRect(0, 0, 512, 320);
    sx.fillStyle = '#1c2340'; sx.fillRect(0, 0, 512, 44);
    sx.fillStyle = '#06080f'; sx.beginPath(); sx.roundRect(70, 9, 370, 26, 13); sx.fill();
    sx.fillStyle = state.lock ? '#5cf2c2' : '#7c86a2'; sx.font = '600 16px JetBrains Mono, monospace'; sx.fillText((state.lock ? '🔒 ' : '') + 'example.com', 88, 28);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { sx.fillStyle = c; sx.beginPath(); sx.arc(18 + i * 16, 22, 5, 0, 7); sx.fill(); });
    if (state.page >= 1) {
      sx.fillStyle = '#e9edf7'; sx.font = '800 34px sans-serif'; sx.fillText('Example Domain', 40, 110);
      sx.fillStyle = '#7c86a2'; [140, 162, 184].forEach((y, i) => sx.fillRect(40, y, 400 - i * 60, 10));
      sx.fillStyle = '#5cf2c2'; sx.fillRect(40, 214, 140, 12);
      if (state.page >= 2) { sx.fillStyle = '#8b7bff'; sx.fillRect(300, 210, 170, 80); sx.fillStyle = '#ff7a45'; sx.beginPath(); sx.arc(385, 250, 22, 0, 7); sx.fill(); }
    } else if (state.loading) {
      sx.fillStyle = '#5cf2c2'; sx.fillRect(0, 44, 512 * state.loading, 4);
      sx.fillStyle = '#7c86a2'; sx.font = '16px JetBrains Mono, monospace'; sx.fillText(state.msg || 'Waiting…', 40, 180);
    } else { sx.fillStyle = '#7c86a2'; sx.font = '16px JetBrains Mono, monospace'; sx.fillText('Press Enter to load the page', 40, 180); }
    scrTex.needsUpdate = true;
  }
  const screenState = { lock: false, page: 0, loading: 0, msg: '' };
  drawScreen(screenState);

  // build nodes
  Object.entries(NODES).forEach(([k, n]) => {
    const g = new THREE.Group(); g.position.copy(V(k));
    const col = new THREE.Color(n.color);
    const mat = new THREE.MeshStandardMaterial({ color: 0x161d36, metalness: 0.6, roughness: 0.35, emissive: col, emissiveIntensity: 0.08 });
    if (n.kind === 'laptop') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(5, 0.3, 3.4), mat); base.position.y = 0.15;
      const lid = new THREE.Group();
      const lidBox = new THREE.Mesh(new THREE.BoxGeometry(5, 3.2, 0.2), mat);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.88), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false }));
      screen.position.z = 0.11;
      lid.add(lidBox, screen); lid.position.set(0, 1.85, -1.6); lid.rotation.x = -0.18;
      g.add(base, lid);
      g.rotation.y = 0.35;
    } else if (n.kind === 'router') {
      g.add(new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 2.2), mat));
      [-1, 0, 1].forEach((i) => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8), mat); a.position.set(i * 1.1, 1.2, -0.8); a.rotation.z = i * 0.25; g.add(a); });
    } else if (n.kind === 'tower') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(3, 5, 3), mat); b.position.y = 2.5; g.add(b);
      for (let i = 0; i < 4; i++) { const led = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: n.color })); led.position.set(0, 0.9 + i * 1.1, 1.53); g.add(led); }
    } else {
      for (let i = 0; i < 3; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 2), mat); u.position.y = 0.45 + i * 0.95; g.add(u); const led = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.05), new THREE.MeshBasicMaterial({ color: n.color })); led.position.set(0, 0.45 + i * 0.95, 1.03); g.add(led); }
    }
    const glow = glowSprite(col, 7); glow.position.y = 1.5; glow.material.opacity = 0.18; g.add(glow);
    scene.add(g);
    nodeObjs[k] = { g, glow, mat, pulse: 0 };
    const top = n.kind === 'tower' ? 6.5 : n.kind === 'server' ? 4.2 : n.kind === 'laptop' ? 4.2 : 2.6;
    addLabel(() => V(k).add(new THREE.Vector3(0, top, 0)), `${n.name}<small>${n.sub}</small>`).node = k;
  });
  const linkObjs = LINKS.map(([a, b]) => {
    const pa = V(a), pb = V(b);
    const mid = pa.clone().add(pb).multiplyScalar(0.5); mid.y += 1.5;
    const curve = new THREE.QuadraticBezierCurve3(pa.clone().setY(pa.y + 1), mid, pb.clone().setY(pb.y + 1));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(30)), new THREE.LineBasicMaterial({ color: 0x2c3a6a, transparent: true, opacity: 0.9 }));
    scene.add(line);
    return { a, b, curve, line, secure: false };
  });
  const linkBetween = (a, b) => linkObjs.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));

  // packets
  const active = [];
  function send(path, color, label, segDur = 0.55) {
    return new Promise((resolve) => {
      const c = new THREE.Color(color);
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1.4 }));
      const gl = glowSprite(c, 3.2); m.add(gl);
      scene.add(m);
      const lab = label ? addLabel(() => m.position.clone().add(new THREE.Vector3(0, 1.3, 0)), esc(label), 'pkt') : null;
      if (lab) lab.el.style.borderColor = '#' + c.getHexString();
      active.push({ m, path, seg: 0, t: 0, segDur, lab, resolve });
    });
  }
  const pulse = (k) => (nodeObjs[k].pulse = 1);
  let speed = 1;

  /* ---------- story ---------- */
  let timeline = 0;
  const addMs = (ms) => { timeline += ms; setText('j-ms', `${timeline} ms`); };
  const STEPS = [
    {
      title: 'You type example.com and press Enter', focus: ['laptop', 'router', 'server'], wide: true,
      text: 'In about a tenth of a second, your request crosses a dozen machines and half a dozen protocols. Let’s slow time down. Each step below is one protocol doing one job.',
      run: async () => { screenState.loading = 0.02; screenState.msg = 'Checking caches…'; drawScreen(screenState); pulse('laptop'); },
    },
    {
      title: '1 · Check the caches', focus: ['laptop'], layer: 'Application',
      text: 'The browser looks in its own DNS cache, then asks the OS (which checks <code>/etc/hosts</code> and its stub cache). Nothing there for example.com, so it needs to ask a DNS resolver. But the resolver is off our subnet, so first we need our <b>router’s MAC address</b>.',
      run: async () => { pulse('laptop'); await sleep(500 / speed); pulse('laptop'); addMs(1); },
    },
    {
      title: '2 · ARP: who is 192.168.1.1?', focus: ['laptop', 'router'], layer: 'Link',
      text: 'The laptop broadcasts an <b>ARP request</b> on the LAN. The router answers with its MAC address. Now Ethernet/Wi‑Fi frames can be addressed to the gateway. <i>(Usually this is already cached; this is the very first packet of the day.)</i>',
      run: async () => { await send(['laptop', 'router'], 0xffd166, 'ARP who-has 192.168.1.1?'); pulse('router'); await send(['router', 'laptop'], 0x8b7bff, 'ARP 192.168.1.1 is-at f4:f2:6d…'); addMs(3); },
    },
    {
      title: '3 · DNS query to the resolver', focus: ['laptop', 'router', 'isp', 'resolver'], layer: 'Application · UDP 53',
      text: 'A small UDP datagram, <code>A? example.com</code>, goes to the recursive resolver <code>1.1.1.1</code>. On the way your router rewrites the source address with <b>NAT</b>, and each router decrements the TTL.',
      run: async () => { screenState.msg = 'Resolving host…'; screenState.loading = 0.12; drawScreen(screenState); await send(['laptop', 'router', 'isp', 'resolver'], 0xffd166, 'UDP :53  A? example.com'); pulse('resolver'); addMs(8); },
    },
    {
      title: '4 · The resolver walks the tree', focus: ['resolver', 'root', 'tld', 'auth'], layer: 'DNS recursion',
      text: 'The resolver’s cache is cold, so it asks a <b>root server</b> (→ “ask .com”), then the <b>.com TLD</b> (→ “ask a.iana-servers.net”), then the <b>authoritative server</b>, which finally answers <code>93.184.215.14</code>, valid for 300 s.',
      run: async () => {
        await send(['resolver', 'root'], 0xffd166, 'A? example.com'); pulse('root'); await send(['root', 'resolver'], 0x8b7bff, 'NS → .com servers');
        await send(['resolver', 'tld'], 0xffd166, 'A? example.com'); pulse('tld'); await send(['tld', 'resolver'], 0x8b7bff, 'NS → a.iana-servers.net');
        await send(['resolver', 'auth'], 0xffd166, 'A? example.com'); pulse('auth'); await send(['auth', 'resolver'], 0x5cf2c2, 'A 93.184.215.14 ttl=300');
        addMs(36);
      },
    },
    {
      title: '5 · The answer comes home', focus: ['resolver', 'isp', 'router', 'laptop'], layer: 'Application · UDP 53',
      text: 'The resolver caches the answer (the next person asking gets it instantly) and replies. Your router’s NAT table maps the reply back to your laptop. The browser now knows the IP: <code>93.184.215.14</code>.',
      run: async () => { await send(['resolver', 'isp', 'router', 'laptop'], 0x5cf2c2, 'example.com = 93.184.215.14'); pulse('laptop'); screenState.loading = 0.3; screenState.msg = 'Connecting…'; drawScreen(screenState); addMs(8); },
    },
    {
      title: '6 · TCP three‑way handshake', focus: TO_SERVER, layer: 'Transport · TCP 443', wide: true,
      text: '<b>SYN → SYN‑ACK → ACK.</b> Both sides agree on starting sequence numbers so every byte can be acknowledged and retransmitted if lost. That’s one full round trip before any data flows. <i>(HTTP/3 uses QUIC over UDP and merges this with the TLS step.)</i>',
      run: async () => {
        await send(TO_SERVER, 0x8b7bff, 'SYN seq=x', 0.4); pulse('server');
        await send(back(TO_SERVER), 0x8b7bff, 'SYN-ACK', 0.4); pulse('laptop');
        await send(TO_SERVER, 0x8b7bff, 'ACK', 0.4);
        addMs(18);
      },
    },
    {
      title: '7 · TLS 1.3: lock it down', focus: TO_SERVER, layer: 'Security · TLS', wide: true,
      text: '<b>ClientHello</b> carries a Diffie‑Hellman key share; the server answers with its own share, its <b>certificate</b> and a signature. Both derive the same keys without ever sending them. From now on everything on the wire is encrypted: watch the links turn mint.',
      run: async () => {
        await send(TO_SERVER, 0xff7a45, 'ClientHello + key share', 0.4); pulse('server');
        await send(back(TO_SERVER), 0xff7a45, 'ServerHello + 🔒 cert', 0.4);
        TO_SERVER.slice(1).forEach((k, i) => (linkBetween(TO_SERVER[i], k).secure = true));
        screenState.lock = true; screenState.loading = 0.5; screenState.msg = 'Secure connection established'; drawScreen(screenState);
        await send(TO_SERVER, 0x5cf2c2, '🔒 Finished', 0.4);
        addMs(18);
      },
    },
    {
      title: '8 · HTTP request & response', focus: TO_SERVER, layer: 'Application · HTTP/2', wide: true,
      text: 'The browser sends <code>GET / HTTP/2</code> with headers (inside TLS). The CDN edge has the page cached and streams back <code>200 OK</code> and the HTML, split into many TCP segments, each acknowledged.',
      run: async () => {
        await send(TO_SERVER, 0x4cc9ff, '🔒 GET /', 0.4); pulse('server');
        screenState.loading = 0.75; screenState.msg = 'Receiving…'; drawScreen(screenState);
        const ps = [];
        for (let i = 0; i < 6; i++) { ps.push(send(back(TO_SERVER), 0x5cf2c2, i === 0 ? '🔒 200 OK + HTML' : '', 0.35)); await sleep(160 / speed); }
        await Promise.all(ps);
        addMs(22);
      },
    },
    {
      title: '9 · Render, and fetch everything else', focus: ['laptop', 'router'], layer: 'Browser',
      text: 'The browser parses the HTML, discovers CSS, JS and images, and reuses the same encrypted connection to fetch them in parallel (HTTP/2 multiplexing). Then it lays out and paints the page. <b>Total ≈ 140 ms</b>, and most of it is the speed of light.',
      run: async () => {
        screenState.page = 1; screenState.loading = 0; drawScreen(screenState);
        const ps = [];
        for (let i = 0; i < 4; i++) { ps.push(send(back(TO_SERVER), [0x8b7bff, 0xff5c9a, 0x4cc9ff, 0xffd166][i], ['style.css', 'app.js', 'logo.svg', 'font.woff2'][i], 0.3)); await sleep(120 / speed); }
        await Promise.all(ps);
        screenState.page = 2; drawScreen(screenState); pulse('laptop');
        addMs(26);
        store.award('journey-done', 40, 'Followed a click across the Internet');
      },
    },
  ];

  /* ---------- HUD ---------- */
  hud.innerHTML = '';
  labels.forEach((l) => hud.appendChild(l.el));
  const top = h(`<div class="hud hud-top"><div class="hud-pill"><span>STEP</span><b id="j-step">0/${STEPS.length - 1}</b></div><div class="hud-pill dest"><span>LAYER</span><b id="j-layer">—</b></div><div class="hud-pill ttl"><span>ELAPSED</span><b id="j-ms">0 ms</b></div></div>`);
  const panel = h(`<div class="hud journey-panel"><div class="hud-panel">
    <div class="journey-dots" id="j-dots">${STEPS.map((_, i) => `<i data-i="${i}"></i>`).join('')}</div>
    <h3 id="j-title" style="margin:10px 0 6px;font-size:1.25rem;color:var(--text)"></h3><p id="j-text" style="margin:0 0 14px;font-family:var(--font-body);font-size:.92rem;line-height:1.55"></p>
    <div class="btn-row"><button class="btn small" id="j-next">Start ▶</button><button class="btn small ghost" id="j-replay" disabled>↻ Replay step</button><button class="btn small ghost" id="j-auto">⏵ Autoplay</button>
    <div class="seg" id="j-speed" style="margin-left:auto"><button data-s="0.6">0.5×</button><button data-s="1" class="on">1×</button><button data-s="1.8">2×</button></div></div>
  </div></div>`);
  shell.append(top, panel);
  const setText = (id, t) => { const e = shell.querySelector('#' + id); if (e) e.innerHTML = t; };

  let step = 0, running = false, auto = false, camFocus = ['laptop', 'router', 'server'], wide = true;
  function show(i) {
    const s = STEPS[i];
    setText('j-title', esc(s.title)); setText('j-text', s.text);
    setText('j-step', `${i}/${STEPS.length - 1}`); setText('j-layer', s.layer || '—');
    shell.querySelectorAll('#j-dots i').forEach((d, k) => { d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); });
    camFocus = s.focus; wide = !!s.wide;
  }
  async function play(i) {
    running = true;
    $('#j-next', panel).disabled = true; $('#j-replay', panel).disabled = true;
    show(i);
    await sleep(500 / speed);
    await STEPS[i].run();
    running = false;
    $('#j-replay', panel).disabled = false;
    const last = i >= STEPS.length - 1;
    $('#j-next', panel).disabled = false;
    $('#j-next', panel).textContent = last ? '↺ Start over' : 'Next step →';
    if (auto && !last) { await sleep(1400 / speed); if (auto && !running && alive) next(); }
  }
  function next() {
    if (running) return;
    if (step >= STEPS.length - 1) return restart();
    step++;
    play(step);
  }
  function restart() {
    step = 0; timeline = 0; setText('j-ms', '0 ms');
    Object.assign(screenState, { lock: false, page: 0, loading: 0, msg: '' }); drawScreen(screenState);
    linkObjs.forEach((l) => (l.secure = false));
    play(0);
  }
  let alive = true; onCleanup(() => (alive = false));
  show(0);
  $('#j-next', panel).onclick = () => (step === 0 && !timeline && $('#j-next', panel).textContent.startsWith('Start') ? play(0) : next());
  $('#j-replay', panel).onclick = () => { if (!running) play(step); };
  $('#j-auto', panel).onclick = (e) => { auto = !auto; e.target.textContent = auto ? '⏸ Pause' : '⏵ Autoplay'; e.target.classList.toggle('ghost', !auto); if (auto && !running) next(); };
  shell.querySelectorAll('#j-speed button').forEach((b) => (b.onclick = () => { shell.querySelectorAll('#j-speed button').forEach((x) => x.classList.toggle('on', x === b)); speed = +b.dataset.s; }));
  const onKey = (e) => { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); $('#j-next', panel).click(); } };
  window.addEventListener('keydown', onKey); onCleanup(() => window.removeEventListener('keydown', onKey));

  /* ---------- camera ---------- */
  let theta = 0, phi = 0, dragging = false, lx = 0, ly = 0, zoom = 1;
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; theta -= (e.clientX - lx) * 0.005; phi = Math.max(-0.5, Math.min(0.6, phi + (e.clientY - ly) * 0.004)); lx = e.clientX; ly = e.clientY; });
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); zoom = Math.max(0.5, Math.min(2, zoom + e.deltaY * 0.001)); }, { passive: false });
  const look = new THREE.Vector3(20, 2, 0), camPos = new THREE.Vector3(20, 30, 60);
  const mobile = () => canvas.clientWidth < 760;

  loop((dt, t) => {
    // packets
    for (let i = active.length - 1; i >= 0; i--) {
      const p = active[i];
      p.t += (dt * speed) / p.segDur;
      const a = p.path[p.seg], b = p.path[p.seg + 1];
      const L = linkBetween(a, b);
      const k = easeInOut(Math.min(1, p.t));
      const pos = L ? L.curve.getPoint(L.a === a ? k : 1 - k) : V(a).lerp(V(b), k);
      p.m.position.copy(pos); p.m.rotation.x += dt * 3; p.m.rotation.y += dt * 2;
      if (p.t >= 1) {
        p.seg++; p.t = 0;
        if (p.seg >= p.path.length - 1) {
          scene.remove(p.m); p.m.geometry.dispose(); p.m.material.dispose();
          if (p.lab) { p.lab.el.remove(); labels.splice(labels.indexOf(p.lab), 1); }
          active.splice(i, 1); p.resolve();
        } else pulse(p.path[p.seg]);
      }
    }
    Object.values(nodeObjs).forEach((o) => { o.pulse = Math.max(0, o.pulse - dt * 1.5); o.glow.material.opacity = 0.18 + o.pulse * 0.6; o.glow.scale.setScalar(7 + o.pulse * 4); o.mat.emissiveIntensity = 0.08 + o.pulse * 0.5; });
    linkObjs.forEach((l) => l.line.material.color.setHex(l.secure ? 0x5cf2c2 : 0x2c3a6a));
    // camera framing the focused nodes
    const pts = camFocus.map(V);
    const c = pts.reduce((a, b) => a.add(b), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    const span = Math.max(8, ...pts.map((p) => p.distanceTo(c))) * (mobile() ? 2.6 : 1.7) * zoom;
    const off = new THREE.Vector3(Math.sin(theta) * span, span * (0.55 + phi), Math.cos(theta) * span * 1.1 + 6);
    look.lerp(c.clone().setY(c.y + 1), 0.04);
    camPos.lerp(c.clone().add(off), 0.035);
    camera.position.copy(camPos); camera.lookAt(look);
    if (!mobile()) camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, 0, canvas.clientHeight * 0.1, canvas.clientWidth, canvas.clientHeight); else camera.clearViewOffset();
    render();
    labels.forEach((l) => { const s = toScreen(l.posFn(), camera, canvas); l.el.style.opacity = s.behind ? '0' : l.node && !camFocus.includes(l.node) ? (mobile() ? '0' : '0.35') : '1'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; });
    void wide; void t;
  }, canvas);
}
