// Low-poly prop builders. Everything is simple geometry — no external assets.
// Each builder returns a THREE.Object3D; obstacles carry a `.collider = {x, z, r}`.
import * as THREE from 'three';
import { randRange, pick } from '../core/math.js';

// ── Shared materials & geometries (cached for performance) ────────────────

const matCache = new Map();
export function mat(color, { flat = false, emissive = 0x000000, emissiveIntensity = 1, transparent = false, opacity = 1 } = {}) {
  const key = `${color}|${flat}|${emissive}|${emissiveIntensity}|${transparent}|${opacity}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: flat, emissive, emissiveIntensity, transparent, opacity });
    matCache.set(key, m);
  }
  return m;
}

const geo = {
  trunk: new THREE.CylinderGeometry(0.32, 0.5, 2.4, 6),
  blob: new THREE.IcosahedronGeometry(1, 0),
  cone: new THREE.ConeGeometry(1, 1, 6),
  rock: new THREE.DodecahedronGeometry(1, 0),
  deadTrunk: new THREE.CylinderGeometry(0.22, 0.55, 4.2, 5),
  branch: new THREE.BoxGeometry(0.2, 0.2, 2.0),
  spike: new THREE.ConeGeometry(0.18, 0.9, 4),
  stem: new THREE.CylinderGeometry(0.14, 0.2, 0.7, 6),
  cap: new THREE.SphereGeometry(0.5, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.55),
  log: new THREE.CylinderGeometry(0.42, 0.42, 3.6, 7),
  flower: new THREE.IcosahedronGeometry(0.24, 0),
  tuft: new THREE.ConeGeometry(0.28, 0.9, 4),
  post: new THREE.BoxGeometry(0.22, 2.2, 0.22),
  board: new THREE.BoxGeometry(3.8, 1.35, 0.16),
  moon: new THREE.SphereGeometry(6, 16, 12),
};

const withCollider = (obj, x, z, r) => { obj.collider = { x, z, r }; return obj; };

// ── Trees ─────────────────────────────────────────────────────────────────

export function makeTree(x, z, { scale = 1, trunk = 0x6b4a2e, leaf = 0x4f9a3a, variant = 'round', rng = Math.random } = {}) {
  const g = new THREE.Group();
  const t = new THREE.Mesh(geo.trunk, mat(trunk));
  t.position.y = 1.2;
  g.add(t);

  const leafMat = mat(leaf, { flat: true });
  if (variant === 'pine') {
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(geo.cone, leafMat);
      const s = 2.4 - i * 0.55;
      c.scale.set(s, 2.2, s);
      c.position.y = 2.4 + i * 1.35;
      g.add(c);
    }
  } else {
    const blobs = [
      [0, 3.4, 0, 2.1], [1.1, 2.9, 0.5, 1.5], [-1.0, 3.0, -0.4, 1.4], [0.2, 2.7, -1.1, 1.3],
    ];
    for (const [bx, by, bz, br] of blobs) {
      const b = new THREE.Mesh(geo.blob, leafMat);
      b.position.set(bx, by, bz);
      b.scale.setScalar(br);
      b.rotation.set(rng() * 3, rng() * 3, rng() * 3);
      g.add(b);
    }
  }
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  g.rotation.y = rng() * Math.PI * 2;
  g.userData.leafMaterial = leafMat;
  return withCollider(g, x, z, 0.9 * scale);
}

export function makeDeadTree(x, z, { scale = 1, rng = Math.random } = {}) {
  const g = new THREE.Group();
  const m = mat(0x3b2f3a, { flat: true });
  const trunk = new THREE.Mesh(geo.deadTrunk, m);
  trunk.position.y = 2.1;
  g.add(trunk);
  for (let i = 0; i < 3; i++) {
    const b = new THREE.Mesh(geo.branch, m);
    const a = (i / 3) * Math.PI * 2 + rng();
    b.position.set(Math.cos(a) * 0.7, 3.4 + i * 0.35, Math.sin(a) * 0.7);
    b.rotation.set(0.6 + rng() * 0.4, -a, 0);
    g.add(b);
  }
  g.position.set(x, 0, z);
  g.rotation.set((rng() - 0.5) * 0.18, rng() * 6.28, (rng() - 0.5) * 0.18);
  g.scale.setScalar(scale);
  return withCollider(g, x, z, 0.7 * scale);
}

// ── Rocks, logs, bushes, mushrooms ────────────────────────────────────────

export function makeRock(x, z, { scale = 1, color = 0x8f8a80, rng = Math.random } = {}) {
  const r = new THREE.Mesh(geo.rock, mat(color, { flat: true }));
  r.position.set(x, 0.55 * scale, z);
  r.scale.set(scale, scale * 0.72, scale);
  r.rotation.set(rng() * 6, rng() * 6, rng() * 6);
  return withCollider(r, x, z, 1.0 * scale);
}

export function makeLog(x, z, { angle = 0 } = {}) {
  const l = new THREE.Mesh(geo.log, mat(0x7a5232));
  l.rotation.z = Math.PI / 2;
  const g = new THREE.Group();
  g.add(l);
  g.position.set(x, 0.42, z);
  g.rotation.y = angle;
  return withCollider(g, x, z, 1.3);
}

export function makeThornBush(x, z, { rng = Math.random } = {}) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo.blob, mat(0x4a3552, { flat: true }));
  body.position.y = 0.9;
  body.scale.set(1.35, 1.0, 1.35);
  g.add(body);
  const spikeMat = mat(0x2a1f30);
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Mesh(geo.spike, spikeMat);
    const a = (i / 7) * Math.PI * 2;
    s.position.set(Math.cos(a) * 1.2, 0.9 + (rng() - 0.5) * 0.6, Math.sin(a) * 1.2);
    s.rotation.set(Math.PI / 2 * Math.sin(a), 0, -Math.PI / 2 * Math.cos(a));
    g.add(s);
  }
  g.position.set(x, 0, z);
  g.rotation.y = rng() * 6.28;
  const obj = withCollider(g, x, z, 1.4);
  obj.hazard = { x, z, r: 1.9, kind: 'thorn' };
  return obj;
}

export function makeMushroom(x, z, { color = 0x66e0d8, rng = Math.random } = {}) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(geo.stem, mat(0xe8dcc8));
  stem.position.y = 0.35;
  const cap = new THREE.Mesh(geo.cap, mat(color, { emissive: color, emissiveIntensity: 0.55 }));
  cap.position.y = 0.6;
  cap.scale.set(1.2, 1, 1.2);
  g.add(stem, cap);
  const s = 0.7 + rng() * 0.8;
  g.scale.setScalar(s);
  g.position.set(x, 0, z);
  return g;
}

// ── Water & terrain features ──────────────────────────────────────────────

export function makeWater(x, z, rx, rz, { clean = true } = {}) {
  const g = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CircleGeometry(1, 28), mat(clean ? 0xd9c896 : 0x5c5136));
  rim.rotation.x = -Math.PI / 2;
  rim.scale.set(rx + 1.4, rz + 1.4, 1);
  rim.position.y = 0.03;
  const water = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    mat(clean ? 0x4ea8e8 : 0x6f6a3c, { transparent: true, opacity: clean ? 0.9 : 0.95 })
  );
  water.rotation.x = -Math.PI / 2;
  water.scale.set(rx, rz, 1);
  water.position.y = 0.06;
  g.add(rim, water);
  g.position.set(x, 0, z);
  g.userData.water = water;
  const obj = withCollider(g, x, z, Math.min(rx, rz) * 0.92);
  if (!clean) obj.hazard = { x, z, r: Math.min(rx, rz) + 0.6, kind: 'dirtyWater' };
  return obj;
}

export function makeHill(x, z, r, h, color = 0x74c04f) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 9), mat(color, { flat: true }));
  m.scale.set(r, h, r);
  m.position.set(x, -h * 0.35, z);
  return withCollider(m, x, z, r * 0.8);
}

export function makeMoon(x, y, z) {
  const m = new THREE.Mesh(geo.moon, new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
  m.position.set(x, y, z);
  return m;
}

// ── Signposts with canvas-drawn text ──────────────────────────────────────

export function makeTextTexture(text, { size = 64, color = '#3b2a1a', bg = '#d7b98a', width = 512, height = 192 } = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;
  ctx.font = `900 ${size}px "Avenir Next", "Nunito", "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const lines = text.split('\n');
  const lh = size * 1.15;
  lines.forEach((line, i) => {
    ctx.fillText(line, width / 2, height / 2 + (i - (lines.length - 1) / 2) * lh);
  });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function makeSignpost(x, z, text, { facing = 0 } = {}) {
  const g = new THREE.Group();
  const post = new THREE.Mesh(geo.post, mat(0x6b4a2e));
  post.position.y = 1.1;
  const board = new THREE.Mesh(geo.board, mat(0xa9855a));
  board.position.y = 2.05;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(3.6, 1.2),
    new THREE.MeshBasicMaterial({ map: makeTextTexture(text), transparent: false })
  );
  face.position.set(0, 2.05, 0.09);
  g.add(post, board, face);
  g.position.set(x, 0, z);
  g.rotation.y = facing;
  return withCollider(g, x, z, 0.5);
}

// ── Instanced scatter (flowers, grass tufts) ──────────────────────────────

const _m4 = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();

// points: [{x, z, scale?, rotY?, color?}]. Returns an InstancedMesh with per-instance colours.
export function makeInstanced(geometry, points, { y = 0, color = 0xffffff, flat = false } = {}) {
  const m = new THREE.InstancedMesh(geometry, mat(color, { flat }), points.length);
  const c = new THREE.Color();
  points.forEach((pt, i) => {
    _p.set(pt.x, y * (pt.scale ?? 1), pt.z);
    _e.set(pt.tiltX ?? 0, pt.rotY ?? 0, pt.tiltZ ?? 0);
    _q.setFromEuler(_e);
    _s.setScalar(pt.scale ?? 1);
    _m4.compose(_p, _q, _s);
    m.setMatrixAt(i, _m4);
    m.setColorAt(i, c.setHex(pt.color ?? color));
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.frustumCulled = false; // spans the whole map; culling would need a bounding sphere recompute
  return m;
}

export const FLOWER_COLORS = [0xff6f91, 0xffd166, 0xffffff, 0xb28dff, 0xff9f43, 0xff4d6d];
export const TUFT_COLORS = [0x5fbf45, 0x78d158, 0x4ea73a, 0x8fdc6a];

export function scatterFlowers(points, rng) {
  return makeInstanced(geo.flower, points.map((p) => ({
    ...p, scale: randRange(rng, 0.7, 1.25), rotY: rng() * 6.28, color: pick(rng, FLOWER_COLORS),
  })), { y: 0.42, flat: true });
}

export function scatterTufts(points, rng, colors = TUFT_COLORS) {
  return makeInstanced(geo.tuft, points.map((p) => ({
    ...p, scale: randRange(rng, 0.6, 1.4), rotY: rng() * 6.28,
    tiltX: (rng() - 0.5) * 0.3, tiltZ: (rng() - 0.5) * 0.3, color: pick(rng, colors),
  })), { y: 0.4 });
}

export { geo };
