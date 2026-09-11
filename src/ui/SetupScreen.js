// Pre-run setup: 1 or 2 players, a name and a skin for each. Also reused from the pause
// menu (live mode) to swap skins mid-run.
import { SKINS } from '../data/skins.js';
import { CHARMS } from '../data/charms.js';
import { isSkinUnlocked } from '../core/save.js';

const hex = (n) => '#' + n.toString(16).padStart(6, '0');
const PLAYER_TAGS = ['Player 1 · WASD', 'Player 2 · Arrow keys'];

export class SetupScreen {
  // config: { players: [{ skinId, name }, ...] }  (1 or 2 entries)
  constructor(root, { config, live = false, onChange, onStart, onBack }) {
    this.root = root;
    this.config = { players: config.players.map((p) => ({ ...p })) };
    this.live = live;
    this.onChange = onChange ?? (() => {});
    this.onStart = onStart ?? (() => {});
    this.onBack = onBack ?? (() => {});
    this.render();
  }

  render() {
    const two = this.config.players.length === 2;
    this.root.innerHTML = `
      <div class="screen ${this.live ? 'dim' : 'setup'}">
        <div class="title-card setup-card">
          <h2 class="screen-title">${this.live ? 'Change your cow' : 'Choose your cows'}</h2>
          ${this.live ? '' : `
          <div class="mode-row">
            <button class="pill ${two ? '' : 'active'}" data-mode="1">1 Player</button>
            <button class="pill ${two ? 'active' : ''}" data-mode="2">2 Players · split-screen</button>
          </div>`}
          <div class="players-row">
            ${this.config.players.map((p, i) => this._playerCard(p, i)).join('')}
          </div>
          <div class="btn-row">
            <button class="btn ghost" data-action="back">${this.live ? 'Back' : 'Title'}</button>
            <button class="btn" data-action="start">${this.live ? 'Done' : 'Start Adventure! 🐄'}</button>
          </div>
        </div>
      </div>`;
    this._wire();
  }

  _playerCard(p, i) {
    return `
      <div class="player-setup" data-index="${i}">
        <div class="ps-head">
          <span class="ps-tag">${PLAYER_TAGS[i]}</span>
          <input class="ps-name" maxlength="12" value="${p.name.replace(/"/g, '&quot;')}" aria-label="Player ${i + 1} name" />
        </div>
        <div class="skin-grid">
          ${SKINS.map((s) => {
            const unlocked = isSkinUnlocked(s);
            const charm = CHARMS.find((c) => c.rewards?.skin === s.id);
            const title = unlocked ? s.blurb : `Locked — recover the ${charm?.name ?? 'right Charm'} to unlock`;
            return `
              <button class="skin-btn ${s.id === p.skinId ? 'selected' : ''} ${unlocked ? '' : 'locked'}"
                      data-skin="${s.id}" title="${title}" ${unlocked ? '' : 'disabled'}
                      style="--body:${hex(s.colors.body)};--fringe:${hex(s.colors.fringe)};--snout:${hex(s.colors.snout)}">
                <span class="skin-swatch"><span class="sw-fringe"></span><span class="sw-snout"></span></span>
                <span class="skin-name">${unlocked ? s.name : '🔒 ' + s.name}</span>
              </button>`;
          }).join('')}
        </div>
        <div class="skin-blurb">${this._blurb(p.skinId)}</div>
      </div>`;
  }

  _blurb(skinId) {
    const s = SKINS.find((x) => x.id === skinId);
    return s ? `<b>${s.name}</b> — ${s.blurb}` : '';
  }

  _wire() {
    const root = this.root;
    root.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
      const n = Number(b.dataset.mode);
      if (n === 2 && this.config.players.length === 1) {
        this.config.players.push({ skinId: this.config.players[0].skinId === 'alien' ? 'classic' : 'alien', name: 'Zoë' });
      } else if (n === 1 && this.config.players.length === 2) {
        this.config.players.length = 1;
      }
      this.onChange(this.config);
      this.render();
    }));

    root.querySelectorAll('.player-setup').forEach((card) => {
      const i = Number(card.dataset.index);
      card.querySelectorAll('.skin-btn').forEach((b) => b.addEventListener('click', () => {
        if (b.disabled) return;
        this.config.players[i].skinId = b.dataset.skin;
        card.querySelectorAll('.skin-btn').forEach((x) => x.classList.toggle('selected', x === b));
        card.querySelector('.skin-blurb').innerHTML = this._blurb(b.dataset.skin);
        this.onChange(this.config);
      }));
      const nameEl = card.querySelector('.ps-name');
      nameEl.addEventListener('input', () => {
        this.config.players[i].name = nameEl.value.trim() || `Player ${i + 1}`;
        this.onChange(this.config);
      });
      // Don't let typing a name trigger game keys.
      nameEl.addEventListener('keydown', (e) => e.stopPropagation());
    });

    root.querySelector('[data-action="start"]').addEventListener('click', () => this.onStart(this.config));
    root.querySelector('[data-action="back"]').addEventListener('click', () => this.onBack());
  }
}
