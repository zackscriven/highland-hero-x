// All five player abilities: Headbutt, Stampede Charge, Horn Shield, Moo Blast, Grass Power.
// Step 7 enemies will call headbuttTest / chargeTest / mooTest for hit detection.

import * as THREE from 'three';
import { Effects } from './Effects.js';

const CD = { headbutt: 0.8, stampede: 2.5, shield: 6.0, moo: 4.0, grass: 12.0 };
const CHARGE_SPEED    = 22;
const CHARGE_DURATION = 0.55;
const SHIELD_DURATION = 3.5;
const HEADBUTT_RANGE  = 3.5;
const MOO_RANGE       = 5.5;

export class Abilities {
  constructor(scene, player, onFeedback) {
    this.scene      = scene;
    this.player     = player;
    this.onFeedback = onFeedback ?? (() => {});
    this.effects    = new Effects(scene);

    // Cooldown counters.
    this.cd = { headbutt: 0, stampede: 0, shield: 0, moo: 0, grass: 0 };

    // One-frame flags for enemy hit detection (Step 7).
    this.headbuttJustFired = false;
    this.mooJustFired      = false;

    // Charge state.
    this.chargeActive = false;
    this.chargeTimer  = 0;
    this.chargeDir    = new THREE.Vector3(0, 0, -1);

    // Moo blast active window (enemies can be pushed while > 0).
    this.mooTimer = 0;

    // Shield state.
    this.shieldActive = false;
    this.shieldTimer  = 0;

    // Shield visual — attached to player group so it follows automatically.
    this._shieldRing = this._makeShieldRing();
    this.player.group.add(this._shieldRing);
    this._shieldRing.visible = false;
  }

  // ── Queries ───────────────────────────────────────────────────

  get isCharging()   { return this.chargeActive; }
  get isShielded()   { return this.shieldActive; }

  // Multiply incoming damage by this when computing hits.
  get damageMultiplier() { return this.shieldActive ? 0.3 : 1.0; }

  // ── Hit-detection helpers called by Enemy in Step 7 ──────────

  // Returns headbutt damage if enemy at `pos` is hit this frame, else 0.
  headbuttTest(pos) {
    if (!this.headbuttJustFired) return 0;
    const fwd = this._forward();
    const toEnemy = new THREE.Vector3().subVectors(pos, this.player.position);
    if (toEnemy.length() > HEADBUTT_RANGE) return 0;
    if (toEnemy.normalize().dot(fwd) < 0.35) return 0; // ~70° cone in front
    return 10 + this.player.stats.strength * 5;
  }

  // Returns charge damage while actively dashing; 0 otherwise.
  chargeTest(pos) {
    if (!this.chargeActive) return 0;
    if (this.player.position.distanceTo(pos) > 2.2) return 0;
    return 20 + this.player.stats.strength * 8;
  }

  // Returns { damage, pushDir } for Moo Blast while ring is active; null otherwise.
  mooTest(pos) {
    if (this.mooTimer <= 0) return null;
    const dist = this.player.position.distanceTo(pos);
    if (dist > MOO_RANGE) return null;
    const pushDir = new THREE.Vector3().subVectors(pos, this.player.position).normalize();
    return { damage: 5, pushDir };
  }

  // ── Main update ───────────────────────────────────────────────

  update(dt, input) {
    // Clear one-frame flags from last tick.
    this.headbuttJustFired = false;
    this.mooJustFired      = false;

    // Cooldown ticks.
    for (const k of Object.keys(this.cd)) {
      this.cd[k] = Math.max(0, this.cd[k] - dt);
    }

    const unlocked  = this.player.stats.abilities;
    const spaceJust = input.isJustDown('Space');
    const shiftDown = input.isDown('ShiftLeft') || input.isDown('ShiftRight');

    // Headbutt: Space (without Shift)
    if (spaceJust && !shiftDown && unlocked.includes('headbutt') && this.cd.headbutt === 0)
      this._doHeadbutt();

    // Stampede: Shift + Space
    if (spaceJust && shiftDown && unlocked.includes('stampede') && this.cd.stampede === 0 && !this.chargeActive)
      this._doStampede();

    // Horn Shield: Q
    if (input.isJustDown('KeyQ') && unlocked.includes('shield') && this.cd.shield === 0)
      this._doShield();

    // Moo Blast: F
    if (input.isJustDown('KeyF') && unlocked.includes('moo') && this.cd.moo === 0)
      this._doMoo();

    // Grass Power: R
    if (input.isJustDown('KeyR') && unlocked.includes('grass') && this.cd.grass === 0)
      this._doGrass();

    this._tickCharge(dt);
    this._tickShield(dt);
    if (this.mooTimer > 0) this.mooTimer = Math.max(0, this.mooTimer - dt);
    this.effects.update(dt);
  }

  // ── Ability implementations ───────────────────────────────────

  _doHeadbutt() {
    this.cd.headbutt       = CD.headbutt;
    this.headbuttJustFired = true;
    this.effects.spawnHeadbuttImpact(this.player.position.clone(), this._forward());
    this.onFeedback('Headbutt!', '#ffdd44');
  }

  _doStampede() {
    if (this.player.stats.stamina < 30) {
      this.onFeedback('Not enough stamina!', '#ff8844');
      return;
    }
    this.player.stats.stamina -= 30;
    this.cd.stampede             = CD.stampede;
    this.chargeActive            = true;
    this.chargeTimer             = CHARGE_DURATION;
    this.chargeDir.copy(this._forward());
    this.player.movementLocked   = true;

    this.effects.spawnChargeFlash(this.player.position.clone(), this.chargeDir);
    this.onFeedback('Stampede!', '#ff8844');
  }

  _doShield() {
    if (this.player.stats.stamina < 20) {
      this.onFeedback('Not enough stamina!', '#ff8844');
      return;
    }
    this.player.stats.stamina -= 20;
    this.cd.shield              = CD.shield;
    this.shieldActive           = true;
    this.shieldTimer            = SHIELD_DURATION;
    this._shieldRing.visible    = true;
    this.onFeedback('Horn Shield!', '#88ccff');
  }

  _doMoo() {
    this.cd.moo       = CD.moo;
    this.mooJustFired = true;
    this.mooTimer     = 0.6; // enemy knockback window matches ring duration
    this.effects.spawnMooBlast(this.player.position.clone());
    this.onFeedback('MOO!', '#88ffff');
  }

  _doGrass() {
    this.cd.grass = CD.grass;
    this.player.heal(30);

    let msg = '+30 Health';
    if (this.player.poisoned) {
      const cut = Math.min(this.player.poisonTimer, 15);
      this.player.poisonTimer = Math.max(0, this.player.poisonTimer - 15);
      if (this.player.poisonTimer <= 0) this.player.poisoned = false;
      msg = `+30 Health · Poison -${Math.round(cut)}s`;
    }

    this.effects.spawnGrassPower(this.player.position.clone());
    this.onFeedback(msg, '#44ff88');
  }

  // ── Ticks ─────────────────────────────────────────────────────

  _tickCharge(dt) {
    if (!this.chargeActive) return;
    const p = this.player.position;
    p.x += this.chargeDir.x * CHARGE_SPEED * dt;
    p.z += this.chargeDir.z * CHARGE_SPEED * dt;
    this.chargeTimer -= dt;
    if (this.chargeTimer <= 0) {
      this.chargeActive          = false;
      this.player.movementLocked = false;
    }
  }

  _tickShield(dt) {
    if (!this.shieldActive) return;
    this.shieldTimer -= dt;
    // Pulse the ring opacity.
    this._shieldRing.material.opacity =
      0.22 + Math.abs(Math.sin(Date.now() * 0.006)) * 0.28;
    if (this.shieldTimer <= 0) {
      this.shieldActive       = false;
      this._shieldRing.visible = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  _forward() {
    return new THREE.Vector3(
      -Math.sin(this.player.facing),
      0,
      -Math.cos(this.player.facing)
    );
  }

  _makeShieldRing() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.35,
      emissive: 0x4488ff,
      emissiveIntensity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.12, 8, 24), mat);
    ring.rotation.x = Math.PI / 2;   // horizontal crown at horn level
    ring.position.set(0, 1.55, 0);
    return ring;
  }
}
