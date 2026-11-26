import { THREE, createStage, starfield, glowSprite, C3, toScreen, gridFloor, isMobile, sfx, burst } from './common.js';
import { loop, onCleanup, rand, pick, store, h, $, esc } from '../core.js';
import { tr } from '../i18n.js';
import { flag } from '../srs.js';

// A rule is [text, test]; the first rule whose test matches allows the packet, otherwise default deny.
const WEB = [tr('ALLOW tcp/443, tcp/80 from any', 'ERLAUBE tcp/443, tcp/80 von überall'), (p) => p.proto === 'TCP' && (p.port === 443 || p.port === 80)];
const SSH = [tr('ALLOW tcp/22 from 10.0.0.0/8', 'ERLAUBE tcp/22 von 10.0.0.0/8'), (p) => p.proto === 'TCP' && p.port === 22 && p.src.startsWith('10.')];
const DNS = [tr('ALLOW udp/53 from 10.0.0.0/8', 'ERLAUBE udp/53 von 10.0.0.0/8'), (p) => p.proto === 'UDP' && p.port === 53 && p.src.startsWith('10.')];
const DENY = tr('DENY everything else', 'VERWEIGERE alles andere');
const WAVES = [
  { name: tr('Wave 1 — Web only', 'Welle 1 – nur Web'), rules: [WEB], speed: 1, spawn: 1.6, len: 35, internal: 0.1 },
  { name: tr('Wave 2 — Admins only for SSH', 'Welle 2 – SSH nur für Admins'), rules: [WEB, SSH], speed: 1.25, spawn: 1.3, len: 40, internal: 0.4 },
  { name: tr('Wave 3 — Internal DNS', 'Welle 3 – internes DNS'), rules: [WEB, SSH, DNS], speed: 1.5, spawn: 1.05, len: 45, internal: 0.4 },
  // DDoS: a flood of reflection traffic (SSDP / DNS answers from outside) hiding a few real customers
  { name: tr('Wave 4 — DDoS burst!', 'Welle 4 – DDoS-Angriff!'), rules: [WEB, SSH, DNS], speed: 1.7, spawn: 0.42, len: 30, internal: 0.1, flood: true },
];
const KINDS = [
  { proto: 'TCP', port: 443, tag: 'HTTPS' }, { proto: 'TCP', port: 80, tag: 'HTTP' }, { proto: 'TCP', port: 22, tag: 'SSH' },
  { proto: 'UDP', port: 53, tag: 'DNS' }, { proto: 'TCP', port: 3389, tag: 'RDP' }, { proto: 'TCP', port: 23, tag: 'Telnet' },
  { proto: 'TCP', port: 5432, tag: 'Postgres' }, { proto: 'UDP', port: 1900, tag: 'SSDP' }, { proto: 'TCP', port: 445, tag: 'SMB' },
];
const FLOOD = [KINDS[7], KINDS[7], KINDS[3], KINDS[0]];
const DIFFS = {
  easy: { name: tr('Easy', 'Leicht'), speed: 0.75, hp: 7 },
  normal: { name: 'Normal', speed: 1, hp: 5 },
  hard: { name: tr('Hard', 'Schwer'), speed: 1.3, hp: 3 },
};
const extIp = () => `${pick([45, 62, 85, 91, 103, 185, 198, 203])}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
const intIp = () => `10.${rand(0, 9)}.${rand(0, 255)}.${rand(1, 254)}`;
const ruleFor = (wave, p) => wave.rules.find(([, test]) => test(p));

export function mountDefender(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 1.1, bloomRadius: 0.6, fogDensity: 0.016 });
  scene.add(starfield(1500, 200));
  scene.add(gridFloor(300, 90, -3));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.7));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(5, 20, 10); scene.add(dl);
  const mobile = isMobile();

  // core: stacked server rack with shield sphere
  const core = new THREE.Group(); scene.add(core);
  for (let i = 0; i < 5; i++) {
    const u = new THREE.Mesh(new THREE.BoxGeometry(3, 0.7, 2.2), new THREE.MeshStandardMaterial({ color: 0x161d36, metalness: 0.7, roughness: 0.3, emissive: 0x0b1230 }));
    u.position.y = i * 0.85 - 1.2;
    const led = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5cf2c2 : 0x8b7bff }));
    led.position.set(0, i * 0.85 - 1.2, 1.13);
    core.add(u, led);
  }
  const shieldMat = new THREE.MeshBasicMaterial({ color: 0x5cf2c2, transparent: true, opacity: 0.08, wireframe: true });
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 2), shieldMat);
  core.add(shield, glowSprite(C3.mint, 6));
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.6, 0.05, 6, 80), new THREE.MeshBasicMaterial({ color: 0x8b7bff }));
  ring.rotation.x = Math.PI / 2; ring.position.y = -2.5; core.add(ring);

  /* ---------- HUD ---------- */
  hud.innerHTML = '';
  const top = h(`<div class="hud hud-top">
    <div class="hud-pill"><span>${tr('WAVE', 'WELLE')}</span><b id="d-wave">1/${WAVES.length}</b></div>
    <div class="hud-pill"><span>${tr('SHIELDS', 'SCHILDE')}</span><b id="d-hp" style="color:var(--mint)">♦♦♦♦♦</b></div>
    <div class="hud-pill"><span>${tr('SCORE', 'PUNKTE')}</span><b id="d-score">0</b></div>
    <div class="hud-pill ttl"><span>${tr('TIME LEFT', 'ZEIT')}</span><b id="d-time">—</b></div>
  </div>`);
  const side = h(`<div class="hud hud-side"><div class="hud-panel"><h4>${tr('Firewall policy', 'Firewall-Regeln')}</h4><div id="d-rules" class="mono" style="font-size:.8rem;line-height:1.8"></div><div id="d-msg" style="margin-top:10px;min-height:38px;font-size:.8rem"></div><div style="font-size:.72rem;color:var(--muted);margin-top:6px">${mobile ? tr('Tap a packet label to block it. Let allowed traffic through.', 'Tippe auf das Etikett eines Pakets, um es zu blocken. Lass erlaubten Verkehr durch.') : tr('Click a packet (or its label) to block it. Let allowed traffic through.', 'Klick ein Paket (oder sein Etikett), um es zu blocken. Lass erlaubten Verkehr durch.')}</div></div></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, side, overlay);
  if (mobile) { side.style.top = 'auto'; side.style.bottom = '12px'; }

  let diff = DIFFS.normal;
  let waveI = 0, wave, hp = 5, score = 0, timeLeft = 0, spawnT = 0, state = 'intro', stats;
  const packets = [];
  const set = (id, v) => { const e = shell.querySelector('#' + id); if (e) e.innerHTML = v; };
  const msg = (t) => set('d-msg', t);
  const updHud = () => { set('d-wave', `${waveI + 1}/${WAVES.length}`); set('d-hp', '♦'.repeat(Math.max(0, hp)) + '<span style="color:var(--muted)">' + '♦'.repeat(Math.max(0, diff.hp - hp)) + '</span>'); set('d-score', String(score)); set('d-time', String(Math.max(0, Math.ceil(timeLeft)))); };
  const rulesHTML = (w) => [...w.rules.map(([text]) => `<div style="color:var(--mint)">${esc(text)}</div>`), `<div style="color:var(--danger)">${esc(DENY)}</div>`].join('');
  // explain the verdict for a packet: which rule allowed it, or default deny
  const why = (p) => { const r = ruleFor(wave, p); return r ? `${tr('matched', 'passt zu')} „${esc(r[0])}“` : `${tr('no ALLOW rule matches → default deny', 'keine ERLAUBE-Regel passt → Standard: verweigern')}`; };

  const pktGeo = new THREE.BoxGeometry(1, 1, 1);
  function spawn() {
    const k = wave.flood && Math.random() < 0.8 ? pick(FLOOD) : pick(KINDS);
    const internal = Math.random() < wave.internal;
    const p = { ...k, src: internal ? intIp() : extIp() };
    p.allowed = !!ruleFor(wave, p);
    const ang = Math.random() * Math.PI * 2;
    const R = 30;
    const start = new THREE.Vector3(Math.cos(ang) * R, rand(-1, 7), Math.sin(ang) * R);
    const color = p.proto === 'UDP' ? 0xffd166 : 0x4cc9ff;
    const m = new THREE.Mesh(pktGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }));
    m.position.copy(start);
    if (mobile) m.scale.setScalar(1.4);
    m.add(glowSprite(new THREE.Color(color), 3));
    scene.add(m);
    const el = document.createElement('div');
    el.className = 'label3d opt';
    el.style.borderColor = 'var(--line-strong)'; el.style.color = 'var(--text)';
    if (mobile) { el.style.padding = '6px 10px'; el.style.fontSize = '.72rem'; }
    el.innerHTML = `${p.proto} :${p.port} <small>${p.src}</small>`;
    el.onclick = () => block(obj);
    hud.appendChild(el);
    const obj = { p, m, el, speed: (2.6 + Math.random() * 1.4) * wave.speed * diff.speed, dir: start.clone().negate().normalize() };
    m.userData.obj = obj;
    packets.push(obj);
  }
  function remove(obj) {
    scene.remove(obj.m); obj.m.material.dispose(); obj.m.children.forEach((c) => c.material?.dispose());
    obj.el.remove();
    packets.splice(packets.indexOf(obj), 1);
  }
  function mistake() { flag('q:nat-firewalls:1'); flag('g:Firewall'); }
  function block(obj) {
    if (state !== 'play' || !packets.includes(obj)) return;
    const { p } = obj;
    if (p.allowed) {
      score = Math.max(0, score - 50); stats.badBlocks++;
      sfx.play('bad'); mistake();
      msg(`<span style="color:var(--orange)">✗ ${tr('Blocked legit', 'Legitimen Verkehr geblockt')} ${p.proto}/${p.port} ${tr('from', 'von')} ${p.src} (${why(p)}). −50</span>`);
    } else {
      score += 100; stats.blocked++;
      sfx.play('zap');
      msg(`<span style="color:var(--mint)">✓ ${tr('Dropped', 'Verworfen')} ${p.tag} ${p.proto}/${p.port} ${tr('from', 'von')} ${p.src} +100</span>`);
    }
    burst(scene, obj.m.position.clone(), p.allowed ? 0xff7a45 : 0x5cf2c2, 10);
    remove(obj);
    updHud();
  }
  // tap/click directly on cubes too (labels are the main touch target)
  const ray = new THREE.Raycaster(), mouse = new THREE.Vector2();
  canvas.addEventListener('pointerdown', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(mouse, camera);
    const hit = ray.intersectObjects(packets.map((p) => p.m), false)[0];
    if (hit) block(hit.object.userData.obj);
  });

  function startWave() {
    wave = WAVES[waveI];
    timeLeft = wave.len; spawnT = 0.5; state = 'play';
    set('d-rules', rulesHTML(wave));
    msg(`<b style="color:var(--text)">${esc(wave.name)}</b>${wave.flood ? `<br><span style="color:var(--orange)">${tr('Thousands of spoofed UDP packets incoming. Find the real customers in the flood!', 'Tausende gefälschte UDP-Pakete im Anflug. Finde die echten Kunden in der Flut!')}</span>` : ''}`);
    overlay.style.display = 'none';
    updHud();
  }
  function endWave() {
    state = 'between';
    [...packets].forEach(remove);
    sfx.play('win');
    store.award(`defender-w${waveI + 1}`, 15, tr(`Survived wave ${waveI + 1}`, `Welle ${waveI + 1} überstanden`));
    if (waveI >= WAVES.length - 1) return finish(true);
    waveI++;
    const nw = WAVES[waveI];
    overlay.innerHTML = `<div class="panel"><span class="tag mint">${tr('wave cleared', 'Welle geschafft')}</span><h2 style="margin-top:14px">${tr('The data center holds.', 'Das Rechenzentrum hält.')}</h2><p>${tr('Score', 'Punkte')} <b style="color:var(--mint)">${score}</b> · ${tr('shields', 'Schilde')} ${hp}/${diff.hp}</p>
      ${nw.flood ? `<p style="color:var(--orange)"><b>${tr('Incoming DDoS!', 'DDoS im Anflug!')}</b> ${tr('Same rules, but a flood of packets. Real networks don’t click each one: they rate-limit and send floods to scrubbing centres.', 'Gleiche Regeln, aber eine Paketflut. Echte Netze klicken nicht jedes einzeln: Sie begrenzen die Rate und leiten Fluten in Scrubbing-Center um.')}</p>` : `<p><b>${tr('Next policy:', 'Nächste Regeln:')}</b></p>`}
      <div class="how mono">${rulesHTML(nw)}</div><div class="btn-row"><button class="btn" id="d-next">${tr('Start', 'Start')} ${esc(nw.name.split(/ [—–] /)[0])} →</button></div></div>`;
    overlay.style.display = 'grid';
    $('#d-next', overlay).onclick = () => { sfx.play('click'); startWave(); };
  }
  function finish(won) {
    state = 'over';
    [...packets].forEach(remove);
    const best = store.setBest('defender', score);
    if (won) store.award('defender-win', 40, tr('Firewall Defender victory', 'Firewall-Defender-Sieg'));
    if (won && diff === DIFFS.hard) store.award('defender-hard', 40, tr('Firewall Defender on Hard', 'Firewall Defender auf Schwer'));
    sfx.play(won ? 'win' : 'bad');
    overlay.innerHTML = `<div class="panel"><span class="tag ${won ? 'mint' : 'orange'}">${won ? tr('victory', 'Sieg') : tr('breach', 'Einbruch')} · ${diff.name}</span><h2 style="margin-top:14px">${won ? tr('All waves repelled', 'Alle Wellen abgewehrt') : tr('The core was breached', 'Der Kern wurde durchbrochen')}</h2><div class="big-score" style="color:${won ? 'var(--mint)' : 'var(--orange)'}">${score}</div>
      <p>${best ? tr('🏆 New personal best! ', '🏆 Neuer Rekord! ') : `${tr('Best', 'Rekord')}: ${store.best('defender')}. `}${tr(`Blocked ${stats.blocked} attacks · ${stats.passed} legit packets served · ${stats.badBlocks} false positives · ${stats.leaks} leaks.`, `${stats.blocked} Angriffe geblockt · ${stats.passed} legitime Pakete durchgelassen · ${stats.badBlocks} Fehlalarme · ${stats.leaks} Lecks.`)}</p>
      <p style="font-size:.9rem">${tr('Real firewalls do this in hardware at millions of packets per second — but the logic is the same: match fields against ordered rules, default deny.', 'Echte Firewalls machen das in Hardware mit Millionen Paketen pro Sekunde – aber die Logik ist dieselbe: Felder gegen geordnete Regeln prüfen, Standard: verweigern.')}${stats.badBlocks + stats.leaks ? ' ' + tr('Your mistakes were added to your flashcards.', 'Deine Fehler sind jetzt in deinen Karteikarten.') : ''}</p>
      <div class="btn-row"><button class="btn" id="d-again">${tr('Play again', 'Noch mal')}</button><a class="btn ghost" href="#/learn/nat-firewalls">${tr('Learn about firewalls', 'Mehr über Firewalls')}</a></div></div>`;
    overlay.style.display = 'grid';
    $('#d-again', overlay).onclick = reset;
  }
  function reset() { sfx.play('click'); waveI = 0; hp = diff.hp; score = 0; stats = { blocked: 0, passed: 0, badBlocks: 0, leaks: 0 }; startWave(); }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">${tr('3D · arcade', '3D · Arcade')}</span><h2 style="margin-top:14px">Firewall Defender</h2>
    <p>${tr('You are the firewall in front of a data center. Packets stream in from the Internet — read each one and decide.', 'Du bist die Firewall vor einem Rechenzentrum. Pakete strömen aus dem Internet herein – lies jedes und entscheide.')}</p>
    <div class="how"><div>🛡 ${tr('Check each packet’s <b>protocol, port and source IP</b> against the policy.', 'Prüfe bei jedem Paket <b>Protokoll, Port und Quell-IP</b> gegen die Regeln.')}</div><div>${mobile ? '👆' : '🖱'} ${mobile ? tr('<b>Tap</b> a forbidden packet’s label to drop it.', '<b>Tippe</b> auf das Etikett eines verbotenen Pakets, um es zu verwerfen.') : tr('<b>Click</b> forbidden packets to drop them.', '<b>Klick</b> verbotene Pakete an, um sie zu verwerfen.')} ${tr('Let allowed ones reach the core.', 'Erlaubte lässt du zum Kern durch.')}</div><div>💥 ${tr('A forbidden packet reaching the core costs a shield. Blocking legit traffic costs points.', 'Ein verbotenes Paket am Kern kostet einen Schild. Legitimen Verkehr zu blocken kostet Punkte.')}</div><div>📜 ${tr(`The policy gets stricter each wave — <code>10.x.x.x</code> is your internal network. Wave ${WAVES.length} is a DDoS.`, `Die Regeln werden jede Welle strenger – <code>10.x.x.x</code> ist dein internes Netz. Welle ${WAVES.length} ist ein DDoS.`)}</div></div>
    <div class="seg" id="d-diff" style="margin-bottom:18px">${Object.entries(DIFFS).map(([k, d]) => `<button data-d="${k}" class="${d === diff ? 'on' : ''}">${d.name}</button>`).join('')}</div>
    <div class="btn-row"><button class="btn" id="d-start">${tr('Defend ▶', 'Verteidigen ▶')}</button><a class="btn ghost" href="#/learn/nat-firewalls">${tr('Learn first', 'Erst lernen')}</a></div>
    ${store.best('defender') ? `<p style="margin:16px 0 0;font-size:.85rem">${tr('Your best', 'Dein Rekord')}: <b style="color:var(--mint)">${store.best('defender')}</b></p>` : ''}</div>`;
  overlay.querySelectorAll('#d-diff button').forEach((b) => (b.onclick = () => { diff = DIFFS[b.dataset.d]; overlay.querySelectorAll('#d-diff button').forEach((x) => x.classList.toggle('on', x === b)); sfx.play('click'); }));
  $('#d-start', overlay).onclick = reset;

  let theta = 0.4;
  const camR = mobile ? 46 : 36, camH = mobile ? 30 : 22;
  loop((dt) => {
    if (state === 'play') {
      timeLeft -= dt; spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = wave.spawn * (0.6 + Math.random() * 0.8); }
      for (let i = packets.length - 1; i >= 0; i--) {
        const o = packets[i];
        o.m.position.addScaledVector(o.dir, o.speed * dt);
        o.m.rotation.x += dt * 2; o.m.rotation.y += dt * 1.5;
        if (o.m.position.length() < 5.2) {
          if (o.p.allowed) { score += 25; stats.passed++; burst(scene, o.m.position.clone(), 0x4cc9ff, 6); }
          else {
            hp--; stats.leaks++; burst(scene, o.m.position.clone(), 0xff5470, 16);
            sfx.play('bad'); mistake();
            msg(`<span style="color:var(--danger)">⚠ ${o.p.tag} ${o.p.proto}/${o.p.port} ${tr('from', 'von')} ${o.p.src} ${tr('got through! Shield −1', 'ist durchgekommen! Schild −1')}</span><br><span style="color:var(--muted)">${tr('Why it was forbidden', 'Warum verboten')}: ${why(o.p)}</span>`);
            shieldMat.color.set(0xff5470); setTimeout(() => shieldMat.color.set(0x5cf2c2), 300);
            shell.classList.add('shake'); setTimeout(() => shell.classList.remove('shake'), 400);
          }
          remove(o);
          updHud();
          if (hp <= 0) { finish(false); break; }
        }
      }
      if (state === 'play' && timeLeft <= 0) endWave();
      if (Math.floor(timeLeft * 4) !== Math.floor((timeLeft + dt) * 4)) updHud();
    }
    shield.rotation.y += dt * 0.2; ring.rotation.z += dt * 0.5;
    theta += dt * (state === 'play' ? 0.04 : 0.12);
    camera.position.set(Math.sin(theta) * camR, camH, Math.cos(theta) * camR);
    camera.lookAt(0, 1, 0);
    render();
    packets.forEach((o) => { const s = toScreen(o.m.position.clone().add(new THREE.Vector3(0, 1.4, 0)), camera, canvas); o.el.style.opacity = s.behind ? '0' : '1'; o.el.style.left = s.x + 'px'; o.el.style.top = s.y + 'px'; });
  }, canvas);
  onCleanup(() => packets.forEach((o) => o.el.remove()));
}
