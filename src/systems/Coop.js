// Local co-op glue: Herd Bond (stick together → tougher + faster stamina) and
// nuzzle revives (stand beside a knocked-out friend to help them up).
import { dist2 } from '../core/math.js';

const BOND_RANGE = 9;
const NUZZLE_RANGE = 3.0;
const NUZZLE_SECONDS = 2.0;

export class Coop {
  constructor({ hud, effects }) {
    this.hud = hud;
    this.effects = effects;
    this.bonded = false;
  }

  update(dt, players, ctx) {
    if (players.length < 2) return;
    const [a, b] = players;

    // ── Herd Bond ──
    const near = dist2(a.cow.x, a.cow.z, b.cow.x, b.cow.z) < BOND_RANGE * BOND_RANGE;
    const bonded = near && !a.cow.isDown && !b.cow.isDown;
    if (bonded !== this.bonded) {
      this.bonded = bonded;
      for (const pl of players) {
        pl.cow.herdBond = bonded;
        this.hud.setBond(pl.cow.index, bonded);
      }
      if (bonded) for (const pl of players) this.hud.toast(pl.cow.index, 'Herd Bond! 💞', '#ffb3c8');
    }

    // ── Nuzzle revive ──
    for (const pl of players) {
      const cow = pl.cow;
      if (!cow.isDown) { cow.nuzzle = 0; continue; }
      const friend = players.find((o) => o !== pl && !o.cow.isDown);
      const close = friend && dist2(cow.x, cow.z, friend.cow.x, friend.cow.z) < (NUZZLE_RANGE + cow.radius) ** 2;
      if (close) {
        cow.nuzzle = (cow.nuzzle ?? 0) + dt;
        if (Math.random() < dt * 6) this.effects.burst(cow.position, 0xffb3c8, { count: 2, speed: 1.5, life: 0.8, up: 3, gravity: 1 });
        const pct = Math.min(1, cow.nuzzle / NUZZLE_SECONDS);
        this.hud.setDowned(cow.index, `Nuzzling… 💕<span class="nuzzle"><i style="width:${Math.round(pct * 100)}%"></i></span>`);
        if (cow.nuzzle >= NUZZLE_SECONDS) {
          cow.revive(0.5);
          cow.nuzzle = 0;
          this.effects.burst(cow.position, 0xffb3c8, { count: 30, speed: 5, life: 1.2, up: 7 });
          this.effects.ring(cow.position, 0xffb3c8, { radius: 4, duration: 0.5 });
          this.hud.toast(cow.index, `${friend.cow.name} nuzzled you back up! 💕`, '#ffb3c8');
          this.hud.toast(friend.cow.index, `You helped ${cow.name} up! 💕`, '#ffb3c8');
          ctx.onRevive?.(cow, friend.cow);
        }
      } else {
        cow.nuzzle = Math.max(0, (cow.nuzzle ?? 0) - dt * 2);
      }
    }
  }
}
