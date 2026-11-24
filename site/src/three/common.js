import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { onCleanup } from '../core.js';

export { THREE };

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/**
 * Creates renderer + scene + camera + bloom composer bound to a canvas whose
 * parent element defines the size. Handles resize and disposal on navigation.
 */
export function createStage(canvas, { fov = 55, bloom = 1.1, bloomRadius = 0.6, bloomThreshold = 0.1, fog = 0x03050a, fogDensity = 0.018 } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x03050a, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  if (fog !== null) scene.fog = new THREE.FogExp2(fog, fogDensity);
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 600);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(new THREE.Vector2(256, 256), bloom, bloomRadius, bloomThreshold);
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  const resize = () => {
    const el = canvas.parentElement;
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas.parentElement);

  onCleanup(() => {
    ro.disconnect();
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); });
    });
    composer.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss?.();
  });

  return { renderer, scene, camera, composer, bloomPass, resize, render: () => composer.render() };
}

/** A field of tiny stars for depth. */
export function starfield(count = 1500, radius = 220) {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const palette = [new THREE.Color('#5cf2c2'), new THREE.Color('#8b7bff'), new THREE.Color('#ffffff'), new THREE.Color('#4cc9ff')];
  for (let i = 0; i < count; i++) {
    const r = radius * (0.35 + Math.random() * 0.65);
    const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    pos.set([r * Math.sin(ph) * Math.cos(th), r * Math.sin(ph) * Math.sin(th), r * Math.cos(ph)], i * 3);
    const c = palette[i % palette.length];
    const k = 0.3 + Math.random() * 0.5;
    col.set([c.r * k, c.g * k, c.b * k], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const m = new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false, sizeAttenuation: true });
  return new THREE.Points(g, m);
}

/** Glow sprite texture (radial gradient), cached. */
let glowTex;
export function glowTexture() {
  if (glowTex) return glowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  glowTex = new THREE.CanvasTexture(c);
  return glowTex;
}
export function glowSprite(color, scale = 2) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  s.scale.setScalar(scale);
  return s;
}

/** Project a 3D point to CSS pixel coords in the canvas. */
export function toScreen(v, camera, canvas) {
  const p = v.clone().project(camera);
  return { x: (p.x * 0.5 + 0.5) * canvas.clientWidth, y: (-p.y * 0.5 + 0.5) * canvas.clientHeight, behind: p.z > 1 };
}

/** A grid floor that fades into fog. */
export function gridFloor(size = 200, div = 80, y = -10) {
  const g = new THREE.GridHelper(size, div, 0x2a3a6a, 0x141d38);
  g.position.y = y;
  g.material.transparent = true;
  g.material.opacity = 0.55;
  return g;
}

export const C3 = {
  mint: new THREE.Color('#5cf2c2'), violet: new THREE.Color('#8b7bff'), orange: new THREE.Color('#ff7a45'),
  pink: new THREE.Color('#ff5c9a'), sky: new THREE.Color('#4cc9ff'), yellow: new THREE.Color('#ffd166'), red: new THREE.Color('#ff5470'), white: new THREE.Color('#ffffff'),
};

export const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
