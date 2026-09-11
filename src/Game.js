// Orchestrates everything: engine, world, players, viewports, systems, HUD, menus,
// and the game state machine (title → playing ⇄ paused → won / lost).
import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { Keyboard } from './core/Keyboard.js';
import { InputMap, SOLO_BINDINGS, P1_BINDINGS, P2_BINDINGS } from './core/InputMap.js';
import { Viewport } from './core/Viewport.js';
import { World } from './world/World.js';
import { Cow } from './entities/Cow.js';
import { Hud } from './ui/Hud.js';
import { Menus } from './ui/Menus.js';
import { Effects } from './systems/Effects.js';
import { Quest } from './systems/Quest.js';
import { AbilityController } from './systems/Abilities.js';
import { Enemies } from './systems/Enemies.js';
import { Hazards } from './systems/Hazards.js';
import { Pickups } from './systems/Pickups.js';
import { Coop } from './systems/Coop.js';
import { Boss } from './entities/Boss.js';
import { getSkin } from './data/skins.js';
import { loadConfig, saveConfig, isSkinUnlocked } from './core/save.js';
import { ZONES } from './data/zones.js';
import { NAMES } from './data/constants.js';

const DOWN_GAME_OVER_DELAY = 3.0; // seconds a solo cow can stay knocked out before the run ends

export class Game {
  constructor(appEl) {
    this.appEl = appEl;
    this.canvas = appEl.querySelector('#game-canvas');
    this.engine = new Engine(this.canvas);
    this.keyboard = new Keyboard();
    this.world = new World(this.engine.scene);
    this.effects = new Effects(this.engine.scene);
    this.hud = new Hud(appEl.querySelector('#hud-root'));
    this.menus = new Menus(appEl.querySelector('#menu-root'), {
      onPlay: () => this.showSetup(),
      onResume: () => this.resume(),
      onQuit: () => this.quitToTitle(),
      onRestart: () => this.startRun(this.lastConfig),
      onSkins: () => this.showLiveSkins(),
    });
    this.previewCows = [];

    this.cows = [];
    this.players = [];   // [{ cow, abilities }]
    this.viewports = [];
    this.quest = null;
    this.enemies = null;
    this.hazards = null;
    this.pickups = null;
    this.boss = null;
    this.state = 'title';
    this.time = 0;
    this.lastConfig = loadConfig();
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

  // ── Setup screen (mode + skins) with live preview cows ────────────────

  showSetup() {
    this.state = 'setup';
    const config = this.lastConfig;
    // Any skin that got locked/unlocked since last time: fall back safely.
    for (const p of config.players) if (!isSkinUnlocked(getSkin(p.skinId))) p.skinId = 'classic';
    this._syncPreviewCows(config);
    this.menus.showSetup({
      config,
      onChange: (cfg) => { this.lastConfig = cfg; this._syncPreviewCows(cfg); },
      onStart: (cfg) => { this.lastConfig = cfg; saveConfig(cfg); this.startRun(cfg); },
      onBack: () => this.quitToTitle(),
    });
  }

  showLiveSkins() {
    if (this.state !== 'paused') return;
    this.state = 'skins';
    const config = { players: this.cows.map((c) => ({ skinId: c.skin.id, name: c.name })) };
    this.menus.showSetup({
      config, live: true,
      onChange: (cfg) => cfg.players.forEach((p, i) => this.cows[i]?.setSkin(getSkin(p.skinId))),
      onStart: (cfg) => {
        cfg.players.forEach((p, i) => { if (this.cows[i]) this.cows[i].setSkin(getSkin(p.skinId)); });
        this.lastConfig = { players: cfg.players.map((p) => ({ ...p })) };
        saveConfig(this.lastConfig);
        this.hud.setPlayers(this.cows, this.viewports);
        for (const pl of this.players) { this.hud.refreshAbilities(pl.cow.index); }
        this.quest?.refreshHud();
        this.state = 'paused';
        this.menus.showPause();
      },
      onBack: () => { this.state = 'paused'; this.menus.showPause(); },
    });
  }

  _syncPreviewCows(config) {
    const nullInput = { isDown: () => false, wasPressed: () => false, moveVector: () => ({ x: 0, z: 0, moving: false }), label: () => '', moveLabel: () => '' };
    while (this.previewCows.length > config.players.length) this.previewCows.pop().dispose();
    config.players.forEach((p, i) => {
      let cow = this.previewCows[i];
      if (!cow) {
        cow = new Cow({ scene: this.engine.scene, skin: getSkin(p.skinId), input: nullInput, index: i, name: p.name });
        this.previewCows.push(cow);
      } else if (cow.skin.id !== p.skinId) cow.setSkin(getSkin(p.skinId));
      const s = this.world.spawn;
      const two = config.players.length === 2;
      cow.placeAt(s.x + (two ? (i === 0 ? -2.2 : 2.2) : 0), s.z - 2, Math.PI * 0.85);
    });
  }

  _clearPreviewCows() {
    for (const c of this.previewCows) c.dispose();
    this.previewCows = [];
  }

  // ── Run lifecycle ─────────────────────────────────────────────────────

  startRun(config) {
    this.lastConfig = config;
    this.runId = (this.runId ?? 0) + 1;
    this._clearPreviewCows();
    this._teardownRun();
    this.world.setVividness(0);
    this.world.setRestoration(0);
    this.world.resetGate?.();

    const players = config.players;
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
    this.quest = new Quest({
      world: this.world, scene: this.engine.scene, effects: this.effects, hud: this.hud,
      onEvent: (type, data) => this._onQuestEvent(type, data),
    });
    this.players = this.cows.map((cow) => ({
      cow,
      abilities: new AbilityController(cow, { effects: this.effects, hud: this.hud, world: this.world }),
    }));
    this.enemies = new Enemies({ scene: this.engine.scene, world: this.world, effects: this.effects, quest: this.quest });
    this.hazards = new Hazards({ world: this.world, effects: this.effects, hud: this.hud });
    this.pickups = new Pickups({ scene: this.engine.scene, world: this.world, effects: this.effects, hud: this.hud });
    this.coop = new Coop({ hud: this.hud, effects: this.effects });
    this.boss = new Boss(this.engine.scene, this.world.arena, { players: this.cows.length });
    this.boss.onEvent = (type, data) => this._onBossEvent(type, data);
    this.stats = { kos: 0, downs: 0 };
    this.enemies.onDeath = (e) => { this.stats.kos++; if (Math.random() < 0.45) this.pickups.drop(e.x, e.z); };
    this.ending = null;
    this.menus.hide();
    this.keyboard.clear();
    this.state = 'playing';
    this.runTime = 0;
  }

  _teardownRun() {
    for (const c of this.cows) c.dispose();
    this.cows = [];
    this.players = [];
    this.viewports = [];
    this.quest?.dispose();
    this.quest = null;
    this.enemies?.dispose();
    this.enemies = null;
    this.pickups?.dispose();
    this.pickups = null;
    this.hazards = null;
    this.boss?.dispose();
    this.boss = null;
    this.hud.clear();
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
    this._clearPreviewCows();
    this._teardownRun();
    this.engine.setViewports([this.titleViewport]);
    this.state = 'title';
    this.menus.showTitle();
  }

  win() {
    if (this.state !== 'playing') return;
    this.state = 'won';
    this.world.setVividness(1);
    this.ending = { t: 0, shown: false };
    for (const pl of this.players) pl.abilities.cancelAll();
    for (const c of this.cows) this.hud.toast(c.index, 'The grasslands are saved! 🌈', '#ffe08a');
  }

  _tickEnding(dt) {
    const e = this.ending;
    if (!e) return;
    e.t += dt;
    // The world blooms back to life over three seconds, with fireworks.
    this.world.setRestoration(Math.min(1, e.t / 3));
    if (e.t < 5 && Math.random() < dt * 6) {
      const c = this.cows[Math.floor(Math.random() * this.cows.length)];
      const a = Math.random() * Math.PI * 2, d = 4 + Math.random() * 10;
      const colors = [0xffe08a, 0xff7ad9, 0x66e0d8, 0x8ad865, 0xb28dff];
      this.effects.burst({ x: c.x + Math.cos(a) * d, z: c.z + Math.sin(a) * d, y: 4 }, colors[Math.floor(Math.random() * colors.length)], { count: 24, speed: 6, life: 1.4, up: 6, gravity: 4 });
    }
    for (const vp of this.viewports) if (e.t < 0.5) vp.shake = 0.3;
    if (e.t > 4.2 && !e.shown) {
      e.shown = true;
      this.menus.showWin({ players: this.cows.length, stats: { time: this.runTime, charms: this.quest?.count ?? 7, kos: this.stats.kos, downs: this.stats.downs, names: this.cows.map((c) => c.name) } });
    }
  }

  _onBossEvent(type, data) {
    const toastAll = (msg, color) => { for (const c of this.cows) this.hud.toast(c.index, msg, color); };
    const shakeAll = (n) => { for (const vp of this.viewports) vp.shake = Math.max(vp.shake, n); };
    switch (type) {
      case 'wake':
        toastAll(`${NAMES.boss} awakens…`, '#d8c8ff');
        shakeAll(0.5);
        this.hud.setBoss({ name: NAMES.boss, fraction: 1 });
        break;
      case 'fightStart':
        toastAll('GRRRRR! Three heads, one bad mood.', '#ff9c9c');
        shakeAll(0.8);
        this.effects.ring(this.boss.position, 0xb28dff, { radius: 14, duration: 0.9, y: 1 });
        break;
      case 'telegraph':
        this.effects.ring(this.boss.position, 0xffe08a, { radius: 6, duration: 0.8, y: 0.6 });
        break;
      case 'pounce':
        shakeAll(0.4);
        break;
      case 'recover':
        toastAll('It stumbled — hit it now! ✨', '#8ff6ff');
        break;
      case 'howl':
        toastAll('AWOOOO! Wolves are coming!', '#d8c8ff');
        shakeAll(0.9);
        this.effects.ring(this.boss.position, 0xd8c8ff, { radius: 18, duration: 1.2, y: 2 });
        this.enemies.spawnPups(this.world.arena, data.pups);
        break;
      case 'enraged':
        toastAll('The wolf is furious! Watch out!', '#ff6b6b');
        shakeAll(0.7);
        break;
      case 'defeated':
        toastAll(`${NAMES.boss} is beaten!`, '#ffe08a');
        shakeAll(1.0);
        this.effects.burst(this.boss.position, 0xffffff, { count: 80, speed: 9, life: 1.5, up: 9 });
        this.effects.ring(this.boss.position, 0xffe08a, { radius: 20, duration: 1.2, y: 1 });
        const runId = this.runId;
        setTimeout(() => {
          if (!this.boss || this.runId !== runId) return; // the run was restarted meanwhile
          this.enemies.spawnFleeingPups(this.boss.x, this.boss.z, 3);
          for (const c of this.cows) this.hud.toast(c.index, 'It was three shy pups all along! 🐶🐶🐶', '#ffb3c8');
          this.quest?.revealBossCharm();
          this.hud.setBoss(null);
        }, 1600);
        break;
    }
  }

  lose() {
    if (this.state !== 'playing') return;
    this.state = 'lost';
    setTimeout(() => this.menus.showLose(), 900);
  }

  _onQuestEvent(type, data) {
    if (type === 'win') this.win();
    if (type === 'gateOpen') {
      for (const vp of this.viewports) vp.shake = 0.6;
    }
    if (type === 'charm') {
      for (const i in this.cows) this.hud.refreshAbilities(Number(i));
      this.viewports[data.cow.index].shake = 0.35;
    }
  }

  // ── Main loop ─────────────────────────────────────────────────────────

  _tick() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.time += dt;

    if (this.state === 'title') {
      this.titleViewport.orbit(this.time, this.world.spawn, 30);
    } else if (this.state === 'setup') {
      // Low, close camera on the preview cows; they idle and slowly turn to show off.
      const s = this.world.spawn;
      this.titleViewport.lookFrom(s.x + Math.sin(this.time * 0.25) * 3, 4.2, s.z + 9, s.x, 1.2, s.z - 2);
      for (const c of this.previewCows) { c.update(dt, this.world); c.facing += dt * 0.35; c.group.rotation.y = c.facing; }
      if (this.keyboard.wasPressed('Escape')) this.quitToTitle();
    } else if (this.state === 'skins') {
      if (this.keyboard.wasPressed('Escape')) { this.state = 'paused'; this.menus.showPause(); }
    } else if (this.state === 'playing') {
      this._updatePlaying(dt);
      if (this.keyboard.wasPressed('Escape')) this.pause();
    } else if (this.state === 'paused') {
      if (this.keyboard.wasPressed('Escape')) this.resume();
    } else if (this.state === 'won' || this.state === 'lost') {
      // Keep the world alive behind the end screen.
      this._updateViewports(dt);
      this.effects.update(dt);
      for (const cow of this.cows) cow.update(dt, this.world);
      if (this.state === 'lost') this.enemies?.update(dt, this._frameContext(dt));
      if (this.state === 'won') this._tickEnding(dt);
    }

    this.engine.render();
    this.keyboard.endFrame();
    requestAnimationFrame(this._tick);
  }

  _updatePlaying(dt) {
    this.runTime += dt;
    const ctx = this._frameContext(dt);
    for (const cow of this.cows) cow.update(dt, this.world);
    for (const pl of this.players) pl.abilities.update(dt, ctx);
    this.enemies.update(dt, ctx);
    this.hazards.update(dt, this.players);
    this.pickups.update(dt, this.players);
    this.coop.update(dt, this.players, ctx);
    this.quest?.update(dt, this.cows);
    this._updateBoss(dt, ctx);
    this.effects.update(dt);
    this._updateViewports(dt);
    this._updateCompass();
    this._updateDowned(dt);
    this.hud.update(dt);
  }

  // Everything systems need to talk to each other this frame.
  _frameContext(dt) {
    const targets = this.enemies ? [...this.enemies.list] : []; // copy: the boss must not leak into the enemy list
    if (this.boss && !this.boss.dead) targets.push(this.boss);
    return {
      dt,
      world: this.world,
      effects: this.effects,
      hud: this.hud,
      players: this.players,
      enemies: this.enemies ? this.enemies.list : [],
      targets,
      boss: this.boss,
      shake: (index, amount) => { const vp = this.viewports[index]; if (vp) vp.shake = Math.max(vp.shake, amount); },
      onPlayerHit: (pl, dealt) => { this.viewports[pl.cow.index].shake = Math.max(this.viewports[pl.cow.index].shake, 0.3 + dealt * 0.02); },
      onRevive: () => {},
    };
  }

  _updateBoss(dt, ctx) {
    const b = this.boss;
    if (!b) return;
    b.update(dt, ctx);
    if (b.removeMe) { b.dispose(); this.boss = null; return; }
    if (!b.dead && b.state !== 'dormant') {
      this.hud.setBoss({ name: NAMES.boss, fraction: b.hpFraction, enraged: b.enraged });
    }
  }

  _updateViewports(dt) {
    for (let i = 0; i < this.cows.length; i++) {
      const cow = this.cows[i];
      const vp = this.viewports[i];
      vp.update(dt, cow.position, cow.moveBlend > 0.2 ? cow.forward() : null);
      if (cow.zone) vp.setAtmosphere(cow.zone.atmo);
    }
  }

  _updateCompass() {
    if (!this.quest) return;
    for (const cow of this.cows) {
      const near = this.quest.nearest(cow.x, cow.z);
      if (!near) { this.hud.setCompass(cow.index, null); continue; }
      const dx = near.charm.position.x - cow.x, dz = near.charm.position.z - cow.z;
      // Screen-space: north (-Z) is up. atan2(dx, -dz) → 0 = up, clockwise positive.
      this.hud.setCompass(cow.index, { angle: Math.atan2(dx, -dz), dist: near.dist, label: near.charm.def.name });
    }
  }

  _updateDowned(dt) {
    const allDown = this.cows.every((c) => c.isDown);
    for (const cow of this.cows) {
      if (!cow.isDown) { this.hud.setDowned(cow.index, null); cow._downCounted = false; continue; }
      if (!cow._downCounted) { cow._downCounted = true; this.stats.downs++; }
      const solo = this.cows.length === 1;
      const left = Math.max(0, DOWN_GAME_OVER_DELAY - cow.downTimer);
      if (cow.nuzzle > 0) continue; // Coop is drawing the nuzzle progress
      this.hud.setDowned(cow.index, solo || allDown
        ? `Knocked out!<small>${left.toFixed(0)}…</small>`
        : `Knocked out!<small>Your friend can walk over and nuzzle you back up.</small>`);
    }
    if (allDown && this.cows.every((c) => c.downTimer >= DOWN_GAME_OVER_DELAY)) this.lose();
  }
}
