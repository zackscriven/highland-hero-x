import * as THREE from 'three';
import { NAMES } from './Constants.js';

// ── Zone definitions ──────────────────────────────────────────
// Zones are defined by player Z position. Moving forward (W key) decreases Z.

export const ZONES = {
  meadow: { key: 'meadow', name: NAMES.meadow,        zMin: -50, zMax:  100 },
  grove:  { key: 'grove',  name: NAMES.trainingGrove, zMin: -75, zMax:  -50 },
  hollow: { key: 'hollow', name: NAMES.wolfHollow,    zMin: -92, zMax:  -75 },
  arena:  { key: 'arena',  name: NAMES.boss + ' Arena', zMin: -100, zMax: -92 },
};

// Sky/fog/light settings Game.js lerps between when the player crosses zones.
export const ZONE_ATMOSPHERE = {
  meadow: { sky: 0x87ceeb, fogNear: 70, fogFar: 150, ambColor: 0xffffff, ambInt: 0.60 },
  grove:  { sky: 0x6db8a0, fogNear: 55, fogFar: 120, ambColor: 0xccffee, ambInt: 0.50 },
  hollow: { sky: 0x3a3a5a, fogNear: 28, fogFar:  85, ambColor: 0x9090cc, ambInt: 0.38 },
  arena:  { sky: 0x1a0a2e, fogNear: 18, fogFar:  65, ambColor: 0x7070aa, ambInt: 0.30 },
};

export function getZoneKey(z) {
  if (z >= -50) return 'meadow';
  if (z >= -75) return 'grove';
  if (z >= -92) return 'hollow';
  return 'arena';
}

// ── World ─────────────────────────────────────────────────────

export class World {
  constructor(scene) {
    this.scene = scene;
    this.rng = new Rand(7);

    // Exposed for Step 4/5 interaction proximity checks.
    this.trainingSpots = [];
    this.waterSpots    = [];
    this.foodSpots     = [];

    this._buildGround();
    this._buildMeadow();
    this._buildGrove();
    this._buildHollow();
    this._buildArena();
  }

  // ── Ground sections (one per zone) ───────────────────────────

  _buildGround() {
    // Each section is a plane whose center is the midpoint of its Z range.
    const sections = [
      { color: 0x6cbf5c, cz:  25.0, d: 150 }, // meadow  z: -50 → +100
      { color: 0x4d9c40, cz: -62.5, d:  25 }, // grove   z: -75 → -50
      { color: 0x2f3d22, cz: -83.5, d:  17 }, // hollow  z: -92 → -75
      { color: 0x1e1430, cz: -96.0, d:   8 }, // arena   z: -100 → -92
    ];
    for (const s of sections) {
      const g = new THREE.Mesh(
        new THREE.PlaneGeometry(200, s.d),
        new THREE.MeshStandardMaterial({ color: s.color, roughness: 1 })
      );
      g.rotation.x = -Math.PI / 2;
      g.position.set(0, 0, s.cz);
      this.scene.add(g);
    }

    // Subtle meadow color patches.
    for (let i = 0; i < 22; i++) {
      const p = new THREE.Mesh(
        new THREE.CircleGeometry(this.rng.range(3, 9), 7),
        new THREE.MeshStandardMaterial({
          color: this.rng.pick(0x72c75e, 0x64b950, 0x7cd468),
          roughness: 1,
        })
      );
      p.rotation.x = -Math.PI / 2;
      p.position.set(this.rng.range(-85, 85), 0.01, this.rng.range(-44, 90));
      this.scene.add(p);
    }
  }

  // ── Safe Meadow ───────────────────────────────────────────────

  _buildMeadow() {
    const trunkMat = this._mat(0x6b4a2b);
    const leafColors = [0x3f8f3a, 0x2e7a2a, 0x4fa044, 0x5ab450];

    // Trees around the meadow perimeter.
    for (let i = 0; i < 38; i++) {
      const r = this.rng.range(15, 88);
      const a = this.rng.next() * Math.PI * 2;
      const x = Math.cos(a) * r;
      const z = Math.max(-46, Math.sin(a) * r);
      this._scene(this._makeTree(x, z, this.rng.range(0.7, 1.3), trunkMat, this._mat(this.rng.pick(...leafColors))));
    }

    // Flowers.
    const flowerColors = [0xffaacc, 0xffee66, 0xff8844, 0xcc88ff, 0xffffff, 0xff6688];
    for (let i = 0; i < 80; i++) {
      const r = this.rng.range(2, 78);
      const a = this.rng.next() * Math.PI * 2;
      this._scene(this._makeFlower(
        Math.cos(a) * r,
        Math.max(-46, Math.sin(a) * r),
        this.rng.pick(...flowerColors)
      ));
    }

    // Rocks.
    for (let i = 0; i < 14; i++) {
      const r = this.rng.range(8, 68);
      const a = this.rng.next() * Math.PI * 2;
      this._scene(this._makeRock(Math.cos(a) * r, Math.max(-46, Math.sin(a) * r)));
    }

    // Soft hills (half-buried spheres).
    for (let i = 0; i < 6; i++) {
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(this.rng.range(4, 9), 9, 7),
        this._mat(this.rng.pick(0x5db54e, 0x6abf5c, 0x68c05a))
      );
      hill.position.set(this.rng.range(-65, 65), this.rng.range(-6, -4), this.rng.range(-38, 80));
      this._scene(hill);
    }

    // Clean lake.
    const lakePos = new THREE.Vector3(22, 0.05, -20);
    const lake = new THREE.Mesh(
      new THREE.CircleGeometry(8, 12),
      this._mat(0x4ca3d8, { roughness: 0.2, emissive: 0x1144aa, emissiveIntensity: 0.15 })
    );
    lake.rotation.x = -Math.PI / 2;
    lake.position.copy(lakePos);
    this._scene(lake);

    // Shore ring.
    const shore = new THREE.Mesh(
      new THREE.RingGeometry(8, 10, 12),
      this._mat(0x90d4f5, { roughness: 0.5 })
    );
    shore.rotation.x = -Math.PI / 2;
    shore.position.set(lakePos.x, 0.02, lakePos.z);
    this._scene(shore);

    // Reed stalks around the lake edge.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + this.rng.range(-0.2, 0.2);
      const reed = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.09, this.rng.range(0.8, 1.5), 4),
        this._mat(0x4a8a30)
      );
      reed.position.set(lakePos.x + Math.cos(a) * 9.5, 0.5, lakePos.z + Math.sin(a) * 9.5);
      this._scene(reed);
    }

    this.waterSpots.push({ type: 'clean', pos: lakePos.clone(), radius: 9, label: 'Press E to drink clean water' });

    // Safe food patches.
    const safeFoodPositions = [
      new THREE.Vector3(-26, 0, 8),
      new THREE.Vector3(12, 0, 50),
      new THREE.Vector3(-8, 0, -36),
    ];
    for (const fp of safeFoodPositions) {
      this._makeFoodPatch(fp, 'safe');
      this.foodSpots.push({ type: 'safe', pos: fp.clone(), radius: 4.5, label: 'Press E to eat' });
    }
  }

  // ── Training Grove ────────────────────────────────────────────

  _buildGrove() {
    // Border trees in a loose oval.
    const trunkMat = this._mat(0x5a3c1e);
    const leafMat  = this._mat(0x2f7828);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const x = Math.cos(a) * (38 + this.rng.range(-3, 5));
      const z = -62.5 + Math.sin(a) * (11 + this.rng.range(-1, 2));
      if (x < -92 || x > 92) continue;
      this._scene(this._makeTree(x, Math.max(-74, Math.min(-51, z)), 1.05, trunkMat, leafMat));
    }

    // Fallen logs.
    const logMat = this._mat(0x6b4226);
    for (const l of [{ x: -28, z: -53, ry: 0.4 }, { x: 26, z: -66, ry: -0.7 }, { x: 6, z: -57, ry: 1.0 }]) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.30, 3.5, 7), logMat);
      log.position.set(l.x, 0.28, l.z);
      log.rotation.set(0, l.ry, Math.PI / 2);
      this._scene(log);
    }

    // Training spot visuals + data.
    this._makeHeadbuttRock(-14, -54);
    this._makeSprintHill(18, -59);
    this._makeHornPost(-19, -63);
    this._makeEchoStone(11, -68);
    this._makeAncientGrassPatch(-3, -72);

    this.trainingSpots = [
      { key: 'headbutt', abilityKey: 'headbutt', label: 'Headbutt Rock',       pos: new THREE.Vector3(-14, 0, -54), radius: 5 },
      { key: 'sprint',   abilityKey: 'stampede', label: 'Sprint Hill',         pos: new THREE.Vector3(18,  0, -59), radius: 6 },
      { key: 'shield',   abilityKey: 'shield',   label: 'Horn Post',           pos: new THREE.Vector3(-19, 0, -63), radius: 4.5 },
      { key: 'echo',     abilityKey: 'moo',      label: 'Echo Stone',          pos: new THREE.Vector3(11,  0, -68), radius: 4 },
      { key: 'grass',    abilityKey: 'grass',    label: 'Ancient Grass Patch', pos: new THREE.Vector3(-3,  0, -72), radius: 5 },
    ];
  }

  // ── Wolf Hollow ───────────────────────────────────────────────

  _buildHollow() {
    // Dead trees scattered throughout.
    for (let i = 0; i < 20; i++) {
      const x = this.rng.range(-82, 82);
      const z = this.rng.range(-91, -76);
      this._scene(this._makeDeadTree(x, z));
    }

    // Thorn-bush border at zone entrance (z ≈ -75).
    for (let i = 0; i < 18; i++) {
      this._scene(this._makeThornBush(this.rng.range(-88, 88), this.rng.range(-77, -74)));
    }
    // Scattered thorns deeper in.
    for (let i = 0; i < 12; i++) {
      this._scene(this._makeThornBush(this.rng.range(-72, 72), this.rng.range(-91, -78)));
    }

    // Glowing mushrooms.
    for (let i = 0; i < 24; i++) {
      this._scene(this._makeMushroom(this.rng.range(-78, 78), this.rng.range(-91, -76)));
    }

    // Dirty pond.
    const dirtyPos = new THREE.Vector3(-14, 0.05, -83);
    const pond = new THREE.Mesh(
      new THREE.CircleGeometry(5.5, 9),
      this._mat(0x4a5a2a, { roughness: 0.9, emissive: 0x112200, emissiveIntensity: 0.08 })
    );
    pond.rotation.x = -Math.PI / 2;
    pond.position.copy(dirtyPos);
    this._scene(pond);
    this.waterSpots.push({ type: 'dirty', pos: dirtyPos.clone(), radius: 6, label: 'Dirty water — this will make you sick!' });

    // Poison berries.
    const poisonPos = new THREE.Vector3(18, 0, -86);
    this._makePoisonPatch(poisonPos);
    this.foodSpots.push({ type: 'poison', pos: poisonPos.clone(), radius: 3.5, label: 'Poison berries — avoid these!' });

    // Dark rocks.
    for (let i = 0; i < 12; i++) {
      this._scene(this._makeRock(this.rng.range(-72, 72), this.rng.range(-91, -76), 0x2a2a3a));
    }
  }

  // ── Boss Arena ────────────────────────────────────────────────

  _buildArena() {
    const cx = 0, cz = -96;

    // Dark arena floor disc.
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(19, 16),
      this._mat(0x0f0820)
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.05, cz);
    this._scene(floor);

    // Standing-stone ring.
    const stoneMat = this._mat(0x4a3a6a, { roughness: 0.9 });
    const numStones = 12;
    for (let i = 0; i < numStones; i++) {
      const a = (i / numStones) * Math.PI * 2;
      const h = this.rng.range(3.5, 5.5);
      const stone = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.0), stoneMat);
      stone.position.set(cx + Math.cos(a) * 17, h / 2, cz + Math.sin(a) * 17);
      stone.rotation.y = a + this.rng.range(-0.2, 0.2);
      this._scene(stone);
    }

    // Central ancient dead tree.
    this._scene(this._makeDeadTree(cx, cz - 3, 2.2));

    // Glowing rune rings on the floor.
    const runeMat = this._mat(0x8844cc, { roughness: 0.3, emissive: 0x6622aa, emissiveIntensity: 0.7 });
    for (let i = 0; i < 3; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(4 + i * 3, 4.5 + i * 3, 16), runeMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(cx, 0.07 + i * 0.01, cz);
      this._scene(ring);
    }

    // Moonlight point light over the arena center.
    const moon = new THREE.PointLight(0xaaaaff, 1.5, 40);
    moon.position.set(cx, 18, cz);
    this._scene(moon);

    // Thorn-arch at entrance (gap in the middle for the player).
    for (let xi = -5; xi <= 5; xi++) {
      if (xi >= -1 && xi <= 1) continue;
      this._scene(this._makeThornBush(cx + xi * 2.8, -93.5));
    }
  }

  // ── Training spot visuals ─────────────────────────────────────

  _makeHeadbuttRock(x, z) {
    const mat = this._mat(0x887766);
    const g = new THREE.Group();
    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 0), mat);
    main.position.y = 1.5;
    main.rotation.set(0.3, 0.6, 0.1);
    const side = new THREE.Mesh(new THREE.DodecahedronGeometry(1.2, 0), mat);
    side.position.set(1.8, 0.9, 0.5);
    g.add(main, side);
    g.position.set(x, 0, z);
    this._scene(g);
  }

  _makeSprintHill(x, z) {
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(5, 10, 8),
      this._mat(0x5baa4c)
    );
    hill.position.set(x, -3.5, z);
    this._scene(hill);
    // Path markers up the hill.
    const markerMat = this._mat(0x888866);
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.15, 0.4), markerMat);
      m.position.set(x + (i - 2) * 0.6, 0.08, z + i * 0.8 - 2);
      this._scene(m);
    }
  }

  _makeHornPost(x, z) {
    const mat = this._mat(0x7a5530);
    const g = new THREE.Group();
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 3.2, 7), mat);
    post.position.y = 1.6;
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.5, 6), mat);
    armL.position.set(-0.65, 3.1, 0);
    armL.rotation.z = 0.6;
    const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.13, 1.5, 6), mat);
    armR.position.set(0.65, 3.1, 0);
    armR.rotation.z = -0.6;
    g.add(post, armL, armR);
    g.position.set(x, 0, z);
    this._scene(g);
  }

  _makeEchoStone(x, z) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.5, 1),
      this._mat(0x4488cc, { roughness: 0.3, emissive: 0x2255aa, emissiveIntensity: 0.6 })
    );
    stone.position.set(x, 1.3, z);
    this._scene(stone);
    // Soft glow ring on ground.
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.8, 2.4, 10),
      this._mat(0x4488cc, { roughness: 0.5, emissive: 0x2244aa, emissiveIntensity: 0.4 })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, 0.06, z);
    this._scene(ring);
  }

  _makeAncientGrassPatch(x, z) {
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(3, 10),
      this._mat(0x44ff88, { roughness: 0.7, emissive: 0x22cc66, emissiveIntensity: 0.4 })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(x, 0.06, z);
    this._scene(disc);
    for (let i = 0; i < 14; i++) {
      const a = this.rng.next() * Math.PI * 2;
      const r = this.rng.range(0.2, 2.6);
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, this.rng.range(0.4, 1.0), 0.06),
        this._mat(0x55ff99, { roughness: 0.5, emissive: 0x33ee77, emissiveIntensity: 0.45 })
      );
      blade.position.set(x + Math.cos(a) * r, 0.4, z + Math.sin(a) * r);
      this._scene(blade);
    }
  }

  // ── Shared object factories ───────────────────────────────────

  _makeTree(x, z, scale, trunkMat, leafMat) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.30 * scale, 1.4 * scale, 7),
      trunkMat
    );
    trunk.position.y = 0.7 * scale;
    tree.add(trunk);
    for (const c of [
      { y: 2.8, r: 1.35, h: 2.0 },
      { y: 3.8, r: 1.00, h: 1.7 },
      { y: 4.6, r: 0.65, h: 1.4 },
    ]) {
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(c.r * scale, c.h * scale, 7),
        leafMat
      );
      cone.position.y = c.y * scale;
      cone.rotation.y = this.rng.next() * Math.PI;
      tree.add(cone);
    }
    tree.position.set(x, 0, z);
    tree.rotation.z = this.rng.range(-0.05, 0.05);
    return tree;
  }

  _makeFlower(x, z, color) {
    const g = new THREE.Group();
    const h = this.rng.range(0.3, 0.7);

    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, h, 4),
      this._mat(0x4c9a2a)
    );
    stem.position.y = h / 2;
    g.add(stem);

    const bloom = new THREE.Mesh(
      new THREE.SphereGeometry(this.rng.range(0.1, 0.18), 6, 5),
      this._mat(color, { roughness: 0.6 })
    );
    bloom.position.y = h + 0.12;
    g.add(bloom);

    g.position.set(x, 0, z);
    return g;
  }

  _makeRock(x, z, colorOverride) {
    const g = new THREE.Group();
    const color = colorOverride ?? this.rng.pick(0x8a8a8a, 0x9a9898, 0x767676, 0xb0aca8);
    const mat = this._mat(color, { roughness: 0.95 });
    const size = this.rng.range(0.4, 1.0);
    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 0), mat);
    main.position.y = size * 0.55;
    main.rotation.set(this.rng.next(), this.rng.next(), this.rng.next());
    g.add(main);
    if (this.rng.next() > 0.5) {
      const side = new THREE.Mesh(new THREE.DodecahedronGeometry(size * this.rng.range(0.35, 0.6), 0), mat);
      side.position.set(
        this.rng.range(-size, size) * 0.8,
        size * 0.3,
        this.rng.range(-size, size) * 0.4
      );
      side.rotation.set(this.rng.next(), this.rng.next(), this.rng.next());
      g.add(side);
    }
    g.position.set(x, 0, z);
    return g;
  }

  _makeDeadTree(x, z, scale = 1) {
    const g = new THREE.Group();
    const mat = this._mat(0x2e2218);
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.36 * scale, 4 * scale, 6),
      mat
    );
    trunk.position.y = 2 * scale;
    g.add(trunk);
    for (const b of [
      { x: 0.8, y: 2.8, len: 1.6, ry: 0.5,  rz: -0.6 },
      { x: -0.8, y: 2.8, len: 1.4, ry: -0.4, rz:  0.65 },
      { x: 0.5,  y: 3.5, len: 1.2, ry: 1.2,  rz: -0.7 },
      { x: -0.4, y: 3.5, len: 1.0, ry: -1.0, rz:  0.6 },
    ]) {
      const branch = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07 * scale, 0.12 * scale, b.len * scale, 5),
        mat
      );
      branch.position.set(b.x * scale, b.y * scale, 0);
      branch.rotation.set(0, b.ry, b.rz);
      g.add(branch);
    }
    g.position.set(x, 0, z);
    return g;
  }

  _makeThornBush(x, z) {
    const g = new THREE.Group();
    const bushMat  = this._mat(0x3d1f1f);
    const thornMat = this._mat(0x5a1a1a);
    const main = new THREE.Mesh(new THREE.DodecahedronGeometry(0.9, 0), bushMat);
    main.position.y = 0.7;
    g.add(main);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const thorn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 4), thornMat);
      thorn.position.set(Math.cos(a) * 0.78, 0.9, Math.sin(a) * 0.78);
      thorn.rotation.set(0, a, Math.PI / 2 - 0.3);
      g.add(thorn);
    }
    g.position.set(x, 0, z);
    return g;
  }

  _makeMushroom(x, z) {
    const g = new THREE.Group();
    const color = this.rng.pick(0x44aaff, 0xaa44ff, 0xff4488, 0x44ffaa, 0xffaa44);
    const h = this.rng.range(0.4, 0.9);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.13, h, 6),
      this._mat(0xddccbb)
    );
    stem.position.y = h / 2;
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(this.rng.range(0.2, 0.46), 7, 5),
      this._mat(color, { roughness: 0.4, emissive: color, emissiveIntensity: 0.35 })
    );
    cap.scale.y = 0.55;
    cap.position.y = h + 0.08;
    g.add(stem, cap);
    g.position.set(x, 0, z);
    return g;
  }

  _makeFoodPatch(pos, type) {
    const color = type === 'safe' ? 0x66cc44 : 0x558800;
    const mat = this._mat(color, { emissive: color, emissiveIntensity: 0.08 });
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.5 + this.rng.range(0, 0.2), 6, 5), mat);
      b.position.set(Math.cos(a) * 1.3, 0.5, Math.sin(a) * 1.3);
      g.add(b);
    }
    const center = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 5), mat);
    center.position.y = 0.6;
    g.add(center);
    g.position.copy(pos);
    this.scene.add(g);
  }

  _makePoisonPatch(pos) {
    const mat = this._mat(0x4a1a5a, { emissive: 0x220033, emissiveIntensity: 0.25 });
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const berry = new THREE.Mesh(new THREE.SphereGeometry(0.2, 5, 4), mat);
      berry.position.set(Math.cos(a) * 0.8, 0.3, Math.sin(a) * 0.8);
      g.add(berry);
    }
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 0.8, 5),
      this._mat(0x2a1a2a)
    );
    stem.position.y = 0.4;
    g.add(stem);
    g.position.copy(pos);
    this.scene.add(g);
  }

  // ── Helpers ───────────────────────────────────────────────────

  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness:          opts.roughness          ?? 0.85,
      emissive:           opts.emissive           ?? 0x000000,
      emissiveIntensity:  opts.emissiveIntensity  ?? 0,
    });
  }

  _scene(obj) {
    this.scene.add(obj);
    return obj;
  }
}

// Deterministic seeded random — same world layout every load.
class Rand {
  constructor(seed = 42) { this.s = seed; }
  next() {
    this.s = (this.s * 1664525 + 1013904223) & 0xffffffff;
    return (this.s >>> 0) / 0xffffffff;
  }
  range(a, b) { return a + this.next() * (b - a); }
  pick(...args) { return args[Math.floor(this.next() * args.length)]; }
}
