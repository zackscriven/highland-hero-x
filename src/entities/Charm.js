// A Highland Charm: a floating, glowing gem with a light beam so it can be spotted from afar.
import * as THREE from 'three';

const gemGeo = new THREE.OctahedronGeometry(0.75, 0);
const coreGeo = new THREE.OctahedronGeometry(0.4, 0);
const ringGeo = new THREE.TorusGeometry(1.25, 0.08, 6, 24);
const beamGeo = new THREE.CylinderGeometry(0.35, 0.9, 14, 10, 1, true);
const padGeo = new THREE.CircleGeometry(1.6, 20);

export class Charm {
  constructor(scene, def, pos) {
    this.def = def;
    this.scene = scene;
    this.collected = false;
    this.locked = !!def.boss; // boss charm appears once the boss falls
    this.time = Math.random() * 10;

    const g = new THREE.Group();
    g.position.set(pos.x, 0, pos.z);
    this.group = g;

    const color = new THREE.Color(def.color);
    this.gem = new THREE.Mesh(gemGeo, new THREE.MeshLambertMaterial({
      color, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.92,
    }));
    this.gem.position.y = 2.2;
    this.core = new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.core.position.y = 2.2;
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 }));
    this.ring.position.y = 2.2;
    this.ring.rotation.x = Math.PI / 2;
    this.beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    }));
    this.beam.position.y = 7;
    const pad = new THREE.Mesh(padGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false }));
    pad.rotation.x = -Math.PI / 2;
    pad.position.y = 0.05;

    g.add(this.gem, this.core, this.ring, this.beam, pad);
    g.visible = !this.locked;
    scene.add(g);
  }

  get position() { return this.group.position; }

  reveal() {
    this.locked = false;
    this.group.visible = true;
    this.group.scale.setScalar(0.01);
  }

  update(dt) {
    if (this.collected || this.locked) return;
    this.time += dt;
    const t = this.time;
    const bob = Math.sin(t * 2.2) * 0.25;
    this.gem.position.y = this.core.position.y = 2.2 + bob;
    this.gem.rotation.y = t * 1.4;
    this.core.rotation.y = -t * 2.2;
    this.core.rotation.x = t * 1.1;
    this.ring.position.y = 2.2 + bob;
    this.ring.rotation.z = t * 0.8;
    this.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
    this.beam.material.opacity = 0.12 + (Math.sin(t * 1.7) + 1) * 0.05;
    if (this.group.scale.x < 1) this.group.scale.setScalar(Math.min(1, this.group.scale.x + dt * 1.5));
  }

  collect() {
    this.collected = true;
    this.group.visible = false;
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
