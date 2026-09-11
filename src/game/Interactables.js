// Proximity interactions: water, food, and training spots.
// Call update() once per frame after player movement.

import { INTERACT, TRAINING_CONFIG } from './Constants.js';

export class Interactables {
  constructor(world) {
    this.world     = world;
    this.cooldowns = new Map(); // id → seconds remaining
  }

  update(dt, player, input, ui) {
    // Tick cooldowns down.
    for (const [id, t] of this.cooldowns) {
      const next = t - dt;
      if (next <= 0) this.cooldowns.delete(id);
      else           this.cooldowns.set(id, next);
    }

    const pos      = player.position;
    let closest    = null;
    let closestDist = Infinity;

    const allSpots = [
      ...this.world.waterSpots.map(s    => ({ ...s, category: 'water'    })),
      ...this.world.foodSpots.map(s     => ({ ...s, category: 'food'     })),
      ...this.world.trainingSpots.map(s => ({ ...s, category: 'training' })),
    ];

    for (const spot of allSpots) {
      const range = spot.radius ?? INTERACT.range;
      const dist  = Math.hypot(pos.x - spot.pos.x, pos.z - spot.pos.z);
      if (dist < range && dist < closestDist) {
        closestDist = dist;
        closest = spot;
      }
    }

    if (closest) {
      const id   = this._id(closest);
      const onCd = this.cooldowns.has(id);
      ui.setHint(this._hint(closest, player, onCd));

      if (!onCd && input.isJustDown('KeyE')) {
        const result = this._activate(closest, player);
        if (result) {
          ui.showFeedback(result.message, result.color);
          if (result.cooldown > 0) this.cooldowns.set(id, result.cooldown);
        }
      }
    } else {
      ui.setHint('WASD / Arrows · Shift sprint · E interact');
    }
  }

  // ── Activation ───────────────────────────────────────────────

  _activate(spot, player) {
    if (spot.category === 'water')    return this._activateWater(spot, player);
    if (spot.category === 'food')     return this._activateFood(spot, player);
    if (spot.category === 'training') return this._activateTraining(spot, player);
    return null;
  }

  _activateWater(spot, player) {
    if (spot.type === 'clean') {
      return { message: player.drinkClean(), color: '#5bc8f5', cooldown: INTERACT.waterCooldown };
    }
    return { message: player.drinkDirty(), color: '#cc44ff', cooldown: INTERACT.waterCooldown };
  }

  _activateFood(spot, player) {
    if (spot.type === 'safe') {
      return { message: player.eatSafe(), color: '#88ee44', cooldown: INTERACT.foodCooldown };
    }
    return { message: player.eatPoison(), color: '#cc44ff', cooldown: INTERACT.foodCooldown };
  }

  _activateTraining(spot, player) {
    const cfg      = TRAINING_CONFIG[spot.key];
    if (!cfg) return null;
    const abilities = player.stats.abilities;
    const parts     = [];
    let   color     = '#ffdd44';

    // Unlock the ability if not yet unlocked.
    if (!abilities.includes(spot.abilityKey)) {
      abilities.push(spot.abilityKey);
      parts.push(cfg.unlockMsg);
    }

    // Stat gain (if this spot has one and the cap hasn't been reached).
    if (cfg.statKey) {
      const current = player.stats[cfg.statKey] ?? 0;
      if (current < cfg.statCap) {
        const gain = Math.min(cfg.statGain, cfg.statCap - current);
        player.stats[cfg.statKey] = current + gain;
        // Also raise stamina itself if staminaMax went up.
        if (cfg.statKey === 'staminaMax') {
          player.stats.stamina = Math.min(player.stats.staminaMax, player.stats.stamina + gain);
        }
        const newVal = player.stats[cfg.statKey];
        if (cfg.statGainMsg) parts.push(cfg.statGainMsg(newVal));
        color = parts.length > 1 ? '#ffdd44' : '#aaffdd';
      } else if (parts.length === 0) {
        // Stat already maxed, ability already unlocked — nothing to do.
        return { message: `${spot.label} — Mastered!`, color: '#aaaaaa', cooldown: 0 };
      }
    } else if (parts.length === 0) {
      // No stat gain and ability already unlocked.
      return { message: `${spot.label} — Mastered!`, color: '#aaaaaa', cooldown: 0 };
    }

    return { message: parts.join(' · '), color, cooldown: cfg.cooldown };
  }

  // ── Hint text ─────────────────────────────────────────────────

  _hint(spot, player, onCooldown) {
    if (spot.category === 'training') {
      return this._trainingHint(spot, player, onCooldown);
    }
    if (onCooldown) {
      if (spot.type === 'dirty' || spot.type === 'poison') return spot.label;
      return 'Wait a moment...';
    }
    return spot.label;
  }

  _trainingHint(spot, player, onCooldown) {
    const cfg       = TRAINING_CONFIG[spot.key];
    if (!cfg) return spot.label;
    const unlocked  = player.stats.abilities.includes(spot.abilityKey);

    if (onCooldown) return `Training... (cooldown)`;

    if (!unlocked) {
      return `Press E to train at ${spot.label}`;
    }

    if (cfg.statKey) {
      const current = player.stats[cfg.statKey] ?? 0;
      if (current >= cfg.statCap) return `${spot.label} — Mastered!`;
      const label =
        cfg.statKey === 'staminaMax' ? `Stamina Capacity ${current}/${cfg.statCap}` :
        cfg.statKey === 'strength'   ? `Strength ${current}/${cfg.statCap}` :
        cfg.statKey === 'courage'    ? `Courage ${current}/${cfg.statCap}` : cfg.statKey;
      return `Press E to keep training · ${label}`;
    }

    return `${spot.label} — Mastered!`;
  }

  _id(spot) {
    return `${spot.category}_${spot.key ?? spot.type}_${Math.round(spot.pos.x)}_${Math.round(spot.pos.z)}`;
  }
}
