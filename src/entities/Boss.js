// The Three-Headed Wolf. Sleeps in the Howling Ring until a cow walks in, then:
//   prowl (chase + bite) → pounce (telegraphed lunge, then a vulnerable recovery)
//   → howl (summons pups at 66% / 33% health) → enraged (< 33%: faster, meaner).
// Beaten, it shrinks into three little pups that scamper off — no gore, just a tumble.
import * as THREE from 'three';
import { NAMES } from '../data/constants.js';
import { damp, angleDamp, dist2, clamp } from '../core/math.js';

const CFG = {
  hpBase: 600, hpPerExtraPlayer: 320,
  radius: 3.2, speed: 6.6, enragedSpeed: 8.8,
  biteRange: 5.2, biteDamage: 22, biteWindup: 0.5, biteCooldown: 1.6,
  pounceEvery: 6.5, pounceEveryEnraged: 4.2, pounceTelegraph: 0.85, pounceSpeed: 30, pounceDuration: 0.5,
  pounceDamage: 28, pounceKnock: 15, recoverSeconds: 1.4, vulnerableMult: 1.6,
  howlAt: [0.66, 0.33], howlSeconds: 1.6, pups: 2,
  regenPerSecondWhenAlone: 0.04,
};

const EYE_COLORS = [0xffd23f, 0x66e0d8, 0xff7ad9];

export class Boss {
  constructor(scene, arena, { players = 1 } = {}) {
    this.scene = scene;
    this.arena = arena;
    this.radius = CFG.radius;
    this.maxHp = CFG.hpBase + CFG.hpPerExtraPlayer * (players - 1);
    this.hp = this.maxHp;
    this.dead = false;
    this.removeMe = false;
    this.state = 'dormant'; // dormant | waking | prowl | biteWindup | pounceTelegraph | pounce | recover | howl | dying
    this.stateTimer = 0;
    this.time = 0;
    this.facing = Math.PI; // faces south toward the gate
    this.target = null;
    this.biteCd = 0;
    this.pounceCd = CFG.pounceEvery * 0.6;
    this.pounceDir = { x: 0, z: 1 };
    this.howlsDone = 0;
    this.enraged = false;
    this.velocity = new THREE.Vector3();
    this.moveBlend = 0;
    this.flashTimer = 0;
    this.aloneTimer = 0;
    this.hitBy = new Set();
    this.onEvent = () => {};

    this.group = new THREE.Group();
    this.group.position.set(arena.x, 0, arena.z - 6);
    this.group.rotation.y = this.facing;
    this.mats = [];
    this.legs = [];
    this.heads = [];
    this._build();
    scene.add(this.group);
    this._setDormantPose(true);
  }

  get position() { return this.group.position; }
  get x() { return this.group.position.x; }
  get z() { return this.group.position.z; }
  get alive() { return !this.dead; }
  get hpFraction() { return clamp(this.hp / this.maxHp, 0, 1); }
  get vulnerable() { return this.state === 'recover'; }

  // ── Fight logic ───────────────────────────────────────────────────────

  wake() {
    if (this.state !== 'dormant') return;
    this.state = 'waking';
    this.stateTimer = 1.6;
    this.onEvent('wake');
  }

  update(dt, ctx) {
    this.time += dt;
    if (this.dead) { this._tickDying(dt); return; }
    const p = this.group.position;
    if (this.biteCd > 0) this.biteCd -= dt;
    if (this.flashTimer > 0) this.flashTimer -= dt;

    // Nearest cow that's up, and whether anyone is inside the ring.
    let best = null, bestD = Infinity, anyoneInside = false;
    for (const pl of ctx.players) {
      const inside = dist2(pl.cow.x, pl.cow.z, this.arena.x, this.arena.z) < (this.arena.r + 4) ** 2;
      if (inside && !pl.cow.isDown) anyoneInside = true;
      if (pl.cow.isDown) continue;
      const d = dist2(p.x, p.z, pl.cow.x, pl.cow.z);
      if (d < bestD) { bestD = d; best = pl; }
    }
    const dist = Math.sqrt(bestD);

    if (this.state === 'dormant') {
      // Wake when a cow steps into the ring.
      for (const pl of ctx.players) {
        if (!pl.cow.isDown && dist2(pl.cow.x, pl.cow.z, this.arena.x, this.arena.z) < (this.arena.r - 2) ** 2) { this.wake(); break; }
      }
      this._pushCows(ctx);
      this._animate(dt, 0);
      return;
    }

    // Catch its breath if everyone runs away.
    if (!anyoneInside) { this.aloneTimer += dt; if (this.aloneTimer > 4) this.hp = Math.min(this.maxHp, this.hp + this.maxHp * CFG.regenPerSecondWhenAlone * dt); }
    else this.aloneTimer = 0;

    let moveX = 0, moveZ = 0, speed = this.enraged ? CFG.enragedSpeed : CFG.speed;

    switch (this.state) {
      case 'waking':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) { this.state = 'prowl'; this.onEvent('fightStart'); }
        break;

      case 'prowl': {
        this.pounceCd -= dt;
        if (!best) break;
        this.target = best;
        moveX = best.cow.x - p.x; moveZ = best.cow.z - p.z;
        if (dist < CFG.biteRange && this.biteCd <= 0) { this.state = 'biteWindup'; this.stateTimer = CFG.biteWindup; }
        else if (this.pounceCd <= 0 && dist > 6 && dist < 30) { this.state = 'pounceTelegraph'; this.stateTimer = CFG.pounceTelegraph; this.onEvent('telegraph'); }
        break;
      }

      case 'biteWindup':
        this.stateTimer -= dt;
        if (best) this._face(best.cow.x - p.x, best.cow.z - p.z, dt, 12);
        if (this.stateTimer <= 0) {
          this.state = 'prowl';
          this.biteCd = CFG.biteCooldown;
          if (best && dist < CFG.biteRange * 1.25) this._hitPlayer(best, CFG.biteDamage, 8, ctx);
          const f = this._fwd();
          this.velocity.x += f.x * 7; this.velocity.z += f.z * 7;
          ctx.effects.puff({ x: p.x + f.x * 3, z: p.z + f.z * 3 }, 0xbfb3d8, 8);
        }
        break;

      case 'pounceTelegraph': {
        this.stateTimer -= dt;
        if (best) { this._face(best.cow.x - p.x, best.cow.z - p.z, dt, 8); }
        if (this.stateTimer <= 0 && best) {
          const dx = best.cow.x - p.x, dz = best.cow.z - p.z, l = Math.hypot(dx, dz) || 1;
          this.pounceDir = { x: dx / l, z: dz / l };
          this.state = 'pounce';
          this.stateTimer = CFG.pounceDuration;
          this.pounceHits = new Set();
          this.onEvent('pounce');
        } else if (this.stateTimer <= 0) this.state = 'prowl';
        break;
      }

      case 'pounce': {
        this.stateTimer -= dt;
        p.x += this.pounceDir.x * CFG.pounceSpeed * dt;
        p.z += this.pounceDir.z * CFG.pounceSpeed * dt;
        if (Math.random() < dt * 30) ctx.effects.puff({ x: p.x - this.pounceDir.x * 3, z: p.z - this.pounceDir.z * 3 }, 0xbfb3d8, 3);
        for (const pl of ctx.players) {
          if (pl.cow.isDown || this.pounceHits.has(pl)) continue;
          const r = this.radius + pl.cow.radius;
          if (dist2(p.x, p.z, pl.cow.x, pl.cow.z) < r * r) { this.pounceHits.add(pl); this._hitPlayer(pl, CFG.pounceDamage, CFG.pounceKnock, ctx); }
        }
        if (this.stateTimer <= 0) { this.state = 'recover'; this.stateTimer = CFG.recoverSeconds; this.pounceCd = this.enraged ? CFG.pounceEveryEnraged : CFG.pounceEvery; this.onEvent('recover'); }
        break;
      }

      case 'recover':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = 'prowl';
        break;

      case 'howl':
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) this.state = 'prowl';
        break;
    }

    // Movement + keep it inside the ring.
    const len = Math.hypot(moveX, moveZ);
    if (len > 0.01 && this.state === 'prowl') {
      moveX /= len; moveZ /= len;
      p.x += moveX * speed * dt; p.z += moveZ * speed * dt;
      this._face(moveX, moveZ, dt, 6);
      this.moveBlend = damp(this.moveBlend, 1, 8, dt);
    } else this.moveBlend = damp(this.moveBlend, 0, 8, dt);

    p.x += this.velocity.x * dt; p.z += this.velocity.z * dt;
    this.velocity.multiplyScalar(Math.exp(-6 * dt));

    const dxA = p.x - this.arena.x, dzA = p.z - this.arena.z, dA = Math.hypot(dxA, dzA), maxR = this.arena.r - 5;
    if (dA > maxR) { p.x = this.arena.x + (dxA / dA) * maxR; p.z = this.arena.z + (dzA / dA) * maxR; }

    this._pushCows(ctx);
    this._animate(dt, speed);
  }

  // Push cows out of the boss's body so nobody clips through it.
  _pushCows(ctx) {
    const p = this.group.position;
    for (const pl of ctx.players) {
      const c = pl.cow, r = this.radius + c.radius, d2 = dist2(p.x, p.z, c.x, c.z);
      if (d2 < r * r && d2 > 0.0001) { const d = Math.sqrt(d2), push = (r - d); c.position.x += ((c.x - p.x) / d) * push; c.position.z += ((c.z - p.z) / d) * push; }
    }
  }

  _hitPlayer(pl, damage, knock, ctx) {
    const mult = pl.abilities?.damageMultiplier ?? 1;
    const dealt = pl.cow.takeDamage(damage * mult, { source: this });
    const kx = pl.cow.x - this.x, kz = pl.cow.z - this.z;
    if (dealt > 0) {
      pl.cow.knockback(kx, kz, knock);
      ctx.effects.burst(pl.cow.position, 0xff7a7a, { count: 12, speed: 5, life: 0.5 });
      ctx.onPlayerHit?.(pl, dealt, this);
    } else if (pl.abilities?.isShielded) {
      pl.cow.knockback(kx, kz, knock * 0.5);
      ctx.effects.burst(pl.cow.position, 0xfff1a8, { count: 12, speed: 5, life: 0.4 });
      ctx.hud.toast(pl.cow.index, 'Horn Shield held! 🛡️', '#ffe08a');
    }
  }

  takeDamage(amount, { fromX, fromZ, knock = 0 } = {}) {
    if (this.dead || this.state === 'dormant' || this.state === 'waking') return 0;
    if (this.vulnerable) amount *= CFG.vulnerableMult;
    this.hp -= amount;
    this.flashTimer = 0.25;
    if (fromX !== undefined && knock > 0) {
      const dx = this.x - fromX, dz = this.z - fromZ, l = Math.hypot(dx, dz) || 1;
      this.velocity.x += (dx / l) * knock * 0.15; this.velocity.z += (dz / l) * knock * 0.15;
    }
    const frac = this.hpFraction;
    if (this.howlsDone < CFG.howlAt.length && frac <= CFG.howlAt[this.howlsDone] && this.state !== 'pounce') {
      this.howlsDone++;
      this.state = 'howl';
      this.stateTimer = CFG.howlSeconds;
      this.onEvent('howl', { pups: CFG.pups });
    }
    if (!this.enraged && frac <= CFG.howlAt[1]) { this.enraged = true; this.onEvent('enraged'); }
    if (this.hp <= 0) this._die();
    return amount;
  }

  scare() { /* the big wolf does not scare */ }

  _die() {
    this.dead = true;
    this.state = 'dying';
    this.dying = 0;
    this.onEvent('defeated');
  }

  _tickDying(dt) {
    this.dying += dt;
    this.group.rotation.z = damp(this.group.rotation.z, Math.PI / 2, 5, dt);
    const s = Math.max(0.01, 1 - Math.max(0, this.dying - 1.0) * 1.4);
    this.group.scale.setScalar(s);
    for (const m of this.mats) { m.emissive.setHex(0xffffff); m.emissiveIntensity = Math.min(1, this.dying * 0.6); }
    if (this.dying > 1.9) { this.removeMe = true; this.group.visible = false; }
  }

  dispose() { this.scene.remove(this.group); }

  // ── Visuals ───────────────────────────────────────────────────────────

  _fwd() { return { x: -Math.sin(this.facing), z: -Math.cos(this.facing) }; }

  _face(dx, dz, dt, lambda) {
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    this.facing = angleDamp(this.facing, Math.atan2(-dx, -dz), lambda, dt);
    this.group.rotation.y = this.facing;
  }

  _setDormantPose(on) {
    this.body.scale.y = on ? 0.62 : 1;
    for (const h of this.heads) { h.eyes.forEach((e) => e.scale.set(1, on ? 0.15 : 1, 1)); }
  }

  _animate(dt, speed) {
    const t = this.time, st = this.state;
    const dormant = st === 'dormant';
    const waking = st === 'waking';
    const legFreq = 7 + (this.enraged ? 2 : 0);
    for (let i = 0; i < 4; i++) {
      const sign = i === 0 || i === 3 ? 1 : -1;
      this.legs[i].rotation.x = Math.sin(t * legFreq) * 0.5 * this.moveBlend * sign;
    }
    let bodyY = dormant ? 0.62 : st === 'pounceTelegraph' ? 0.75 : 1;
    if (waking) bodyY = 0.62 + (1 - Math.max(0, this.stateTimer) / 1.6) * 0.38;
    this.body.scale.y = damp(this.body.scale.y, bodyY, 6, dt);
    this.body.scale.z = damp(this.body.scale.z, st === 'pounce' ? 1.25 : 1, 10, dt);
    this.body.position.y = Math.abs(Math.sin(t * legFreq)) * 0.15 * this.moveBlend + (dormant ? 0 : Math.sin(t * 1.5) * 0.05);

    this.heads.forEach((h, i) => {
      const phase = t * 2 + i * 1.7;
      let pitch = Math.sin(phase) * 0.08;
      let yaw = h.baseYaw + Math.sin(phase * 0.7) * 0.12;
      if (st === 'howl') pitch = -0.9;
      else if (st === 'biteWindup') pitch = -0.4;
      else if (st === 'pounceTelegraph') pitch = 0.35;
      else if (st === 'recover') { pitch = 0.5; yaw = h.baseYaw + Math.sin(t * 9 + i) * 0.25; }
      h.group.rotation.x = damp(h.group.rotation.x, pitch, 8, dt);
      h.group.rotation.y = damp(h.group.rotation.y, yaw, 8, dt);
      const eyeOpen = dormant ? 0.15 : waking ? 0.15 + (1 - Math.max(0, this.stateTimer) / 1.6) * 0.85 : 1;
      h.eyes.forEach((e) => { e.scale.y = damp(e.scale.y, eyeOpen, 8, dt); e.material.emissive.setHex(this.enraged ? 0xff4d4d : h.eyeColor); });
    });
    this.tail.rotation.y = Math.sin(t * 4) * 0.4;

    const flash = this.flashTimer > 0 ? Math.max(0, this.flashTimer) * 3 : 0;
    const telegraph = st === 'pounceTelegraph' ? (Math.sin(t * 24) + 1) * 0.25 : 0;
    const vuln = st === 'recover' ? 0.25 : 0;
    for (const m of this.mats) {
      m.emissive.setHex(flash ? 0xff5555 : telegraph ? 0xffe08a : vuln ? 0x66e0d8 : 0x000000);
      m.emissiveIntensity = flash || telegraph || vuln;
    }
  }

  _mat(hex) { const m = new THREE.MeshLambertMaterial({ color: hex }); this.mats.push(m); return m; }
  _box(w, h, d, mat, x, y, z) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); return m; }

  _build() {
    const fur = this._mat(0x5a5470), dark = this._mat(0x35304a), light = this._mat(0x9a93b8), pink = this._mat(0xf2a7b5), nose = this._mat(0x1a1622);
    const body = new THREE.Group();
    this.body = body;
    body.add(this._box(3.0, 2.2, 4.4, fur, 0, 2.2, 0.2));
    body.add(this._box(2.2, 0.6, 3.4, light, 0, 1.2, 0.3));
    // Spiky mane along the spine
    const spike = new THREE.ConeGeometry(0.35, 1.1, 4);
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Mesh(spike, dark);
      s.position.set(((i % 2) - 0.5) * 0.9, 3.35, -1.2 + i * 0.6);
      s.rotation.x = -0.3;
      body.add(s);
    }
    // Three heads on necks, fanned out
    const headDefs = [
      { x: -1.55, y: 3.1, z: -2.6, yaw: 0.55 },
      { x: 0, y: 3.45, z: -2.9, yaw: 0 },
      { x: 1.55, y: 3.1, z: -2.6, yaw: -0.55 },
    ];
    headDefs.forEach((d, i) => {
      const neck = this._box(0.9, 0.9, 1.6, fur, d.x * 0.6, d.y - 0.5, d.z + 1.1);
      neck.rotation.y = d.yaw;
      body.add(neck);
      const g = new THREE.Group();
      g.position.set(d.x, d.y, d.z);
      g.rotation.y = d.yaw;
      g.add(this._box(1.25, 1.1, 1.2, fur, 0, 0, 0));
      g.add(this._box(0.65, 0.5, 0.7, light, 0, -0.2, -0.85));
      const n = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), nose); n.position.set(0, -0.08, -1.22); g.add(n);
      for (const s of [-1, 1]) {
        g.add(this._box(0.3, 0.6, 0.2, fur, s * 0.42, 0.75, 0.05));
        g.add(this._box(0.15, 0.34, 0.1, pink, s * 0.42, 0.75, -0.02));
      }
      const eyes = [];
      const eyeMat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: EYE_COLORS[i], emissiveIntensity: 1 });
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), eyeMat);
        e.position.set(s * 0.33, 0.18, -0.6);
        g.add(e);
        eyes.push(e);
      }
      body.add(g);
      this.heads.push({ group: g, eyes, baseYaw: d.yaw, eyeColor: EYE_COLORS[i] });
    });
    const tail = this._box(0.4, 0.4, 2.2, fur, 0, 2.6, 2.9);
    tail.rotation.x = -0.5;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.5, 7, 6), dark); tuft.position.set(0, 0.2, 1.2); tail.add(tuft);
    this.tail = tail;
    body.add(tail);
    this.group.add(body);

    const legGeo = new THREE.CylinderGeometry(0.42, 0.46, 1.9, 6);
    for (const [lx, lz] of [[-1.15, -1.5], [1.15, -1.5], [-1.15, 1.6], [1.15, 1.6]]) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 1.9, lz);
      const leg = new THREE.Mesh(legGeo, fur);
      leg.position.y = -0.95;
      pivot.add(leg);
      this.group.add(pivot);
      this.legs.push(pivot);
    }
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.6, 20), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.04; shadow.scale.set(1, 1.3, 1);
    this.group.add(shadow);
  }
}
