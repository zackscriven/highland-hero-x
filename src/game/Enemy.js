import * as THREE from 'three';

const WOLF_CFG = {
  maxHealth: 40, speed: 5.5, damage: 8, detectRange: 18,
  attackRange: 1.8, attackInterval: 0.5,
  bodyColor: 0x7a7a8e, accentColor: 0xb0b0c4, barColor: 0xff7733,
};

const BEAR_CFG = {
  maxHealth: 100, speed: 3.2, damage: 15, detectRange: 14,
  attackRange: 2.5, attackInterval: 0.7,
  bodyColor: 0x6b4a2b, accentColor: 0x9a7050, barColor: 0xff4422,
};

export const WOLF_SPAWNS = [
  [-30, -78], [25, -80], [-50, -82], [42, -84], [-12, -87], [55, -80],
];

export const BEAR_SPAWNS = [
  [-15, -83], [30, -87], [-45, -90],
];

export class Enemy {
  constructor(scene, type, x, z) {
    this.scene  = scene;
    this.type   = type;
    this.cfg    = type === 'wolf' ? WOLF_CFG : BEAR_CFG;
    this.health = this.cfg.maxHealth;
    this.alive  = true;
    this.readyToRemove = false;

    this._hurtTimer   = 0;
    this._dyingTimer  = -1;
    this._attackTimer = 0;
    this._chargeHit   = false;
    this._mooHit      = false;
    this._pushVel     = new THREE.Vector3();
    this._bodyMeshes  = [];
    this.facing       = Math.random() * Math.PI * 2;

    this.group = new THREE.Group();
    this._buildMesh();
    this._buildHealthBar();
    this.group.position.set(x, 0, z);
    scene.add(this.group);
  }

  get position() { return this.group.position; }
  get isDead()   { return !this.alive; }

  // Returns damage dealt to player this frame (0 = none).
  update(dt, playerPos) {
    if (this._dyingTimer >= 0) { this._tickDying(dt); return 0; }

    // Knockback decay
    if (this._pushVel.lengthSq() > 0.01) {
      this.group.position.x += this._pushVel.x * dt;
      this.group.position.z += this._pushVel.z * dt;
      this._pushVel.multiplyScalar(Math.max(0, 1 - dt * 9));
    }

    // Hurt flash — reset color after flash expires
    if (this._hurtTimer > 0) {
      this._hurtTimer = Math.max(0, this._hurtTimer - dt);
      const c = this._hurtTimer > 0 ? 0xff3333 : this.cfg.bodyColor;
      for (const m of this._bodyMeshes) m.material.color.setHex(c);
    }

    // Chase AI
    const dx   = playerPos.x - this.group.position.x;
    const dz   = playerPos.z - this.group.position.z;
    const dist = Math.hypot(dx, dz);

    if (dist < this.cfg.detectRange) {
      const target = Math.atan2(-dx, -dz);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, 7 * dt);
      this.group.rotation.y = this.facing;

      if (dist > this.cfg.attackRange) {
        this.group.position.x += (dx / dist) * this.cfg.speed * dt;
        this.group.position.z += (dz / dist) * this.cfg.speed * dt;
      }
    }

    // Melee damage tick
    if (dist <= this.cfg.attackRange) {
      this._attackTimer = Math.max(0, this._attackTimer - dt);
      if (this._attackTimer <= 0) {
        this._attackTimer = this.cfg.attackInterval;
        return this.cfg.damage;
      }
    }
    return 0;
  }

  // Returns actual damage dealt (after clamping to remaining health).
  takeDamage(amount) {
    if (this._dyingTimer >= 0 || amount <= 0) return 0;
    const actual = Math.min(this.health, amount);
    this.health -= actual;
    this._hurtTimer = 0.15;
    this._refreshBar();
    if (this.health <= 0) this._startDying();
    return actual;
  }

  applyKnockback(dir, force) {
    this._pushVel.addScaledVector(dir, force);
  }

  dispose() {
    this.scene.remove(this.group);
  }

  // ── Private ────────────────────────────────────────────────────

  _startDying() {
    this.alive             = false;
    this._dyingTimer       = 0.7;
    this._barGroup.visible = false;
  }

  _tickDying(dt) {
    this._dyingTimer -= dt;
    if (this._dyingTimer <= 0) {
      this.dispose();
      this.readyToRemove = true;
      return;
    }
    const t = this._dyingTimer / 0.7;
    this.group.rotation.z = (1 - t) * Math.PI / 2;
    this.group.position.y = -(1 - t) * 0.4;
    for (const m of this._bodyMeshes) {
      m.material.transparent = true;
      m.material.opacity = t;
    }
  }

  _refreshBar() {
    const pct = Math.max(0, this.health / this.cfg.maxHealth);
    const W   = 1.4;
    this._barFill.scale.x    = Math.max(0.001, pct);
    this._barFill.position.x = (W / 2) * (pct - 1);
  }

  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
      color,
      roughness:         opts.roughness         ?? 0.85,
      emissive:          opts.emissive          ?? 0x000000,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
  }

  // Create a mesh, push to bodyMeshes (for tinting), add to group.
  _mesh(geo, color, opts) {
    const m = new THREE.Mesh(geo, this._mat(color, opts));
    this._bodyMeshes.push(m);
    this.group.add(m);
    return m;
  }

  _buildMesh() {
    if (this.type === 'wolf') this._buildWolf();
    else                      this._buildBear();
  }

  _buildWolf() {
    const b = this.cfg.bodyColor, a = this.cfg.accentColor;

    const body = this._mesh(new THREE.BoxGeometry(1.1, 0.55, 1.75), b);
    body.position.set(0, 0.6, 0);

    const head = this._mesh(new THREE.BoxGeometry(0.72, 0.6, 0.65), b);
    head.position.set(0, 0.85, -1.05);

    // Snout (accent — not in bodyMeshes so it doesn't flash red on hurt)
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.3, 0.42), this._mat(a));
    snout.position.set(0, 0.72, -1.38);
    this.group.add(snout);

    for (const sx of [-1, 1]) {
      const ear = this._mesh(new THREE.BoxGeometry(0.14, 0.26, 0.1), b);
      ear.position.set(sx * 0.27, 1.19, -1.04);
      ear.rotation.z = sx * 0.25;

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 5, 4), this._mat(0x111111));
      eye.position.set(sx * 0.19, 0.94, -1.37);
      this.group.add(eye);
    }

    for (const [lx, lz] of [[-0.36,-0.55],[0.36,-0.55],[-0.36,0.55],[0.36,0.55]]) {
      const leg = this._mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 5), b);
      leg.position.set(lx, 0.27, lz);
    }

    const tail = this._mesh(new THREE.BoxGeometry(0.1, 0.1, 0.55), b);
    tail.position.set(0, 0.85, 0.98);
    tail.rotation.x = 0.5;
  }

  _buildBear() {
    const b = this.cfg.bodyColor, a = this.cfg.accentColor;

    const body = this._mesh(new THREE.BoxGeometry(1.65, 0.9, 2.1), b);
    body.position.set(0, 0.9, 0);

    const head = this._mesh(new THREE.BoxGeometry(1.05, 0.85, 0.9), b);
    head.position.set(0, 1.25, -1.3);

    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.42, 0.45), this._mat(a));
    snout.position.set(0, 1.05, -1.78);
    this.group.add(snout);

    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), this._mat(b));
      ear.position.set(sx * 0.44, 1.75, -1.25);
      ear.scale.y = 0.7;
      this._bodyMeshes.push(ear);
      this.group.add(ear);

      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.075, 5, 4), this._mat(0x111111));
      eye.position.set(sx * 0.27, 1.3, -1.75);
      this.group.add(eye);
    }

    for (const [lx, lz] of [[-0.55,-0.65],[0.55,-0.65],[-0.55,0.65],[0.55,0.65]]) {
      const leg = this._mesh(new THREE.CylinderGeometry(0.18, 0.21, 0.7, 6), b);
      leg.position.set(lx, 0.38, lz);
    }

    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.18, 5, 4), this._mat(a));
    tail.position.set(0, 1.0, 1.1);
    this.group.add(tail);
  }

  _buildHealthBar() {
    const W    = 1.4;
    const H    = 0.14;
    const yPos = this.type === 'bear' ? 2.65 : 2.1;

    const bg = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ color: 0x222222, depthTest: false })
    );
    bg.rotation.x = -Math.PI / 2;

    this._barFill = new THREE.Mesh(
      new THREE.PlaneGeometry(W, H),
      new THREE.MeshBasicMaterial({ color: this.cfg.barColor, depthTest: false })
    );
    this._barFill.rotation.x = -Math.PI / 2;
    this._barFill.position.y = 0.005; // above bg to avoid z-fighting

    this._barGroup = new THREE.Group();
    this._barGroup.add(bg, this._barFill);
    this._barGroup.position.y = yPos;
    this.group.add(this._barGroup);
  }
}
