import * as THREE from 'three';
import { COLORS, PLAYER, STATS_INITIAL, DECAY, POISON } from './Constants.js';

export class Player {
  constructor(scene) {
    this.group = new THREE.Group();
    this._buildMesh();
    this.group.position.set(PLAYER.startPos.x, 0, PLAYER.startPos.z);
    scene.add(this.group);

    this.facing          = 0;
    this.isSprinting     = false;
    this.movementLocked  = false; // set true by Stampede Charge
    this.stats           = { ...STATS_INITIAL, abilities: [] };

    // Food-poisoning state
    this.poisoned    = false;
    this.poisonTimer = 0;
  }

  // ── Consume actions ───────────────────────────────────────────

  drinkClean() {
    const restored = Math.min(this.stats.thirstMax - this.stats.thirst, 60);
    this.stats.thirst = Math.min(this.stats.thirstMax, this.stats.thirst + 60);
    // Drinking clean water also reduces active poison duration.
    if (this.poisoned) this.poisonTimer = Math.max(0, this.poisonTimer - 10);
    return restored > 0 ? `+${Math.round(restored)} Thirst` : 'Already hydrated';
  }

  drinkDirty() {
    this.stats.thirst = Math.min(this.stats.thirstMax, this.stats.thirst + 25);
    this._applyPoison(POISON.duration);
    return 'Poisoned!';
  }

  eatSafe() {
    const restored = Math.min(this.stats.hungerMax - this.stats.hunger, 60);
    this.stats.hunger = Math.min(this.stats.hungerMax, this.stats.hunger + 60);
    return restored > 0 ? `+${Math.round(restored)} Hunger` : 'Already full';
  }

  eatPoison() {
    this._applyPoison(POISON.duration);
    return 'Poisoned!';
  }

  takeDamage(amount) {
    this.stats.health = Math.max(0, this.stats.health - amount);
  }

  heal(amount) {
    this.stats.health = Math.min(this.stats.healthMax, this.stats.health + amount);
  }

  _applyPoison(duration) {
    this.poisoned = true;
    // Extend if already poisoned.
    this.poisonTimer = Math.max(this.poisonTimer, duration);
  }

  get isDead() { return this.stats.health <= 0; }

  // ── Update ────────────────────────────────────────────────────

  get position() { return this.group.position; }

  update(dt, input) {
    this._updateStats(dt);
    this._updateMovement(dt, input);
  }

  _updateStats(dt) {
    const s = this.stats;

    // Hunger & thirst decay
    s.hunger = Math.max(0, s.hunger - DECAY.hunger * dt);
    s.thirst = Math.max(0, s.thirst - DECAY.thirst * dt);

    // Health consequences
    if (s.hunger <= 0) s.health = Math.max(0, s.health - DECAY.healthFromHunger * dt);
    if (s.thirst <= 0) s.health = Math.max(0, s.health - DECAY.healthFromThirst * dt);

    // Poison tick
    if (this.poisoned) {
      this.poisonTimer -= dt;
      s.health = Math.max(0, s.health - DECAY.healthFromPoison * dt);
      if (this.poisonTimer <= 0) {
        this.poisoned    = false;
        this.poisonTimer = 0;
      }
    }
  }

  _updateMovement(dt, input) {
    if (this.movementLocked) return; // Abilities handles movement during Stampede Charge
    const move = input.getMoveVector();
    const moving = move.x !== 0 || move.z !== 0;

    const wantSprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const sprinting  = wantSprint && moving && this.stats.stamina > 0;
    this.isSprinting = sprinting;

    if (sprinting) {
      this.stats.stamina = Math.max(0, this.stats.stamina - PLAYER.staminaDrain * dt);
    } else {
      // Use stats.staminaMax so Sprint Hill training raises the cap.
      this.stats.stamina = Math.min(this.stats.staminaMax, this.stats.stamina + PLAYER.staminaRegen * dt);
    }

    // Poison slows the cow down noticeably.
    const speedMult = this.poisoned ? POISON.speedMult : 1;
    const speed = (sprinting ? PLAYER.sprintSpeed : PLAYER.walkSpeed) * speedMult;
    this.group.position.x += move.x * speed * dt;
    this.group.position.z += move.z * speed * dt;

    if (moving) {
      const target = Math.atan2(-move.x, -move.z);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, PLAYER.turnSpeed * dt);
      this.group.rotation.y = this.facing;
    }
  }

  // ── Mesh ─────────────────────────────────────────────────────

  _mat(color, roughness = 0.85) {
    return new THREE.MeshStandardMaterial({ color, roughness });
  }

  _buildMesh() {
    const bodyMat    = this._mat(COLORS.cowBody);
    const fringeMat  = this._mat(COLORS.cowFringe);
    const hornMat    = this._mat(COLORS.cowHorn, 0.6);
    const hoofMat    = this._mat(COLORS.cowHoof);
    const muzzleMat  = this._mat(COLORS.cowMuzzle);
    const eyeMat     = this._mat(COLORS.cowEye, 0.3);
    const bellyMat   = this._mat(0xd4956a);
    const noseMat    = this._mat(0x8b4e3b);

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.05, 2.5), bodyMat);
    body.position.y = 0.95;
    this.group.add(body);

    const belly = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 1.9), bellyMat);
    belly.position.y = 0.44;
    this.group.add(belly);

    const hump = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 0.9), bodyMat);
    hump.position.set(0, 1.65, -0.55);
    this.group.add(hump);

    const coat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 2.0), fringeMat);
    coat.position.set(0, 1.6, 0.1);
    this.group.add(coat);

    // Head
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.0, 1.0), bodyMat);
    head.position.set(0, 1.22, -1.5);
    this.group.add(head);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.55, 0.45), muzzleMat);
    muzzle.position.set(0, 0.98, -2.07);
    this.group.add(muzzle);

    for (const [sx, sz] of [[-0.16, -2.31], [0.16, -2.31]]) {
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.07, 5, 4), noseMat);
      n.position.set(sx, 0.97, sz);
      this.group.add(n);
    }

    // Ears
    const earGeom   = new THREE.BoxGeometry(0.18, 0.45, 0.38);
    const iEarGeom  = new THREE.BoxGeometry(0.08, 0.28, 0.22);
    const iEarMat   = this._mat(0xf0b89a);
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(earGeom, bodyMat);
      ear.position.set(side * 0.6, 1.55, -1.48);
      ear.rotation.z = side * -0.35;
      const ie = new THREE.Mesh(iEarGeom, iEarMat);
      ie.position.set(side * 0.63, 1.56, -1.47);
      ie.rotation.z = side * -0.35;
      this.group.add(ear, ie);
    }

    // Fringe
    const mainFringe = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.42, 0.42), fringeMat);
    mainFringe.position.set(0, 1.72, -1.92);
    this.group.add(mainFringe);

    for (const d of [
      { x: -0.38, y: 1.60, z: -2.02, ry:  0.20 },
      { x: -0.15, y: 1.55, z: -2.08, ry:  0.05 },
      { x:  0.05, y: 1.58, z: -2.05, ry: -0.10 },
      { x:  0.25, y: 1.53, z: -2.07, ry:  0.12 },
      { x:  0.42, y: 1.62, z: -2.00, ry: -0.20 },
      { x: -0.28, y: 1.78, z: -1.85, ry:  0.10 },
      { x:  0.00, y: 1.82, z: -1.90, ry:  0.00 },
      { x:  0.28, y: 1.77, z: -1.85, ry: -0.10 },
    ]) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.30), fringeMat);
      s.position.set(d.x, d.y, d.z);
      s.rotation.y = d.ry;
      this.group.add(s);
    }

    const topTuft = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.32, 0.5), fringeMat);
    topTuft.position.set(0, 1.92, -1.6);
    this.group.add(topTuft);

    for (const [ex, ez] of [[-0.22, -2.01], [0.22, -2.01]]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 5, 4), eyeMat);
      eye.position.set(ex, 1.35, ez);
      this.group.add(eye);
    }

    // Horns
    const hornGeom = new THREE.BoxGeometry(0.16, 0.16, 0.7);
    const tipMat   = this._mat(0xfff4dc, 0.5);
    for (const side of [-1, 1]) {
      const horn = new THREE.Mesh(hornGeom, hornMat);
      horn.position.set(side * 0.58, 1.7, -1.52);
      horn.rotation.set(0.1, 0, side * -0.32);
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), tipMat);
      tip.position.set(side * 0.76, 1.76, -1.53);
      tip.rotation.set(0.1, 0, side * -0.32);
      this.group.add(horn, tip);
    }

    // Legs
    const legGeom  = new THREE.CylinderGeometry(0.17, 0.19, 0.72, 6);
    const hoofGeom = new THREE.CylinderGeometry(0.19, 0.20, 0.18, 6);
    for (const [lx, lz] of [[-0.6, -0.85], [0.6, -0.85], [-0.6, 0.85], [0.6, 0.85]]) {
      const leg  = new THREE.Mesh(legGeom,  bodyMat);
      const hoof = new THREE.Mesh(hoofGeom, hoofMat);
      leg.position.set(lx, 0.43, lz);
      hoof.position.set(lx, 0.07, lz);
      this.group.add(leg, hoof);
    }

    // Tail
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.55), bodyMat);
    tail.position.set(0, 1.1, 1.48);
    const tailTip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 5, 4), fringeMat);
    tailTip.position.set(0, 1.0, 1.78);
    this.group.add(tail, tailTip);
  }
}
