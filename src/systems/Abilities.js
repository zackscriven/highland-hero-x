// One AbilityController per player. Reads that player's InputMap, runs cooldowns,
// moves the cow during Stampede Charge, and applies hits to `ctx.targets`
// (enemies now, the boss later — anything with x/z/radius/dead/takeDamage).
import * as THREE from 'three';
import { ABILITIES, ABILITY_BY_ID } from '../data/abilities.js';
import { CHARMS } from '../data/charms.js';
import { dist2 } from '../core/math.js';

export const TUNE = {
  headbutt: { damage: 18, range: 2.4, reach: 2.0, knock: 7, anim: 0.28 },
  charge:   { speed: 27, duration: 0.55, damage: 32, pad: 0.7, knock: 15, stamina: 30 },
  shield:   { duration: 3.5, multiplier: 0.25 },
  moo:      { radius: 8.5, damage: 12, knock: 20, scare: 1.8 },
  grass:    { heal: 45, radius: 7 },
};

const ringGeo = new THREE.TorusGeometry(1.15, 0.09, 6, 28);

export class AbilityController {
  constructor(cow, { effects, hud, world }) {
    this.cow = cow;
    this.effects = effects;
    this.hud = hud;
    this.world = world;
    this.cd = Object.fromEntries(ABILITIES.map((a) => [a.id, 0]));
    this.charge = { active: false, timer: 0, dirX: 0, dirZ: -1, hits: new Set(), puffTimer: 0 };
    this.shield = { active: false, timer: 0 };
    this.headbuttTimer = 0;
    this.mooTimer = 0;
    this.lockedToastCd = 0;

    this.shieldRing = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
      color: 0xffe08a, transparent: true, opacity: 0.85, depthWrite: false,
    }));
    this.shieldRing.position.set(0, 1.9, -1.5);
    this.shieldRing.rotation.x = Math.PI / 2;
    this.shieldRing.visible = false;
    cow.group.add(this.shieldRing);
  }

  get damageMultiplier() { return this.shield.active ? TUNE.shield.multiplier : 1; }
  get isShielded() { return this.shield.active; }
  get isCharging() { return this.charge.active; }

  cancelAll() {
    if (this.charge.active) this._endCharge();
    this.shield.active = false;
    this.shieldRing.visible = false;
    this.hud.setSlotActive(this.cow.index, 'shield', false);
  }

  update(dt, ctx) {
    const cow = this.cow, input = cow.input;
    for (const id in this.cd) {
      if (this.cd[id] > 0) this.cd[id] = Math.max(0, this.cd[id] - dt);
      this.hud.setCooldown(cow.index, id, this.cd[id] / ABILITY_BY_ID[id].cooldown);
    }
    if (this.lockedToastCd > 0) this.lockedToastCd -= dt;

    if (cow.isDown) { this.cancelAll(); cow.mesh.nod = 0; return; }

    for (const a of ABILITIES) {
      if (!input.wasPressed(a.action)) continue;
      if (!cow.hasAbility(a.id)) { this._lockedHint(a); continue; }
      if (this.cd[a.id] > 0) continue;
      if (this.charge.active) continue;
      this[`_use_${a.id}`](ctx);
    }

    this._tickCharge(dt, ctx);
    this._tickShield(dt);

    // Head animation: nod for headbutt, big pulse for moo.
    if (this.headbuttTimer > 0) {
      this.headbuttTimer -= dt;
      const k = 1 - Math.max(0, this.headbuttTimer) / TUNE.headbutt.anim;
      cow.mesh.nod = -Math.sin(k * Math.PI) * 0.9;
    } else cow.mesh.nod = 0;
    if (this.mooTimer > 0) {
      this.mooTimer -= dt;
      cow.mesh.mooPulse = Math.max(0, this.mooTimer) * 2.5;
    } else cow.mesh.mooPulse = 0;
  }

  _lockedHint(a) {
    if (this.lockedToastCd > 0) return;
    this.lockedToastCd = 2.5;
    const charm = CHARMS.find((c) => c.rewards?.ability === a.id);
    this.hud.toast(this.cow.index, `🔒 ${a.name} — find the ${charm?.name ?? 'right Charm'}`, '#cfcfcf');
  }

  // ── Headbutt ──────────────────────────────────────────────────────────

  _use_headbutt(ctx) {
    const T = TUNE.headbutt, cow = this.cow;
    this.cd.headbutt = ABILITY_BY_ID.headbutt.cooldown;
    this.headbuttTimer = T.anim;
    const f = cow.forward();
    const hx = cow.x + f.x * T.reach, hz = cow.z + f.z * T.reach;
    this.effects.puff({ x: hx, z: hz }, 0xe9dcc0, 5);
    let hit = 0;
    for (const t of ctx.targets) {
      if (t.dead) continue;
      const r = T.range + t.radius;
      if (dist2(hx, hz, t.x, t.z) < r * r) {
        t.takeDamage(T.damage, { fromX: cow.x, fromZ: cow.z, knock: T.knock });
        this.effects.burst({ x: t.x, z: t.z }, 0xfff1a8, { count: 10, speed: 5, life: 0.45 });
        hit++;
      }
    }
    if (hit) ctx.shake(cow.index, 0.25);
  }

  // ── Stampede Charge ───────────────────────────────────────────────────

  _use_charge(ctx) {
    const T = TUNE.charge, cow = this.cow;
    if (cow.stats.stamina < T.stamina) { this.hud.toast(cow.index, 'Too tired to charge!', '#ffd166'); this.cd.charge = 0.4; return; }
    cow.stats.stamina -= T.stamina;
    this.cd.charge = ABILITY_BY_ID.charge.cooldown;
    const f = cow.forward();
    const mv = cow.input.moveVector();
    // Charge where you're pushing, or straight ahead if standing still.
    const dx = mv.moving ? mv.x : f.x, dz = mv.moving ? mv.z : f.z;
    this.charge.active = true;
    this.charge.timer = T.duration;
    this.charge.dirX = dx; this.charge.dirZ = dz;
    this.charge.hits.clear();
    cow.movementLocked = true;
    cow.facing = Math.atan2(-dx, -dz);
    cow.group.rotation.y = cow.facing;
    this.hud.setSlotActive(cow.index, 'charge', true);
    this.effects.ring(cow.position, 0xe9dcc0, { radius: 3, duration: 0.35 });
  }

  _tickCharge(dt, ctx) {
    const c = this.charge;
    if (!c.active) return;
    const T = TUNE.charge, cow = this.cow;
    c.timer -= dt;
    const p = cow.position;
    p.x += c.dirX * T.speed * dt;
    p.z += c.dirZ * T.speed * dt;
    this.world.resolve(p, cow.radius);
    c.puffTimer -= dt;
    if (c.puffTimer <= 0) { c.puffTimer = 0.05; this.effects.puff({ x: p.x - c.dirX, z: p.z - c.dirZ }, 0xd9c7a3, 3); }
    for (const t of ctx.targets) {
      if (t.dead || c.hits.has(t)) continue;
      const r = cow.radius + t.radius + T.pad;
      if (dist2(p.x, p.z, t.x, t.z) < r * r) {
        c.hits.add(t);
        t.takeDamage(T.damage, { fromX: p.x - c.dirX * 2, fromZ: p.z - c.dirZ * 2, knock: T.knock });
        this.effects.burst({ x: t.x, z: t.z }, 0xffb347, { count: 14, speed: 7, life: 0.6 });
        ctx.shake(cow.index, 0.5);
      }
    }
    if (c.timer <= 0) this._endCharge();
  }

  _endCharge() {
    this.charge.active = false;
    this.cow.movementLocked = false;
    this.cow.velocity.x += this.charge.dirX * 4;
    this.cow.velocity.z += this.charge.dirZ * 4;
    this.hud.setSlotActive(this.cow.index, 'charge', false);
  }

  // ── Horn Shield ───────────────────────────────────────────────────────

  _use_shield() {
    this.cd.shield = ABILITY_BY_ID.shield.cooldown;
    this.shield.active = true;
    this.shield.timer = TUNE.shield.duration;
    this.shieldRing.visible = true;
    this.hud.setSlotActive(this.cow.index, 'shield', true);
    this.effects.ring(this.cow.position, 0xffe08a, { radius: 2.5, duration: 0.4, y: 1.2 });
    this.cow.flash(0xffe08a, 0.5);
  }

  _tickShield(dt) {
    const s = this.shield;
    if (!s.active) return;
    s.timer -= dt;
    this.shieldRing.rotation.z += dt * 4;
    const pulse = 1 + Math.sin(s.timer * 12) * 0.08;
    this.shieldRing.scale.setScalar(pulse);
    this.shieldRing.material.opacity = s.timer < 0.8 ? 0.85 * (s.timer / 0.8) : 0.85;
    if (s.timer <= 0) {
      s.active = false;
      this.shieldRing.visible = false;
      this.hud.setSlotActive(this.cow.index, 'shield', false);
    }
  }

  // ── Moo Blast ─────────────────────────────────────────────────────────

  _use_moo(ctx) {
    const T = TUNE.moo, cow = this.cow;
    this.cd.moo = ABILITY_BY_ID.moo.cooldown;
    this.mooTimer = 0.4;
    this.effects.ring(cow.position, 0x8ff6ff, { radius: T.radius, duration: 0.55, y: 0.8 });
    this.effects.ring(cow.position, 0xffffff, { radius: T.radius * 0.6, duration: 0.4, y: 1.4 });
    this.effects.burst(cow.position, 0x8ff6ff, { count: 24, speed: 10, life: 0.7, up: 3 });
    ctx.shake(cow.index, 0.7);
    this.hud.toast(cow.index, 'MOOOOO!', '#8ff6ff');
    for (const t of ctx.targets) {
      if (t.dead) continue;
      const r = T.radius + t.radius;
      if (dist2(cow.x, cow.z, t.x, t.z) < r * r) {
        t.takeDamage(T.damage, { fromX: cow.x, fromZ: cow.z, knock: T.knock });
        t.scare?.(T.scare);
      }
    }
  }

  // ── Grass Power ───────────────────────────────────────────────────────

  _use_grass(ctx) {
    const T = TUNE.grass, cow = this.cow;
    this.cd.grass = ABILITY_BY_ID.grass.cooldown;
    this.effects.ring(cow.position, 0x8ad865, { radius: T.radius, duration: 0.8, y: 0.3 });
    this.effects.burst(cow.position, 0x8ad865, { count: 40, speed: 4, life: 1.3, up: 6, gravity: 3 });
    this.effects.burst(cow.position, 0xffffff, { count: 12, speed: 3, life: 1.0, up: 5, gravity: 3 });
    for (const pl of ctx.players) {
      const other = pl.cow;
      const r = T.radius + other.radius;
      if (dist2(cow.x, cow.z, other.x, other.z) > r * r) continue;
      if (other.isDown) {
        other.revive(0.6);
        this.hud.toast(other.index, `${cow.name} helped you up! 🌱`, '#8ad865');
        this.effects.burst(other.position, 0x8ad865, { count: 30, speed: 5, life: 1.2, up: 7 });
        ctx.onRevive?.(other, cow);
      } else {
        const healed = other.heal(T.heal);
        if (healed > 0) this.hud.toast(other.index, `+${Math.round(healed)} ❤️ Grass Power`, '#8ad865');
        other.speedMult = 1;
      }
    }
  }
}
