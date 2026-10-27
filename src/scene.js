import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import vertexShader from './shaders/particles.vert?raw';
import fragmentShader from './shaders/particles.frag?raw';

const SIDE = 160; // SIDE*SIDE particles per shape
const COUNT = SIDE * SIDE;

/* ---------- shape generators (all return Float32Array of COUNT*3) ---------- */
const rnd = (a = -1, b = 1) => a + Math.random() * (b - a);

function sphere() {
  const out = new Float32Array(COUNT * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const y = 1 - (i / (COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const R = 2 + (Math.random() < 0.12 ? rnd(-0.6, 0.05) : rnd(-0.02, 0.02));
    out.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
  }
  return out;
}

function lattice() {
  const out = new Float32Array(COUNT * 3);
  const n = 4, size = 3.2;
  const coord = (k) => -size / 2 + (k / (n - 1)) * size;
  for (let i = 0; i < COUNT; i++) {
    const axis = i % 3;
    const a = coord(Math.floor(Math.random() * n));
    const b = coord(Math.floor(Math.random() * n));
    const t = rnd(-size / 2, size / 2);
    const j = 0.015;
    const p = axis === 0 ? [t, a, b] : axis === 1 ? [a, t, b] : [a, b, t];
    out.set([p[0] + rnd(-j, j), p[1] + rnd(-j, j), p[2] + rnd(-j, j)], i * 3);
  }
  return out;
}

function torusKnot() {
  const out = new Float32Array(COUNT * 3);
  const P = 2, Q = 3, R = 1.45, r = 0.55;
  const v = new THREE.Vector3(), n = new THREE.Vector3(), b = new THREE.Vector3(), t = new THREE.Vector3();
  const pt = (u, target) => {
    const cu = Math.cos(u), su = Math.sin(u), qu = (Q / P) * u, cs = Math.cos(qu);
    target.set(R * (2 + cs) * 0.5 * cu, R * (2 + cs) * su * 0.5, R * Math.sin(qu) * 0.5);
    return target;
  };
  const p1 = new THREE.Vector3(), p2 = new THREE.Vector3();
  for (let i = 0; i < COUNT; i++) {
    const u = (i / COUNT) * Math.PI * 2 * P;
    pt(u, p1); pt(u + 0.01, p2);
    t.subVectors(p2, p1).normalize();
    n.addVectors(p2, p1).normalize();
    b.crossVectors(t, n).normalize();
    n.crossVectors(b, t);
    const a = Math.random() * Math.PI * 2;
    const rr = r * 0.45 * Math.sqrt(Math.random() * 0.25 + 0.75);
    v.copy(p1).addScaledVector(n, Math.cos(a) * rr).addScaledVector(b, Math.sin(a) * rr);
    out.set([v.x * 1.25, v.y * 1.25, v.z * 1.25], i * 3);
  }
  return out;
}

function helix() {
  const out = new Float32Array(COUNT * 3);
  const H = 5.4, R = 1.05, turns = 2.6;
  for (let i = 0; i < COUNT; i++) {
    const s = Math.random();
    const y = (s - 0.5) * H;
    const a = s * Math.PI * 2 * turns;
    const kind = Math.random();
    let x, z;
    if (kind < 0.78) {
      const ph = kind < 0.39 ? 0 : Math.PI;
      const j = rnd(0, 0.09);
      const ja = rnd(0, Math.PI * 2);
      x = Math.cos(a + ph) * R + Math.cos(ja) * j;
      z = Math.sin(a + ph) * R + Math.sin(ja) * j;
    } else {
      // rungs
      const step = Math.round(s * 34) / 34;
      const yy = (step - 0.5) * H;
      const aa = step * Math.PI * 2 * turns;
      const k = rnd(-1, 1);
      out.set([Math.cos(aa) * R * k, yy, Math.sin(aa) * R * k], i * 3);
      continue;
    }
    out.set([x, y, z], i * 3);
  }
  // lay horizontally
  for (let i = 0; i < COUNT; i++) {
    const x = out[i * 3], y = out[i * 3 + 1];
    out[i * 3] = y; out[i * 3 + 1] = -x;
  }
  return out;
}

function galaxy() {
  const out = new Float32Array(COUNT * 3);
  const arms = 4, radius = 3.4, spin = 1.15;
  for (let i = 0; i < COUNT; i++) {
    const r = Math.pow(Math.random(), 1.6) * radius;
    const arm = ((i % arms) / arms) * Math.PI * 2;
    const ang = arm + r * spin;
    const sc = 0.32 * (1 - r / radius) + 0.06;
    const rx = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * sc * 2.2;
    const ry = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * sc;
    const rz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * sc * 2.2;
    out.set([Math.cos(ang) * r + rx, ry, Math.sin(ang) * r + rz], i * 3);
  }
  return out;
}

function plane() {
  const out = new Float32Array(COUNT * 3);
  const W = 9;
  for (let iy = 0; iy < SIDE; iy++) {
    for (let ix = 0; ix < SIDE; ix++) {
      const i = iy * SIDE + ix;
      out.set([(ix / (SIDE - 1) - 0.5) * W, 0, (iy / (SIDE - 1) - 0.5) * W], i * 3);
    }
  }
  return out;
}

function portal() {
  const out = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    const a = Math.random() * Math.PI * 2;
    const k = Math.random();
    let R, tube, b;
    if (k < 0.6) { R = 2.1; tube = 0.12; }
    else if (k < 0.85) { R = 1.5; tube = 0.04; }
    else { R = rnd(0.2, 3.2); tube = 0.3; }
    b = Math.random() * Math.PI * 2;
    const tr = tube * Math.sqrt(Math.random());
    out.set([Math.cos(a) * (R + Math.cos(b) * tr), Math.sin(a) * (R + Math.cos(b) * tr), Math.sin(b) * tr], i * 3);
  }
  return out;
}

const SHAPES = [sphere, lattice, torusKnot, helix, galaxy, plane, portal];

/* ---------- per-scene layout & palette ---------- */
// x/y in world units at z=0 (scaled by viewport), rx = tilt, alpha = intensity
export const SCENES = [
  { x: 0.0, y: 0.05, s: 1.0, rx: 0.0, alpha: 1.0, c1: '#7c4dff', c2: '#22e4ff' },
  { x: 0.4, y: 0.0, s: 0.85, rx: 0.5, alpha: 0.9, c1: '#8b5cff', c2: '#3b82ff' },
  { x: 0.0, y: 0.0, s: 1.05, rx: 0.3, alpha: 0.75, c1: '#ff4d8d', c2: '#7c4dff' },
  { x: -0.3, y: -0.4, s: 0.8, rx: 0.25, alpha: 0.75, c1: '#22e4ff', c2: '#22e4a0' },
  { x: 0.0, y: 0.0, s: 1.15, rx: 1.05, alpha: 0.7, c1: '#ffb84d', c2: '#ff4d8d' },
  { x: 0.0, y: -0.3, s: 1.0, rx: 0.42, alpha: 0.85, c1: '#22e4ff', c2: '#7c4dff' },
  { x: 0.45, y: 0.0, s: 1.0, rx: 0.15, alpha: 1.0, c1: '#7c4dff', c2: '#22e4ff' },
];

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setClearColor(0x05050a, 1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x05050a, 0.05);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 7.5);

  /* positions texture: SIDE x (SIDE * shapes) */
  const shapesN = SHAPES.length;
  const data = new Float32Array(SIDE * SIDE * shapesN * 4);
  SHAPES.forEach((fn, s) => {
    const p = fn();
    for (let i = 0; i < COUNT; i++) {
      const o = (s * COUNT + i) * 4;
      data[o] = p[i * 3]; data[o + 1] = p[i * 3 + 1]; data[o + 2] = p[i * 3 + 2]; data[o + 3] = 1;
    }
  });
  const posTex = new THREE.DataTexture(data, SIDE, SIDE * shapesN, THREE.RGBAFormat, THREE.FloatType);
  posTex.needsUpdate = true;

  const geo = new THREE.BufferGeometry();
  const idx = new Float32Array(COUNT * 2);
  const rand = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    idx[i * 2] = i % SIDE; idx[i * 2 + 1] = Math.floor(i / SIDE);
    rand[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(COUNT * 3), 3));
  geo.setAttribute('aIndex', new THREE.BufferAttribute(idx, 2));
  geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 20);

  const uniforms = {
    uPos: { value: posTex },
    uSide: { value: SIDE },
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 26 },
    uPixelRatio: { value: 1 },
    uMouse: { value: new THREE.Vector2(9, 9) },
    uMouseForce: { value: 0 },
    uAlpha: { value: 0 },
    uIntro: { value: 0 },
    uVelocity: { value: 0 },
    uColorA: { value: new THREE.Color(SCENES[0].c1) },
    uColorB: { value: new THREE.Color(SCENES[0].c2) },
  };
  const mat = new THREE.ShaderMaterial({
    vertexShader, fragmentShader, uniforms,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  const group = new THREE.Group();
  const spinner = new THREE.Group();
  spinner.add(points);
  group.add(spinner);
  scene.add(group);

  /* background dust */
  const dustN = 1800;
  const dustPos = new Float32Array(dustN * 3);
  for (let i = 0; i < dustN; i++) dustPos.set([rnd(-14, 14), rnd(-9, 9), rnd(-12, 2)], i * 3);
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    size: 0.025, color: 0x8899ff, transparent: true, opacity: 0.45, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  /* post */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.35, 0.12);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let viewW = 1, viewH = 1, mobile = false;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    composer.setPixelRatio(pr);
    composer.setSize(w, h);
    bloom.resolution.set(w / 2, h / 2);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = pr;
    viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    viewW = viewH * camera.aspect;
    mobile = w < 820;
  }
  resize();
  window.addEventListener('resize', resize);

  const target = { morph: 0, x: 0, y: 0, s: 1, rx: 0, alpha: 1 };
  const cur = { ...target };
  const cA = new THREE.Color(), cB = new THREE.Color(), tmpA = new THREE.Color(), tmpB = new THREE.Color();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    uniforms.uMouseForce.value = 1;
  });

  /** progress: continuous scene value (0..SCENES.length-1) */
  function setProgress(v) {
    v = THREE.MathUtils.clamp(v, 0, SCENES.length - 1);
    const i = Math.floor(v), f = v - i;
    const a = SCENES[i], b = SCENES[Math.min(i + 1, SCENES.length - 1)];
    const lerp = (k) => a[k] + (b[k] - a[k]) * f;
    target.morph = v;
    target.x = lerp('x'); target.y = lerp('y'); target.s = lerp('s'); target.rx = lerp('rx'); target.alpha = lerp('alpha');
    tmpA.set(a.c1).lerp(tmpB.set(b.c1), f); cA.copy(tmpA);
    tmpA.set(a.c2).lerp(tmpB.set(b.c2), f); cB.copy(tmpA);
  }
  setProgress(0);

  const timer = new THREE.Timer();
  let velocity = 0;
  function render() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    const k = 1 - Math.pow(0.0015, dt); // frame-rate independent smoothing
    for (const key in target) cur[key] += (target[key] - cur[key]) * k;

    uniforms.uTime.value = t;
    uniforms.uMorph.value = cur.morph;
    uniforms.uAlpha.value = cur.alpha * (mobile ? 0.6 : 1);
    uniforms.uColorA.value.lerp(cA, k);
    uniforms.uColorB.value.lerp(cB, k);
    uniforms.uVelocity.value += (Math.min(Math.abs(velocity) / 40, 1) - uniforms.uVelocity.value) * k;
    uniforms.uMouseForce.value *= 0.985;

    mouse.sx += (mouse.x - mouse.sx) * k * 0.6;
    mouse.sy += (mouse.y - mouse.sy) * k * 0.6;
    uniforms.uMouse.value.set(mouse.x, mouse.y);

    const sx = mobile ? 0 : cur.x;
    const sc = cur.s * (mobile ? 0.62 : Math.min(1, viewW / 9.5));
    group.position.set(sx * viewW * 0.5, cur.y * viewH * 0.5 + (mobile ? 0.6 : 0), 0);
    group.scale.setScalar(sc);
    group.rotation.x = cur.rx + mouse.sy * 0.12;
    group.rotation.y = mouse.sx * 0.25;
    group.rotation.z = -mouse.sx * 0.05;
    spinner.rotation.y += dt * (0.08 + uniforms.uVelocity.value * 0.6);

    dust.rotation.y = t * 0.01 + mouse.sx * 0.05;
    dust.position.y = -cur.morph * 0.6;
    camera.position.x = mouse.sx * 0.25;
    camera.position.y = mouse.sy * 0.18;
    camera.lookAt(0, 0, 0);

    composer.render();
  }

  return {
    render,
    setProgress,
    setVelocity: (v) => { velocity = v; },
    intro: uniforms.uIntro,
    resize,
  };
}
