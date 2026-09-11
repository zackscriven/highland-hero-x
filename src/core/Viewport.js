// One Viewport = one camera following one player, drawn into a rectangle of the canvas.
// Split-screen is just two Viewports with different rects.
import * as THREE from 'three';
import { CAMERA } from '../data/constants.js';
import { damp } from './math.js';

export class Viewport {
  constructor(rect = { x: 0, y: 0, w: 1, h: 1 }) {
    this.rect = rect;              // fractions of the canvas; y measured from the bottom (WebGL style)
    this.px = { x: 0, y: 0, w: 1, h: 1 };
    this.camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.5, 420);
    this.target = new THREE.Vector3();
    this.lookAt = new THREE.Vector3();
    this.shake = 0;

    // Current atmosphere (blended each frame toward the zone the player is in).
    this.atmo = {
      sky: new THREE.Color(0x93d4ff),
      fogNear: 80,
      fogFar: 210,
      ambient: new THREE.Color(0xfff4e0),
      ambientIntensity: 0.55,
    };
    this._atmoTarget = null;
    this._tmpColor = new THREE.Color();
  }

  setRect(rect) { this.rect = rect; }

  resize(canvasW, canvasH) {
    this.px = {
      x: Math.round(this.rect.x * canvasW),
      y: Math.round(this.rect.y * canvasH),
      w: Math.max(1, Math.round(this.rect.w * canvasW)),
      h: Math.max(1, Math.round(this.rect.h * canvasH)),
    };
    this.camera.aspect = this.px.w / this.px.h;
    this.camera.updateProjectionMatrix();
  }

  // Jump instantly (used at spawn / respawn so the camera doesn't fly across the map).
  snapTo(pos) {
    this.target.copy(pos);
    this._placeCamera();
  }

  setAtmosphere(atmo, instant = false) {
    this._atmoTarget = atmo;
    if (instant) {
      this.atmo.sky.setHex(atmo.sky);
      this.atmo.ambient.setHex(atmo.ambient);
      this.atmo.fogNear = atmo.fogNear;
      this.atmo.fogFar = atmo.fogFar;
      this.atmo.ambientIntensity = atmo.ambientIntensity;
    }
  }

  update(dt, pos, forward) {
    const ahead = CAMERA.lookAhead;
    const tx = pos.x + (forward?.x ?? 0) * ahead;
    const tz = pos.z + (forward?.z ?? 0) * ahead;
    this.target.x = damp(this.target.x, tx, CAMERA.followLambda, dt);
    this.target.z = damp(this.target.z, tz, CAMERA.followLambda, dt);
    this.target.y = damp(this.target.y, pos.y, CAMERA.followLambda, dt);
    this._placeCamera();

    if (this.shake > 0) {
      const s = this.shake;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }

    if (this._atmoTarget) {
      const a = this._atmoTarget;
      const t = 1 - Math.exp(-1.6 * dt);
      this.atmo.sky.lerp(this._tmpColor.setHex(a.sky), t);
      this.atmo.ambient.lerp(this._tmpColor.setHex(a.ambient), t);
      this.atmo.fogNear = damp(this.atmo.fogNear, a.fogNear, 1.6, dt);
      this.atmo.fogFar = damp(this.atmo.fogFar, a.fogFar, 1.6, dt);
      this.atmo.ambientIntensity = damp(this.atmo.ambientIntensity, a.ambientIntensity, 1.6, dt);
    }
  }

  // Slow cinematic orbit used behind the title screen.
  orbit(time, center, radius = 26) {
    const a = time * 0.12;
    this.camera.position.set(
      center.x + Math.sin(a) * radius,
      center.y + 16,
      center.z + Math.cos(a) * radius
    );
    this.camera.lookAt(center.x, center.y + 1, center.z);
  }

  lookFrom(x, y, z, tx, ty, tz) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(tx, ty, tz);
  }

  _placeCamera() {
    this.camera.position.copy(this.target).add(CAMERA.offset);
    this.lookAt.set(this.target.x, this.target.y + 1, this.target.z);
    this.camera.lookAt(this.lookAt);
  }
}
