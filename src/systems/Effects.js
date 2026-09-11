// Juicy feedback: sparkle bursts (one pooled Points cloud) and expanding rings.
import * as THREE from 'three';

const MAX_PARTICLES = 600;
const MAX_RINGS = 10;

export class Effects {
  constructor(scene) {
    this.scene = scene;

    // ── Particles ──
    this.count = MAX_PARTICLES;
    this.positions = new Float32Array(this.count * 3).fill(-999);
    this.colors = new Float32Array(this.count * 3);
    this.vel = new Float32Array(this.count * 3);
    this.life = new Float32Array(this.count);
    this.maxLife = new Float32Array(this.count);
    this.gravity = new Float32Array(this.count);
    this.next = 0;

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.positions, 3);
    this.colAttr = new THREE.BufferAttribute(this.colors, 3);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.55, vertexColors: true, transparent: true, opacity: 0.95,
      depthWrite: false, sizeAttenuation: true,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);

    // ── Rings ──
    this.rings = [];
    const ringGeo = new THREE.TorusGeometry(1, 0.12, 6, 32);
    for (let i = 0; i < MAX_RINGS; i++) {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
      m.rotation.x = Math.PI / 2;
      m.visible = false;
      scene.add(m);
      this.rings.push({ mesh: m, t: 0, dur: 1, r: 1, active: false });
    }
    this._c = new THREE.Color();
  }

  burst(pos, hex, { count = 16, speed = 7, life = 0.8, up = 4, gravity = 10, spread = 1 } = {}) {
    this._c.setHex(hex);
    for (let i = 0; i < count; i++) {
      const idx = this.next;
      this.next = (this.next + 1) % this.count;
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.4 + Math.random() * 0.6);
      const j = idx * 3;
      this.positions[j] = pos.x + (Math.random() - 0.5) * spread;
      this.positions[j + 1] = (pos.y ?? 0) + 1 + Math.random() * 0.8;
      this.positions[j + 2] = pos.z + (Math.random() - 0.5) * spread;
      this.vel[j] = Math.cos(a) * s;
      this.vel[j + 1] = up * (0.5 + Math.random());
      this.vel[j + 2] = Math.sin(a) * s;
      this.colors[j] = this._c.r; this.colors[j + 1] = this._c.g; this.colors[j + 2] = this._c.b;
      this.life[idx] = this.maxLife[idx] = life * (0.6 + Math.random() * 0.6);
      this.gravity[idx] = gravity;
    }
    this.colAttr.needsUpdate = true;
  }

  // Low, slow dust — for charging and stomps.
  puff(pos, hex = 0xd9c7a3, count = 6) {
    this.burst(pos, hex, { count, speed: 2.5, life: 0.5, up: 1.2, gravity: 2, spread: 1.4 });
  }

  ring(pos, hex, { radius = 6, duration = 0.5, y = 0.4 } = {}) {
    const r = this.rings.find((x) => !x.active) ?? this.rings[0];
    r.active = true;
    r.t = 0;
    r.dur = duration;
    r.r = radius;
    r.mesh.visible = true;
    r.mesh.material.color.setHex(hex);
    r.mesh.position.set(pos.x, y, pos.z);
  }

  update(dt) {
    const p = this.positions, v = this.vel;
    for (let i = 0; i < this.count; i++) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const j = i * 3;
      if (this.life[i] <= 0) { p[j + 1] = -999; continue; }
      v[j + 1] -= this.gravity[i] * dt;
      p[j] += v[j] * dt;
      p[j + 1] += v[j + 1] * dt;
      p[j + 2] += v[j + 2] * dt;
      if (p[j + 1] < 0.1) { p[j + 1] = 0.1; v[j + 1] *= -0.3; v[j] *= 0.7; v[j + 2] *= 0.7; }
    }
    this.posAttr.needsUpdate = true;

    for (const r of this.rings) {
      if (!r.active) continue;
      r.t += dt;
      const k = Math.min(1, r.t / r.dur);
      const ease = 1 - Math.pow(1 - k, 2);
      r.mesh.scale.setScalar(0.3 + ease * r.r);
      r.mesh.material.opacity = (1 - k) * 0.9;
      if (k >= 1) { r.active = false; r.mesh.visible = false; }
    }
  }
}
