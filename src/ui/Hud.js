// Per-player heads-up display. Each player gets a panel sized to their viewport.
export class Hud {
  constructor(root) {
    this.root = root;
    this.panels = [];
  }

  setPlayers(cows, viewports) {
    this.root.innerHTML = '';
    this.panels = cows.map((cow, i) => this._makePanel(cow, viewports[i], i));
  }

  clear() {
    this.root.innerHTML = '';
    this.panels = [];
  }

  _makePanel(cow, vp, i) {
    const el = document.createElement('div');
    el.className = 'hud-panel' + (vp.rect.x > 0 ? ' right-side' : '');
    el.style.left = `${vp.rect.x * 100}%`;
    el.style.width = `${vp.rect.w * 100}%`;
    const swatch = '#' + cow.skin.colors.body.toString(16).padStart(6, '0');
    el.innerHTML = `
      <div class="hud-card">
        <div class="hud-name"><span class="hud-swatch" style="background:${swatch}"></span>${cow.name} · ${cow.skin.name}</div>
        <div class="bar health"><div class="fill"></div><span class="label">HEALTH</span></div>
        <div class="bar stamina"><div class="fill"></div><span class="label">STAMINA</span></div>
        <div class="hud-abilities"></div>
      </div>
      <div class="hud-zone"></div>
      <div class="hud-toasts"></div>
      <div class="hud-downed"></div>
      <div class="hud-hint">Move <b>${cow.input.moveLabel()}</b> · Sprint <b>${cow.input.label('sprint')}</b></div>
    `;
    this.root.appendChild(el);
    return {
      el, cow,
      health: el.querySelector('.bar.health .fill'),
      stamina: el.querySelector('.bar.stamina .fill'),
      zone: el.querySelector('.hud-zone'),
      toasts: el.querySelector('.hud-toasts'),
      downed: el.querySelector('.hud-downed'),
      abilities: el.querySelector('.hud-abilities'),
      hint: el.querySelector('.hud-hint'),
      zoneKey: null,
      zoneTimer: 0,
    };
  }

  update(dt) {
    for (const p of this.panels) {
      const s = p.cow.stats;
      p.health.style.transform = `scaleX(${s.health / s.healthMax})`;
      p.stamina.style.transform = `scaleX(${s.stamina / s.staminaMax})`;

      const zone = p.cow.zone;
      if (zone && zone.key !== p.zoneKey) {
        p.zoneKey = zone.key;
        p.zone.textContent = zone.name;
        p.zone.classList.add('show');
        p.zoneTimer = 2.6;
      }
      if (p.zoneTimer > 0) {
        p.zoneTimer -= dt;
        if (p.zoneTimer <= 0) p.zone.classList.remove('show');
      }
    }
  }

  toast(index, text, color = '#fff4dc') {
    const p = this.panels[index];
    if (!p) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.style.color = color;
    t.textContent = text;
    p.toasts.appendChild(t);
    setTimeout(() => t.remove(), 1700);
  }

  setDowned(index, html) {
    const p = this.panels[index];
    if (!p) return;
    p.downed.innerHTML = html ?? '';
    p.downed.classList.toggle('show', !!html);
  }

  setHint(index, html) {
    const p = this.panels[index];
    if (p) p.hint.innerHTML = html;
  }
}
