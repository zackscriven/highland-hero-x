// Builds the whole map: ground, four zones of props, the arena, obstacles, hazards.
// Also owns the "colour is draining from the grasslands" effect (setVividness).
import * as THREE from 'three';
import { ZONES, zoneAt } from '../data/zones.js';
import { WORLD, NAMES } from '../data/constants.js';
import { mulberry32, noise2, randRange, dist2, clamp, pick, lerp } from '../core/math.js';
import * as P from './props.js';

const LEAF_COLORS = [0x4f9a3a, 0x5fae42, 0x3f8f34, 0x6cbb4a, 0x86c95a];
const PINE_COLORS = [0x3d8a3c, 0x2f7a35, 0x4c9a45];
const HOLLOW_TUFTS = [0x5a6a4a, 0x6a5a7a, 0x4a5a3a, 0x7a6a8a];
const SHROOM_COLORS = [0x66e0d8, 0xff7ad9, 0xb28dff, 0x8dff9e];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = mulberry32(WORLD.seed);
    this.root = new THREE.Group();
    scene.add(this.root);

    this.obstacles = [];   // {x, z, r}
    this.hazards = [];     // {x, z, r, kind}
    this.vividItems = [];  // things that regain colour as charms come home
    this.vividness = 0;
    this.restoration = 0;

    this.spawn = new THREE.Vector3(0, 0, 96);
    this.arena = { x: 0, z: -124, r: 24 };
    this.gate = { x: 0, z: -98, open: false, obstacles: [], meshes: [] };
    this.reservedSpots = {}; // named spots for charms / pedestals (used by later phases)
    this._reserved = [];     // circles where scatter() will not place props

    this._reserve(this.spawn.x, this.spawn.z, 12);
    // Keep a corridor open straight up the middle so nobody gets walled in.
    for (let z = 118; z > -100; z -= 6) this._reserve(0, z, 6.5);

    this._buildGround();
    this._buildMeadow();
    this._buildGrove();
    this._buildHollow();
    this._buildArena();
    this._buildBorder();
    this.setVividness(0);
  }

  // ── Queries ───────────────────────────────────────────────────────────

  zoneAt(pos) { return zoneAt(pos.z); }

  // Push `pos` out of every obstacle and clamp to the map bounds.
  resolve(pos, radius) {
    const b = WORLD.bounds;
    pos.x = clamp(pos.x, b.xMin + radius, b.xMax - radius);
    pos.z = clamp(pos.z, b.zMin + radius, b.zMax - radius);
    for (let iter = 0; iter < 2; iter++) {
      for (const o of this.obstacles) {
        if (o.disabled) continue;
        const dx = pos.x - o.x, dz = pos.z - o.z;
        const minD = o.r + radius;
        const d2 = dx * dx + dz * dz;
        if (d2 < minD * minD) {
          const d = Math.sqrt(d2) || 0.001;
          const push = (minD - d) / d;
          pos.x += dx * push;
          pos.z += dz * push;
        }
      }
    }
  }

  // Hazards overlapping a circle. Returns [] most frames; cheap enough per entity.
  hazardsAt(x, z, radius) {
    const out = [];
    for (const h of this.hazards) {
      const r = h.r + radius;
      if (dist2(x, z, h.x, h.z) < r * r) out.push(h);
    }
    return out;
  }

  isFree(x, z, r) {
    for (const o of this.obstacles) {
      const m = o.r + r;
      if (dist2(x, z, o.x, o.z) < m * m) return false;
    }
    return true;
  }

  // Find a walkable point near (x, z) — used for spawning charms, enemies, pickups.
  findFreeSpot(x, z, r = 1.5, tries = 40) {
    if (this.isFree(x, z, r)) return { x, z };
    for (let i = 0; i < tries; i++) {
      const a = this.rng() * Math.PI * 2, d = 2 + i * 0.6;
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
      if (this.isFree(px, pz, r)) return { x: px, z: pz };
    }
    return { x, z };
  }

  openGate() {
    if (this.gate.open) return;
    this.gate.open = true;
    for (const o of this.gate.obstacles) o.disabled = true;
    for (const m of this.gate.meshes) m.visible = false;
  }

  // 0 = the grasslands are faded and sad, 1 = full colour restored.
  setVividness(t) {
    this.vividness = clamp(t, 0, 1);
    for (const item of this.vividItems) item.apply(this.vividness, this.restoration);
  }

  // After the boss falls: Wolf Hollow turns green again.
  setRestoration(t) {
    this.restoration = clamp(t, 0, 1);
    for (const item of this.vividItems) item.apply(this.vividness, this.restoration);
  }

  // ── Building helpers ──────────────────────────────────────────────────

  _add(obj) {
    this.root.add(obj);
    if (obj.collider) this.obstacles.push(obj.collider);
    if (obj.hazard) this.hazards.push(obj.hazard);
    return obj;
  }

  _reserve(x, z, r) { this._reserved.push({ x, z, r }); }

  _isReserved(x, z, pad = 0) {
    for (const s of this._reserved) {
      const r = s.r + pad;
      if (dist2(x, z, s.x, s.z) < r * r) return true;
    }
    return false;
  }

  // Rejection-sampled scatter inside a rect. makeFn(x, z) → object (or null to skip).
  _scatter(count, rect, gap, makeFn, { pad = 1.5, avoidObstacles = true } = {}) {
    let placed = 0, attempts = 0;
    while (placed < count && attempts < count * 30) {
      attempts++;
      const x = randRange(this.rng, rect.xMin, rect.xMax);
      const z = randRange(this.rng, rect.zMin, rect.zMax);
      if (this._isReserved(x, z, pad)) continue;
      if (avoidObstacles && !this.isFree(x, z, gap)) continue;
      const obj = makeFn(x, z);
      if (!obj) continue;
      this._add(obj);
      placed++;
    }
  }

  _points(count, rect, { avoidObstacles = true, gap = 0.8 } = {}) {
    const pts = [];
    let attempts = 0;
    while (pts.length < count && attempts < count * 12) {
      attempts++;
      const x = randRange(this.rng, rect.xMin, rect.xMax);
      const z = randRange(this.rng, rect.zMin, rect.zMax);
      if (avoidObstacles && !this.isFree(x, z, gap)) continue;
      pts.push({ x, z });
    }
    return pts;
  }

  _registerMaterialVivid(material, vividHex, fadeAmount = 0.55) {
    const vivid = new THREE.Color(vividHex);
    const faded = vivid.clone().lerp(new THREE.Color(0x9a9a8a), fadeAmount);
    this.vividItems.push({
      apply: (t) => material.color.copy(faded).lerp(vivid, t),
    });
  }

  _registerInstancedVivid(mesh, fadeAmount = 0.6) {
    const attr = mesh.instanceColor;
    if (!attr) return;
    const vivid = Float32Array.from(attr.array);
    const faded = new Float32Array(vivid.length);
    const grey = new THREE.Color(0x9a9a8a);
    const c = new THREE.Color();
    for (let i = 0; i < vivid.length; i += 3) {
      c.setRGB(vivid[i], vivid[i + 1], vivid[i + 2]).lerp(grey, fadeAmount);
      faded[i] = c.r; faded[i + 1] = c.g; faded[i + 2] = c.b;
    }
    this.vividItems.push({
      apply: (t) => {
        for (let i = 0; i < vivid.length; i++) attr.array[i] = lerp(faded[i], vivid[i], t);
        attr.needsUpdate = true;
      },
    });
  }

  // ── Ground ────────────────────────────────────────────────────────────

  _buildGround() {
    const W = 240, H = 300, cx = 0, cz = -14;
    const g = new THREE.PlaneGeometry(W, H, 60, 75);
    g.rotateX(-Math.PI / 2);
    g.translate(cx, 0, cz);

    const pos = g.attributes.position;
    const n = pos.count;
    const vivid = new Float32Array(n * 3);
    const faded = new Float32Array(n * 3);
    const restored = new Float32Array(n * 3);
    const c = new THREE.Color(), tmp = new THREE.Color();
    const grey = new THREE.Color(0x8f8f80);
    const green = new THREE.Color(ZONES.grove.ground);

    const zoneColor = (z) => {
      // Blend ground colours across zone edges so there are no hard lines.
      const m = new THREE.Color(ZONES.meadow.ground);
      const gr = new THREE.Color(ZONES.grove.ground);
      const h = new THREE.Color(ZONES.hollow.ground);
      const a = new THREE.Color(ZONES.arena.ground);
      const s = (edge, w) => clamp((z - (edge - w)) / (2 * w), 0, 1);
      const out = a.clone();
      out.lerp(h, s(ZONES.hollow.zMin, 6));
      out.lerp(gr, s(ZONES.grove.zMin, 8));
      out.lerp(m, s(ZONES.meadow.zMin, 10));
      return out;
    };

    for (let i = 0; i < n; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      c.copy(zoneColor(z));
      const nz = noise2(x * 0.09 + 7, z * 0.09 + 3) - 0.5;
      const nz2 = noise2(x * 0.32, z * 0.32) - 0.5;
      c.offsetHSL(0, nz * 0.08, nz * 0.06 + nz2 * 0.025);
      vivid[i * 3] = c.r; vivid[i * 3 + 1] = c.g; vivid[i * 3 + 2] = c.b;

      // The Hollow keeps its gloom; the meadow and grove are what fade.
      const fadeAmt = z > ZONES.grove.zMin - 8 ? 0.42 : 0.1;
      tmp.copy(c).lerp(grey, fadeAmt);
      faded[i * 3] = tmp.r; faded[i * 3 + 1] = tmp.g; faded[i * 3 + 2] = tmp.b;

      // Restored: the Hollow goes green once the boss is beaten.
      if (z < ZONES.grove.zMin + 4) {
        tmp.copy(green).offsetHSL(0, nz * 0.08, nz * 0.06);
        const k = z < ZONES.hollow.zMin ? 0.85 : 1;
        tmp.lerp(c, 1 - k);
      } else tmp.copy(c);
      restored[i * 3] = tmp.r; restored[i * 3 + 1] = tmp.g; restored[i * 3 + 2] = tmp.b;
    }
    const colorAttr = new THREE.BufferAttribute(Float32Array.from(vivid), 3);
    g.setAttribute('color', colorAttr);

    const ground = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true }));
    ground.name = 'ground';
    this.root.add(ground);
    this.ground = ground;

    this.vividItems.push({
      apply: (t, restore) => {
        const arr = colorAttr.array;
        for (let i = 0; i < arr.length; i++) {
          const v = lerp(faded[i], vivid[i], t);
          arr[i] = restore > 0 ? lerp(v, restored[i], restore) : v;
        }
        colorAttr.needsUpdate = true;
      },
    });
  }

  // ── Zone 1: Sunny Meadow ──────────────────────────────────────────────

  _buildMeadow() {
    const rng = this.rng;
    const rect = { xMin: -98, xMax: 98, zMin: 34, zMax: 118 };

    this._add(P.makeWater(-44, 80, 13, 10, { clean: true }));
    this._add(P.makeWater(50, 102, 7, 6, { clean: true }));
    this._add(P.makeHill(-84, 48, 14, 6, 0x74c04f));
    this._add(P.makeHill(82, 64, 12, 5, 0x7cc655));
    this._add(P.makeHill(66, 116, 10, 4, 0x74c04f));
    this._registerMaterialVivid(P.mat(0x74c04f, { flat: true }), 0x74c04f, 0.5);
    this._registerMaterialVivid(P.mat(0x7cc655, { flat: true }), 0x7cc655, 0.5);

    this._add(P.makeSignpost(6, 100, `${NAMES.meadow}\nHome sweet home`));
    this._add(P.makeSignpost(5, 38, `${NAMES.grove}  ↑`));

    const leafMats = new Set();
    this._scatter(48, rect, 5, (x, z) => {
      const leaf = pick(rng, LEAF_COLORS);
      leafMats.add(leaf);
      return P.makeTree(x, z, { scale: randRange(rng, 0.9, 1.6), leaf, rng });
    });
    for (const leaf of leafMats) this._registerMaterialVivid(P.mat(leaf, { flat: true }), leaf, 0.42);

    this._scatter(14, rect, 3, (x, z) => P.makeRock(x, z, { scale: randRange(rng, 0.6, 1.6), rng }));

    const flowers = P.scatterFlowers(this._points(520, rect), rng);
    this._registerInstancedVivid(flowers, 0.6);
    this.root.add(flowers);
    const tufts = P.scatterTufts(this._points(760, rect), rng);
    this._registerInstancedVivid(tufts, 0.4);
    this.root.add(tufts);
  }

  // ── Zone 2: Training Grove ────────────────────────────────────────────

  _buildGrove() {
    const rng = this.rng;
    const rect = { xMin: -98, xMax: 98, zMin: -14, zMax: 30 };

    // Spots kept clear for training pedestals / charms (later phases).
    const spots = { groveWest: [-26, 10], groveEast: [26, 10], groveNorthWest: [-20, -8], groveNorthEast: [20, -8], groveCenter: [0, 2] };
    for (const [k, [x, z]] of Object.entries(spots)) { this.reservedSpots[k] = { x, z }; this._reserve(x, z, 6); }

    this._add(P.makeSignpost(-6, 27, `${NAMES.grove}\nPractice makes brave`));
    this._add(P.makeSignpost(6, -14, `${NAMES.hollow}  ↑\nBe brave!`));

    const pineMats = new Set();
    this._scatter(44, rect, 4.5, (x, z) => {
      const pine = rng() < 0.55;
      const leaf = pine ? pick(rng, PINE_COLORS) : pick(rng, LEAF_COLORS);
      pineMats.add(leaf);
      return P.makeTree(x, z, { scale: randRange(rng, 1.0, 1.7), leaf, variant: pine ? 'pine' : 'round', trunk: 0x5e3f28, rng });
    });
    for (const leaf of pineMats) this._registerMaterialVivid(P.mat(leaf, { flat: true }), leaf, 0.4);

    this._scatter(7, rect, 3, (x, z) => P.makeLog(x, z, { angle: rng() * Math.PI }));
    this._scatter(12, rect, 3, (x, z) => P.makeRock(x, z, { scale: randRange(rng, 0.7, 1.5), color: 0x8a8478, rng }));

    const flowers = P.scatterFlowers(this._points(140, rect), rng);
    this._registerInstancedVivid(flowers, 0.6);
    this.root.add(flowers);
    const tufts = P.scatterTufts(this._points(380, rect), rng);
    this._registerInstancedVivid(tufts, 0.4);
    this.root.add(tufts);
  }

  // ── Zone 3: Wolf Hollow ───────────────────────────────────────────────

  _buildHollow() {
    const rng = this.rng;
    const rect = { xMin: -98, xMax: 98, zMin: -92, zMax: -20 };

    this._add(P.makeWater(-36, -46, 9, 7, { clean: false }));
    this._add(P.makeWater(40, -70, 8, 6, { clean: false }));
    this._add(P.makeWater(-22, -86, 6, 5, { clean: false }));
    this._add(P.makeSignpost(7, -22, `${NAMES.hollow}\nTurn back… or don't`));

    this._scatter(52, rect, 4, (x, z) => P.makeDeadTree(x, z, { scale: randRange(rng, 0.9, 1.7), rng }));
    this._scatter(30, rect, 3.5, (x, z) => P.makeThornBush(x, z, { rng }));
    this._scatter(18, rect, 3, (x, z) => P.makeRock(x, z, { scale: randRange(rng, 0.7, 1.8), color: 0x5a5261, rng }));
    this._scatter(64, rect, 1.2, (x, z) => P.makeMushroom(x, z, { color: pick(rng, SHROOM_COLORS), rng }), { avoidObstacles: true });

    this.root.add(P.scatterTufts(this._points(380, rect), rng, HOLLOW_TUFTS));
  }

  // ── Zone 4: The Howling Ring (boss arena) ─────────────────────────────

  _buildArena() {
    const rng = this.rng;
    const { x: ax, z: az, r } = this.arena;

    const floor = new THREE.Mesh(new THREE.CircleGeometry(r + 1, 40), P.mat(0x4b4162));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(ax, 0.02, az);
    this.root.add(floor);

    // Thorn wall ring with a gap on the south side (the gate).
    const wallR = r + 3;
    const count = 34;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = ax + Math.cos(a) * wallR, z = az + Math.sin(a) * wallR;
      // Gate gap faces +Z (south, toward the Hollow).
      if (Math.abs(x - ax) < 7 && z > az) continue;
      const bush = P.makeThornBush(x, z, { rng });
      bush.scale.setScalar(1.35);
      bush.collider.r = 2.0;
      this._add(bush);
    }
    // Gate: two thorn doors that vanish when enough charms are recovered.
    for (const gx of [-3.2, 3.2]) {
      const door = P.makeThornBush(ax + gx, this.gate.z, { rng });
      door.scale.set(1.15, 1.5, 1.15);
      door.collider.r = 3.3;
      door.hazard = null;
      this._add(door);
      this.gate.obstacles.push(door.collider);
      this.gate.meshes.push(door);
    }
    // Stone arch + ancient tree at the back of the ring.
    const stone = P.mat(0x6a6478, { flat: true });
    for (const px of [-7, 7]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 9, 2.2), stone);
      pillar.position.set(ax + px, 4.5, az - 20);
      pillar.collider = { x: ax + px, z: az - 20, r: 1.6 };
      this._add(pillar);
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(17, 2, 2.4), stone);
    lintel.position.set(ax, 9.6, az - 20);
    this.root.add(lintel);
    const oldTree = P.makeDeadTree(ax, az - 26, { scale: 2.6, rng });
    this._add(oldTree);

    this._add(P.makeMoon(30, 80, -240));
    const glow = new THREE.PointLight(0xa090ff, 70, 70, 1.6);
    glow.position.set(ax, 9, az);
    this.root.add(glow);

    for (let i = 0; i < 26; i++) {
      const a = rng() * Math.PI * 2, d = randRange(rng, 6, r - 3);
      this.root.add(P.makeMushroom(ax + Math.cos(a) * d, az + Math.sin(a) * d, { color: pick(rng, SHROOM_COLORS), rng }));
    }
    // Scatter some dead trees around the outside of the ring.
    this._scatter(24, { xMin: -98, xMax: 98, zMin: -146, zMax: -100 }, 4, (x, z) => {
      if (dist2(x, z, ax, az) < (wallR + 4) ** 2) return null;
      return P.makeDeadTree(x, z, { scale: randRange(rng, 1.0, 1.8), rng });
    });
  }

  // ── Map border: a wall of trees so the edge reads as "forest", not "void" ──

  _buildBorder() {
    const rng = this.rng;
    const b = WORLD.bounds;
    const step = 6.5;
    const edge = (x, z) => {
      const dark = z < ZONES.hollow.zMax;
      const jx = (rng() - 0.5) * 3, jz = (rng() - 0.5) * 3;
      const obj = dark
        ? P.makeDeadTree(x + jx, z + jz, { scale: randRange(rng, 1.3, 2.0), rng })
        : P.makeTree(x + jx, z + jz, { scale: randRange(rng, 1.4, 2.1), leaf: pick(rng, LEAF_COLORS), variant: rng() < 0.4 ? 'pine' : 'round', rng });
      obj.collider.r = 2.2;
      this._add(obj);
    };
    for (let z = b.zMin - 4; z <= b.zMax + 4; z += step) { edge(b.xMin - 4, z); edge(b.xMax + 4, z); }
    for (let x = b.xMin; x <= b.xMax; x += step) { edge(x, b.zMax + 5); edge(x, b.zMin - 5); }
  }
}
