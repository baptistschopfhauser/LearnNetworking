import { THREE, createStage, starfield, glowSprite, C3, toScreen, gridFloor, easeInOut } from './common.js';
import { loop, onCleanup, rand, pick, shuffle, store, h, $, esc, intToIp, ipToInt, inSubnet } from '../core.js';

/* ---------------------------------------------------------
   Level generation
   --------------------------------------------------------- */
function genLevel(L) {
  const layers = 3 + Math.min(L, 4); // 4..7 layers
  const routers = [];
  const links = [];
  const has = (a, b) => links.some((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a));
  const link = (a, b) => { if (a !== b && !has(a, b)) links.push({ a, b }); };
  let id = 0;
  const byLayer = [];
  for (let l = 0; l < layers; l++) {
    const count = l === 0 ? 1 : l === layers - 1 ? 2 : rand(2, 3);
    const arr = [];
    for (let k = 0; k < count; k++) {
      const spread = (k - (count - 1) / 2) * 9;
      routers.push({
        id, layer: l, name: 'R' + (id + 1),
        pos: new THREE.Vector3(l * 13 - layers * 6.5, spread * 0.55 + rand(-2, 2), spread + rand(-2, 2)),
        octet: 0,
      });
      arr.push(id++);
    }
    byLayer.push(arr);
  }
  // connect consecutive layers (each node to 1-2 nodes of next)
  for (let l = 0; l < layers - 1; l++) {
    for (const a of byLayer[l]) {
      const nxt = shuffle(byLayer[l + 1]);
      link(a, nxt[0]);
      if (nxt[1] !== undefined && Math.random() < 0.6) link(a, nxt[1]);
    }
    for (const b of byLayer[l + 1]) if (!links.some((x) => x.a === b || x.b === b)) link(pick(byLayer[l]), b);
    // lateral link
    if (byLayer[l + 1].length > 1 && Math.random() < 0.5) link(byLayer[l + 1][0], byLayer[l + 1][1]);
  }
  // make sure every router has >= 2 neighbours where possible
  const nb = (r) => links.filter((x) => x.a === r || x.b === r).map((x) => (x.a === r ? x.b : x.a));
  routers.forEach((r) => {
    if (nb(r.id).length < 2) {
      const cands = routers.filter((o) => o.id !== r.id && Math.abs(o.layer - r.layer) <= 1 && !has(o.id, r.id));
      if (cands.length) link(r.id, pick(cands).id);
    }
  });
  // assign unique second octets
  const octets = shuffle(Array.from({ length: 200 }, (_, i) => i + 10));
  routers.forEach((r, i) => (r.octet = octets[i]));
  // interfaces per router
  routers.forEach((r) => { r.ifaces = nb(r.id).map((n, i) => ({ name: 'eth' + i, to: n })); });

  const src = 0;
  const dst = pick(byLayer[layers - 1]);
  const D = routers[dst].octet, S = rand(1, 250), H = rand(2, 250);
  const destIp = `10.${D}.${S}.${H}`;
  // BFS from destination to get next hops
  const parent = new Map([[dst, -1]]);
  const q = [dst];
  while (q.length) { const u = q.shift(); for (const v of nb(u)) if (!parent.has(v)) { parent.set(v, u); q.push(v); } }
  let pathLen = 0; for (let x = src; x !== dst; x = parent.get(x)) pathLen++;

  // routing tables
  routers.forEach((r) => {
    const table = [];
    const ifTo = (n) => r.ifaces.find((f) => f.to === n);
    const others = (exclude) => r.ifaces.filter((f) => f.name !== exclude);
    if (r.id === dst) {
      table.push({ prefix: `10.${D}.${S}.0/24`, iface: 'lan0', via: 'directly connected', correct: true });
      const o = pick(r.ifaces);
      table.push({ prefix: `10.${D}.0.0/16`, iface: o.name, via: routers[o.to].name });
      table.push({ prefix: '0.0.0.0/0', iface: pick(r.ifaces).name, via: 'default' });
      r.lan = true;
    } else {
      const next = parent.get(r.id);
      const good = ifTo(next);
      const bad = others(good.name);
      const anyBad = () => (bad.length ? pick(bad) : good);
      const variant = L === 1 ? 'simple' : pick(L >= 3 ? ['covering', 'specific', 'default', 'specific'] : ['covering', 'default', 'simple']);
      if (variant === 'simple') {
        table.push({ prefix: `10.${D}.0.0/16`, iface: good.name, via: routers[next].name, correct: true });
        const b = anyBad();
        table.push({ prefix: `10.${pick(routers.filter((x) => x.octet !== D)).octet}.0.0/16`, iface: b.name, via: routers[b.to].name });
        if (L >= 2 || Math.random() < 0.5) { const b2 = anyBad(); table.push({ prefix: '0.0.0.0/0', iface: b2.name, via: routers[b2.to].name }); }
      } else if (variant === 'covering') {
        const b = anyBad();
        table.push({ prefix: '10.0.0.0/8', iface: b.name, via: routers[b.to].name });
        table.push({ prefix: `10.${D}.0.0/16`, iface: good.name, via: routers[next].name, correct: true });
        const b2 = anyBad();
        table.push({ prefix: '0.0.0.0/0', iface: b2.name, via: routers[b2.to].name });
      } else if (variant === 'specific') {
        const b = anyBad();
        table.push({ prefix: `10.${D}.0.0/16`, iface: b.name, via: routers[b.to].name });
        table.push({ prefix: `10.${D}.${S}.0/24`, iface: good.name, via: routers[next].name, correct: true });
        const b2 = anyBad();
        const sOther = (S + rand(1, 3)) % 256;
        table.push({ prefix: `10.${D}.${sOther}.0/24`, iface: b2.name, via: routers[b2.to].name });
        if (Math.random() < 0.6) { const b3 = anyBad(); table.push({ prefix: '0.0.0.0/0', iface: b3.name, via: routers[b3.to].name }); }
      } else {
        // only the default route matches
        const b = anyBad();
        table.push({ prefix: `10.${(D + rand(1, 30)) % 250 + 1}.0.0/16`, iface: b.name, via: routers[b.to].name });
        const b2 = anyBad();
        table.push({ prefix: `172.16.0.0/12`, iface: b2.name, via: routers[b2.to].name });
        table.push({ prefix: '0.0.0.0/0', iface: good.name, via: routers[next].name, correct: true });
      }
      // sanity: verify the "correct" entry really is the longest match (protect against random collisions)
      const ip = ipToInt(destIp);
      const matches = table.filter((e) => { const [n, p] = e.prefix.split('/'); return inSubnet(ip, ipToInt(n), +p); });
      const best = matches.sort((a, b) => +b.prefix.split('/')[1] - +a.prefix.split('/')[1])[0];
      table.forEach((e) => (e.correct = e === best));
      r.answer = best.iface;
      table.sort((a, b) => +b.prefix.split('/')[1] - +a.prefix.split('/')[1] || a.prefix.localeCompare(b.prefix));
    }
    if (r.id === dst) r.answer = 'lan0';
    r.table = table;
  });
  return { routers, links, src, dst, destIp, pathLen, nb };
}

/* ---------------------------------------------------------
   Game
   --------------------------------------------------------- */
export function mountRunner(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 1.0, bloomRadius: 0.55, fogDensity: 0.012 });
  scene.add(starfield(1600, 220));
  scene.add(gridFloor(400, 100, -18));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(10, 20, 10); scene.add(key);
  const rim = new THREE.PointLight(0x8b7bff, 60, 80); rim.position.set(-20, 10, -10); scene.add(rim);

  let world = new THREE.Group();
  scene.add(world);
  let L = 1, score = 0, ttl = 0, lvl, cur, state = 'intro', hopStart = 0, labels = [], hintUsed = false, mistakes = 0, levelScore = 0;
  const packet = new THREE.Group();
  const pCore = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x5cf2c2, emissive: 0x5cf2c2, emissiveIntensity: 1.6, metalness: 0.2, roughness: 0.3 }));
  const pShell = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), new THREE.MeshBasicMaterial({ color: 0x5cf2c2, wireframe: true, transparent: true, opacity: 0.5 }));
  packet.add(pCore, pShell, glowSprite(C3.mint, 5));
  scene.add(packet);
  // trail
  const TRAIL = 40;
  const trailPos = new Float32Array(TRAIL * 3);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0x5cf2c2, transparent: true, opacity: 0.6 }));
  scene.add(trail);

  let flight = null; // {from, to, t, dur, bounce, done}
  const routerObjs = new Map();
  const linkObjs = [];

  function buildWorld() {
    scene.remove(world);
    world.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    world = new THREE.Group();
    scene.add(world);
    routerObjs.clear(); linkObjs.length = 0;
    labels.forEach((l) => l.el.remove()); labels = [];
    const bodyGeo = new THREE.CylinderGeometry(1.5, 1.7, 1.2, 24);
    const ringGeo = new THREE.TorusGeometry(2.3, 0.08, 8, 48);
    lvl.routers.forEach((r) => {
      const g = new THREE.Group(); g.position.copy(r.pos);
      const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x1a2240, metalness: 0.7, roughness: 0.35, emissive: 0x0a1030 }));
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x8b7bff }));
      ring.rotation.x = Math.PI / 2;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.08, 24), new THREE.MeshBasicMaterial({ color: 0x8b7bff, transparent: true, opacity: 0.6 }));
      top.position.y = 0.64;
      const glow = glowSprite(C3.violet, 6); glow.material.opacity = 0.35;
      g.add(body, ring, top, glow);
      if (r.id === lvl.dst) {
        const host = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.1, 0.2), new THREE.MeshStandardMaterial({ color: 0x222a44, emissive: 0xff7a45, emissiveIntensity: 0.6 }));
        host.position.set(0, 4, 0);
        const stand = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.7, 0), new THREE.Vector3(0, 3.4, 0)]), new THREE.LineBasicMaterial({ color: 0xff7a45 }));
        const hg = glowSprite(C3.orange, 7);
        hg.position.y = 4;
        g.add(host, stand, hg);
        g.userData.host = host;
        ring.material.color.set(0xff7a45); top.material.color.set(0xff7a45); glow.material.color.set(0xff7a45);
      }
      world.add(g);
      routerObjs.set(r.id, { g, ring, top, glow, body });
      addLabel(r.id, () => r.pos.clone().add(new THREE.Vector3(0, -2.6, 0)), `${r.name}<small>10.${r.octet}.x.x</small>`);
    });
    lvl.links.forEach((l) => {
      const a = lvl.routers[l.a].pos, b = lvl.routers[l.b].pos;
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0x3a4a80, transparent: true, opacity: 0.8 }));
      world.add(line);
      // ambient traffic dot
      const dot = glowSprite(C3.sky, 1.1);
      world.add(dot);
      linkObjs.push({ l, line, dot, off: Math.random(), speed: 0.2 + Math.random() * 0.3 });
    });
    const dpos = lvl.routers[lvl.dst].pos.clone().add(new THREE.Vector3(0, 5.6, 0));
    addLabel('dest', () => dpos, `🖥 ${lvl.destIp}`, 'cur');
  }

  function addLabel(id, posFn, html, cls = '') {
    const el = document.createElement('div');
    el.className = 'label3d ' + cls;
    el.innerHTML = html;
    hud.appendChild(el);
    labels.push({ id, posFn, el });
    return el;
  }

  /* ---------- HUD ---------- */
  hud.innerHTML = '';
  const top = h(`<div class="hud hud-top">
    <div class="hud-pill"><span>LEVEL</span><b id="r-level">1</b></div>
    <div class="hud-pill dest"><span>DESTINATION</span><b id="r-dest">—</b></div>
    <div class="hud-pill ttl"><span>TTL</span><b id="r-ttl">—</b></div>
    <div class="hud-pill"><span>SCORE</span><b id="r-score">0</b></div>
    <div class="hud-pill"><span>AT ROUTER</span><b id="r-at">—</b></div>
  </div>`);
  const side = h(`<div class="hud hud-side"><div class="hud-panel" id="r-panel"><h4>Routing table</h4><div id="r-table"></div><div id="r-msg" style="margin-top:10px;min-height:20px"></div>
    <div style="margin-top:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap"><button class="btn small ghost" id="r-hint">💡 Hint (−30)</button><span style="font-size:.72rem;color:var(--muted)">drag to orbit · scroll to zoom</span></div></div></div>`);
  const bottom = h(`<div class="hud hud-bottom" id="r-hops"></div>`);
  const overlay = h(`<div class="overlay" id="r-overlay"></div>`);
  shell.append(top, side, bottom, overlay);
  if (window.innerWidth < 760) { side.style.top = 'auto'; side.style.bottom = '84px'; side.style.maxHeight = '40%'; side.style.overflow = 'auto'; }

  const setText = (id, t) => { const e = shell.querySelector('#' + id); if (e) e.textContent = t; };
  function updateHud() {
    setText('r-level', `${L}/5`); setText('r-dest', lvl?.destIp ?? '—'); setText('r-ttl', String(ttl)); setText('r-score', String(score));
    setText('r-at', lvl ? lvl.routers[cur].name : '—');
  }

  function showTable(highlight = false) {
    const r = lvl.routers[cur];
    $('#r-table', side).innerHTML = `<table class="mini-table"><thead><tr><th>Prefix</th><th>Iface</th><th>Next hop</th></tr></thead><tbody>${r.table.map((e) => {
      const [n, p] = e.prefix.split('/'); const m = inSubnet(ipToInt(lvl.destIp), ipToInt(n), +p);
      const cls = highlight && e.correct ? 'hit' : '';
      return `<tr class="${cls}" style="${highlight && !m ? 'opacity:.4' : ''}"><td style="color:var(--text)">${e.prefix}</td><td style="color:var(--orange)">${e.iface}</td><td>${e.via}</td></tr>`;
    }).join('')}</tbody></table>`;
  }

  function showHops() {
    const r = lvl.routers[cur];
    const opts = [...r.ifaces.map((f) => ({ iface: f.name, label: `${f.name} → ${lvl.routers[f.to].name}`, to: f.to }))];
    if (r.lan) opts.push({ iface: 'lan0', label: 'lan0 → deliver to host', to: 'host' });
    $('#r-hops', shell).innerHTML = opts.map((o, i) => `<button class="hop-btn" data-iface="${o.iface}"><kbd>${i + 1}</kbd>${o.label}</button>`).join('');
    shell.querySelectorAll('.hop-btn').forEach((b) => (b.onclick = () => choose(b.dataset.iface)));
    if (window.innerWidth < 760) side.style.bottom = ($('#r-hops', shell).offsetHeight + 24) + 'px';
    // option labels at neighbour routers
    labels.filter((l) => l.id === 'opt').forEach((l) => l.el.remove());
    labels = labels.filter((l) => l.id !== 'opt');
    opts.forEach((o, i) => {
      if (o.to === 'host') return;
      const el = addLabel('opt', () => lvl.routers[o.to].pos.clone().add(new THREE.Vector3(0, 2.8, 0)), `${i + 1} · ${o.iface}`, 'opt');
      el.onclick = () => choose(o.iface);
    });
  }
  function clearHops() {
    $('#r-hops', shell).innerHTML = '';
    labels.filter((l) => l.id === 'opt').forEach((l) => l.el.remove());
    labels = labels.filter((l) => l.id !== 'opt');
  }

  function msg(html) { $('#r-msg', side).innerHTML = html; }

  function arrive() {
    state = 'choose';
    hopStart = performance.now();
    hintUsed = false;
    showTable(false);
    showHops();
    msg(`<span style="color:var(--muted)">Which interface does the longest prefix match for <b style="color:var(--mint)">${lvl.destIp}</b> use?</span>`);
    updateHud();
  }

  function choose(iface) {
    if (state !== 'choose') return;
    const r = lvl.routers[cur];
    const secs = (performance.now() - hopStart) / 1000;
    if (iface === r.answer) {
      const bonus = Math.max(0, Math.round(50 - secs * 6));
      const gained = 100 + bonus - (hintUsed ? 30 : 0);
      score += gained; levelScore += gained;
      ttl--;
      const correct = r.table.find((e) => e.correct);
      msg(`<span style="color:var(--mint)">✓ ${correct.prefix} is the longest match → ${iface}</span> <b>+${gained}</b>`);
      clearHops();
      if (iface === 'lan0') {
        state = 'fly';
        flight = { from: r.pos.clone(), to: r.pos.clone().add(new THREE.Vector3(0, 4, 0)), t: 0, dur: 0.9, done: levelDone };
      } else {
        const next = r.ifaces.find((f) => f.name === iface).to;
        state = 'fly';
        flight = { from: r.pos.clone(), to: lvl.routers[next].pos.clone(), t: 0, dur: 1.3, done: () => { cur = next; if (ttl <= 0) return gameOver('TTL expired'); arrive(); } };
      }
    } else {
      ttl--; mistakes++;
      score = Math.max(0, score - 40); levelScore -= 40;
      const correct = r.table.find((e) => e.correct);
      const why = r.table.filter((e) => { const [n, p] = e.prefix.split('/'); return inSubnet(ipToInt(lvl.destIp), ipToInt(n), +p); }).map((e) => e.prefix);
      msg(`<span style="color:var(--danger)">✗ Wrong interface — the packet got bounced back (TTL −1).</span><br><span style="color:var(--muted)">Matching routes: ${why.join(', ')}. Longest wins.</span>`);
      side.firstElementChild.classList.add('shake'); setTimeout(() => side.firstElementChild.classList.remove('shake'), 400);
      const target = iface === 'lan0' ? r.pos.clone().add(new THREE.Vector3(0, 4, 0)) : lvl.routers[r.ifaces.find((f) => f.name === iface).to].pos.clone();
      state = 'fly';
      clearHops();
      flight = { from: r.pos.clone(), to: target, t: 0, dur: 1.2, bounce: true, done: () => { if (ttl <= 0) return gameOver('TTL reached 0 — the router dropped your packet and sent an ICMP Time Exceeded.'); arrive(); } };
      void correct;
    }
    updateHud();
  }

  function startLevel() {
    lvl = genLevel(L);
    cur = lvl.src;
    ttl = lvl.pathLen + 4;
    levelScore = 0; mistakes = 0;
    buildWorld();
    packet.position.copy(lvl.routers[cur].pos);
    for (let i = 0; i < TRAIL; i++) trailPos.set([packet.position.x, packet.position.y, packet.position.z], i * 3);
    camTarget.copy(packet.position);
    overlay.style.display = 'none';
    arrive();
  }

  function levelDone() {
    state = 'over';
    const perfect = mistakes === 0;
    if (perfect) { score += 150; levelScore += 150; }
    updateHud();
    store.award(`runner-l${L}`, 15, `Packet Runner level ${L} cleared`);
    if (L >= 5) {
      const best = store.setBest('runner', score);
      store.award('runner-win', 50, 'Packet Runner champion');
      overlay.innerHTML = `<div class="panel"><span class="tag mint">all 5 levels cleared</span><h2 style="margin-top:14px">Delivered. Every time.</h2><div class="big-score">${score}</div><p>${best ? '🏆 New personal best!' : `Best: ${store.best('runner')}`}</p><p>You just did what every router on the Internet does billions of times per second: longest‑prefix match, decrement TTL, forward.</p><div class="btn-row"><button class="btn" id="r-again">Play again</button><a class="btn ghost" href="#/learn/routing">Review routing</a></div></div>`;
      overlay.style.display = 'grid';
      $('#r-again', overlay).onclick = () => { L = 1; score = 0; startLevel(); };
      return;
    }
    overlay.innerHTML = `<div class="panel"><span class="tag mint">level ${L} complete</span><h2 style="margin-top:14px">Packet delivered to ${lvl.destIp}</h2>
      <p>${perfect ? '<b style="color:var(--mint)">Perfect routing! +150 bonus.</b> ' : `${mistakes} wrong hop${mistakes === 1 ? '' : 's'}. `}TTL left: ${ttl}. Level score: ${levelScore}.</p>
      <p style="font-size:.9rem">${['', 'Next: tables gain a <b>default route</b> and a covering <code>/8</code>. Remember — the most specific match wins.', 'Next: some routers only know a <b>default route</b>; others have a <code>/24</code> more specific than the <code>/16</code>.', 'Next: bigger networks, trickier look‑alike prefixes.', 'Final level: the full gauntlet.'][L]}</p>
      <div class="btn-row"><button class="btn" id="r-next">Level ${L + 1} →</button></div></div>`;
    overlay.style.display = 'grid';
    $('#r-next', overlay).onclick = () => { L++; startLevel(); };
  }

  function gameOver(reason) {
    state = 'over';
    store.setBest('runner', score);
    overlay.innerHTML = `<div class="panel"><span class="tag orange">packet dropped</span><h2 style="margin-top:14px">${esc(reason.split(' — ')[0])}</h2><div class="big-score" style="color:var(--orange)">${score}</div><p>${esc(reason)}</p><p style="font-size:.9rem">TTL exists so misrouted packets can't loop forever. Every hop costs 1; each wrong choice costs another.</p><div class="btn-row"><button class="btn" id="r-retry">Retry level ${L}</button><button class="btn ghost" id="r-restart">Restart from level 1</button></div></div>`;
    overlay.style.display = 'grid';
    $('#r-retry', overlay).onclick = () => startLevel();
    $('#r-restart', overlay).onclick = () => { L = 1; score = 0; startLevel(); };
  }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">3D · routing game</span><h2 style="margin-top:14px">Packet Runner</h2>
    <p>You are an IP packet. Get to your destination before your <b>TTL</b> runs out.</p>
    <div class="how">
      <div>🧭 At each router, read its <b>routing table</b> (right panel).</div>
      <div>🎯 Find every prefix that contains your destination IP — the <b>longest prefix</b> wins.</div>
      <div>⌨️ Press <kbd>1</kbd>–<kbd>4</kbd> or click the interface. Fast answers earn bonus points.</div>
      <div>💀 Wrong interface = bounced back and TTL −1. TTL 0 = dropped.</div>
    </div>
    <div class="btn-row"><button class="btn" id="r-start">Start routing ▶</button><a class="btn ghost" href="#/learn/routing">Learn first</a></div>
    ${store.best('runner') ? `<p style="margin:16px 0 0;font-size:.85rem">Your best: <b style="color:var(--mint)">${store.best('runner')}</b></p>` : ''}</div>`;
  $('#r-start', overlay).onclick = startLevel;

  $('#r-hint', side).onclick = () => {
    if (state !== 'choose' || hintUsed) return;
    hintUsed = true; showTable(true);
    msg('<span style="color:var(--violet)">Highlighted: matching routes. The violet row is the longest match.</span>');
  };

  const onKey = (e) => {
    if (state !== 'choose') return;
    const n = +e.key;
    if (n >= 1 && n <= 9) {
      const b = shell.querySelectorAll('.hop-btn')[n - 1];
      if (b) choose(b.dataset.iface);
    }
  };
  window.addEventListener('keydown', onKey);
  onCleanup(() => window.removeEventListener('keydown', onKey));

  /* ---------- camera orbit ---------- */
  let theta = -0.25, phi = 1.1, dist = window.innerWidth < 760 ? 46 : 32, dragging = false, lx = 0, ly = 0;
  const camTarget = new THREE.Vector3();
  canvas.addEventListener('pointerdown', (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (!dragging) return; theta -= (e.clientX - lx) * 0.006; phi = Math.max(0.25, Math.min(1.45, phi - (e.clientY - ly) * 0.005)); lx = e.clientX; ly = e.clientY; });
  canvas.addEventListener('pointerup', () => (dragging = false));
  canvas.addEventListener('wheel', (e) => { e.preventDefault(); dist = Math.max(12, Math.min(70, dist + e.deltaY * 0.03)); }, { passive: false });

  /* ---------- placeholder world behind intro ---------- */
  lvl = genLevel(2); cur = 0; buildWorld(); packet.position.copy(lvl.routers[0].pos); camTarget.copy(packet.position);
  labels.forEach((l) => (l.el.style.opacity = '0'));

  loop((dt, t) => {
    // flight
    if (flight) {
      flight.t += dt / flight.dur;
      const k = Math.min(1, flight.t);
      let e;
      if (flight.bounce) e = Math.sin(Math.min(1, k) * Math.PI) * 0.45; else e = easeInOut(k);
      const p = flight.from.clone().lerp(flight.to, e);
      p.y += Math.sin(e * Math.PI) * (flight.bounce ? 1 : 2.5);
      packet.position.copy(p);
      if (flight.t >= 1) { const f = flight; flight = null; if (f.bounce) packet.position.copy(f.from); f.done(); }
    }
    packet.rotation.x += dt * 1.2; packet.rotation.y += dt * 1.7;
    pShell.rotation.z += dt * 0.8;
    const pulse = 1 + Math.sin(t * 6) * 0.06; packet.scale.setScalar(pulse);
    // trail
    trailPos.copyWithin(3, 0, (TRAIL - 1) * 3);
    trailPos.set([packet.position.x, packet.position.y, packet.position.z], 0);
    trailGeo.attributes.position.needsUpdate = true;
    // routers animate
    routerObjs.forEach((o, id) => {
      const isCur = lvl && id === cur && state !== 'intro';
      o.ring.rotation.z += dt * (isCur ? 1.8 : 0.4);
      const base = id === lvl.dst ? 0xff7a45 : isCur ? 0x5cf2c2 : 0x8b7bff;
      o.ring.material.color.setHex(base); o.top.material.color.setHex(base); o.glow.material.color.setHex(base);
      o.glow.material.opacity = isCur ? 0.6 + Math.sin(t * 4) * 0.15 : id === lvl.dst ? 0.45 + Math.sin(t * 3) * 0.2 : 0.3;
      if (o.g.userData.host) o.g.userData.host.rotation.y += dt * 0.8;
    });
    linkObjs.forEach((lo) => {
      const a = lvl.routers[lo.l.a].pos, b = lvl.routers[lo.l.b].pos;
      const k = (t * lo.speed + lo.off) % 1;
      lo.dot.position.lerpVectors(a, b, k);
      const active = state === 'choose' && (lo.l.a === cur || lo.l.b === cur);
      lo.line.material.color.setHex(active ? 0xff7a45 : 0x3a4a80);
    });
    // camera
    camTarget.lerp(packet.position, 0.06);
    if (state === 'intro') theta += dt * 0.08;
    const off = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta)).multiplyScalar(dist);
    camera.position.lerp(camTarget.clone().add(off), 0.08);
    camera.lookAt(camTarget);
    { const cw = canvas.clientWidth, ch = canvas.clientHeight; if (cw > 900) camera.setViewOffset(cw, ch, cw * 0.14, 0, cw, ch); else camera.clearViewOffset(); }
    render();
    // labels
    for (const l of labels) {
      const s = toScreen(l.posFn(), camera, canvas);
      if (s.behind || state === 'intro') { l.el.style.opacity = '0'; continue; }
      l.el.style.opacity = '1';
      l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px';
    }
  }, canvas);
}
