import { THREE, createStage, starfield, glowSprite, toScreen, gridFloor, orbit, isMobile, sfx, burst } from './common.js';
import { loop, onCleanup, store, h, $, esc, rand, shuffle } from '../core.js';
import { tr } from '../i18n.js';
import { flag } from '../srs.js';
import { prefixFor, blockSize, alignedStart, fits, firstFit } from '../gamelogic.js';

const TEAMS = [tr('Office', 'Büro'), tr('Wi‑Fi', 'WLAN'), tr('Servers', 'Server'), tr('Guests', 'Gäste'), tr('Cameras', 'Kameras'), tr('Lab', 'Labor'), tr('Printers', 'Drucker'), tr('VoIP phones', 'VoIP-Telefone'), tr('Router link', 'Router-Link'), tr('Management', 'Verwaltung')];
const COLORS = [0x5cf2c2, 0x8b7bff, 0xff7a45, 0x4cc9ff, 0xffd166, 0xff5c9a, 0x9be15d, 0xc792ea, 0xf78c6c, 0x82aaff];
const LEVELS = [
  [100, 50],
  [60, 25, 12, 2],
  [100, 30, 14, 6, 2],
  [50, 50, 20, 10, 2, 2],
  null, // generated
];
// hosts for a random level: power-of-two blocks that fill at most the /24, each just over half full
function randomLevel() {
  const sizes = [], used = [];
  for (const s of shuffle([128, 64, 64, 32, 32, 16, 8, 4, 4])) if (firstFit(used, s) >= 0) { used.push([firstFit(used, s), s]); sizes.push(s); }
  return sizes.sort((a, b) => b - a).map((s) => (s === 4 ? 2 : rand(s / 2 - 1, s - 2)));
}

export function mountSubnetBlocks(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 0.8, bloomRadius: 0.5, bloomThreshold: 0.2, fogDensity: 0.01 });
  scene.add(starfield(1200, 200));
  scene.add(gridFloor(300, 90, -1.2));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.9));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(10, 30, 15); scene.add(dl);
  const mobile = isMobile();

  // 16 x 16 board: one cell = one address, one row = 16 addresses
  const CELL = 1.2;
  const cellPos = (c) => new THREE.Vector3(((c % 16) - 7.5) * CELL, 0, (Math.floor(c / 16) - 7.5) * CELL);
  const tiles = [];
  const tileGeo = new THREE.BoxGeometry(CELL * 0.92, 0.2, CELL * 0.92);
  for (let c = 0; c < 256; c++) {
    const m = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({ color: 0x161d36, emissive: 0x0b1230, metalness: 0.4, roughness: 0.6 }));
    m.position.copy(cellPos(c)); m.userData.cell = c;
    scene.add(m); tiles.push(m);
  }
  const labels = [];
  const addLabel = (pos, html, cls = '') => { const el = document.createElement('div'); el.className = 'label3d ' + cls; el.innerHTML = html; hud.appendChild(el); const l = { pos, el }; labels.push(l); return l; };

  // a block mesh covering `size` cells from `start`
  function blockMesh(start, size, color, ghost = false) {
    const rows = Math.max(1, size / 16), cols = Math.min(16, size);
    const w = cols * CELL - 0.12, d = rows * CELL - 0.12;
    const g = new THREE.Group();
    const col = new THREE.Color(color);
    const box = new THREE.Mesh(new THREE.BoxGeometry(w, ghost ? 0.5 : 0.9, d), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: ghost ? 0.5 : 0.35, transparent: true, opacity: ghost ? 0.35 : 0.85, metalness: 0.2, roughness: 0.4 }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: col }));
    g.add(box, edges);
    const first = cellPos(start), last = cellPos(start + size - 1);
    g.position.set((first.x + last.x) / 2, ghost ? 0.4 : 0.55, (first.z + last.z) / 2);
    return g;
  }

  /* ---------- HUD ---------- */
  hud.innerHTML = '';
  for (let r = 0; r < 16; r++) addLabel(cellPos(r * 16).add(new THREE.Vector3(-CELL * 1.1, 0, 0)), `.${r * 16}`, 'row');
  const top = h(`<div class="hud hud-top">
    <div class="hud-pill"><span>LEVEL</span><b id="s-level">1/5</b></div>
    <div class="hud-pill dest"><span>${tr('NETWORK', 'NETZ')}</span><b id="s-net">—</b></div>
    <div class="hud-pill"><span>${tr('FREE', 'FREI')}</span><b id="s-free">256</b></div>
    <div class="hud-pill"><span>${tr('SCORE', 'PUNKTE')}</span><b id="s-score">0</b></div>
  </div>`);
  const panel = h(`<div class="hud" style="left:50%;bottom:16px;transform:translateX(-50%);width:min(640px,calc(100% - 24px))"><div class="hud-panel" id="s-panel"></div></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, panel, overlay);
  const P = $('#s-panel', panel);
  const set = (id, v) => { const e = shell.querySelector('#' + id); if (e) e.textContent = v; };

  let L = 0, reqs = [], ri = 0, used = [], placed = [], score = 0, state = 'intro', ghost = null, ghostStart = -1, size = 0, prefix = 0, tries = 0, net = '';
  const free = () => 256 - used.reduce((s, [, n]) => s + n, 0);
  const updHud = () => { set('s-level', `${L + 1}/${LEVELS.length}`); set('s-net', net); set('s-free', String(free())); set('s-score', String(score)); };

  function startLevel() {
    placed.forEach((p) => { scene.remove(p.mesh); p.label.el.remove(); labels.splice(labels.indexOf(p.label), 1); });
    placed = []; used = []; ri = 0;
    const hosts = LEVELS[L] || randomLevel();
    const names = shuffle(TEAMS);
    reqs = hosts.map((n, i) => ({ name: names[i % names.length], hosts: n, color: COLORS[i % COLORS.length] }));
    net = `10.20.${L + 1}.0/24`;
    overlay.style.display = 'none';
    updHud();
    askPrefix();
  }

  function askPrefix() {
    state = 'prefix'; tries = 0;
    const r = reqs[ri];
    P.innerHTML = `<h4>${tr('Request', 'Anfrage')} ${ri + 1}/${reqs.length}</h4>
      <div style="color:var(--text);font:600 1.05rem var(--font-body);margin-bottom:10px"><span style="color:#${r.color.toString(16).padStart(6, '0')}">■</span> ${esc(r.name)} ${tr('needs', 'braucht')} <b>${r.hosts}</b> ${tr('host addresses. Which prefix fits best?', 'Host-Adressen. Welches Präfix passt am besten?')}</div>
      <div class="btn-row">${[24, 25, 26, 27, 28, 29, 30].map((p) => `<button class="hop-btn" data-p="${p}">/${p} <small style="color:var(--muted)">${2 ** (32 - p) - 2}</small></button>`).join('')}</div>
      <div id="s-why" style="margin-top:10px;font:.82rem var(--font-body)"></div>`;
    P.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => choosePrefix(+b.dataset.p, b)));
  }
  function choosePrefix(p, btn) {
    if (state !== 'prefix') return;
    const r = reqs[ri], right = prefixFor(r.hosts);
    if (p === right) {
      sfx.play('ok');
      score += tries ? 40 : 100;
      prefix = p; size = blockSize(p);
      startPlacing();
    } else {
      tries++; sfx.play('bad'); flag('q:subnetting:0');
      btn.disabled = true; btn.style.borderColor = 'var(--danger)';
      const usable = 2 ** (32 - p) - 2;
      $('#s-why', P).innerHTML = `<span style="color:var(--yellow)">💡 ${usable < r.hosts
        ? tr(`A /${p} has only ${usable} usable hosts (2^${32 - p} − 2). Too small.`, `Ein /${p} hat nur ${usable} nutzbare Hosts (2^${32 - p} − 2). Zu klein.`)
        : tr(`A /${p} works, but wastes ${usable - r.hosts} addresses. Take the smallest block that still fits.`, `Ein /${p} geht, verschwendet aber ${usable - r.hosts} Adressen. Nimm den kleinsten Block, der noch passt.`)}</span>`;
    }
    updHud();
  }
  function startPlacing() {
    state = 'place';
    const r = reqs[ri];
    const ff = firstFit(used, size);
    if (ff < 0) { // can only happen in generated levels if the player packed badly
      P.innerHTML = `<p style="color:var(--danger)">${tr('No aligned space left for this block — earlier blocks left gaps. Packing tightly from the bottom avoids this.', 'Kein ausgerichteter Platz mehr für diesen Block – frühere Blöcke haben Lücken gelassen. Dicht von unten packen verhindert das.')}</p><button class="btn small" id="s-retry">${tr('Retry level', 'Level wiederholen')}</button>`;
      $('#s-retry', P).onclick = startLevel;
      return;
    }
    P.innerHTML = `<h4>${tr('Place the block', 'Block platzieren')}</h4><div style="color:var(--text);font:600 1rem var(--font-body)">${esc(r.name)}: /${prefix} = ${size} ${tr('addresses', 'Adressen')}</div>
      <div style="font:.82rem var(--font-body);margin:6px 0 10px">${tr(`A /${prefix} must start at a multiple of ${size}.`, `Ein /${prefix} muss bei einem Vielfachen von ${size} beginnen.`)} ${mobile ? tr('Tap the board, then place.', 'Tippe aufs Brett, dann platzieren.') : tr('Hover the board and click to place (arrow keys + Enter work too).', 'Fahr übers Brett und klick zum Platzieren (Pfeiltasten + Enter gehen auch).')}</div>
      <div class="btn-row"><button class="btn small" id="s-place">✓ ${tr('Place here', 'Hier platzieren')}</button><button class="btn small ghost" id="s-hint">💡 ${tr('Show first free spot', 'Ersten freien Platz zeigen')}</button><span id="s-pos" class="mono" style="font-size:.8rem"></span></div>`;
    $('#s-place', P).onclick = () => place(ghostStart);
    $('#s-hint', P).onclick = () => moveGhost(ff);
    moveGhost(ff);
  }
  function moveGhost(cell) {
    if (state !== 'place') return;
    const s = alignedStart(Math.max(0, Math.min(255, cell)), size);
    if (s === ghostStart && ghost) return;
    if (ghost) scene.remove(ghost);
    ghostStart = s;
    const ok = fits(used, s, size);
    ghost = blockMesh(s, size, ok ? reqs[ri].color : 0xff5470, true);
    scene.add(ghost);
    const base = net.split('.').slice(0, 3).join('.');
    const posEl = $('#s-pos', P);
    if (posEl) posEl.innerHTML = `${base}.${s}/${prefix} <span style="color:${ok ? 'var(--mint)' : 'var(--danger)'}">${ok ? '✓' : tr('✗ overlaps', '✗ überlappt')}</span>`;
  }
  function place(s) {
    if (state !== 'place' || s < 0) return;
    if (!fits(used, s, size)) { sfx.play('bad'); P.classList.add('shake'); setTimeout(() => P.classList.remove('shake'), 400); return; }
    const r = reqs[ri];
    const best = s === firstFit(used, size);
    score += best ? 50 : 20;
    used.push([s, size]);
    scene.remove(ghost); ghost = null; ghostStart = -1;
    const mesh = blockMesh(s, size, r.color);
    scene.add(mesh);
    burst(scene, mesh.position.clone().add(new THREE.Vector3(0, 1, 0)), r.color, 16);
    sfx.play('ok');
    const base = net.split('.').slice(0, 3).join('.');
    const label = addLabel(mesh.position.clone().add(new THREE.Vector3(0, 0.9, 0)), `${esc(r.name)} <small>.${s}/${prefix}</small>`);
    placed.push({ mesh, label, r, s, prefix, size, range: `${base}.${s + 1} – ${base}.${s + size - 2}`, bc: `${base}.${s + size - 1}` });
    ri++;
    updHud();
    if (ri >= reqs.length) levelDone(); else askPrefix();
  }

  function levelDone() {
    state = 'done';
    sfx.play('win');
    store.award(`blocks-l${L + 1}`, 15, tr(`Subnet Blocks level ${L + 1}`, `Subnetz-Blöcke Level ${L + 1}`));
    const last = L >= LEVELS.length - 1;
    if (last) { store.award('blocks-win', 40, tr('Address architect', 'Adress-Architekt')); store.setBest('blocks', score); }
    const base = net.split('.').slice(0, 3).join('.');
    overlay.innerHTML = `<div class="panel"><span class="tag mint">${tr(`level ${L + 1} complete`, `Level ${L + 1} geschafft`)}</span><h2 style="margin-top:14px">${last ? tr('Address plan complete!', 'Adressplan fertig!') : tr('Your address plan', 'Dein Adressplan')}</h2>
      ${last ? `<div class="big-score">${score}</div>` : ''}
      <div class="tbl-wrap"><table class="mini-table" style="text-align:left"><thead><tr><th>${tr('Team', 'Team')}</th><th>${tr('Subnet', 'Subnetz')}</th><th>${tr('Usable hosts', 'Nutzbare Hosts')}</th><th>Broadcast</th></tr></thead><tbody>
      ${placed.map((p) => `<tr><td>${esc(p.r.name)} (${p.r.hosts})</td><td>${base}.${p.s}/${p.prefix}</td><td>${p.range}</td><td>${p.bc}</td></tr>`).join('')}</tbody></table></div>
      <p style="font-size:.85rem;margin-top:12px">${tr(`${free()} of 256 addresses still free for growth.`, `${free()} von 256 Adressen bleiben frei für Wachstum.`)}</p>
      <div class="btn-row">${last ? `<button class="btn" id="s-again">${tr('Play again', 'Noch mal')}</button>` : `<button class="btn" id="s-next">Level ${L + 2} →</button>`}<a class="btn ghost" href="#/learn/subnetting">${tr('Subnetting lesson', 'Lektion Subnetting')}</a></div></div>`;
    overlay.style.display = 'grid';
    if (last) $('#s-again', overlay).onclick = () => { L = 0; score = 0; startLevel(); };
    else $('#s-next', overlay).onclick = () => { L++; startLevel(); };
  }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">${tr('3D · subnetting puzzle', '3D · Subnetz-Puzzle')}</span><h2 style="margin-top:14px">${tr('Subnet Blocks', 'Subnetz-Blöcke')}</h2>
    <p>${tr('The board is one /24: 256 addresses, 16 per row. Teams ask for addresses — give each the right block and fit it in.', 'Das Brett ist ein /24: 256 Adressen, 16 pro Reihe. Teams fragen nach Adressen – gib jedem den passenden Block und setze ihn ein.')}</p>
    <div class="how"><div>🧮 ${tr('Pick the <b>smallest prefix</b> whose usable hosts (2ⁿ − 2) cover the request.', 'Wähle das <b>kleinste Präfix</b>, dessen nutzbare Hosts (2ⁿ − 2) die Anfrage abdecken.')}</div><div>📐 ${tr('Blocks must be <b>aligned</b>: a /26 (64 addresses) can only start at .0, .64, .128 or .192.', 'Blöcke müssen <b>ausgerichtet</b> sein: Ein /26 (64 Adressen) kann nur bei .0, .64, .128 oder .192 beginnen.')}</div><div>🧱 ${tr('Pack tightly from the bottom for bonus points — gaps can block bigger requests later.', 'Pack dicht von unten für Bonuspunkte – Lücken können später größere Anfragen blockieren.')}</div></div>
    <div class="btn-row"><button class="btn" id="s-start">Start ▶</button><a class="btn ghost" href="#/learn/subnetting">${tr('Learn first', 'Erst lernen')}</a></div>
    ${store.best('blocks') ? `<p style="margin:16px 0 0;font-size:.85rem">${tr('Your best', 'Dein Rekord')}: <b style="color:var(--mint)">${store.best('blocks')}</b></p>` : ''}</div>`;
  $('#s-start', overlay).onclick = () => { sfx.play('click'); startLevel(); };

  /* ---------- input ---------- */
  const cam = orbit(canvas, { theta: 0, phi: 0.75, dist: mobile ? 40 : 28, phiMin: 0.2, phiMax: 1.3, distMin: 14, distMax: 60 });
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const cellAt = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects(tiles, false)[0]?.object.userData.cell ?? -1;
  };
  canvas.addEventListener('pointermove', (e) => { if (!mobile && e.buttons === 0) { const c = cellAt(e); if (c >= 0) moveGhost(c); } });
  canvas.addEventListener('pointerup', (e) => {
    if (cam.moved > 8 || state !== 'place') return; // it was a drag (orbit), not a tap
    const c = cellAt(e);
    if (c < 0) return;
    if (mobile) moveGhost(c); else { moveGhost(c); place(ghostStart); }
  });
  const onKey = (e) => {
    if (state !== 'place') return;
    const step = { ArrowLeft: -size, ArrowRight: size, ArrowUp: -Math.max(16, size), ArrowDown: Math.max(16, size) }[e.key];
    if (step) { e.preventDefault(); moveGhost(Math.max(0, Math.min(256 - size, ghostStart + step))); }
    if (e.key === 'Enter') place(ghostStart);
  };
  window.addEventListener('keydown', onKey);
  onCleanup(() => window.removeEventListener('keydown', onKey));

  const look = new THREE.Vector3(0, 0, mobile ? 2 : 1);
  loop((dt, t) => {
    if (state === 'intro') cam.theta += dt * 0.1;
    if (ghost) ghost.position.y = 0.45 + Math.sin(t * 4) * 0.1;
    const off = new THREE.Vector3(Math.sin(cam.phi) * Math.sin(cam.theta), Math.cos(cam.phi), Math.sin(cam.phi) * Math.cos(cam.theta)).multiplyScalar(cam.dist);
    camera.position.lerp(look.clone().add(off), 0.1);
    camera.lookAt(look);
    render();
    labels.forEach((l) => { const s = toScreen(l.pos, camera, canvas); l.el.style.opacity = s.behind || state === 'intro' ? '0' : '1'; l.el.style.left = s.x + 'px'; l.el.style.top = s.y + 'px'; });
  }, canvas);
  void glowSprite;
}
