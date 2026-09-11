// The Highland cow model, built from boxes and spheres. One rig, recoloured per skin.
import * as THREE from 'three';

export const PART_KEYS = ['body', 'fringe', 'belly', 'horn', 'hornTip', 'snout', 'nose', 'hoof', 'eye', 'innerEar', 'tailTuft'];

export class CowMesh {
  constructor(colors, features = {}) {
    this.group = new THREE.Group();
    this.mats = {};
    for (const k of PART_KEYS) {
      this.mats[k] = new THREE.MeshLambertMaterial({ color: colors[k] ?? 0xff00ff });
    }
    this.mats.eye.emissive = new THREE.Color(0x000000);
    this.legs = [];
    this.features = { eyeScale: 1, ...features };
    this.nod = 0;        // extra head pitch (headbutt animation), set by AbilityController
    this.mooPulse = 0;   // head scale pulse for Moo Blast
    this._build();
  }

  applySkin(colors, features = {}) {
    for (const k of PART_KEYS) if (colors[k] !== undefined) this.mats[k].color.setHex(colors[k]);
    const es = features.eyeScale ?? 1;
    for (const e of this.eyes) e.scale.setScalar(es);
  }

  // Hit flash / heal glow: tint every material's emissive.
  setGlow(hex, intensity) {
    for (const k of PART_KEYS) {
      const m = this.mats[k];
      m.emissive.setHex(hex);
      m.emissiveIntensity = intensity;
    }
  }

  // moveBlend 0..1 (walking), sprintBlend 0..1, downed: lying on side
  animate(t, moveBlend, sprintBlend = 0) {
    const freq = 9 + sprintBlend * 5;
    const phase = t * freq;
    const swing = 0.55 + sprintBlend * 0.25;
    for (let i = 0; i < 4; i++) {
      const sign = i === 0 || i === 3 ? 1 : -1;
      this.legs[i].rotation.x = Math.sin(phase) * swing * moveBlend * sign;
    }
    const bob = Math.abs(Math.sin(phase)) * 0.1 * moveBlend;
    this.bodyGroup.position.y = bob;
    this.bodyGroup.rotation.z = Math.sin(phase) * 0.035 * moveBlend;
    const breathe = 1 + Math.sin(t * 2.2) * 0.012;
    this.bodyGroup.scale.set(1, breathe, 1);
    this.head.rotation.x = Math.sin(phase * 0.5) * 0.06 * moveBlend - 0.02 + this.nod;
    this.head.position.y = 1.22 + bob * 0.5;
    const ms = 1 + this.mooPulse * 0.35;
    this.head.scale.set(ms, ms, ms);
    this.tail.rotation.y = Math.sin(t * 3.1) * 0.35 + Math.sin(t * 7.3) * 0.08;
  }

  _mesh(geoOrDims, matKey, x = 0, y = 0, z = 0) {
    const geo = Array.isArray(geoOrDims) ? new THREE.BoxGeometry(...geoOrDims) : geoOrDims;
    const m = new THREE.Mesh(geo, this.mats[matKey]);
    m.position.set(x, y, z);
    return m;
  }

  _build() {
    const g = this.group;
    const M = this.mats;

    // Body (bobs while walking)
    const body = new THREE.Group();
    this.bodyGroup = body;
    g.add(body);
    body.add(this._mesh([1.7, 1.05, 2.5], 'body', 0, 0.95, 0));
    body.add(this._mesh([1.2, 0.22, 1.9], 'belly', 0, 0.44, 0));
    body.add(this._mesh([1.3, 0.5, 0.9], 'body', 0, 1.65, -0.55));
    body.add(this._mesh([1.5, 0.35, 2.0], 'fringe', 0, 1.6, 0.1));
    // Shaggy side fringe
    for (const side of [-1, 1]) {
      const shag = this._mesh([0.22, 0.5, 2.2], 'fringe', side * 0.82, 0.55, 0);
      body.add(shag);
    }

    // Tail
    const tail = new THREE.Group();
    tail.position.set(0, 1.1, 1.25);
    tail.add(this._mesh([0.14, 0.14, 0.55], 'body', 0, 0, 0.25));
    tail.add(this._mesh(new THREE.SphereGeometry(0.22, 6, 5), 'tailTuft', 0, -0.1, 0.55));
    body.add(tail);
    this.tail = tail;

    // Head (own pivot so it can nod / headbutt)
    const head = new THREE.Group();
    head.position.set(0, 1.22, -1.5);
    this.head = head;
    body.add(head);
    head.add(this._mesh([1.05, 1.0, 1.0], 'body', 0, 0, 0));
    head.add(this._mesh([0.72, 0.55, 0.45], 'snout', 0, -0.24, -0.57));
    for (const sx of [-0.16, 0.16]) head.add(this._mesh(new THREE.SphereGeometry(0.07, 5, 4), 'nose', sx, -0.25, -0.81));

    for (const side of [-1, 1]) {
      const ear = this._mesh([0.18, 0.45, 0.38], 'body', side * 0.6, 0.33, 0.02);
      ear.rotation.z = side * -0.35;
      const inner = this._mesh([0.08, 0.28, 0.22], 'innerEar', side * 0.63, 0.34, 0.03);
      inner.rotation.z = side * -0.35;
      head.add(ear, inner);
    }

    // Fringe over the eyes — the signature Highland look
    head.add(this._mesh([1.1, 0.42, 0.42], 'fringe', 0, 0.5, -0.42));
    const strands = [
      [-0.38, 0.38, -0.52, 0.2], [-0.15, 0.33, -0.58, 0.05], [0.05, 0.36, -0.55, -0.1],
      [0.25, 0.31, -0.57, 0.12], [0.42, 0.40, -0.50, -0.2],
      [-0.28, 0.56, -0.35, 0.1], [0.0, 0.60, -0.40, 0], [0.28, 0.55, -0.35, -0.1],
    ];
    for (const [x, y, z, ry] of strands) {
      const s = this._mesh([0.28, 0.36, 0.30], 'fringe', x, y, z);
      s.rotation.y = ry;
      head.add(s);
    }
    head.add(this._mesh([0.95, 0.32, 0.5], 'fringe', 0, 0.7, -0.1));

    this.eyes = [];
    for (const ex of [-0.22, 0.22]) {
      const eye = this._mesh(new THREE.SphereGeometry(0.085, 6, 5), 'eye', ex, 0.13, -0.51);
      eye.scale.setScalar(this.features.eyeScale);
      head.add(eye);
      this.eyes.push(eye);
    }

    for (const side of [-1, 1]) {
      const horn = this._mesh([0.16, 0.16, 0.7], 'horn', side * 0.58, 0.48, -0.02);
      horn.rotation.set(0.1, 0, side * -0.32);
      const tip = this._mesh([0.1, 0.1, 0.2], 'hornTip', side * 0.76, 0.54, -0.03);
      tip.rotation.set(0.1, 0, side * -0.32);
      head.add(horn, tip);
    }

    // Legs: pivot groups at the hips so they swing naturally
    const legGeo = new THREE.CylinderGeometry(0.17, 0.19, 0.72, 6);
    const hoofGeo = new THREE.CylinderGeometry(0.19, 0.2, 0.18, 6);
    for (const [lx, lz] of [[-0.6, -0.85], [0.6, -0.85], [-0.6, 0.85], [0.6, 0.85]]) {
      const pivot = new THREE.Group();
      pivot.position.set(lx, 0.85, lz);
      pivot.add(this._mesh(legGeo, 'body', 0, -0.42, 0));
      pivot.add(this._mesh(hoofGeo, 'hoof', 0, -0.78, 0));
      g.add(pivot);
      this.legs.push(pivot);
    }

    // Soft blob shadow — cheaper than shadow maps and works with split-screen.
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 18),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.04;
    shadow.scale.set(1, 1.35, 1);
    g.add(shadow);
    this.shadow = shadow;
  }
}
