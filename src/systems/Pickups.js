// Healing berries: fixed bushes that regrow, plus drops from beaten enemies.
import * as THREE from 'three';
import { BERRY_SPOTS, BERRY_HEAL, BERRY_RESPAWN } from '../data/enemies.js';
import { dist2 } from '../core/math.js';
import { audio } from './Audio.js';

const berryGeo = new THREE.SphereGeometry(0.28, 7, 6);
const leafGeo = new THREE.ConeGeometry(0.5, 0.35, 5);
const berryMat = new THREE.MeshLambertMaterial({ color: 0xff3b5c, emissive: 0xff3b5c, emissiveIntensity: 0.25 });
const leafMat = new THREE.MeshLambertMaterial({ color: 0x4f9a3a });
const PICK_RADIUS = 1.9;

function makeBerry(x, z) {
  const g = new THREE.Group();
  const leaf = new THREE.Mesh(leafGeo, leafMat);
  leaf.position.y = 0.2;
  leaf.rotation.x = Math.PI;
  g.add(leaf);
  for (const [bx, by, bz] of [[0, 0.55, 0], [0.28, 0.42, 0.1], [-0.25, 0.45, -0.12], [0.05, 0.4, 0.3]]) {
    const b = new THREE.Mesh(berryGeo, berryMat);
    b.position.set(bx, by, bz);
    g.add(b);
  }
  g.position.set(x, 0, z);
  return g;
}

export class Pickups {
  constructor({ scene, world, effects, hud }) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.hud = hud;
    this.items = [];
    for (const s of BERRY_SPOTS) {
      const spot = world.findFreeSpot(s.x, s.z, 1.2);
      this.items.push(this._make(spot.x, spot.z, { fixed: true }));
    }
  }

  _make(x, z, { fixed = false } = {}) {
    const mesh = makeBerry(x, z);
    this.scene.add(mesh);
    return { mesh, x, z, fixed, taken: false, timer: 0, t: Math.random() * 6 };
  }

  drop(x, z) {
    const spot = this.world.findFreeSpot(x, z, 1.0);
    this.items.push(this._make(spot.x, spot.z));
  }

  update(dt, players) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      if (it.taken) {
        if (!it.fixed) { this.scene.remove(it.mesh); this.items.splice(i, 1); continue; }
        it.timer -= dt;
        if (it.timer <= 0) { it.taken = false; it.mesh.visible = true; it.mesh.scale.setScalar(0.01); }
        continue;
      }
      if (it.mesh.scale.x < 1) it.mesh.scale.setScalar(Math.min(1, it.mesh.scale.x + dt * 2));
      it.mesh.position.y = Math.sin(it.t * 2.5) * 0.08;
      it.mesh.rotation.y = it.t * 0.8;

      for (const pl of players) {
        const cow = pl.cow;
        if (cow.isDown || cow.stats.health >= cow.stats.healthMax) continue;
        const r = PICK_RADIUS + cow.radius * 0.5;
        if (dist2(cow.x, cow.z, it.x, it.z) < r * r) {
          const healed = cow.heal(BERRY_HEAL);
          this.hud.toast(cow.index, `+${Math.round(healed)} ❤️ Yum, berries!`, '#ff8fa3');
          this.effects.burst(it.mesh.position, 0xff3b5c, { count: 12, speed: 4, life: 0.6, up: 4 });
          audio.play('berry');
          it.taken = true;
          it.timer = BERRY_RESPAWN;
          it.mesh.visible = false;
          break;
        }
      }
    }
  }

  dispose() {
    for (const it of this.items) this.scene.remove(it.mesh);
    this.items = [];
  }
}
