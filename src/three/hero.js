import { THREE, createStage, starfield, glowSprite, C3 } from './common.js';
import { loop, onCleanup, pick, rand } from '../core.js';

const CITIES = ['PAR', 'NYC', 'TYO', 'SIN', 'FRA', 'SFO', 'SAO', 'SYD', 'LON', 'AMS', 'JNB', 'BOM', 'SEA', 'MIA', 'HKG', 'STO', 'MAD', 'DXB', 'YYZ', 'LAX'];
const PROTOS = ['TCP 443', 'UDP 53', 'QUIC 443', 'TCP 22', 'UDP 3478', 'TCP 25', 'ICMP echo'];

/** Interactive globe of routers with packets arcing between cities. */
export function mountHero(canvas, logEl) {
  const { scene, camera, render, bloomPass } = createStage(canvas, { bloom: 1.25, bloomRadius: 0.7, fogDensity: 0.012 });
  camera.position.set(0, 0, 34);
  scene.add(starfield(1800, 200));

  const globe = new THREE.Group();
  scene.add(globe);
  const R = 10;

  // inner dark sphere to occlude back side
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 48), new THREE.MeshBasicMaterial({ color: 0x050814 })));
  // lat/long wire
  const wire = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(R, 3)), new THREE.LineBasicMaterial({ color: 0x24305a, transparent: true, opacity: 0.55 }));
  globe.add(wire);

  // fibonacci dots
  const N = 900;
  const dotPos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = i * Math.PI * (3 - Math.sqrt(5));
    dotPos.set([Math.cos(th) * r * R * 1.002, y * R * 1.002, Math.sin(th) * r * R * 1.002], i * 3);
  }
  const dg = new THREE.BufferGeometry();
  dg.setAttribute('position', new THREE.BufferAttribute(dotPos, 3));
  globe.add(new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x3a4a80, size: 0.12 })));

  // city routers
  const nodes = CITIES.map((name, i) => {
    const lat = (Math.random() - 0.5) * Math.PI * 0.8, lon = Math.random() * Math.PI * 2;
    const v = new THREE.Vector3(Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)).multiplyScalar(R);
    const color = [C3.mint, C3.violet, C3.sky, C3.orange][i % 4];
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 12), new THREE.MeshBasicMaterial({ color }));
    core.position.copy(v);
    const glow = glowSprite(color, 1.4);
    glow.position.copy(v);
    // tower line sticking out
    const tip = v.clone().multiplyScalar(1.08);
    const stick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([v, tip]), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    globe.add(core, glow, stick);
    return { name, v, color, glow };
  });

  // arcs
  const arcs = [];
  const arcMat = new THREE.LineBasicMaterial({ color: 0x5cf2c2, transparent: true, opacity: 0.18 });
  function makeArc(a, b) {
    const mid = a.v.clone().add(b.v).multiplyScalar(0.5);
    const dist = a.v.distanceTo(b.v);
    mid.normalize().multiplyScalar(R + dist * 0.45);
    const curve = new THREE.QuadraticBezierCurve3(a.v, mid, b.v);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), arcMat.clone());
    globe.add(line);
    return { a, b, curve, line };
  }
  for (let i = 0; i < nodes.length; i++) {
    const others = nodes.filter((n) => n !== nodes[i]).sort((x, y) => x.v.distanceTo(nodes[i].v) - y.v.distanceTo(nodes[i].v));
    arcs.push(makeArc(nodes[i], others[0]));
    if (i % 2 === 0) arcs.push(makeArc(nodes[i], others[rand(2, 6)]));
  }

  // packets
  const packets = [];
  function spawn() {
    const arc = pick(arcs);
    const rev = Math.random() < 0.5;
    const color = pick([C3.mint, C3.violet, C3.orange, C3.sky, C3.pink]);
    const s = glowSprite(color, 0.9);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    globe.add(s, core);
    packets.push({ arc, rev, t: 0, speed: 0.25 + Math.random() * 0.35, s, core, proto: pick(PROTOS) });
  }
  for (let i = 0; i < 14; i++) { spawn(); packets[i].t = Math.random(); }

  function logLine(p) {
    if (!logEl) return;
    const [from, to] = p.rev ? [p.arc.b, p.arc.a] : [p.arc.a, p.arc.b];
    const ttl = rand(52, 63);
    const div = document.createElement('div');
    div.innerHTML = `<span>${from.name}→${to.name}</span> ${p.proto} ttl=${ttl} ${rand(40, 1500)}B`;
    logEl.prepend(div);
    while (logEl.children.length > 9) logEl.lastChild.remove();
    [...logEl.children].forEach((c, i) => (c.style.opacity = String(1 - i * 0.1)));
  }

  // interaction: drag to spin, with inertia; parallax on hover
  let vx = 0.0016, vy = 0, dragging = false, lx = 0, ly = 0, mx = 0, my = 0;
  const onDown = (e) => { dragging = true; lx = e.clientX; ly = e.clientY; canvas.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!dragging) return;
    vx = (e.clientX - lx) * 0.0009; vy = (e.clientY - ly) * 0.0009; lx = e.clientX; ly = e.clientY;
  };
  const onUp = () => { dragging = false; };
  canvas.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  onCleanup(() => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); });

  const place = () => {
    const wide = canvas.clientWidth > 900;
    globe.position.x = wide ? 15 : 0;
    globe.position.y = wide ? -1 : -9;
    globe.scale.setScalar(wide ? 1 : 0.85);
  };
  place();
  window.addEventListener('resize', place);
  onCleanup(() => window.removeEventListener('resize', place));

  loop((dt, t) => {
    globe.rotation.y += vx;
    globe.rotation.x = Math.max(-0.6, Math.min(0.6, globe.rotation.x + vy));
    if (!dragging) { vx += (0.0016 - vx) * 0.02; vy *= 0.94; }
    camera.position.x += (mx * 1.5 - camera.position.x) * 0.03;
    camera.position.y += (-my * 1.2 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);
    nodes.forEach((n, i) => n.glow.scale.setScalar(1.2 + Math.sin(t * 2 + i) * 0.25));
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i];
      p.t += dt * p.speed;
      const k = p.rev ? 1 - p.t : p.t;
      const pos = p.arc.curve.getPoint(Math.min(1, Math.max(0, k)));
      p.s.position.copy(pos); p.core.position.copy(pos);
      p.arc.line.material.opacity = 0.18 + 0.35 * Math.sin(Math.min(1, p.t) * Math.PI);
      if (p.t >= 1) {
        logLine(p);
        globe.remove(p.s, p.core);
        p.core.geometry.dispose(); p.core.material.dispose(); p.s.material.dispose();
        packets.splice(i, 1);
        spawn();
      }
    }
    bloomPass.strength = 1.15 + Math.sin(t * 0.7) * 0.1;
    render();
  }, canvas);
}
