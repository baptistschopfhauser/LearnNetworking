import { THREE, createStage, starfield, glowSprite, C3, toScreen, gridFloor, easeInOut, orbit, isMobile, sfx, burst } from './common.js';
import { loop, onCleanup, shuffle, pick, store, h, $, esc } from '../core.js';
import { tr } from '../i18n.js';
import { flag } from '../srs.js';

const LAYERS = [
  { key: 'app', full: tr('Application layer', 'Anwendungsschicht'), name: tr('Application', 'Anwendung'), color: '#ff5c9a', hint: tr('The application layer carries the message itself (HTTP, DNS, SMTP…), or nothing if a tool talks to a lower layer directly.', 'Die Anwendungsschicht trägt die Nachricht selbst (HTTP, DNS, SMTP …) – oder nichts, wenn ein Werkzeug direkt mit einer tieferen Schicht spricht.') },
  { key: 'tr', full: tr('Transport layer', 'Transportschicht'), name: 'Transport', color: '#5cf2c2', hint: tr('The transport layer adds ports: TCP for reliable streams, UDP for quick datagrams.', 'Die Transportschicht fügt Ports hinzu: TCP für zuverlässige Ströme, UDP für schnelle Datagramme.') },
  { key: 'net', full: tr('Network layer', 'Vermittlungsschicht'), name: tr('Network', 'Vermittlung'), color: '#4cc9ff', hint: tr('The network layer adds IP addresses (IPv4 or IPv6) and says which transport is inside.', 'Die Vermittlungsschicht fügt IP-Adressen hinzu (IPv4 oder IPv6) und sagt, welcher Transport drin steckt.') },
  { key: 'link', full: tr('Link layer', 'Sicherungsschicht'), name: tr('Link', 'Sicherung'), color: '#8b7bff', hint: tr('The link layer wraps everything in a frame for the next hop: Ethernet or Wi‑Fi, with MAC addresses.', 'Die Sicherungsschicht verpackt alles in einen Rahmen für den nächsten Hop: Ethernet oder WLAN, mit MAC-Adressen.') },
];

const P = {
  web: tr('Web server (nginx)', 'Webserver (nginx)'), dns: tr('DNS resolver', 'DNS-Resolver'), mail: tr('Mail server (SMTP)', 'Mailserver (SMTP)'),
  call: tr('Video call app (WebRTC)', 'Videocall-App (WebRTC)'), ssh: tr('SSH daemon', 'SSH-Dienst (sshd)'), icmp: tr('Kernel ICMP handler', 'ICMP-Handler im Kernel'),
  vpn: tr('WireGuard VPN', 'WireGuard-VPN'), h3: tr('Web server (HTTP/3)', 'Webserver (HTTP/3)'),
};
const ETH4 = tr('EtherType 0x0800 → IPv4', 'EtherType 0x0800 → IPv4'), ETH6 = 'EtherType 0x86DD → IPv6';
const SCENARIOS = [
  { id: 'web', title: tr('Load a web page', 'Webseite laden'), icon: '🌐', payload: 'GET /index.html',
    app: tr('HTTP GET /index.html (inside TLS)', 'HTTP GET /index.html (in TLS)'), tr: 'TCP 51514 → 443, SEQ 1, ACK 1', net: 'IPv4 192.168.1.10 → 93.184.215.14, proto 6', link: tr('Ethernet → gateway MAC, type 0x0800', 'Ethernet → Gateway-MAC, Typ 0x0800'),
    port: 443, program: P.web, proto: 'Protocol 6 → TCP', ethertype: ETH4 },
  { id: 'dns', title: tr('Look up a name', 'Namen auflösen'), icon: '📇', payload: 'A? example.com',
    app: tr('DNS query: A example.com', 'DNS-Anfrage: A example.com'), tr: 'UDP 53001 → 53', net: 'IPv4 192.168.1.10 → 1.1.1.1, proto 17', link: tr('Wi‑Fi 802.11 frame → access point', 'WLAN-802.11-Rahmen → Access Point'),
    port: 53, program: P.dns, proto: 'Protocol 17 → UDP', ethertype: ETH4 },
  { id: 'mail', title: tr('Send an email (IPv6)', 'E-Mail senden (IPv6)'), icon: '✉️', payload: 'MAIL FROM:<ada@lovelace.org>',
    app: 'SMTP MAIL FROM:<ada@…>', tr: 'TCP 60123 → 587', net: 'IPv6 2001:db8::5 → 2001:db8::25, next‑hdr 6', link: tr('Ethernet → router MAC, type 0x86DD', 'Ethernet → Router-MAC, Typ 0x86DD'),
    port: 587, program: P.mail, proto: 'Next Header 6 → TCP', ethertype: ETH6 },
  { id: 'call', title: tr('Join a video call', 'Videocall beitreten'), icon: '🎥', payload: tr('[20 ms of audio]', '[20 ms Audio]'),
    app: tr('RTP media frame (SRTP encrypted)', 'RTP-Medienrahmen (SRTP-verschlüsselt)'), tr: 'UDP 50000 → 3478', net: 'IPv4 10.0.0.7 → 142.250.0.10, proto 17', link: tr('Wi‑Fi 802.11 frame → access point', 'WLAN-802.11-Rahmen → Access Point'),
    port: 3478, program: P.call, proto: 'Protocol 17 → UDP', ethertype: ETH4 },
  { id: 'ping', title: tr('Ping a server', 'Server anpingen'), icon: '📡', payload: 'echo request #7',
    app: tr('No app header — the ping tool builds ICMP directly', 'Kein App-Header – ping baut ICMP direkt'), tr: tr('None — ICMP rides directly inside IP', 'Keiner – ICMP steckt direkt in IP'), net: 'IPv4 → 8.8.8.8, proto 1 + ICMP Echo Request', link: tr('Ethernet → gateway MAC, type 0x0800', 'Ethernet → Gateway-MAC, Typ 0x0800'),
    port: null, program: P.icmp, proto: 'Protocol 1 → ICMP', ethertype: ETH4, none: ['app', 'tr'] },
  { id: 'vpn', title: tr('Browse through a VPN', 'Über ein VPN surfen'), icon: '🔐', payload: tr('[encrypted inner IP packet]', '[verschlüsseltes inneres IP-Paket]'),
    app: tr('WireGuard: encrypted inner packet (10.8.0.2 → 93.184.215.14)', 'WireGuard: verschlüsseltes inneres Paket (10.8.0.2 → 93.184.215.14)'), tr: 'UDP 51820 → 51820', net: 'IPv4 192.168.1.10 → 203.0.113.9 (VPN server), proto 17', link: tr('Wi‑Fi 802.11 frame → access point', 'WLAN-802.11-Rahmen → Access Point'),
    port: 51820, program: P.vpn, proto: 'Protocol 17 → UDP', ethertype: ETH4 },
  { id: 'ssh', title: tr('Log in with SSH', 'Per SSH einloggen'), icon: '🖥', payload: tr('[encrypted keystrokes]', '[verschlüsselte Tastendrücke]'),
    app: tr('SSH packet (encrypted session)', 'SSH-Paket (verschlüsselte Sitzung)'), tr: 'TCP 49152 → 22', net: 'IPv4 10.0.0.7 → 10.0.0.20, proto 6', link: tr('Ethernet → server MAC (same LAN), type 0x0800', 'Ethernet → Server-MAC (gleiches LAN), Typ 0x0800'),
    port: 22, program: P.ssh, proto: 'Protocol 6 → TCP', ethertype: ETH4 },
  { id: 'h3', title: tr('Load a page over HTTP/3', 'Seite über HTTP/3 laden'), icon: '⚡', payload: 'GET / (HTTP/3)',
    app: tr('HTTP/3 GET / inside QUIC (encrypted)', 'HTTP/3 GET / in QUIC (verschlüsselt)'), tr: 'UDP 55000 → 443 (QUIC)', net: 'IPv6 2001:db8::5 → 2606:2800::1, next‑hdr 17', link: tr('Ethernet → router MAC, type 0x86DD', 'Ethernet → Router-MAC, Typ 0x86DD'),
    port: 443, program: P.h3, proto: 'Next Header 17 → UDP', ethertype: ETH6 },
];
const PROGRAMS = Object.values(P);
const isNone = (sc, key) => (sc.none || []).includes(key);

function encapQuestion(sc, layer) {
  const right = sc[layer.key];
  const pool = [];
  SCENARIOS.forEach((o) => { if (o[layer.key] !== right) pool.push(o[layer.key]); });
  LAYERS.forEach((l) => { if (l.key !== layer.key) pool.push(sc[l.key]); });
  const wrong = shuffle([...new Set(pool)].filter((x) => x !== right)).slice(0, 3);
  return { q: tr(`${layer.full} — which header gets added?`, `${layer.full} – welcher Header kommt dazu?`), opts: shuffle([right, ...wrong]), right, hint: layer.hint };
}
function decapQuestion(sc, layer) {
  if (layer.key === 'link') {
    const right = sc.ethertype;
    return { q: tr('Link layer: dest MAC is ours. Which field says what is inside the frame?', 'Sicherungsschicht: Ziel-MAC passt. Welches Feld sagt, was im Rahmen steckt?'), opts: shuffle([right, right === ETH6 ? ETH4 : ETH6, tr('TTL 64 → keep it', 'TTL 64 → behalten'), tr('Dest port → hand to app', 'Zielport → an die App')]), right, hint: tr('The EtherType field names the next protocol: 0x0800 = IPv4, 0x86DD = IPv6.', 'Das EtherType-Feld nennt das nächste Protokoll: 0x0800 = IPv4, 0x86DD = IPv6.') };
  }
  if (layer.key === 'net') {
    const right = sc.proto;
    const all = ['Protocol 6 → TCP', 'Protocol 17 → UDP', 'Protocol 1 → ICMP', 'Next Header 6 → TCP', 'Next Header 17 → UDP'];
    const sameKind = (x) => x.split('→')[1] === right.split('→')[1];
    return { q: tr('Network layer: dest IP is ours. Which transport gets the payload?', 'Vermittlungsschicht: Ziel-IP passt. Welcher Transport bekommt die Nutzlast?'), opts: shuffle([right, ...shuffle(all.filter((x) => !sameKind(x))).slice(0, 2), tr('Source MAC → reply', 'Quell-MAC → antworten')]), right, hint: tr('IPv4’s Protocol field (IPv6: Next Header) says what’s inside: 6 = TCP, 17 = UDP, 1 = ICMP.', 'Das Protocol-Feld von IPv4 (IPv6: Next Header) sagt, was drin ist: 6 = TCP, 17 = UDP, 1 = ICMP.') };
  }
  if (layer.key === 'tr') {
    const right = sc.program;
    return { q: sc.port ? tr(`Transport layer: destination port ${sc.port}. Which program receives it?`, `Transportschicht: Zielport ${sc.port}. Welches Programm bekommt es?`) : tr('No transport header here. Who handles an ICMP Echo Request?', 'Hier gibt es keinen Transport-Header. Wer bearbeitet ein ICMP Echo Request?'), opts: shuffle([right, ...shuffle(PROGRAMS.filter((p) => p !== right)).slice(0, 3)]), right, hint: tr('Well-known ports: 22 SSH, 53 DNS, 443 HTTPS/QUIC, 587 mail submission, 3478 STUN/WebRTC, 51820 WireGuard.', 'Bekannte Ports: 22 SSH, 53 DNS, 443 HTTPS/QUIC, 587 Mail-Einlieferung, 3478 STUN/WebRTC, 51820 WireGuard.'), card: 'g:Port' };
  }
  return { q: tr('Application layer: what does the program finally read?', 'Anwendungsschicht: Was liest das Programm am Ende?'), opts: shuffle([sc.payload, ...shuffle(SCENARIOS.filter((s) => s !== sc).map((s) => s.payload)).slice(0, 3)]), right: sc.payload, hint: tr('After every header is stripped, only the original payload is left.', 'Wenn alle Header entfernt sind, bleibt nur die ursprüngliche Nutzlast übrig.') };
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
    addLabel(new THREE.Vector3(x, -0.2, 6), `<span style="color:#b4bdd3">L1</span> ${tr('Physical', 'Bitübertragung')}`);
    addLabel(new THREE.Vector3(x, floorY(0) + FLOOR_H / 2 + 1.6, 0), ti ? tr('🖥 Receiver', '🖥 Empfänger') : tr('💻 Sender', '💻 Sender'), 'cur');
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
    <div class="hud-pill"><span>${tr('ROUND', 'RUNDE')}</span><b id="t-round">1/3</b></div>
    <div class="hud-pill dest"><span>${tr('MISSION', 'AUFTRAG')}</span><b id="t-mission">—</b></div>
    <div class="hud-pill"><span>${tr('SCORE', 'PUNKTE')}</span><b id="t-score">0</b></div>
    <div class="hud-pill ttl"><span>COMBO</span><b id="t-combo">×1</b></div>
  </div>`);
  const qpanel = h(`<div class="hud" style="left:50%;bottom:20px;transform:translateX(-50%);width:min(680px,calc(100% - 32px))"><div class="hud-panel" id="t-q" style="display:none"></div></div>`);
  const stackPanel = h(`<div class="hud hud-side" style="top:96px"><div class="hud-panel"><h4>${tr('Packet on the wire', 'Paket auf der Leitung')}</h4><div class="packet-vis" id="t-stack" style="height:auto;min-height:44px;flex-wrap:wrap"></div><div id="t-note" style="font-size:.78rem"></div></div></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, qpanel, stackPanel, overlay);
  if (isMobile()) stackPanel.style.display = 'none';

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
    $('#t-stack', stackPanel).innerHTML = hdrs.map((l) => `<div style="background:${l.color};padding:6px 8px">${l.key === 'link' ? 'L2' : l.key === 'net' ? 'IP' : l.key === 'tr' ? (sc.tr.slice(0, 3)) : 'APP'}</div>`).join('') + `<div style="background:#e9edf7;flex:1;padding:6px 8px">${esc(sc.payload)}</div>${parts.some((p) => p.key === 'link') ? '<div style="background:#8b7bff;padding:6px 8px">FCS</div>' : ''}`;
    $('#t-note', stackPanel).innerHTML = note;
  }

  function ask(question, onRight) {
    const panel = $('#t-q', qpanel);
    panel.style.display = 'block';
    qStart = performance.now(); wrongThis = 0;
    panel.innerHTML = `<h4>${phase === 'encap' ? tr('⬇ Encapsulate', '⬇ Einpacken') : tr('⬆ Decapsulate', '⬆ Auspacken')} · ${esc(sc.title)}</h4><div style="color:var(--text);font-weight:600;font-size:1rem;margin-bottom:10px;font-family:var(--font-body)">${esc(question.q)}</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:8px">${question.opts.map((o, i) => `<button class="hop-btn" style="justify-content:flex-start;text-align:left" data-o="${esc(o)}">${isMobile() ? '' : `<kbd>${i + 1}</kbd>`}${esc(o)}</button>`).join('')}</div>
      <div id="t-why" style="margin-top:10px;font-size:.82rem;font-family:var(--font-body)"></div>`;
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
      sfx.play('ok');
      burst(scene, pkt.position.clone(), 0x5cf2c2, 10);
      const cb = current.onRight; current = null;
      setTimeout(() => { $('#t-q', qpanel).style.display = 'none'; cb(); }, 350);
    } else {
      wrongThis++; totalWrong++; combo = 1;
      b.style.borderColor = 'var(--danger)'; b.style.color = 'var(--danger)'; b.disabled = true;
      sfx.play('bad');
      flag(current.question.card || 'q:layers:1'); flag('g:Encapsulation');
      $('#t-why', qpanel).innerHTML = `<span style="color:var(--yellow)">💡 ${esc(current.question.hint)}</span> <a href="#/learn/layers" style="font-size:.78rem">${tr('Lesson →', 'Lektion →')}</a>`;
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
    renderStack(`${tr('Payload', 'Nutzlast')}: <b style="color:var(--text)">${esc(sc.payload)}</b>`);
    overlay.style.display = 'none';
    await goTo(new THREE.Vector3(towerX[0], floorY(0), 0), 0.8);
    encapStep();
  }
  function encapStep() {
    const layer = LAYERS[step];
    ask(encapQuestion(sc, layer), async () => {
      const none = isNone(sc, layer.key);
      if (!none) addShell(layer);
      renderStack(none ? `<span style="color:var(--yellow)">${layer.full}: ${tr('no header added here — that’s the trick!', 'hier kommt kein Header dazu – das ist der Trick!')}</span>` : `<span style="color:${layer.color}">+ ${esc(sc[layer.key])}</span>`);
      flashFloor(0, step);
      step++;
      if (step < LAYERS.length) { await goTo(new THREE.Vector3(towerX[0], floorY(step), 0)); encapStep(); }
      else { await goTo(new THREE.Vector3(towerX[0], 1.2, 0)); wire(); }
    });
  }
  function flashFloor(ti, i) { const f = floorMeshes[ti][i]; f.flash = 1; }
  function wire() {
    phase = 'wire';
    sfx.play('whoosh');
    renderStack(`<span style="color:var(--yellow)">${tr('Physical layer: the frame becomes a stream of bits on the cable…', 'Bitübertragungsschicht: Der Rahmen wird zu einem Bitstrom auf dem Kabel …')}</span>`);
    pkt.visible = false;
    bitRun = { t: 0 };
  }
  async function afterWire() {
    pkt.visible = true;
    pkt.position.set(towerX[1], 1.2, 0);
    phase = 'decap';
    step = LAYERS.length - 1;
    renderStack(`<span style="color:var(--mint)">${tr('Bits re‑assembled into a frame. FCS checks out ✓', 'Bits wieder zu einem Rahmen zusammengesetzt. Prüfsumme (FCS) stimmt ✓')}</span>`);
    await goTo(new THREE.Vector3(towerX[1], floorY(step), 0));
    decapStep();
  }
  function decapStep() {
    const layer = LAYERS[step];
    ask(decapQuestion(sc, layer), async () => {
      const hasShell = shells.length && shells[shells.length - 1].userData.layer.key === layer.key;
      if (hasShell) peelShell();
      flashFloor(1, step);
      renderStack(hasShell ? `<span style="color:${layer.color}">− ${layer.full}: ${tr('header read & stripped', 'Header gelesen & entfernt')}</span>` : `<span style="color:var(--yellow)">${layer.full}: ${tr('nothing to strip', 'nichts zu entfernen')}</span>`);
      step--;
      if (step >= 0) { await goTo(new THREE.Vector3(towerX[1], floorY(step), 0)); decapStep(); }
      else { await goTo(new THREE.Vector3(towerX[1], floorY(0) + FLOOR_H / 2 + 1.5, 0)); roundDone(); }
    });
  }
  function roundDone() {
    round++;
    sfx.play('win');
    store.award(`tower-${sc.id}`, 10, `${sc.title}: ${tr('delivered', 'zugestellt')}`);
    if (round >= 3) return finish();
    overlay.innerHTML = `<div class="panel"><span class="tag mint">${tr('delivered', 'zugestellt')}</span><h2 style="margin-top:14px">${sc.icon} ${esc(sc.title)} ✓</h2><p>${tr('Score so far', 'Bisherige Punkte')}: <b style="color:var(--mint)">${score}</b>. ${tr('Next mission', 'Nächster Auftrag')}: <b>${rounds[round].icon} ${esc(rounds[round].title)}</b></p><div class="btn-row"><button class="btn" id="t-next">${tr('Continue →', 'Weiter →')}</button></div></div>`;
    overlay.style.display = 'grid';
    $('#t-next', overlay).onclick = startRound;
  }
  function finish() {
    phase = 'done';
    const best = store.setBest('tower', score);
    if (totalWrong === 0) store.award('tower-perfect', 40, tr('Flawless encapsulation', 'Fehlerfrei gekapselt'));
    store.award('tower-win', 30, tr('Encapsulation Elevator complete', 'Encapsulation Elevator geschafft'));
    overlay.innerHTML = `<div class="panel"><span class="tag mint">${tr('all missions complete', 'alle Aufträge erledigt')}</span><h2 style="margin-top:14px">${tr('Stack master', 'Stack-Meister')}</h2><div class="big-score">${score}</div><p>${best ? tr('🏆 New personal best! ', '🏆 Neuer Rekord! ') : `${tr('Best', 'Rekord')}: ${store.best('tower')}. `}${totalWrong ? tr(`${totalWrong} wrong pick(s) — they are now in your flashcards.`, `${totalWrong} Fehlgriff(e) – sie sind jetzt in deinen Karteikarten.`) : tr('Not a single mistake!', 'Kein einziger Fehler!')}</p><div class="btn-row"><button class="btn" id="t-again">${tr('Play again', 'Noch mal')}</button><a class="btn ghost" href="#/learn/layers">${tr('Review layers', 'Schichten wiederholen')}</a></div></div>`;
    overlay.style.display = 'grid';
    $('#t-again', overlay).onclick = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">${tr('3D · layers game', '3D · Schichten-Spiel')}</span><h2 style="margin-top:14px">Encapsulation Elevator</h2>
    <p>${tr('Ride a message down the sender’s network stack, across the wire, and up the receiver’s stack.', 'Fahre eine Nachricht durch den Netzwerk-Stack des Senders nach unten, über die Leitung und beim Empfänger wieder hoch.')}</p>
    <div class="how"><div>⬇ ${tr('<b>Sender:</b> at each layer pick the header that gets added. Watch the packet grow shells.', '<b>Sender:</b> Wähle auf jeder Schicht den Header, der dazukommt. Das Paket bekommt Hüllen.')}</div><div>〰 ${tr('<b>Physical:</b> your frame turns into bits on the cable.', '<b>Bitübertragung:</b> Dein Rahmen wird zu Bits auf dem Kabel.')}</div><div>⬆ ${tr('<b>Receiver:</b> each layer reads a field to decide who gets the payload next — then strips its header.', '<b>Empfänger:</b> Jede Schicht liest ein Feld, um zu entscheiden, wer die Nutzlast bekommt – und entfernt dann ihren Header.')}</div><div>🔥 ${tr('Answer without mistakes to build a combo (up to ×5).', 'Antworte fehlerfrei für eine Combo (bis ×5).')} ${isMobile() ? '' : tr('Keys <kbd>1</kbd>–<kbd>4</kbd> work.', 'Tasten <kbd>1</kbd>–<kbd>4</kbd> gehen auch.')}</div><div>🎲 ${tr(`3 random missions out of ${SCENARIOS.length} — including VPN tunnels, SSH and HTTP/3 over IPv6.`, `3 zufällige aus ${SCENARIOS.length} Aufträgen – darunter VPN-Tunnel, SSH und HTTP/3 über IPv6.`)}</div></div>
    <div class="btn-row"><button class="btn" id="t-start">Start ▶</button><a class="btn ghost" href="#/learn/layers">${tr('Learn first', 'Erst lernen')}</a></div>
    ${store.best('tower') ? `<p style="margin:16px 0 0;font-size:.85rem">${tr('Your best', 'Dein Rekord')}: <b style="color:var(--mint)">${store.best('tower')}</b></p>` : ''}</div>`;
  $('#t-start', overlay).onclick = () => { sfx.play('click'); startRound(); };

  // orbit camera
  const cam = orbit(canvas, { theta: 0.35, phi: 1.2, dist: isMobile() ? 72 : 50, phiMin: 0.3, phiMax: 1.5, distMin: 18, distMax: 90 });
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
    if (phase === 'intro' || phase === 'done') cam.theta += dt * 0.1;
    const off = new THREE.Vector3(Math.sin(cam.phi) * Math.sin(cam.theta), Math.cos(cam.phi), Math.sin(cam.phi) * Math.cos(cam.theta)).multiplyScalar(cam.dist);
    camera.position.lerp(look.clone().add(off), 0.07);
    camera.lookAt(look);
    render();
    labels.forEach((l) => { const s = toScreen(l.pos, camera, canvas); l.el.style.opacity = s.behind ? '0' : '1'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; });
  }, canvas);
  void pick;
}
