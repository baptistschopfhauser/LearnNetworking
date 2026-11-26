import { THREE, createStage, starfield, glowSprite, toScreen, gridFloor, orbit, isMobile, sfx, burst, easeInOut } from './common.js';
import { loop, onCleanup, store, h, $, esc } from '../core.js';
import { tr } from '../i18n.js';
import { flag } from '../srs.js';
import { cableError, reachable, segments, segmentOf, segmentHasRouter, survivesAnyCableCut, cost, COST } from '../gamelogic.js';

const COLS = 10, ROWS = 7, CELL = 3.2;
const SEG_COLORS = [0x5cf2c2, 0xff7a45, 0x8b7bff, 0x4cc9ff, 0xffd166, 0xff5c9a];
const NAMES = { pc: 'PC', server: 'Server', switch: 'Switch', router: 'Router', internet: tr('Internet', 'Internet') };

// helpers over the current board
const pcs = (d) => d.filter((x) => x.type === 'pc').map((x) => x.id);
const net = (d) => d.find((x) => x.type === 'internet')?.id;
const allReach = (d, c, ids, target) => ids.every((id) => reachable(d, c, id, target).has(target));
const sameSeg = (d, c, ids) => { const s = segments(d, c); const i = segmentOf(s, ids[0]); return i >= 0 && ids.every((id) => segmentOf(s, id) === i); };
const segOf = (d, c, id) => segmentOf(segments(d, c), id);

const MISSIONS = [
  {
    title: tr('1 · Your first LAN', '1 · Dein erstes LAN'),
    brief: tr('Three PCs need to talk to each other. A PC has only one network port — so they need something in the middle.', 'Drei PCs sollen miteinander reden. Ein PC hat nur einen Netzwerkanschluss – also brauchen sie etwas in der Mitte.'),
    hint: tr('Place a Switch, then use the cable tool: tap the switch, then a PC. Repeat for every PC.', 'Setz einen Switch, dann mit dem Kabel-Werkzeug: Switch antippen, dann einen PC. Für jeden PC wiederholen.'),
    preset: [['pc', 1, 1], ['pc', 1, 3], ['pc', 1, 5]],
    checks: [{ t: tr('All three PCs are in one LAN segment', 'Alle drei PCs sind im selben LAN-Segment'), f: (d, c) => sameSeg(d, c, pcs(d)) }],
    card: 'q:switching:0',
  },
  {
    title: tr('2 · Off to the Internet', '2 · Ab ins Internet'),
    brief: tr('Get the office online. The Internet only talks to a router, and the router hands out addresses (DHCP) and does NAT.', 'Bring das Büro online. Das Internet spricht nur mit einem Router – und der Router verteilt Adressen (DHCP) und macht NAT.'),
    hint: tr('PCs → Switch → Router → Internet.', 'PCs → Switch → Router → Internet.'),
    preset: [['pc', 1, 1], ['pc', 1, 3], ['pc', 1, 5], ['internet', 9, 3]],
    checks: [
      { t: tr('PCs share one LAN', 'PCs teilen sich ein LAN'), f: (d, c) => sameSeg(d, c, pcs(d)) },
      { t: tr('The LAN has a router (gateway + DHCP)', 'Das LAN hat einen Router (Gateway + DHCP)'), f: (d, c) => { const s = segments(d, c); const i = segOf(d, c, pcs(d)[0]); return i >= 0 && segmentHasRouter(d, c, s[i]); } },
      { t: tr('Every PC reaches the Internet', 'Jeder PC erreicht das Internet'), f: (d, c) => allReach(d, c, pcs(d), net(d)) },
    ],
    card: 'q:ip-addresses:2',
  },
  {
    title: tr('3 · Two departments', '3 · Zwei Abteilungen'),
    brief: tr('Sales (top) and Engineering (bottom) get separate subnets — but can still reach each other and the Internet through a router.', 'Vertrieb (oben) und Entwicklung (unten) bekommen getrennte Subnetze – erreichen sich und das Internet aber über einen Router.'),
    hint: tr('One switch per department, both switches into the same router. Each router port is its own subnet.', 'Ein Switch pro Abteilung, beide Switches an denselben Router. Jeder Router-Port ist ein eigenes Subnetz.'),
    preset: [['pc', 1, 0, 'A'], ['pc', 3, 0, 'A'], ['pc', 1, 6, 'B'], ['pc', 3, 6, 'B'], ['internet', 9, 3]],
    checks: [
      { t: tr('Sales PCs share a subnet', 'Vertriebs-PCs teilen ein Subnetz'), f: (d, c) => sameSeg(d, c, d.filter((x) => x.group === 'A').map((x) => x.id)) },
      { t: tr('Engineering PCs share a subnet', 'Entwicklungs-PCs teilen ein Subnetz'), f: (d, c) => sameSeg(d, c, d.filter((x) => x.group === 'B').map((x) => x.id)) },
      { t: tr('The two departments are in different subnets', 'Die Abteilungen sind in verschiedenen Subnetzen'), f: (d, c) => { const a = d.find((x) => x.group === 'A'), b = d.find((x) => x.group === 'B'); const s = segments(d, c); return segmentOf(s, a.id) !== segmentOf(s, b.id); } },
      { t: tr('Everyone reaches the Internet (and each other)', 'Alle erreichen das Internet (und einander)'), f: (d, c) => allReach(d, c, pcs(d), net(d)) },
    ],
    card: 'q:subnetting:1',
  },
  {
    title: tr('4 · No single point of failure', '4 · Kein einzelner Ausfallpunkt'),
    brief: tr('The office must stay online even if any one cable between network devices is cut.', 'Das Büro muss online bleiben, selbst wenn irgendein Kabel zwischen Netzwerkgeräten durchtrennt wird.'),
    hint: tr('Use two routers, each with its own uplink to the Internet, and connect the switch to both.', 'Nimm zwei Router mit je eigener Leitung ins Internet und verbinde den Switch mit beiden.'),
    preset: [['pc', 1, 1], ['pc', 1, 3], ['pc', 1, 5], ['internet', 9, 3]],
    checks: [
      { t: tr('Every PC reaches the Internet', 'Jeder PC erreicht das Internet'), f: (d, c) => allReach(d, c, pcs(d), net(d)) },
      { t: tr('…even after any single infrastructure cable fails', '…auch wenn ein beliebiges Infrastruktur-Kabel ausfällt'), f: (d, c) => allReach(d, c, pcs(d), net(d)) && survivesAnyCableCut(d, c, pcs(d), net(d)) },
    ],
    card: 'g:Spanning Tree (STP)',
  },
  {
    title: tr('5 · Budget office with a DMZ', '5 · Spar-Büro mit DMZ'),
    brief: tr('Four PCs and a public web server. Put the server in its own subnet (a DMZ), away from the office LAN. Budget: 160 €.', 'Vier PCs und ein öffentlicher Webserver. Pack den Server in ein eigenes Subnetz (eine DMZ), getrennt vom Büro-LAN. Budget: 160 €.'),
    hint: tr('One switch for the PCs, the server plugs straight into a router port. Every cable costs 5 €.', 'Ein Switch für die PCs, der Server direkt an einen Router-Port. Jedes Kabel kostet 5 €.'),
    preset: [['pc', 1, 0], ['pc', 1, 2], ['pc', 1, 4], ['pc', 1, 6], ['server', 6, 6], ['internet', 9, 3]],
    budget: 160,
    checks: [
      { t: tr('PCs share one LAN with a router', 'PCs teilen ein LAN mit Router'), f: (d, c) => { const s = segments(d, c); const i = segOf(d, c, pcs(d)[0]); return sameSeg(d, c, pcs(d)) && i >= 0 && segmentHasRouter(d, c, s[i]); } },
      { t: tr('The server is in its own subnet', 'Der Server ist in einem eigenen Subnetz'), f: (d, c) => { const sv = d.find((x) => x.type === 'server').id; return segOf(d, c, sv) !== segOf(d, c, pcs(d)[0]); } },
      { t: tr('PCs and server reach the Internet', 'PCs und Server erreichen das Internet'), f: (d, c) => allReach(d, c, [...pcs(d), d.find((x) => x.type === 'server').id], net(d)) },
      { t: tr('Within budget', 'Im Budget'), f: (d, c) => cost(d, c) <= 160 },
    ],
    card: 'q:nat-firewalls:1',
  },
];
const ERRORS = {
  ports: tr('No free port left (PC/server: 1, router: 4, switch: 8, Internet: 2).', 'Kein Port mehr frei (PC/Server: 1, Router: 4, Switch: 8, Internet: 2).'),
  'internet-needs-router': tr('The Internet only connects to a router — your LAN uses private addresses that must be translated (NAT).', 'Das Internet verbindet sich nur mit einem Router – dein LAN nutzt private Adressen, die übersetzt werden müssen (NAT).'),
  'need-switch': tr('Two end devices can’t share one cable here — put a switch in between.', 'Zwei Endgeräte können hier nicht direkt verkabelt werden – setz einen Switch dazwischen.'),
  duplicate: tr('These two are already connected.', 'Die beiden sind schon verbunden.'),
  self: tr('Pick a different second device.', 'Wähle ein anderes zweites Gerät.'),
};

export function mountBuilder(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 0.85, bloomRadius: 0.5, bloomThreshold: 0.18, fogDensity: 0.01 });
  scene.add(starfield(1200, 200));
  scene.add(gridFloor(300, 90, -1.3));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(10, 30, 15); scene.add(dl);
  const mobile = isMobile();
  const cellPos = (col, row) => new THREE.Vector3((col - (COLS - 1) / 2) * CELL, 0, (row - (ROWS - 1) / 2) * CELL);

  const tiles = [];
  const tileGeo = new THREE.BoxGeometry(CELL * 0.94, 0.25, CELL * 0.94);
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: 0x141b33, emissive: 0x000000, metalness: 0.4, roughness: 0.6 }));
    m.position.copy(cellPos(c, r)).setY(-0.15); m.userData = { col: c, row: r };
    scene.add(m); tiles.push(m);
  }

  // device models
  function model(type) {
    const g = new THREE.Group();
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a2240, metalness: 0.6, roughness: 0.35 });
    const glowMat = (c) => new THREE.MeshBasicMaterial({ color: c });
    if (type === 'pc') {
      const scr = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.1, 0.12), dark); scr.position.y = 1.3;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.9), glowMat(0x4cc9ff)); face.position.set(0, 1.3, 0.07);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.6, 0.15), dark); stand.position.y = 0.5;
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.08, 0.6), dark); base.position.y = 0.2;
      g.add(scr, face, stand, base);
    } else if (type === 'server') {
      for (let i = 0; i < 3; i++) { const u = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 1.3), dark); u.position.y = 0.45 + i * 0.8; const led = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 0.05), glowMat(0xff7a45)); led.position.set(0, 0.45 + i * 0.8, 0.67); g.add(u, led); }
    } else if (type === 'switch') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 1.2), dark); b.position.y = 0.4; g.add(b);
      for (let i = 0; i < 8; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.05), glowMat(0x5cf2c2)); p.position.set(-0.98 + i * 0.28, 0.42, 0.62); g.add(p); }
    } else if (type === 'router') {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.1, 0.6, 24), dark); b.position.y = 0.4; g.add(b);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.06, 8, 40), glowMat(0x8b7bff)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.4; g.add(ring);
      [-0.5, 0.5].forEach((x) => { const a = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.1), dark); a.position.set(x, 1.1, -0.5); g.add(a); });
    } else {
      const cloud = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), new THREE.MeshBasicMaterial({ color: 0x4cc9ff, wireframe: true, transparent: true, opacity: 0.7 }));
      cloud.position.y = 1.6;
      const halo = glowSprite(new THREE.Color(0x4cc9ff), 6); halo.position.y = 1.6;
      g.add(cloud, halo);
      g.userData.spin = cloud;
    }
    return g;
  }

  /* ---------- state ---------- */
  let mi = 0, devices = [], cables = [], nextId = 1, tool = 'cable', pick = null, history = [], state = 'intro', solvedAt = 0;
  const objs = new Map(); // devId -> { g, label, ring }
  const cableObjs = [];
  const labels = [];
  const mission = () => MISSIONS[mi];

  function snapshot() { history.push(JSON.stringify({ devices, cables, nextId })); if (history.length > 50) history.shift(); }
  function clearScene() {
    objs.forEach((o) => { scene.remove(o.g); o.label.el.remove(); });
    objs.clear(); labels.length = 0;
    cableObjs.forEach((l) => scene.remove(l)); cableObjs.length = 0;
  }
  function rebuild() {
    clearScene();
    for (const d of devices) {
      const g = model(d.type);
      g.position.copy(cellPos(d.col, d.row));
      g.traverse((m) => { if (m.isMesh) m.userData.devId = d.id; });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.07, 6, 40), new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: 0 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = 0.1; g.add(ring);
      scene.add(g);
      const el = document.createElement('div');
      el.className = 'label3d'; hud.appendChild(el);
      const label = { pos: g.position.clone().add(new THREE.Vector3(0, d.type === 'internet' ? 3.6 : d.type === 'server' ? 3.1 : 2.4, 0)), el };
      labels.push(label);
      objs.set(d.id, { g, label, ring });
    }
    for (const [a, b] of cables) {
      const pa = objs.get(a).g.position.clone().setY(0.6), pb = objs.get(b).g.position.clone().setY(0.6);
      const mid = pa.clone().lerp(pb, 0.5); mid.y = 1.4;
      const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
      const line = new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.08, 6, false), new THREE.MeshBasicMaterial({ color: 0x5cf2c2 }));
      line.userData.curve = curve;
      scene.add(line); cableObjs.push(line);
    }
    evaluate();
  }

  /* ---------- HUD ---------- */
  hud.innerHTML = '';
  const top = h(`<div class="hud hud-top">
    <div class="hud-pill"><span>${tr('MISSION', 'MISSION')}</span><b id="b-mission">1/${MISSIONS.length}</b></div>
    <div class="hud-pill"><span>${tr('COST', 'KOSTEN')}</span><b id="b-cost">0 €</b></div>
  </div>`);
  const side = h(`<div class="hud hud-side"><div class="hud-panel" id="b-panel"></div></div>`);
  const bar = h(`<div class="hud hud-bottom" id="b-tools"></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, side, bar, overlay);
  if (mobile) { side.style.top = '96px'; side.style.maxHeight = '34%'; side.style.overflowY = 'auto'; }
  const P = $('#b-panel', side);
  const msg = (html) => { const e = $('#b-msg', P); if (e) e.innerHTML = html; };

  const TOOLS = [
    ['cable', '🔌', tr('Cable', 'Kabel'), COST.cable],
    ['switch', '🔀', 'Switch', COST.switch],
    ['router', '📡', 'Router', COST.router],
    ['delete', '🗑', tr('Remove', 'Entfernen'), null],
  ];
  function renderTools() {
    bar.innerHTML = TOOLS.map(([id, ic, name, c]) => `<button class="hop-btn ${tool === id ? 'on' : ''}" data-tool="${id}">${ic} ${name}${c ? ` <small style="color:var(--muted)">${c} €</small>` : ''}</button>`).join('') + `<button class="hop-btn" id="b-undo">↶ ${tr('Undo', 'Zurück')}</button>`;
    bar.querySelectorAll('[data-tool]').forEach((b) => (b.onclick = () => { tool = b.dataset.tool; pick = null; sfx.play('click'); renderTools(); msg(toolHelp()); }));
    $('#b-undo', bar).onclick = undo;
  }
  const toolHelp = () => ({
    cable: tr('Cable: tap a device, then a second one.', 'Kabel: ein Gerät antippen, dann ein zweites.'),
    switch: tr('Switch: tap an empty tile to place it.', 'Switch: leeres Feld antippen zum Platzieren.'),
    router: tr('Router: tap an empty tile to place it.', 'Router: leeres Feld antippen zum Platzieren.'),
    delete: tr('Remove: tap a device you placed (removes its cables too). Tapping a fixed device removes only its cables.', 'Entfernen: ein selbst gesetztes Gerät antippen (samt Kabeln). Ein festes Gerät antippen entfernt nur seine Kabel.'),
  }[tool]);
  function renderPanel() {
    const m = mission();
    P.innerHTML = `<h4>${esc(m.title)}</h4><p style="color:var(--text);font:.9rem/1.5 var(--font-body);margin:0 0 10px">${esc(m.brief)}</p>
      <ul class="b-checks" id="b-checks"></ul>
      <div id="b-msg" style="font:.82rem var(--font-body);min-height:20px;margin-top:8px">${toolHelp()}</div>
      <div class="btn-row" style="margin-top:8px"><button class="btn small ghost" id="b-hint">💡 ${tr('Hint', 'Tipp')}</button><button class="btn small ghost" id="b-reset">↺ ${tr('Reset', 'Neu')}</button></div>`;
    $('#b-hint', P).onclick = () => { msg(`<span style="color:var(--yellow)">💡 ${esc(m.hint)}</span>`); flag(m.card); };
    $('#b-reset', P).onclick = () => { snapshot(); loadMission(true); };
  }

  /* ---------- rules & evaluation ---------- */
  function evaluate() {
    const m = mission();
    const results = m.checks.map((c) => c.f(devices, cables));
    const ul = $('#b-checks', P);
    if (ul) ul.innerHTML = m.checks.map((c, i) => `<li class="${results[i] ? 'ok' : ''}">${results[i] ? '✓' : '○'} ${esc(c.t)}</li>`).join('');
    const c = cost(devices, cables);
    const costEl = shell.querySelector('#b-cost');
    if (costEl) { costEl.textContent = `${c} €${m.budget ? ` / ${m.budget}` : ''}`; costEl.style.color = m.budget && c > m.budget ? 'var(--danger)' : ''; }
    // colour every LAN segment's tiles; show addresses
    const segs = segments(devices, cables);
    tiles.forEach((t) => t.material.emissive.setHex(0x000000));
    let routed = 0;
    segs.forEach((seg, si) => {
      const hasR = segmentHasRouter(devices, cables, seg);
      const col = SEG_COLORS[si % SEG_COLORS.length];
      const subnet = hasR ? ++routed : 0;
      let host = 10;
      seg.forEach((id) => {
        const d = devices.find((x) => x.id === id);
        const tile = tiles.find((t) => t.userData.col === d.col && t.userData.row === d.row);
        if (seg.length > 1 || hasR) tile.material.emissive.setHex(col).multiplyScalar(0.35);
        const o = objs.get(id);
        if (!o) return;
        const ip = d.type === 'switch' ? '' : hasR ? `192.168.${subnet}.${host++}` : seg.length > 1 ? tr('no IP (no DHCP)', 'keine IP (kein DHCP)') : tr('not connected', 'nicht verbunden');
        o.label.el.innerHTML = `${NAMES[d.type]}${d.group ? ` ${d.group === 'A' ? tr('Sales', 'Vertrieb') : tr('Eng.', 'Entw.')}` : ''}${ip ? `<small>${ip}</small>` : ''}`;
        o.label.el.style.borderColor = seg.length > 1 || hasR ? '#' + col.toString(16).padStart(6, '0') : 'var(--line-strong)';
      });
    });
    devices.filter((d) => d.type === 'router' || d.type === 'internet').forEach((d) => {
      const o = objs.get(d.id);
      if (o) o.label.el.innerHTML = d.type === 'router' ? `Router <small>${tr('gateway · NAT', 'Gateway · NAT')}</small>` : `${NAMES.internet} <small>${tr('public', 'öffentlich')}</small>`;
    });
    if (results.every(Boolean) && state === 'build') missionComplete();
  }
  function act(fn) { snapshot(); fn(); rebuild(); }
  function undo() {
    if (!history.length || state !== 'build') return;
    const s = JSON.parse(history.pop());
    devices = s.devices; cables = s.cables; nextId = s.nextId; pick = null;
    sfx.play('click'); rebuild();
  }
  function tapTile(col, row) {
    if (state !== 'build') return;
    const occupant = devices.find((d) => d.col === col && d.row === row);
    if (occupant) return tapDevice(occupant.id);
    if (tool === 'switch' || tool === 'router') {
      const m = mission();
      if (m.budget && cost(devices, cables) + COST[tool] > m.budget) { sfx.play('bad'); msg(`<span style="color:var(--danger)">${tr('Over budget!', 'Budget überschritten!')}</span>`); return; }
      act(() => devices.push({ id: nextId++, type: tool, col, row, placed: true }));
      sfx.play('ok');
      burst(scene, cellPos(col, row).setY(1), tool === 'router' ? 0x8b7bff : 0x5cf2c2, 10);
    }
  }
  function tapDevice(id) {
    if (state !== 'build') return;
    const d = devices.find((x) => x.id === id);
    if (tool === 'delete') {
      act(() => { cables = cables.filter(([a, b]) => a !== id && b !== id); if (d.placed) devices = devices.filter((x) => x.id !== id); });
      sfx.play('zap');
      return;
    }
    if (tool !== 'cable') { tool = 'cable'; renderTools(); }
    if (pick == null) { pick = id; sfx.play('click'); msg(tr(`${NAMES[d.type]} selected — now tap the device to connect it to.`, `${NAMES[d.type]} gewählt – jetzt das Gerät antippen, mit dem es verbunden werden soll.`)); return; }
    if (pick === id) { pick = null; msg(toolHelp()); return; }
    const err = cableError(devices, cables, pick, id);
    if (err) { sfx.play('bad'); msg(`<span style="color:var(--danger)">✗ ${ERRORS[err] || err}</span>`); if (err !== 'duplicate' && err !== 'self') flag(mission().card); pick = null; return; }
    const m = mission();
    if (m.budget && cost(devices, cables) + COST.cable > m.budget) { sfx.play('bad'); msg(`<span style="color:var(--danger)">${tr('Over budget!', 'Budget überschritten!')}</span>`); pick = null; return; }
    const a = pick; pick = null;
    act(() => cables.push([a, id]));
    sfx.play('ok');
    msg(toolHelp());
  }

  function loadMission(keepHistory = false) {
    const m = mission();
    devices = m.preset.map(([type, col, row, group], i) => ({ id: i + 1, type, col, row, group }));
    nextId = devices.length + 1; cables = []; pick = null; tool = 'cable';
    if (!keepHistory) history = [];
    state = 'build';
    shell.querySelector('#b-mission').textContent = `${mi + 1}/${MISSIONS.length}`;
    renderPanel(); renderTools(); rebuild();
  }

  // packets flow from every PC to the Internet once a mission is solved
  const flows = [];
  function missionComplete() {
    state = 'solved'; solvedAt = performance.now();
    sfx.play('win');
    store.award(`builder-m${mi + 1}`, 20, tr(`Mission ${mi + 1} complete`, `Mission ${mi + 1} geschafft`));
    const target = net(devices);
    devices.filter((d) => d.type === 'pc' || d.type === 'server').forEach((d, k) => {
      const path = pathTo(d.id, target ?? devices.filter((x) => x.type === 'pc').slice(-1)[0].id);
      if (path.length > 1) flows.push({ path, t: -k * 0.25, sprite: glowSprite(new THREE.Color(0x5cf2c2), 1.4) });
    });
    flows.forEach((f) => scene.add(f.sprite));
    setTimeout(() => {
      const last = mi >= MISSIONS.length - 1;
      if (last) { store.award('builder-win', 50, tr('Network architect', 'Netzwerk-Architekt')); store.setBest('builder', MISSIONS.length); }
      overlay.innerHTML = `<div class="panel"><span class="tag mint">${tr('mission complete', 'Mission geschafft')}</span><h2 style="margin-top:14px">${esc(mission().title)} ✓</h2>
        <p>${[tr('A switch joins devices into one LAN (layer 2). Frames go straight to the right port.', 'Ein Switch verbindet Geräte zu einem LAN (Schicht 2). Rahmen gehen direkt zum richtigen Port.'),
              tr('The router is the default gateway: it gives the LAN private addresses via DHCP and translates them to its public IP (NAT).', 'Der Router ist das Default-Gateway: Er vergibt private Adressen per DHCP und übersetzt sie auf seine öffentliche IP (NAT).'),
              tr('Each router port is a separate subnet (see the colours). Traffic between them is routed — exactly where you’d add firewall rules.', 'Jeder Router-Port ist ein eigenes Subnetz (siehe Farben). Verkehr dazwischen wird geroutet – genau dort würdest du Firewall-Regeln setzen.'),
              tr('Redundant paths remove single points of failure. Between switches, Spanning Tree keeps such loops safe.', 'Redundante Wege beseitigen einzelne Ausfallpunkte. Zwischen Switches hält Spanning Tree solche Schleifen sicher.'),
              tr('A DMZ keeps public servers apart from the office: if the web server is hacked, the attacker is not in your LAN.', 'Eine DMZ trennt öffentliche Server vom Büro: Wird der Webserver gehackt, ist der Angreifer nicht in deinem LAN.')][mi]}</p>
        <p style="font-size:.85rem">${tr('Cost', 'Kosten')}: ${cost(devices, cables)} €</p>
        <div class="btn-row">${last ? `<button class="btn" id="b-again">${tr('Play again', 'Noch mal')}</button><a class="btn ghost" href="#/learn/routing">${tr('Routing lesson', 'Lektion Routing')}</a>` : `<button class="btn" id="b-next">${tr('Next mission →', 'Nächste Mission →')}</button>`}</div></div>`;
      overlay.style.display = 'grid';
      if (last) $('#b-again', overlay).onclick = () => { mi = 0; overlay.style.display = 'none'; clearFlows(); loadMission(); };
      else $('#b-next', overlay).onclick = () => { mi++; overlay.style.display = 'none'; clearFlows(); loadMission(); };
    }, 2600);
  }
  function clearFlows() { flows.forEach((f) => { scene.remove(f.sprite); f.sprite.material.dispose(); }); flows.length = 0; }
  function pathTo(from, to) {
    const prev = new Map([[from, null]]), q = [from];
    while (q.length) { const u = q.shift(); if (u === to) break; for (const [a, b] of cables) { const v = a === u ? b : b === u ? a : null; if (v != null && !prev.has(v)) { prev.set(v, u); q.push(v); } } }
    if (!prev.has(to)) return [];
    const p = []; for (let x = to; x != null; x = prev.get(x)) p.unshift(x);
    return p;
  }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">${tr('3D · sandbox missions', '3D · Bau-Missionen')}</span><h2 style="margin-top:14px">${tr('Network Builder', 'Netzwerk-Baukasten')}</h2>
    <p>${tr('Build real network designs: place switches and routers, run cables, and watch subnets light up.', 'Baue echte Netzwerk-Designs: Switches und Router setzen, Kabel ziehen und zusehen, wie Subnetze aufleuchten.')}</p>
    <div class="how"><div>🧰 ${tr('Pick a tool at the bottom: Cable, Switch, Router, Remove.', 'Wähle unten ein Werkzeug: Kabel, Switch, Router, Entfernen.')}</div><div>🎨 ${tr('Each colour on the floor is one LAN segment / subnet.', 'Jede Farbe auf dem Boden ist ein LAN-Segment bzw. Subnetz.')}</div><div>✅ ${tr('The checklist updates live — finish all goals to complete a mission.', 'Die Checkliste aktualisiert sich live – erfülle alle Ziele, um die Mission zu schaffen.')}</div><div>↶ ${tr('Made a mess? Undo or reset any time.', 'Verbaut? Jederzeit zurück oder neu starten.')}</div></div>
    <div class="btn-row"><button class="btn" id="b-start">${tr('Start building ▶', 'Losbauen ▶')}</button><a class="btn ghost" href="#/learn/switching">${tr('Learn first', 'Erst lernen')}</a></div></div>`;
  $('#b-start', overlay).onclick = () => { sfx.play('click'); overlay.style.display = 'none'; loadMission(); };

  /* ---------- input ---------- */
  const cam = orbit(canvas, { theta: 0, phi: 0.85, dist: mobile ? 46 : 34, phiMin: 0.25, phiMax: 1.3, distMin: 16, distMax: 70 });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  canvas.addEventListener('pointerup', (e) => {
    if (cam.moved > 8) return;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const devMeshes = []; objs.forEach((o) => o.g.traverse((m) => m.isMesh && devMeshes.push(m)));
    const hitDev = ray.intersectObjects(devMeshes, false)[0];
    if (hitDev && hitDev.object.userData.devId != null) return tapDevice(hitDev.object.userData.devId);
    const hitTile = ray.intersectObjects(tiles, false)[0];
    if (hitTile) tapTile(hitTile.object.userData.col, hitTile.object.userData.row);
  });
  onCleanup(() => labels.forEach((l) => l.el.remove()));

  const look = new THREE.Vector3(0, 0, 0);
  loop((dt, t) => {
    if (state === 'intro') cam.theta += dt * 0.1;
    objs.forEach((o, id) => {
      o.ring.material.opacity = id === pick ? 0.9 : 0;
      if (o.g.userData.spin) o.g.userData.spin.rotation.y += dt * 0.3;
    });
    for (const f of flows) {
      f.t += dt * 1.2;
      const seg = Math.floor(Math.max(0, f.t)) % (f.path.length - 1);
      const k = easeInOut(Math.max(0, f.t) % 1);
      const a = objs.get(f.path[seg])?.g.position, b = objs.get(f.path[seg + 1])?.g.position;
      if (a && b) f.sprite.position.lerpVectors(a, b, k).setY(1.4 + Math.sin(k * Math.PI));
    }
    const off = new THREE.Vector3(Math.sin(cam.phi) * Math.sin(cam.theta), Math.cos(cam.phi), Math.sin(cam.phi) * Math.cos(cam.theta)).multiplyScalar(cam.dist);
    camera.position.lerp(look.clone().add(off), 0.1);
    camera.lookAt(look);
    if (!mobile) camera.setViewOffset(canvas.clientWidth, canvas.clientHeight, canvas.clientWidth * 0.13, 0, canvas.clientWidth, canvas.clientHeight); else camera.clearViewOffset();
    render();
    labels.forEach((l) => { const s = toScreen(l.pos, camera, canvas); l.el.style.opacity = s.behind || state === 'intro' ? '0' : '1'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; });
    void solvedAt;
  }, canvas);
}
