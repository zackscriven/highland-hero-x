import * as THREE from 'three';
import { COLORS } from './Constants.js';
import { Input } from './Input.js';
import { World, getZoneKey, ZONE_ATMOSPHERE } from './World.js';
import { Player } from './Player.js';
import { Interactables } from './Interactables.js';
import { Abilities } from './Abilities.js';
import { UI } from './UI.js';
import { Enemy, WOLF_SPAWNS, BEAR_SPAWNS } from './Enemy.js';

const CAMERA_OFFSET = new THREE.Vector3(0, 22, 22);
const BOUNDS = { xMin: -95, xMax: 95, zMin: -99, zMax: 97 };

export class Game {
  constructor(parent) {
    this.parent = parent;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(COLORS.sky);
    this.scene.fog = new THREE.Fog(COLORS.sky, 70, 150);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    parent.appendChild(this.renderer.domElement);

    const aspect = window.innerWidth / window.innerHeight;
    this.camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 500);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.60);
    this.sunLight     = new THREE.DirectionalLight(0xfff1c4, 0.9);
    this.sunLight.position.set(20, 40, 20);
    this.scene.add(this.ambientLight, this.sunLight);

    this.input         = new Input();
    this.world         = new World(this.scene);
    this.player        = new Player(this.scene);
    this.interactables = new Interactables(this.world);
    this.ui            = new UI(parent);
    this.abilities     = new Abilities(
      this.scene,
      this.player,
      (msg, color) => this.ui.showFeedback(msg, color)
    );

    // Enemies
    this.enemies = [
      ...WOLF_SPAWNS.map(([x, z]) => new Enemy(this.scene, 'wolf', x, z)),
      ...BEAR_SPAWNS.map(([x, z]) => new Enemy(this.scene, 'bear', x, z)),
    ];
    this._prevChargeActive = false;
    this._prevMooActive    = false;

    // Zone atmosphere tracking.
    this.currentZoneKey = getZoneKey(this.player.position.z);
    const initAtmo = ZONE_ATMOSPHERE[this.currentZoneKey];
    this._targetSky     = new THREE.Color(initAtmo.sky);
    this._targetFogNear = initAtmo.fogNear;
    this._targetFogFar  = initAtmo.fogFar;
    this._targetAmb     = new THREE.Color(initAtmo.ambColor);
    this._targetAmbInt  = initAtmo.ambInt;

    window.addEventListener('resize', () => this._onResize());
    this._onResize();

    this.clock = new THREE.Clock();
    this._tick = this._tick.bind(this);
  }

  start() { requestAnimationFrame(this._tick); }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  _enforceBounds() {
    const p = this.player.position;
    p.x = Math.max(BOUNDS.xMin, Math.min(BOUNDS.xMax, p.x));
    p.z = Math.max(BOUNDS.zMin, Math.min(BOUNDS.zMax, p.z));
  }

  _updateZone() {
    const key = getZoneKey(this.player.position.z);
    if (key !== this.currentZoneKey) {
      this.currentZoneKey = key;
      const atmo = ZONE_ATMOSPHERE[key];
      this._targetSky     = new THREE.Color(atmo.sky);
      this._targetFogNear = atmo.fogNear;
      this._targetFogFar  = atmo.fogFar;
      this._targetAmb     = new THREE.Color(atmo.ambColor);
      this._targetAmbInt  = atmo.ambInt;
      this.ui.setZone(this._zoneName(key));
    }
    const t = 0.03;
    this.scene.fog.color.lerp(this._targetSky, t);
    this.scene.background.lerp(this._targetSky, t);
    this.scene.fog.near += (this._targetFogNear - this.scene.fog.near) * t;
    this.scene.fog.far  += (this._targetFogFar  - this.scene.fog.far)  * t;
    this.ambientLight.color.lerp(this._targetAmb, t);
    this.ambientLight.intensity += (this._targetAmbInt - this.ambientLight.intensity) * t;
  }

  _zoneName(key) {
    return { meadow: 'Safe Meadow', grove: 'Training Grove', hollow: 'Wolf Hollow', arena: 'Three-Headed Wolf Arena' }[key] ?? key;
  }

  _updateCamera(dt) {
    const target = this.player.position;
    const t = Math.min(1, dt * 8);
    this.camera.position.x += (target.x + CAMERA_OFFSET.x - this.camera.position.x) * t;
    this.camera.position.y += (target.y + CAMERA_OFFSET.y - this.camera.position.y) * t;
    this.camera.position.z += (target.z + CAMERA_OFFSET.z - this.camera.position.z) * t;
    this.camera.lookAt(target.x, target.y + 1, target.z);
  }

  _tick() {
    try {
      const dt = Math.min(this.clock.getDelta(), 0.05);
      this.player.update(dt, this.input);
      this.abilities.update(dt, this.input);
      this._enforceBounds();
      this._updateEnemies(dt);
      this.interactables.update(dt, this.player, this.input, this.ui);
      this._updateZone();
      this._updateCamera(dt);
      this.ui.update(this.player);
      this.ui.updateAbilityCooldowns(this.abilities);
      this.input.tick();
      this.renderer.render(this.scene, this.camera);
      requestAnimationFrame(this._tick);
    } catch (err) {
      throw err;
    }
  }

  _updateEnemies(dt) {
    // Track when a new charge or moo starts so we reset per-enemy hit flags.
    const chargeOn = this.abilities.isCharging;
    const mooOn    = this.abilities.mooTimer > 0;
    if (!this._prevChargeActive && chargeOn) {
      for (const e of this.enemies) e._chargeHit = false;
    }
    if (!this._prevMooActive && mooOn) {
      for (const e of this.enemies) e._mooHit = false;
    }
    this._prevChargeActive = chargeOn;
    this._prevMooActive    = mooOn;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];

      if (e.readyToRemove) {
        this.enemies.splice(i, 1);
        continue;
      }

      // Player → enemy: ability hit detection
      if (!e.isDead) {
        const hbDmg = this.abilities.headbuttTest(e.position);
        if (hbDmg > 0) {
          const actual = e.takeDamage(hbDmg);
          if (actual > 0)
            this.ui.spawnFloatingText(e.position, this.camera, `-${Math.round(actual)}`, '#ffdd44');
        }

        if (!e._chargeHit) {
          const chDmg = this.abilities.chargeTest(e.position);
          if (chDmg > 0) {
            e._chargeHit = true;
            const actual = e.takeDamage(chDmg);
            if (actual > 0)
              this.ui.spawnFloatingText(e.position, this.camera, `-${Math.round(actual)}`, '#ff8844');
          }
        }

        if (!e._mooHit) {
          const moo = this.abilities.mooTest(e.position);
          if (moo) {
            e._mooHit = true;
            const actual = e.takeDamage(moo.damage);
            if (actual > 0) {
              e.applyKnockback(moo.pushDir, 12);
              this.ui.spawnFloatingText(e.position, this.camera, `-${Math.round(actual)}`, '#88ffff');
            }
          }
        }
      }

      // Enemy → player: melee damage
      const dmgToPlayer = e.update(dt, this.player.position);
      if (dmgToPlayer > 0) {
        const reduced = dmgToPlayer * this.abilities.damageMultiplier;
        this.player.takeDamage(reduced);
        this.ui.spawnFloatingText(this.player.position, this.camera, `-${Math.round(reduced)}`, '#ff5555');
      }
    }
  }
}
