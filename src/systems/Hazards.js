// Thorn bushes prick, dirty ponds slow you down. Kid-friendly consequences only.
import { audio } from './Audio.js';

export class Hazards {
  constructor({ world, effects, hud }) {
    this.world = world;
    this.effects = effects;
    this.hud = hud;
  }

  update(dt, players) {
    for (const pl of players) {
      const cow = pl.cow;
      const st = (cow._hz ??= { thornCd: 0, yuckCd: 0 });
      if (st.thornCd > 0) st.thornCd -= dt;
      if (st.yuckCd > 0) st.yuckCd -= dt;
      if (cow.isDown) continue;

      const hz = this.world.hazardsAt(cow.x, cow.z, cow.radius * 1.05);
      let inWater = false;
      for (const h of hz) {
        if (h.kind === 'thorn' && st.thornCd <= 0) {
          st.thornCd = 0.8;
          const dealt = cow.takeDamage(5 * pl.abilities.damageMultiplier);
          cow.knockback(cow.x - h.x, cow.z - h.z, 9);
          this.effects.burst(cow.position, 0xb28dff, { count: 8, speed: 4, life: 0.4 });
          if (dealt > 0) { this.hud.toast(cow.index, 'Ouch! Thorns! 🌵', '#d8b4ff'); audio.play('thorn'); }
        }
        if (h.kind === 'dirtyWater') {
          inWater = true;
          if (st.yuckCd <= 0) { st.yuckCd = 6; this.hud.toast(cow.index, 'Yuck, dirty water! So slow…', '#b5b06a'); }
        }
      }
      cow.speedMult = inWater ? 0.45 : 1;
    }
  }
}
