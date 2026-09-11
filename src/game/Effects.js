// Short-lived visual effects. Each effect owns a mesh + a per-frame tick fn.
// Game.js calls effects.update(dt) through Abilities — no direct Game dependency.

import * as THREE from 'three';

export class Effects {
  constructor(scene) {
    this.scene  = scene;
    this.active = []; // { mesh, life, maxLife, tick(effect, dt) }
  }

  update(dt) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const e = this.active[i];
      e.life -= dt;
      if (e.life <= 0) {
        this.scene.remove(e.mesh);
        this.active.splice(i, 1);
      } else {
        e.tick(e, dt);
      }
    }
  }

  // Headbutt: bright yellow-orange flash sphere in front of the cow.
  spawnHeadbuttImpact(playerPos, forward) {
    const pos = playerPos.clone().addScaledVector(forward, 2.2);
    pos.y = 1.2;
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 7, 6),
      new THREE.MeshStandardMaterial({
        color: 0xffdd00, emissive: 0xffcc00, emissiveIntensity: 1.4,
        transparent: true, opacity: 0.9,
      })
    );
    mesh.position.copy(pos);
    this.scene.add(mesh);
    const maxLife = 0.22;
    this._push(mesh, maxLife, (e) => {
      const t = e.life / maxLife;
      e.mesh.material.opacity           = t * 0.9;
      e.mesh.material.emissiveIntensity  = t * 1.4;
      e.mesh.scale.setScalar(1 + (1 - t) * 1.4);
    });
  }

  // Stampede Charge: orange comet puffs behind the launch point.
  spawnChargeFlash(playerPos, dir) {
    for (let i = 0; i < 7; i++) {
      const pos = playerPos.clone().addScaledVector(dir, -i * 0.55);
      pos.y = 0.45 + i * 0.07;
      const r = 0.32 - i * 0.025;
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(Math.max(0.06, r), 5, 4),
        new THREE.MeshStandardMaterial({
          color: 0xff8800, emissive: 0xff5500, emissiveIntensity: 0.9,
          transparent: true, opacity: 0.75,
        })
      );
      mesh.position.copy(pos);
      this.scene.add(mesh);
      const maxLife = 0.38 + i * 0.05;
      this._push(mesh, maxLife, (e) => {
        const t = e.life / maxLife;
        e.mesh.material.opacity = t * 0.75;
        e.mesh.scale.setScalar(0.4 + (1 - t) * 1.8);
      });
    }
  }

  // Moo Blast: expanding flat ring that radiates outward.
  spawnMooBlast(playerPos) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.5, 0.28, 8, 22),
      new THREE.MeshStandardMaterial({
        color: 0x88ffff, emissive: 0x44bbbb, emissiveIntensity: 0.8,
        transparent: true, opacity: 0.85,
      })
    );
    mesh.rotation.x = Math.PI / 2;
    mesh.position.copy(playerPos);
    mesh.position.y = 0.5;
    this.scene.add(mesh);
    const maxLife = 0.6;
    const maxScale = 12; // ~6 unit radius at peak
    this._push(mesh, maxLife, (e) => {
      const t = 1 - e.life / maxLife;
      e.mesh.scale.setScalar(1 + t * (maxScale - 1));
      e.mesh.material.opacity = (1 - t) * 0.85;
    });
  }

  // Grass Power: circle of glowing green patches that fade out.
  spawnGrassPower(playerPos) {
    const group = new THREE.Group();
    group.position.copy(playerPos);

    const makeMat = () => new THREE.MeshStandardMaterial({
      color: 0x44ff88, emissive: 0x22cc66, emissiveIntensity: 0.7,
      transparent: true, opacity: 0.9,
    });

    // Center disc.
    const center = new THREE.Mesh(new THREE.CircleGeometry(1.2, 10), makeMat());
    center.rotation.x = -Math.PI / 2;
    center.position.y = 0.07;
    group.add(center);

    // Petal ring.
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const p = new THREE.Mesh(
        new THREE.CircleGeometry(0.45 + Math.random() * 0.25, 6),
        makeMat()
      );
      p.rotation.x = -Math.PI / 2;
      p.position.set(Math.cos(a) * 2.0, 0.06, Math.sin(a) * 2.0);
      group.add(p);
    }

    // Rising blade tips.
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.8 + Math.random() * 0.4, 0.06),
        makeMat()
      );
      blade.position.set(Math.cos(a) * 1.5, 0.4, Math.sin(a) * 1.5);
      group.add(blade);
    }

    this.scene.add(group);
    const maxLife = 2.0;
    this._push(group, maxLife, (e) => {
      const t = e.life / maxLife;
      for (const child of e.mesh.children) {
        if (child.material) {
          child.material.opacity           = t * 0.9;
          child.material.emissiveIntensity  = t * 0.7;
        }
      }
    });
  }

  _push(mesh, life, tick) {
    this.active.push({ mesh, life, maxLife: life, tick });
  }
}
