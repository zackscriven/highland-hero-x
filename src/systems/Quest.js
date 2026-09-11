// The core mission: recover the Highland Charms. Owns charm entities, pickup checks,
// reward granting (shared by all players), the thorn gate, and the win condition.
import { CHARMS, TOTAL_CHARMS, GATE_CHARMS_REQUIRED } from '../data/charms.js';
import { ABILITY_BY_ID } from '../data/abilities.js';
import { getSkin } from '../data/skins.js';
import { NAMES } from '../data/constants.js';
import { Charm } from '../entities/Charm.js';
import { unlockSkin } from '../core/save.js';
import { dist2 } from '../core/math.js';

const PICKUP_RADIUS = 2.4;

export class Quest {
  constructor({ world, scene, effects, hud, onEvent }) {
    this.world = world;
    this.effects = effects;
    this.hud = hud;
    this.onEvent = onEvent ?? (() => {});
    this.charms = CHARMS.map((def) => new Charm(scene, def, world.findFreeSpot(def.x, def.z, 2.6)));
    this.collected = new Set();
    this.gateOpen = false;
    this.bossDefeated = false;
    this.won = false;
    this.total = TOTAL_CHARMS;
    this.refreshHud();
  }

  get count() { return this.collected.size; }
  get remaining() { return this.charms.filter((c) => !c.collected); }

  charmById(id) { return this.charms.find((c) => c.def.id === id); }

  // Called by the boss system once the three-headed wolf is beaten.
  revealBossCharm() {
    this.bossDefeated = true;
    const c = this.charms.find((x) => x.def.boss);
    if (c && !c.collected) c.reveal();
    this.refreshHud();
  }

  update(dt, cows) {
    for (const charm of this.charms) {
      charm.update(dt);
      if (charm.collected || charm.locked) continue;
      for (const cow of cows) {
        if (cow.isDown) continue;
        const r = PICKUP_RADIUS + cow.radius * 0.5;
        if (dist2(cow.x, cow.z, charm.position.x, charm.position.z) < r * r) {
          this.collect(charm, cow, cows);
          break;
        }
      }
    }
  }

  collect(charm, cow, cows) {
    charm.collect();
    this.collected.add(charm.def.id);
    const def = charm.def;

    this.effects.burst(charm.position, def.color, { count: 40, speed: 9, life: 1.2, up: 7 });
    this.effects.burst(charm.position, 0xffffff, { count: 14, speed: 4, life: 0.9, up: 5 });
    this.effects.ring(charm.position, def.color, { radius: 9, duration: 0.7 });

    // Rewards go to everyone — teamwork!
    const lines = [`${def.name} recovered!`];
    const r = def.rewards ?? {};
    if (r.ability) {
      const ab = ABILITY_BY_ID[r.ability];
      for (const c of cows) c.unlockAbility(r.ability);
      lines.push(`Unlocked: ${ab.name} ${ab.icon}`);
    }
    if (r.healthMax) {
      for (const c of cows) { c.stats.healthMax += r.healthMax; c.heal(r.healthMax); }
      lines.push(`+${r.healthMax} Max Health ❤️`);
    }
    if (r.skin) {
      const isNew = unlockSkin(r.skin);
      lines.push(`${isNew ? 'New skin' : 'Skin'}: ${getSkin(r.skin).name} 🎨`);
    }

    // The grasslands regain their colour as charms come home.
    this.world.setVividness(this.count / GATE_CHARMS_REQUIRED);

    if (!this.gateOpen && this.count >= GATE_CHARMS_REQUIRED) {
      this.gateOpen = true;
      this.world.openGate();
      lines.push(`The Thorn Gate to ${NAMES.arena} has opened!`);
      this.onEvent('gateOpen');
    }

    for (const c of cows) {
      lines.forEach((line, i) => setTimeout(() => this.hud.toast(c.index, line, i === 0 ? '#ffe08a' : '#ffffff'), i * 450));
    }
    if (this.count >= this.total) this.won = true;
    this.onEvent('charm', { charm, cow });
    this.refreshHud();
    if (this.won) this.onEvent('win');
  }

  // Text for the shared tracker.
  objective() {
    if (this.won) return { title: 'The grasslands are saved!', hint: '' };
    if (this.count >= GATE_CHARMS_REQUIRED) {
      return this.bossDefeated
        ? { title: 'Grab the Frost Charm!', hint: 'It waits in the middle of the Howling Ring.' }
        : { title: `Face ${NAMES.boss}!`, hint: `The Thorn Gate is open — head north into ${NAMES.arena}.` };
    }
    const next = this.remaining.find((c) => !c.def.boss);
    return {
      title: `Recover the ${NAMES.charms}`,
      hint: next ? `Hint: ${next.def.hint}` : '',
    };
  }

  // Nearest uncollected, reachable charm to a point (for the compass).
  nearest(x, z) {
    let best = null, bestD = Infinity;
    for (const c of this.charms) {
      if (c.collected || c.locked) continue;
      if (c.def.boss && !this.bossDefeated) continue;
      const d = dist2(x, z, c.position.x, c.position.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best ? { charm: best, dist: Math.sqrt(bestD) } : null;
  }

  refreshHud() {
    this.hud.setQuest({
      count: this.count,
      total: this.total,
      charms: this.charms.map((c) => ({ id: c.def.id, color: c.def.color, collected: c.collected, name: c.def.name })),
      ...this.objective(),
    });
  }

  dispose() {
    for (const c of this.charms) c.dispose();
  }
}
