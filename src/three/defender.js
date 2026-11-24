import { THREE, createStage, starfield, glowSprite, C3, toScreen, gridFloor } from './common.js';
import { loop, onCleanup, rand, pick, store, h, $, esc } from '../core.js';

const WAVES = [
  {
    name: 'Wave 1 — Web only', rules: ['ALLOW tcp/443 from any', 'ALLOW tcp/80 from any', 'DENY everything else'],
    allow: (p) => p.proto === 'TCP' && (p.port === 443 || p.port === 80), speed: 1, spawn: 1.6, len: 35,
  },
  {
    name: 'Wave 2 — Admins only for SSH', rules: ['ALLOW tcp/443, tcp/80 from any', 'ALLOW tcp/22 from 10.0.0.0/8', 'DENY everything else'],
    allow: (p) => p.proto === 'TCP' && (p.port === 443 || p.port === 80 || (p.port === 22 && p.src.startsWith('10.'))), speed: 1.25, spawn: 1.3, len: 40,
  },
  {
    name: 'Wave 3 — Internal DNS', rules: ['ALLOW tcp/443, tcp/80 from any', 'ALLOW tcp/22 from 10.0.0.0/8', 'ALLOW udp/53 from 10.0.0.0/8', 'DENY everything else'],
    allow: (p) => (p.proto === 'TCP' && (p.port === 443 || p.port === 80 || (p.port === 22 && p.src.startsWith('10.')))) || (p.proto === 'UDP' && p.port === 53 && p.src.startsWith('10.')), speed: 1.5, spawn: 1.05, len: 45,
  },
];
const KINDS = [
  { proto: 'TCP', port: 443, tag: 'HTTPS' }, { proto: 'TCP', port: 80, tag: 'HTTP' }, { proto: 'TCP', port: 22, tag: 'SSH' },
  { proto: 'UDP', port: 53, tag: 'DNS' }, { proto: 'TCP', port: 3389, tag: 'RDP' }, { proto: 'TCP', port: 23, tag: 'Telnet' },
  { proto: 'TCP', port: 5432, tag: 'Postgres' }, { proto: 'UDP', port: 1900, tag: 'SSDP' }, { proto: 'TCP', port: 445, tag: 'SMB' },
];
const extIp = () => `${pick([45, 62, 85, 91, 103, 185, 198, 203])}.${rand(0, 255)}.${rand(0, 255)}.${rand(1, 254)}`;
const intIp = () => `10.${rand(0, 9)}.${rand(0, 255)}.${rand(1, 254)}`;

export function mountDefender(shell) {
  const canvas = $('canvas', shell);
  const hud = $('.hud-layer', shell);
  const { scene, camera, render } = createStage(canvas, { bloom: 1.1, bloomRadius: 0.6, fogDensity: 0.016 });
  scene.add(starfield(1500, 200));
  scene.add(gridFloor(300, 90, -3));
  scene.add(new THREE.AmbientLight(0x8090c0, 0.7));
  const dl = new THREE.DirectionalLight(0xffffff, 1.2); dl.position.set(5, 20, 10); scene.add(dl);

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
    <div class="hud-pill"><span>WAVE</span><b id="d-wave">1/3</b></div>
    <div class="hud-pill"><span>SHIELDS</span><b id="d-hp" style="color:var(--mint)">♦♦♦♦♦</b></div>
    <div class="hud-pill"><span>SCORE</span><b id="d-score">0</b></div>
    <div class="hud-pill ttl"><span>TIME LEFT</span><b id="d-time">—</b></div>
  </div>`);
  const side = h(`<div class="hud hud-side"><div class="hud-panel"><h4>Firewall policy</h4><div id="d-rules" class="mono" style="font-size:.8rem;line-height:1.8"></div><div id="d-msg" style="margin-top:10px;min-height:38px;font-size:.8rem"></div><div style="font-size:.72rem;color:var(--muted);margin-top:6px">Click a packet (or its label) to block it. Let allowed traffic through.</div></div></div>`);
  const overlay = h(`<div class="overlay"></div>`);
  shell.append(top, side, overlay);
  if (window.innerWidth < 760) { side.style.top = 'auto'; side.style.bottom = '12px'; }

  let waveI = 0, wave, hp = 5, score = 0, timeLeft = 0, spawnT = 0, state = 'intro', stats;
  const packets = [];
  const boomList = [];
  const set = (id, v) => { const e = shell.querySelector('#' + id); if (e) e.innerHTML = v; };
  const msg = (t) => set('d-msg', t);
  const updHud = () => { set('d-wave', `${waveI + 1}/3`); set('d-hp', '♦'.repeat(hp) + '<span style="color:var(--muted)">' + '♦'.repeat(5 - hp) + '</span>'); set('d-score', String(score)); set('d-time', String(Math.max(0, Math.ceil(timeLeft)))); };

  const pktGeo = new THREE.BoxGeometry(1, 1, 1);
  function spawn() {
    const k = pick(KINDS);
    const internal = Math.random() < (waveI === 0 ? 0.1 : 0.4);
    const p = { ...k, src: internal ? intIp() : extIp() };
    p.allowed = wave.allow(p);
    const ang = Math.random() * Math.PI * 2;
    const R = 30;
    const start = new THREE.Vector3(Math.cos(ang) * R, rand(-1, 7), Math.sin(ang) * R);
    const color = p.proto === 'UDP' ? 0xffd166 : 0x4cc9ff;
    const m = new THREE.Mesh(pktGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9 }));
    m.position.copy(start);
    const g = glowSprite(new THREE.Color(color), 3);
    m.add(g);
    scene.add(m);
    const el = document.createElement('div');
    el.className = 'label3d opt';
    el.style.borderColor = 'var(--line-strong)'; el.style.color = 'var(--text)';
    el.innerHTML = `${p.proto} :${p.port} <small>${p.src}</small>`;
    el.onclick = () => block(obj);
    hud.appendChild(el);
    const obj = { p, m, el, speed: (2.6 + Math.random() * 1.4) * wave.speed, dir: start.clone().negate().normalize() };
    m.userData.obj = obj;
    packets.push(obj);
  }
  function remove(obj) {
    scene.remove(obj.m); obj.m.material.dispose(); obj.m.children.forEach((c) => c.material?.dispose());
    obj.el.remove();
    packets.splice(packets.indexOf(obj), 1);
  }
  function boom(pos, color) {
    const s = glowSprite(new THREE.Color(color), 2); s.position.copy(pos); scene.add(s); boomList.push({ s, t: 0 });
  }
  function block(obj) {
    if (state !== 'play' || !packets.includes(obj)) return;
    if (obj.p.allowed) {
      score = Math.max(0, score - 50); stats.badBlocks++;
      msg(`<span style="color:var(--orange)">✗ Blocked legit ${obj.p.proto}/${obj.p.port} from ${obj.p.src}. Customers are angry! −50</span>`);
    } else {
      score += 100; stats.blocked++;
      msg(`<span style="color:var(--mint)">✓ Dropped ${obj.p.tag} ${obj.p.proto}/${obj.p.port} from ${obj.p.src} +100</span>`);
    }
    boom(obj.m.position, obj.p.allowed ? 0xff7a45 : 0x5cf2c2);
    remove(obj);
    updHud();
  }
  // raycast clicks on cubes too
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
    set('d-rules', wave.rules.map((r) => `<div style="color:${r.startsWith('ALLOW') ? 'var(--mint)' : 'var(--danger)'}">${esc(r)}</div>`).join(''));
    msg(`<b style="color:var(--text)">${esc(wave.name)}</b>`);
    overlay.style.display = 'none';
    updHud();
  }
  function endWave() {
    state = 'between';
    [...packets].forEach(remove);
    store.award(`defender-w${waveI + 1}`, 15, `Survived wave ${waveI + 1}`);
    if (waveI >= WAVES.length - 1) return finish(true);
    waveI++;
    overlay.innerHTML = `<div class="panel"><span class="tag mint">wave cleared</span><h2 style="margin-top:14px">The data center holds.</h2><p>Score <b style="color:var(--mint)">${score}</b> · shields ${hp}/5</p><p><b>Next policy:</b></p><div class="how mono">${WAVES[waveI].rules.map((r) => `<div style="color:${r.startsWith('ALLOW') ? 'var(--mint)' : 'var(--danger)'}">${esc(r)}</div>`).join('')}</div><div class="btn-row"><button class="btn" id="d-next">Start ${esc(WAVES[waveI].name.split(' — ')[0])} →</button></div></div>`;
    overlay.style.display = 'grid';
    $('#d-next', overlay).onclick = startWave;
  }
  function finish(won) {
    state = 'over';
    [...packets].forEach(remove);
    const best = store.setBest('defender', score);
    if (won) store.award('defender-win', 40, 'Firewall Defender victory');
    overlay.innerHTML = `<div class="panel"><span class="tag ${won ? 'mint' : 'orange'}">${won ? 'victory' : 'breach'}</span><h2 style="margin-top:14px">${won ? 'All waves repelled' : 'The core was breached'}</h2><div class="big-score" style="color:${won ? 'var(--mint)' : 'var(--orange)'}">${score}</div>
      <p>${best ? '🏆 New personal best! ' : `Best: ${store.best('defender')}. `}Blocked ${stats.blocked} attacks · ${stats.passed} legit packets served · ${stats.badBlocks} false positives · ${stats.leaks} leaks.</p>
      <p style="font-size:.9rem">Real firewalls do this in hardware at millions of packets per second — but the logic is the same: match fields against ordered rules, default deny.</p>
      <div class="btn-row"><button class="btn" id="d-again">Play again</button><a class="btn ghost" href="#/learn/nat-firewalls">Learn about firewalls</a></div></div>`;
    overlay.style.display = 'grid';
    $('#d-again', overlay).onclick = reset;
  }
  function reset() { waveI = 0; hp = 5; score = 0; stats = { blocked: 0, passed: 0, badBlocks: 0, leaks: 0 }; startWave(); }

  overlay.innerHTML = `<div class="panel"><span class="tag violet">3D · arcade</span><h2 style="margin-top:14px">Firewall Defender</h2>
    <p>You are the firewall in front of a data center. Packets stream in from the Internet — read each one and decide.</p>
    <div class="how"><div>🛡 Check each packet's <b>protocol, port and source IP</b> against the policy on the right.</div><div>🖱 <b>Click</b> forbidden packets to drop them. Let allowed ones reach the core.</div><div>💥 A forbidden packet reaching the core costs a shield. Blocking legit traffic costs points.</div><div>📜 The policy gets stricter each wave — <code>10.x.x.x</code> is your internal network.</div></div>
    <div class="btn-row"><button class="btn" id="d-start">Defend ▶</button><a class="btn ghost" href="#/learn/nat-firewalls">Learn first</a></div>
    ${store.best('defender') ? `<p style="margin:16px 0 0;font-size:.85rem">Your best: <b style="color:var(--mint)">${store.best('defender')}</b></p>` : ''}</div>`;
  $('#d-start', overlay).onclick = reset;

  let theta = 0.4;
  loop((dt, t) => {
    if (state === 'play') {
      timeLeft -= dt; spawnT -= dt;
      if (spawnT <= 0) { spawn(); spawnT = wave.spawn * (0.6 + Math.random() * 0.8); }
      for (let i = packets.length - 1; i >= 0; i--) {
        const o = packets[i];
        o.m.position.addScaledVector(o.dir, o.speed * dt);
        o.m.rotation.x += dt * 2; o.m.rotation.y += dt * 1.5;
        if (o.m.position.length() < 5.2) {
          if (o.p.allowed) { score += 25; stats.passed++; boom(o.m.position, 0x4cc9ff); }
          else {
            hp--; stats.leaks++; boom(o.m.position, 0xff5470);
            msg(`<span style="color:var(--danger)">⚠ ${o.p.tag} ${o.p.proto}/${o.p.port} from ${o.p.src} got through! Shield −1</span>`);
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
    for (let i = boomList.length - 1; i >= 0; i--) {
      const b = boomList[i]; b.t += dt * 2.5;
      b.s.scale.setScalar(2 + b.t * 8); b.s.material.opacity = Math.max(0, 1 - b.t);
      if (b.t >= 1) { scene.remove(b.s); b.s.material.dispose(); boomList.splice(i, 1); }
    }
    shield.rotation.y += dt * 0.2; ring.rotation.z += dt * 0.5;
    theta += dt * (state === 'play' ? 0.04 : 0.12);
    camera.position.set(Math.sin(theta) * 36, 22, Math.cos(theta) * 36);
    camera.lookAt(0, 1, 0);
    render();
    packets.forEach((o) => { const s = toScreen(o.m.position.clone().add(new THREE.Vector3(0, 1.4, 0)), camera, canvas); o.el.style.opacity = s.behind ? '0' : '1'; o.el.style.left = s.x + 'px'; o.el.style.top = s.y + 'px'; });
  }, canvas);
  onCleanup(() => packets.forEach((o) => o.el.remove()));
}
