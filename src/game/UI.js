import { NAMES, ABILITIES, POISON } from './Constants.js';

export class UI {
  constructor(parent) {
    this.root = document.createElement('div');
    this.root.style.cssText = `
      position:absolute;inset:0;pointer-events:none;
      font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
      color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6);
    `;

    // ----- Stats panel (top-left) --------------------------------
    this.statsPanel = document.createElement('div');
    this.statsPanel.style.cssText = `
      position:absolute;top:16px;left:16px;
      padding:12px 14px;background:rgba(0,0,0,.42);
      border-radius:10px;font-size:13px;line-height:1.4;min-width:200px;
    `;
    const title = document.createElement('div');
    title.style.cssText = 'font-weight:600;margin-bottom:8px;font-size:14px;';
    title.textContent   = NAMES.cow;
    this.statsPanel.appendChild(title);

    this.bars = {
      health:  this._makeBar('Health',  '#e85a5a'),
      hunger:  this._makeBar('Hunger',  '#e8a35a'),
      thirst:  this._makeBar('Thirst',  '#5ab4e8'),
      stamina: this._makeBar('Stamina', '#9be85a'),
    };
    for (const b of Object.values(this.bars)) this.statsPanel.appendChild(b.row);

    this.strengthRow = document.createElement('div');
    this.courageRow  = document.createElement('div');
    this.strengthRow.style.marginTop = '6px';
    this.statsPanel.appendChild(this.strengthRow);
    this.statsPanel.appendChild(this.courageRow);

    // Poison status (hidden by default).
    this.poisonRow = document.createElement('div');
    this.poisonRow.style.cssText = `
      display:none;margin-top:8px;padding:5px 8px;
      background:rgba(120,0,180,.4);border-radius:5px;
      font-size:12px;color:#dd88ff;font-weight:600;
    `;
    this.statsPanel.appendChild(this.poisonRow);
    this.root.appendChild(this.statsPanel);

    // ----- Abilities panel (bottom-left) -------------------------
    this.abilityPanel = document.createElement('div');
    this.abilityPanel.style.cssText = `
      position:absolute;bottom:64px;left:16px;
      padding:10px 12px;background:rgba(0,0,0,.42);
      border-radius:10px;font-size:12px;line-height:1.6;min-width:180px;
    `;
    const abilTitle = document.createElement('div');
    abilTitle.style.cssText = 'font-weight:600;margin-bottom:4px;font-size:13px;';
    abilTitle.textContent   = 'Abilities';
    this.abilityPanel.appendChild(abilTitle);

    this.abilityRows = ABILITIES.map((ab) => {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:12px;';
      const left = document.createElement('span');
      const right = document.createElement('span');
      right.style.opacity = '0.7';
      row.appendChild(left); row.appendChild(right);
      this.abilityPanel.appendChild(row);
      return { def: ab, row, left, right };
    });
    this.root.appendChild(this.abilityPanel);

    // ----- Zone label (top-center) --------------------------------
    this.zoneLabel = document.createElement('div');
    this.zoneLabel.style.cssText = `
      position:absolute;top:16px;left:50%;transform:translateX(-50%);
      padding:8px 16px;background:rgba(0,0,0,.42);border-radius:999px;
      font-size:16px;font-weight:600;letter-spacing:.5px;
      transition:opacity .4s;
    `;
    this.zoneLabel.textContent = NAMES.meadow;
    this.root.appendChild(this.zoneLabel);

    // ----- Hint bar (bottom-center) --------------------------------
    this.hintBar = document.createElement('div');
    this.hintBar.style.cssText = `
      position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
      padding:8px 16px;background:rgba(0,0,0,.42);border-radius:8px;
      font-size:13px;white-space:nowrap;
    `;
    this.hintBar.textContent = 'WASD / Arrows to move · Shift to sprint · E to interact';
    this.root.appendChild(this.hintBar);

    // ----- Feedback message (center of screen, temporary) ----------
    this.feedbackEl = document.createElement('div');
    this.feedbackEl.style.cssText = `
      position:absolute;top:38%;left:50%;transform:translateX(-50%);
      font-size:20px;font-weight:700;pointer-events:none;opacity:0;
      text-shadow:0 2px 6px rgba(0,0,0,.8);transition:opacity .25s;
      white-space:nowrap;
    `;
    this.root.appendChild(this.feedbackEl);

    parent.appendChild(this.root);
    this._feedbackTimer = 0;
  }

  // ── Public API ────────────────────────────────────────────────

  setZone(name) {
    this.zoneLabel.textContent = name;
    // Brief flash to draw attention on zone entry.
    this.zoneLabel.style.opacity = '0';
    requestAnimationFrame(() => { this.zoneLabel.style.opacity = '1'; });
  }

  setHint(text) {
    this.hintBar.textContent = text;
  }

  showFeedback(message, color = '#ffffff') {
    this.feedbackEl.textContent = message;
    this.feedbackEl.style.color = color;
    this.feedbackEl.style.opacity = '1';
    clearTimeout(this._feedbackTimeout);
    this._feedbackTimeout = setTimeout(() => {
      this.feedbackEl.style.opacity = '0';
    }, 1600);
  }

  // Called every frame from Game.js
  update(player) {
    const s = player.stats;
    this._setBar(this.bars.health,  s.health,  s.healthMax);
    this._setBar(this.bars.hunger,  s.hunger,  s.hungerMax);
    this._setBar(this.bars.thirst,  s.thirst,  s.thirstMax);
    this._setBar(this.bars.stamina, s.stamina, s.staminaMax ?? 100);

    this.strengthRow.textContent = `Strength: ${s.strength}/${s.strengthMax ?? 10}`;
    this.courageRow.textContent  = `Courage:  ${s.courage}/${s.courageMax ?? 10}`;

    // Poison status
    if (player.poisoned) {
      this.poisonRow.style.display = 'block';
      this.poisonRow.textContent   = `POISONED (${Math.ceil(player.poisonTimer)}s)`;
      // Tint the health bar purple while poisoned.
      this.bars.health.fill.style.background = '#aa44cc';
    } else {
      this.poisonRow.style.display = 'none';
      this.bars.health.fill.style.background = '#e85a5a';
    }

    // Warn on critically low stats.
    this._warnBar(this.bars.hunger, s.hunger, 20);
    this._warnBar(this.bars.thirst, s.thirst, 20);

    // Abilities — cooldown text injected by updateAbilityCooldowns() below.
    for (const r of this.abilityRows) {
      const unlocked = s.abilities.includes(r.def.key);
      r.row.style.opacity = unlocked ? '1' : '0.4';
      r.left.textContent  = r.def.label;
      if (!unlocked) r.right.textContent = 'locked';
    }
  }

  // Called from Game.js after abilities.update() so cooldown text is current.
  updateAbilityCooldowns(abilities) {
    const CD_KEYS = ['headbutt', 'stampede', 'shield', 'moo', 'grass'];
    for (let i = 0; i < this.abilityRows.length; i++) {
      const r        = this.abilityRows[i];
      const key      = CD_KEYS[i];
      const unlocked = this.abilityRows[i].left.textContent !== '' &&
                       r.row.style.opacity !== '0.4';
      if (!unlocked) continue;
      const cd = abilities.cd[key] ?? 0;
      r.right.textContent = cd > 0.05
        ? `${cd.toFixed(1)}s`
        : r.def.input;
    }
  }

  // Floating damage / heal number rising from a world-space position.
  spawnFloatingText(worldPos, camera, text, color = '#ffffff') {
    const projected = worldPos.clone().project(camera);
    if (projected.z > 1) return; // behind camera
    const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;

    const el = document.createElement('div');
    el.style.cssText = `
      position:absolute;left:${x}px;top:${y}px;
      font-size:17px;font-weight:700;color:${color};
      text-shadow:0 2px 4px rgba(0,0,0,.85);pointer-events:none;
      white-space:nowrap;transform:translate(-50%,-50%);
      transition:transform .75s ease-out,opacity .75s ease-out;
      opacity:1;z-index:200;
    `;
    el.textContent = text;
    this.root.appendChild(el);
    requestAnimationFrame(() => {
      el.style.transform = 'translate(-50%, calc(-50% - 55px))';
      el.style.opacity   = '0';
    });
    setTimeout(() => el.remove(), 800);
  }

  // ── Helpers ───────────────────────────────────────────────────

  _makeBar(label, color) {
    const row = document.createElement('div');
    row.style.marginBottom = '4px';

    const labelRow = document.createElement('div');
    labelRow.style.cssText = 'display:flex;justify-content:space-between;font-size:11px;opacity:.85;';
    const name = document.createElement('span');
    name.textContent = label;
    const num = document.createElement('span');
    labelRow.appendChild(name); labelRow.appendChild(num);
    row.appendChild(labelRow);

    const track = document.createElement('div');
    track.style.cssText = 'height:8px;background:rgba(255,255,255,.15);border-radius:4px;overflow:hidden;';
    const fill = document.createElement('div');
    fill.style.cssText = `height:100%;width:100%;background:${color};transition:width 120ms linear,background .3s;`;
    track.appendChild(fill);
    row.appendChild(track);

    return { row, fill, num, baseColor: color };
  }

  _setBar(bar, value, max) {
    const pct = Math.max(0, Math.min(100, (value / max) * 100));
    bar.fill.style.width = pct + '%';
    bar.num.textContent  = Math.round(value).toString();
  }

  _warnBar(bar, value, threshold) {
    // Flash the bar slightly orange when critically low.
    if (value <= threshold && value > 0) {
      bar.fill.style.filter = 'brightness(1.4)';
    } else {
      bar.fill.style.filter = '';
    }
  }
}
