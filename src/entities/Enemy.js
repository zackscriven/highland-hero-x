// Wolves and bears: cute-scary, simple state machine (idle → chase → windup → attack → cooldown).
import * as THREE from 'three';
import { ENEMY_TYPES } from '../data/enemies.js';
import { damp, angleDamp, dist2, clamp } from '../core/math.js';

const legGeoWolf = new THREE.CylinderGeometry(0.11, 0.12, 0.7, 5);
const legGeoBear = new THREE.CylinderGeometry(0.26, 0.28, 1.0, 6);
const shadowGeo = new THREE.CircleGeometry(1, 16);
const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false });

export class Enemy {
  constructor(scene, type, x, z, { guardOf = null, ephemeral = false, harmless = false, scale = 1, fleeFrom = null } = {}) {
    this.scene = scene;
    this.type = type;
    this.cfg = ENEMY_TYPES[type];
    this.guardOf = guardOf;
    this.ephemeral = ephemeral;   // never respawns (boss pups)
    this.harmless = harmless;     // just runs away and vanishes
    this.fleeFrom = fleeFrom;
    this.lifetime = 0;
    this.home = { x, z };
    this.radius = this.cfg.radius;
    this.hp = this.cfg.hp;
    this.maxHp = this.cfg.hp;
    this.facing = Math.random() * Math.PI * 2;
    this.state = 'idle';
    this.stateTimer = 0;
    this.attackCd = 0;
    this.target = null;
    this.wander = { x, z, timer: 0 };
    this.velocity = new THREE.Vector3();
    this.moveBlend = 0;
    this.time = Math.random() * 10;
    this.dead = false;
    this.removeMe = false;
    this.dying = 0;
    this.flashTimer = 0;
    this.scareTimer = 0;
    this.hitBy = new Set(); // ability instances that already hit us (charge, moo)
    this._blockedTimer = 0;
    this._sideStep = 0;

    this.group = new THREE.Group();
    this.group.position.set(x, 0, z);
    this.mats = [];
    this.legs = [];
    if (type === 'wolf') this._buildWolf(); else this._buildBear();
    this._buildHealthBar();
    this.group.scale.setScalar(scale);
    scene.add(this.group);
  }

  get position() { return this.group.position; }
  get x() { return this.group.position.x; }
  get z() { return this.group.position.z; }
  get alive() { return !this.dead; }

  // ── AI ────────────────────────────────────────────────────────────────

  update(dt, ctx) {
    this.time += dt;
    if (this.dead) { this._tickDying(dt); return; }
    if (this.harmless) { this._tickHarmless(dt, ctx); return; }

    const p = this.group.position;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.scareTimer > 0) this.scareTimer -= dt;

    // Pick a target: nearest cow that's up and in range.
    let best = null, bestD = Infinity;
    for (const pl of ctx.players) {
      if (pl.cow.isDown) continue;
      const d = dist2(p.x, p.z, pl.cow.x, pl.cow.z);
      if (d < bestD) { bestD = d; best = pl; }
    }
    const distToTarget = Math.sqrt(bestD);
    const distHome = Math.hypot(p.x - this.home.x, p.z - this.home.z);

    let moveX = 0, moveZ = 0, speed = this.cfg.speed;

    switch (this.state) {
      case 'idle': {
        this.wander.timer -= dt;
        if (this.wander.timer <= 0) {
          this.wander.timer = 2 + Math.random() * 3;
          const a = Math.random() * Math.PI * 2, r = Math.random() * 6;
          this.wander.x = this.home.x + Math.cos(a) * r;
          this.wander.z = this.home.z + Math.sin(a) * r;
        }
        const dx = this.wander.x - p.x, dz = this.wander.z - p.z;
        if (Math.hypot(dx, dz) > 0.8) { moveX = dx; moveZ = dz; speed *= 0.35; }
        if (best && distToTarget < this.cfg.aggroRange && this.scareTimer <= 0) { this.state = 'chase'; this.target = best; }
        break;
      }
      case 'chase': {
        if (!best || distToTarget > this.cfg.aggroRange * 1.6 || distHome > this.cfg.leash) { this.state = 'return'; break; }
        if (this.scareTimer > 0) {
          // Run away from the player for a moment (Moo Blast!).
          moveX = p.x - best.cow.x; moveZ = p.z - best.cow.z; speed *= 1.1;
          break;
        }
        this.target = best;
        moveX = best.cow.x - p.x; moveZ = best.cow.z - p.z;
        if (distToTarget < this.cfg.attackRange && this.attackCd <= 0) {
          this.state = 'windup'; this.stateTimer = this.cfg.windup;
        }
        break;
      }
      case 'windup': {
        this.stateTimer -= dt;
        if (best) this._face(best.cow.x - p.x, best.cow.z - p.z, dt, 14);
        if (this.stateTimer <= 0) {
          this.state = 'attack'; this.stateTimer = 0.22;
          this.attackCd = this.cfg.attackCooldown;
          // Lunge + damage if the target is still close.
          if (best && distToTarget < this.cfg.attackRange * 1.35) {
            const pl = best;
            const mult = pl.abilities?.damageMultiplier ?? 1;
            const dealt = pl.cow.takeDamage(this.cfg.damage * mult, { source: this });
            const kx = pl.cow.x - p.x, kz = pl.cow.z - p.z;
            if (dealt > 0) {
              pl.cow.knockback(kx, kz, this.type === 'bear' ? 9 : 5);
              ctx.effects.burst(pl.cow.position, 0xff7a7a, { count: 8, speed: 4, life: 0.5 });
              ctx.onPlayerHit?.(pl, dealt, this);
            } else if (pl.abilities?.isShielded) {
              // Bonked off the horn shield!
              this.knockback(-kx, -kz, 10);
              ctx.effects.burst(p, 0xfff1a8, { count: 8, speed: 4, life: 0.4 });
            }
          }
          const fx = -Math.sin(this.facing), fz = -Math.cos(this.facing);
          this.velocity.x += fx * 9; this.velocity.z += fz * 9;
        }
        break;
      }
      case 'attack': {
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = 'chase';
        break;
      }
      case 'return': {
        const dx = this.home.x - p.x, dz = this.home.z - p.z;
        moveX = dx; moveZ = dz; speed *= 0.8;
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15 * dt);
        if (distHome < 2) this.state = 'idle';
        else if (best && distToTarget < this.cfg.aggroRange * 0.6 && distHome < this.cfg.leash * 0.8) this.state = 'chase';
        break;
      }
    }

    // Steering: separate from other enemies, sidestep when blocked.
    const len = Math.hypot(moveX, moveZ);
    if (len > 0.01) {
      moveX /= len; moveZ /= len;
      if (this._sideStep > 0) {
        this._sideStep -= dt;
        const sx = -moveZ, sz = moveX;
        moveX = moveX * 0.3 + sx * this._sideSign; moveZ = moveZ * 0.3 + sz * this._sideSign;
      }
      for (const e of ctx.enemies) {
        if (e === this || e.dead) continue;
        const d2 = dist2(p.x, p.z, e.x, e.z), min = this.radius + e.radius + 0.4;
        if (d2 < min * min && d2 > 0.0001) {
          const d = Math.sqrt(d2);
          moveX += (p.x - e.x) / d * 0.8; moveZ += (p.z - e.z) / d * 0.8;
        }
      }
      const l2 = Math.hypot(moveX, moveZ) || 1;
      const before = { x: p.x, z: p.z };
      p.x += (moveX / l2) * speed * dt;
      p.z += (moveZ / l2) * speed * dt;
      this._face(moveX, moveZ, dt, 10);
      ctx.world.resolve(p, this.radius);
      const moved = Math.hypot(p.x - before.x, p.z - before.z);
      if (moved < speed * dt * 0.35) {
        this._blockedTimer += dt;
        if (this._blockedTimer > 0.35 && this._sideStep <= 0) { this._sideStep = 0.6; this._sideSign = Math.random() < 0.5 ? 1 : -1; }
      } else this._blockedTimer = 0;
      this.moveBlend = damp(this.moveBlend, 1, 10, dt);
    } else {
      this.moveBlend = damp(this.moveBlend, 0, 10, dt);
    }

    // Knockback velocity.
    p.x += this.velocity.x * dt; p.z += this.velocity.z * dt;
    this.velocity.multiplyScalar(Math.exp(-7 * dt));
    ctx.world.resolve(p, this.radius);

    this._animate(dt);
  }

  // Pups: scamper away from a point, hop about, then pop away in a puff.
  _tickHarmless(dt, ctx) {
    this.lifetime += dt;
    const p = this.group.position;
    const from = this.fleeFrom ?? { x: 0, z: 0 };
    let dx = p.x - from.x, dz = p.z - from.z;
    const l = Math.hypot(dx, dz) || 1;
    dx /= l; dz /= l;
    dx += Math.sin(this.time * 5 + this.facing) * 0.4;
    const speed = 8;
    p.x += dx * speed * dt; p.z += dz * speed * dt;
    this._face(dx, dz, dt, 12);
    ctx.world.resolve(p, this.radius * 0.5);
    this.moveBlend = 1;
    this.group.position.y = Math.abs(Math.sin(this.time * 12)) * 0.4;
    this._animate(dt);
    if (this.lifetime > 3.2) { this.dead = true; this.removeMe = true; this.group.visible = false; ctx.effects.puff(p, 0xd8d0ee, 8); }
  }

  _face(dx, dz, dt, lambda) {
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    this.facing = angleDamp(this.facing, Math.atan2(-dx, -dz), lambda, dt);
    this.group.rotation.y = this.facing;
  }

  // ── Damage ────────────────────────────────────────────────────────────

  takeDamage(amount, { fromX, fromZ, knock = 6 } = {}) {
    if (this.dead) return 0;
    this.hp -= amount;
    this.flashTimer = 0.25;
    if (fromX !== undefined) this.knockback(this.x - fromX, this.z - fromZ, knock);
    if (this.state === 'idle' || this.state === 'return') this.state = 'chase';
    if (this.hp <= 0) this._die();
    this._refreshBar();
    return amount;
  }

  knockback(dx, dz, force) {
    const l = Math.hypot(dx, dz) || 1;
    const f = force * this.cfg.knockbackResist;
    this.velocity.x += (dx / l) * f;
    this.velocity.z += (dz / l) * f;
  }

  scare(seconds) { this.scareTimer = Math.max(this.scareTimer, seconds); }

  _die() {
    this.dead = true;
    this.dying = 0;
    this.bar.visible = false;
  }

  _tickDying(dt) {
    this.dying += dt;
    // Flop over, shrink, and pop away — no gore, just a dramatic tumble.
    this.group.rotation.z = damp(this.group.rotation.z, Math.PI / 2, 8, dt);
    const s = Math.max(0.01, 1 - Math.max(0, this.dying - 0.7) * 2.2);
    this.group.scale.setScalar(s);
    if (this.dying > 1.2) { this.removeMe = true; this.group.visible = false; }
  }

  dispose() { this.scene.remove(this.group); }

  // ── Visuals ───────────────────────────────────────────────────────────

  _animate(dt) {
    const t = this.time;
    const freq = this.type === 'wolf' ? 13 : 8;
    const swing = this.type === 'wolf' ? 0.7 : 0.45;
    for (let i = 0; i < this.legs.length; i++) {
      const sign = i === 0 || i === 3 ? 1 : -1;
      this.legs[i].rotation.x = Math.sin(t * freq) * swing * this.moveBlend * sign;
    }
    const crouch = this.state === 'windup' ? 0.82 : 1;
    this.body.scale.y = damp(this.body.scale.y, crouch, 12, dt);
    this.body.position.y = Math.abs(Math.sin(t * freq)) * 0.08 * this.moveBlend;
    this.head.rotation.x = this.state === 'windup' ? -0.35 : Math.sin(t * 2) * 0.05;
    if (this.tail) this.tail.rotation.y = Math.sin(t * 5) * 0.4;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      const k = Math.max(0, this.flashTimer) * 3;
      for (const m of this.mats) { m.emissive.setHex(0xff5555); m.emissiveIntensity = k; }
    }
    // Scared wolves' eyes go wide (bigger), and they whimper-tilt.
    if (this.eyes) { const es = this.scareTimer > 0 ? 1.5 : 1; for (const e of this.eyes) e.scale.setScalar(damp(e.scale.x, es, 10, dt)); }
    this.bar.position.y = this.barHeight;
  }

  _mat(hex) {
    const m = new THREE.MeshLambertMaterial({ color: hex });
    this.mats.push(m);
    return m;
  }

  _box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    return m;
  }

  _buildWolf() {
    const fur = this._mat(0x8d93a1), dark = this._mat(0x5f6573), light = this._mat(0xc3c8d4);
    const pink = this._mat(0xf2a7b5), nose = this._mat(0x1e1e26);
    const body = new THREE.Group();
    this.body = body;
    body.add(this._box(0.95, 0.8, 1.7, fur, 0, 0.85, 0));
    body.add(this._box(0.7, 0.2, 1.4, dark, 0, 1.28, 0));
    body.add(this._box(0.7, 0.2, 1.2, light, 0, 0.5, 0.1));
    const head = new THREE.Group();
    head.position.set(0, 1.12, -1.05);
    this.head = head;
    head.add(this._box(0.72, 0.66, 0.7, fur, 0, 0, 0));
    head.add(this._box(0.38, 0.32, 0.42, light, 0, -0.12, -0.5));
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 5, 4), nose)).position.set(0, -0.05, -0.72);
    for (const s of [-1, 1]) {
      head.add(this._box(0.18, 0.36, 0.12, fur, s * 0.24, 0.45, 0.05));
      head.add(this._box(0.09, 0.2, 0.06, pink, s * 0.24, 0.45, 0.0));
    }
    this.eyes = [];
    const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffe066, emissive: 0xffd23f, emissiveIntensity: 0.9 });
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), eyeMat);
      e.position.set(s * 0.19, 0.1, -0.36);
      head.add(e);
      this.eyes.push(e);
    }
    body.add(head);
    const tail = this._box(0.16, 0.16, 0.75, fur, 0, 1.05, 1.1);
    tail.rotation.x = -0.6;
    this.tail = tail;
    body.add(tail);
    this.group.add(body);
    for (const [lx, lz] of [[-0.32, -0.6], [0.32, -0.6], [-0.32, 0.6], [0.32, 0.6]]) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0.7, lz);
      const leg = new THREE.Mesh(legGeoWolf, fur);
      leg.position.y = -0.35;
      pivot.add(leg);
      this.group.add(pivot);
      this.legs.push(pivot);
    }
    this._shadow(1.1);
    this.barHeight = 2.2;
  }

  _buildBear() {
    const fur = this._mat(0x6b4a32), tan = this._mat(0xc9a27a), dark = this._mat(0x1e1512);
    const body = new THREE.Group();
    this.body = body;
    body.add(this._box(1.9, 1.5, 2.6, fur, 0, 1.25, 0));
    body.add(this._box(1.2, 0.5, 1.6, tan, 0, 0.7, 0.2));
    const head = new THREE.Group();
    head.position.set(0, 1.9, -1.55);
    this.head = head;
    head.add(this._box(1.1, 1.0, 1.0, fur, 0, 0, 0));
    head.add(this._box(0.6, 0.45, 0.5, tan, 0, -0.2, -0.65));
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 6, 5), dark)).position.set(0, -0.1, -0.92);
    for (const s of [-1, 1]) {
      head.add(new THREE.Mesh(new THREE.SphereGeometry(0.24, 7, 6), fur)).position.set(s * 0.48, 0.52, 0.1);
      head.add(new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), dark)).position.set(s * 0.25, 0.15, -0.5);
    }
    body.add(head);
    this.group.add(body);
    for (const [lx, lz] of [[-0.65, -0.9], [0.65, -0.9], [-0.65, 0.9], [0.65, 0.9]]) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 1.0, lz);
      const leg = new THREE.Mesh(legGeoBear, fur);
      leg.position.y = -0.5;
      pivot.add(leg);
      this.group.add(pivot);
      this.legs.push(pivot);
    }
    this._shadow(1.8);
    this.barHeight = 3.4;
  }

  _shadow(r) {
    const s = new THREE.Mesh(shadowGeo, shadowMat);
    s.rotation.x = -Math.PI / 2;
    s.position.y = 0.04;
    s.scale.setScalar(r);
    this.group.add(s);
  }

  _buildHealthBar() {
    // Sprites face whichever camera is rendering — perfect for split-screen.
    const bar = new THREE.Group();
    const bg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x1a1020, depthTest: false }));
    bg.scale.set(1.8, 0.22, 1);
    const fg = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0xff5a5a, depthTest: false }));
    fg.scale.set(1.7, 0.14, 1);
    fg.center.set(0, 0.5);
    fg.position.x = -0.85;
    bar.add(bg, fg);
    bar.renderOrder = 10;
    bar.visible = false;
    this.bar = bar;
    this.barFg = fg;
    this.group.add(bar);
  }

  _refreshBar() {
    this.bar.visible = this.hp > 0 && this.hp < this.maxHp;
    this.barFg.scale.x = 1.7 * clamp(this.hp / this.maxHp, 0, 1);
  }
}
