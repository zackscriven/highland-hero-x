// Heads-up display: a shared quest tracker plus one panel per player
// (health, stamina, ability slots, charm compass, zone banner, toasts).
import { ABILITIES } from '../data/abilities.js';

export class Hud {
  constructor(root) {
    this.root = root;
    this.panels = [];
    this.quest = null;
  }

  setPlayers(cows, viewports) {
    this.root.innerHTML = '';
    this.quest = this._makeQuest(cows.length > 1);
    this.panels = cows.map((cow, i) => this._makePanel(cow, viewports[i], i));
  }

  clear() {
    this.root.innerHTML = '';
    this.panels = [];
    this.quest = null;
  }

  // ── Shared quest tracker ──────────────────────────────────────────────

  _makeQuest(split) {
    const el = document.createElement('div');
    el.className = 'hud-quest' + (split ? ' bottom' : '');
    el.innerHTML = `
      <div class="q-title"></div>
      <div class="q-gems"></div>
      <div class="q-hint"></div>
    `;
    this.root.appendChild(el);
    return { el, title: el.querySelector('.q-title'), gems: el.querySelector('.q-gems'), hint: el.querySelector('.q-hint') };
  }

  setQuest({ count, total, charms, title, hint }) {
    if (!this.quest) return;
    this.quest.title.textContent = `${title}  ·  ${count} / ${total}`;
    this.quest.gems.innerHTML = charms.map((c) => {
      const hex = '#' + c.color.toString(16).padStart(6, '0');
      return `<span class="gem ${c.collected ? 'got' : ''}" title="${c.name}" style="--gem:${hex}"></span>`;
    }).join('');
    this.quest.hint.textContent = hint ?? '';
    this.quest.el.classList.add('pulse');
    setTimeout(() => this.quest?.el.classList.remove('pulse'), 700);
  }

  // ── Per-player panels ─────────────────────────────────────────────────

  _makePanel(cow, vp, i) {
    const el = document.createElement('div');
    el.className = 'hud-panel' + (vp.rect.x > 0 ? ' right-side' : '');
    el.style.left = `${vp.rect.x * 100}%`;
    el.style.width = `${vp.rect.w * 100}%`;
    const swatch = '#' + cow.skin.colors.body.toString(16).padStart(6, '0');
    const slots = ABILITIES.map((a) => `
      <div class="slot locked" data-id="${a.id}" title="${a.name}: ${a.blurb}">
        <span class="slot-icon">${a.icon}</span>
        <span class="slot-key">${cow.input.label(a.action)}</span>
        <div class="cd"></div>
      </div>`).join('');
    el.innerHTML = `
      <div class="hud-card">
        <div class="hud-name"><span class="hud-swatch" style="background:${swatch}"></span>${cow.name} · ${cow.skin.name}<span class="bond-tag" title="Herd Bond: stick together for faster stamina and tougher hides">💞</span></div>
        <div class="bar health"><div class="fill"></div><span class="label">HEALTH</span></div>
        <div class="bar stamina"><div class="fill"></div><span class="label">STAMINA</span></div>
        <div class="hud-abilities">${slots}</div>
        <div class="hud-compass"><span class="arrow">➜</span><span class="compass-text"></span></div>
      </div>
      <div class="hud-zone"></div>
      <div class="hud-toasts"></div>
      <div class="hud-downed"></div>
      <div class="hud-hint">${this._hintHtml(cow)}</div>
    `;
    this.root.appendChild(el);
    const panel = {
      el, cow,
      health: el.querySelector('.bar.health .fill'),
      stamina: el.querySelector('.bar.stamina .fill'),
      zone: el.querySelector('.hud-zone'),
      toasts: el.querySelector('.hud-toasts'),
      downed: el.querySelector('.hud-downed'),
      hint: el.querySelector('.hud-hint'),
      compass: el.querySelector('.hud-compass'),
      arrow: el.querySelector('.hud-compass .arrow'),
      compassText: el.querySelector('.compass-text'),
      slots: Object.fromEntries([...el.querySelectorAll('.slot')].map((s) => [s.dataset.id, { el: s, cd: s.querySelector('.cd') }])),
      zoneKey: null,
      zoneTimer: 0,
    };
    this.refreshAbilities(i);
    return panel;
  }

  _hintHtml(cow) {
    const k = (a) => `<b>${cow.input.label(a)}</b>`;
    return `Move ${k('up')}${k('left')}${k('down')}${k('right')} · Sprint ${k('sprint')} · Headbutt ${k('headbutt')} · Charge ${k('charge')} · Shield ${k('shield')} · Moo ${k('moo')} · Grass ${k('grass')}`;
  }

  setBond(index, on) {
    const p = this.panels[index];
    if (!p) return;
    p.el.querySelector('.hud-name').classList.toggle('bonded', !!on);
  }

  refreshAbilities(index) {
    const p = this.panels[index];
    if (!p) return;
    for (const a of ABILITIES) {
      const slot = p.slots[a.id];
      slot.el.classList.toggle('locked', !p.cow.hasAbility(a.id));
    }
  }

  setCooldown(index, id, fraction) {
    const slot = this.panels[index]?.slots[id];
    if (slot) slot.cd.style.transform = `scaleY(${fraction})`;
  }

  setSlotActive(index, id, active) {
    const slot = this.panels[index]?.slots[id];
    if (slot) slot.el.classList.toggle('active', !!active);
  }

  // angle: radians, 0 = north (up on screen), clockwise positive. dist in world units.
  setCompass(index, target) {
    const p = this.panels[index];
    if (!p) return;
    if (!target) { p.compass.style.display = 'none'; return; }
    p.compass.style.display = '';
    p.arrow.style.transform = `rotate(${target.angle - Math.PI / 2}rad)`;
    p.compassText.textContent = `${target.label} · ${Math.round(target.dist)}m`;
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
