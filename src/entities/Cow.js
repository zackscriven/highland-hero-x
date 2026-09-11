// A playable Highland cow. Movement, stats, and animation live here.
// Abilities are driven by systems/Abilities.js so the cow stays small.
import * as THREE from 'three';
import { COW } from '../data/constants.js';
import { CowMesh } from './CowMesh.js';
import { angleDamp, damp, clamp } from '../core/math.js';

export class Cow {
  constructor({ scene, skin, input, index = 0, name = 'Cow' }) {
    this.index = index;
    this.name = name;
    this.input = input;
    this.skin = skin;
    this.scene = scene;

    this.mesh = new CowMesh(skin.colors, skin.features);
    this.group = this.mesh.group;
    scene.add(this.group);

    this.radius = COW.radius;
    this.facing = 0;
    this.time = index * 1.7;
    this.zone = null;

    this.stats = {
      health: COW.healthMax, healthMax: COW.healthMax,
      stamina: COW.staminaMax, staminaMax: COW.staminaMax,
    };

    this.velocity = new THREE.Vector3(); // knockback / external pushes
    this.movementLocked = false;         // Stampede Charge takes over movement
    this.speedMult = 1;                  // slowed by hazards
    this.isSprinting = false;
    this.moveBlend = 0;
    this.sprintBlend = 0;
    this.invulnTimer = 0;
    this.glowTimer = 0;
    this.glowColor = 0xffffff;
    this.isDown = false;                 // knocked out (0 health)
    this.downTimer = 0;
    this.abilities = new Set();          // unlocked ability ids (granted by the Quest system)
    this._fwd = { x: 0, z: -1 };
  }

  hasAbility(id) { return this.abilities.has(id); }

  unlockAbility(id) {
    const isNew = !this.abilities.has(id);
    this.abilities.add(id);
    if (isNew) this.flash(0xffe08a, 1.0);
    return isNew;
  }

  get position() { return this.group.position; }
  get x() { return this.group.position.x; }
  get z() { return this.group.position.z; }

  forward() {
    this._fwd.x = -Math.sin(this.facing);
    this._fwd.z = -Math.cos(this.facing);
    return this._fwd;
  }

  setSkin(skin) {
    this.skin = skin;
    this.mesh.applySkin(skin.colors, skin.features);
  }

  placeAt(x, z, facing = 0) {
    this.group.position.set(x, 0, z);
    this.facing = facing;
    this.group.rotation.y = facing;
    this.velocity.set(0, 0, 0);
  }

  update(dt, world) {
    this.time += dt;
    if (this.isDown) this._updateDowned(dt);
    else this._updateMovement(dt);

    // External velocity (knockback) decays quickly.
    const p = this.group.position;
    p.x += this.velocity.x * dt;
    p.z += this.velocity.z * dt;
    this.velocity.multiplyScalar(Math.exp(-6 * dt));

    world.resolve(p, this.radius);
    this.zone = world.zoneAt(p);

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.glowTimer > 0) {
      this.glowTimer -= dt;
      this.mesh.setGlow(this.glowColor, Math.max(0, this.glowTimer) * 1.6);
      if (this.glowTimer <= 0) this.mesh.setGlow(0x000000, 0);
    }
    this.mesh.animate(this.time, this.moveBlend, this.sprintBlend);
  }

  _updateMovement(dt) {
    const s = this.stats;
    const mv = this.input.moveVector();

    if (this.movementLocked) {
      this.moveBlend = damp(this.moveBlend, 1, 12, dt);
      this.sprintBlend = damp(this.sprintBlend, 1, 12, dt);
      return;
    }

    const wantSprint = this.input.isDown('sprint') && mv.moving && s.stamina > 0;
    this.isSprinting = wantSprint;
    if (wantSprint) s.stamina = Math.max(0, s.stamina - COW.staminaDrain * dt);
    else s.stamina = Math.min(s.staminaMax, s.stamina + COW.staminaRegen * dt);

    const speed = (wantSprint ? COW.sprintSpeed : COW.walkSpeed) * this.speedMult;
    const p = this.group.position;
    p.x += mv.x * speed * dt;
    p.z += mv.z * speed * dt;

    if (mv.moving) {
      const target = Math.atan2(-mv.x, -mv.z);
      this.facing = angleDamp(this.facing, target, COW.turnLambda, dt);
    }
    this.group.rotation.y = this.facing;
    this.group.rotation.z = damp(this.group.rotation.z, 0, 8, dt);
    this.moveBlend = damp(this.moveBlend, mv.moving ? 1 : 0, 10, dt);
    this.sprintBlend = damp(this.sprintBlend, wantSprint ? 1 : 0, 6, dt);
  }

  _updateDowned(dt) {
    this.downTimer += dt;
    this.moveBlend = damp(this.moveBlend, 0, 8, dt);
    this.sprintBlend = 0;
    // Flop onto one side — dramatic but harmless.
    this.group.rotation.z = damp(this.group.rotation.z, Math.PI / 2, 6, dt);
    this.group.rotation.y = this.facing;
  }

  takeDamage(amount, { source } = {}) {
    if (this.isDown || this.invulnTimer > 0 || amount <= 0) return 0;
    this.stats.health = Math.max(0, this.stats.health - amount);
    this.invulnTimer = 0.35;
    this.flash(0xff4444, 0.5);
    if (this.stats.health <= 0) this.knockOut();
    return amount;
  }

  heal(amount) {
    const before = this.stats.health;
    this.stats.health = clamp(this.stats.health + amount, 0, this.stats.healthMax);
    if (this.stats.health > before) this.flash(0x66ff88, 0.7);
    return this.stats.health - before;
  }

  flash(hex, duration = 0.4) {
    this.glowColor = hex;
    this.glowTimer = duration;
  }

  knockback(dirX, dirZ, force) {
    const len = Math.hypot(dirX, dirZ) || 1;
    this.velocity.x += (dirX / len) * force;
    this.velocity.z += (dirZ / len) * force;
  }

  knockOut() {
    this.isDown = true;
    this.downTimer = 0;
    this.movementLocked = false;
    this.isSprinting = false;
  }

  revive(healthFraction = 0.5) {
    this.isDown = false;
    this.downTimer = 0;
    this.stats.health = Math.max(1, Math.round(this.stats.healthMax * healthFraction));
    this.stats.stamina = this.stats.staminaMax;
    this.invulnTimer = 2.0;
    this.flash(0x66ff88, 1.0);
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
