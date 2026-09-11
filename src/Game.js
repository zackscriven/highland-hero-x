// Orchestrates everything: engine, world, players, viewports, HUD, menus, and the game state machine.
import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Keyboard } from './core/Keyboard.js';
import { InputMap, SOLO_BINDINGS, P1_BINDINGS, P2_BINDINGS } from './core/InputMap.js';
import { Viewport } from './core/Viewport.js';
import { World } from './world/World.js';
import { Cow } from './entities/Cow.js';
import { Hud } from './ui/Hud.js';
import { Menus } from './ui/Menus.js';
import { getSkin } from './data/skins.js';
import { ZONES } from './data/zones.js';

export class Game {
  constructor(appEl) {
    this.appEl = appEl;
    this.canvas = appEl.querySelector('#game-canvas');
    this.engine = new Engine(this.canvas);
    this.keyboard = new Keyboard();
    this.world = new World(this.engine.scene);
    this.hud = new Hud(appEl.querySelector('#hud-root'));
    this.menus = new Menus(appEl.querySelector('#menu-root'), {
      onPlay: () => this.startRun({ players: [{ skinId: 'classic', name: 'Player 1' }] }),
      onResume: () => this.resume(),
      onQuit: () => this.quitToTitle(),
    });

    this.cows = [];
    this.viewports = [];
    this.state = 'title';
    this.time = 0;
    this.clock = new THREE.Clock();

    // Title screen shows the meadow with a slow camera orbit.
    this.titleViewport = new Viewport();
    this.titleViewport.setAtmosphere(ZONES.meadow.atmo, true);
    this.engine.setViewports([this.titleViewport]);

    this._tick = this._tick.bind(this);
  }

  start() {
    this.menus.showTitle();
    requestAnimationFrame(this._tick);
  }

  // ── Run lifecycle ─────────────────────────────────────────────────────

  startRun({ players }) {
    for (const c of this.cows) c.dispose();
    this.cows = [];
    this.viewports = [];

    const two = players.length === 2;
    players.forEach((p, i) => {
      const bindings = two ? (i === 0 ? P1_BINDINGS : P2_BINDINGS) : SOLO_BINDINGS;
      const cow = new Cow({
        scene: this.engine.scene,
        skin: getSkin(p.skinId),
        input: new InputMap(this.keyboard, bindings),
        index: i,
        name: p.name ?? `Player ${i + 1}`,
      });
      const s = this.world.spawn;
      cow.placeAt(s.x + (two ? (i === 0 ? -2.5 : 2.5) : 0), s.z, 0);
      this.cows.push(cow);

      const vp = new Viewport(two ? { x: i * 0.5, y: 0, w: 0.5, h: 1 } : { x: 0, y: 0, w: 1, h: 1 });
      vp.setAtmosphere(ZONES.meadow.atmo, true);
      vp.snapTo(cow.position);
      this.viewports.push(vp);
    });

    this.engine.setViewports(this.viewports);
    this.hud.setPlayers(this.cows, this.viewports);
    this.menus.hide();
    this.keyboard.clear();
    this.state = 'playing';
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.menus.showPause();
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.menus.hide();
    this.keyboard.clear();
  }

  quitToTitle() {
    for (const c of this.cows) c.dispose();
    this.cows = [];
    this.viewports = [];
    this.hud.clear();
    this.engine.setViewports([this.titleViewport]);
    this.state = 'title';
    this.menus.showTitle();
  }

  // ── Main loop ─────────────────────────────────────────────────────────

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.time += dt;

    if (this.state === 'title') {
      this.titleViewport.orbit(this.time, this.world.spawn, 30);
      this.titleViewport.update(dt, this.world.spawn, null);
      this.titleViewport.orbit(this.time, this.world.spawn, 30);
    } else if (this.state === 'playing') {
      this._updatePlaying(dt);
      if (this.keyboard.wasPressed('Escape')) this.pause();
    } else if (this.state === 'paused') {
      if (this.keyboard.wasPressed('Escape')) this.resume();
    }

    this.engine.render();
    this.keyboard.endFrame();
    requestAnimationFrame(this._tick);
  }

  _updatePlaying(dt) {
    for (let i = 0; i < this.cows.length; i++) {
      const cow = this.cows[i];
      cow.update(dt, this.world);
      const vp = this.viewports[i];
      vp.update(dt, cow.position, cow.moveBlend > 0.2 ? cow.forward() : null);
      if (cow.zone) vp.setAtmosphere(cow.zone.atmo);
    }
    this.hud.update(dt);
  }
}
