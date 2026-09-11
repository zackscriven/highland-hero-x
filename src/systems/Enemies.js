// Spawns and updates every wolf and bear: charm guards + ambient packs, with respawns.
import { CHARMS } from '../data/charms.js';
import { AMBIENT_SPAWNS, RESPAWN_SECONDS } from '../data/enemies.js';
import { Enemy } from '../entities/Enemy.js';
import { dist2 } from '../core/math.js';

export class Enemies {
  constructor({ scene, world, effects, quest }) {
    this.scene = scene;
    this.world = world;
    this.effects = effects;
    this.quest = quest;
    this.list = [];
    this.respawns = [];
    this.onDeath = null;

    for (const s of AMBIENT_SPAWNS) this.spawn(s.type, s.x, s.z);
    for (const def of CHARMS) {
      if (!def.guards) continue;
      const charm = quest.charmById(def.id);
      const cx = charm.position.x, cz = charm.position.z;
      let k = 0;
      for (const g of def.guards) {
        for (let i = 0; i < g.count; i++, k++) {
          const a = (k / 4) * Math.PI * 2 + 0.6;
          this.spawn(g.type, cx + Math.cos(a) * 5.5, cz + Math.sin(a) * 5.5, { guardOf: def.id });
        }
      }
    }
  }

  spawn(type, x, z, opts = {}) {
    const spot = this.world.findFreeSpot(x, z, 1.8);
    const e = new Enemy(this.scene, type, spot.x, spot.z, opts);
    this.list.push(e);
    return e;
  }

  get alive() { return this.list.filter((e) => !e.dead); }

  update(dt, ctx) {
    for (const e of this.list) e.update(dt, ctx);

    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      if (!e.dead || e._counted) continue;
      e._counted = true;
      this.effects.burst(e.position, 0xffffff, { count: 18, speed: 6, life: 0.8, up: 6 });
      this.effects.puff(e.position, 0xcbbfb0, 10);
      this.onDeath?.(e);
      const guardCollected = e.guardOf && this.quest.collected.has(e.guardOf);
      if (!guardCollected) this.respawns.push({ type: e.type, x: e.home.x, z: e.home.z, guardOf: e.guardOf, timer: RESPAWN_SECONDS });
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (this.list[i].removeMe) { this.list[i].dispose(); this.list.splice(i, 1); }
    }

    for (let i = this.respawns.length - 1; i >= 0; i--) {
      const r = this.respawns[i];
      r.timer -= dt;
      if (r.timer > 0) continue;
      if (r.guardOf && this.quest.collected.has(r.guardOf)) { this.respawns.splice(i, 1); continue; }
      const playerNear = ctx.players.some((pl) => dist2(pl.cow.x, pl.cow.z, r.x, r.z) < 28 * 28);
      if (playerNear) { r.timer = 5; continue; }
      this.spawn(r.type, r.x, r.z, { guardOf: r.guardOf });
      this.respawns.splice(i, 1);
    }
  }

  dispose() {
    for (const e of this.list) e.dispose();
    this.list = [];
    this.respawns = [];
  }
}
