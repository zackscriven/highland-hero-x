// Full-screen menus: title, pause, win/lose. Skin & mode selection arrive in later phases.
import { NAMES } from '../data/constants.js';
import { KEY_LABELS } from '../core/InputMap.js';
import { SetupScreen } from './SetupScreen.js';

const kbd = (code) => `<kbd>${KEY_LABELS[code] ?? code}</kbd>`;

export class Menus {
  constructor(root, handlers) {
    this.root = root;
    this.h = handlers;
    this.current = null;
  }

  hide() {
    this.root.innerHTML = '';
    this.current = null;
  }

  _show(name, html) {
    this.root.innerHTML = html;
    this.current = name;
    return this.root.firstElementChild;
  }

  showTitle() {
    const el = this._show('title', `
      <div class="screen">
        <div class="title-card">
          <h1 class="game-title">Highland Hero <span class="x">X</span></h1>
          <p class="subtitle">${NAMES.subtitle}</p>
          <p class="birthday">Made for Zoë's 10th birthday 🎂🐄</p>
          <div class="btn-row">
            <button class="btn" data-action="play">Play</button>
          </div>
          <div class="controls-grid">
            <div class="controls-box">
              <h4>Player 1</h4>
              Move ${kbd('KeyW')}${kbd('KeyA')}${kbd('KeyS')}${kbd('KeyD')} · Sprint ${kbd('ShiftLeft')}<br/>
              Headbutt ${kbd('Space')} · Charge ${kbd('KeyE')} · Shield ${kbd('KeyQ')}<br/>
              Moo Blast ${kbd('KeyF')} · Grass Power ${kbd('KeyR')}
            </div>
            <div class="controls-box">
              <h4>Player 2</h4>
              Move ${kbd('ArrowUp')}${kbd('ArrowLeft')}${kbd('ArrowDown')}${kbd('ArrowRight')} · Sprint ${kbd('ShiftRight')}<br/>
              Headbutt ${kbd('Slash')} · Charge ${kbd('Period')} · Shield ${kbd('Comma')}<br/>
              Moo Blast ${kbd('KeyM')} · Grass Power ${kbd('KeyN')}
            </div>
          </div>
        </div>
      </div>
    `);
    el.querySelector('[data-action="play"]').addEventListener('click', () => this.h.onPlay?.());
  }

  showSetup(opts) {
    this.root.innerHTML = '';
    this.current = 'setup';
    return new SetupScreen(this.root, opts);
  }

  showPause() {
    const el = this._show('pause', `
      <div class="screen dim">
        <div class="title-card">
          <h2 class="screen-title">Paused</h2>
          <p class="subtitle">Take a breath, wee cow.</p>
          <div class="btn-row">
            <button class="btn" data-action="resume">Resume</button>
            <button class="btn secondary" data-action="skins">Change Skin 🎨</button>
            <button class="btn ghost" data-action="quit">Back to Title</button>
          </div>
        </div>
      </div>
    `);
    el.querySelector('[data-action="resume"]').addEventListener('click', () => this.h.onResume?.());
    el.querySelector('[data-action="skins"]').addEventListener('click', () => this.h.onSkins?.());
    el.querySelector('[data-action="quit"]').addEventListener('click', () => this.h.onQuit?.());
  }

  showWin({ players = 1, stats = {} } = {}) {
    const mins = Math.floor((stats.time ?? 0) / 60), secs = Math.round((stats.time ?? 0) % 60);
    const heroes = (stats.names ?? []).join(' & ') || 'A brave cow';
    const el = this._show('win', `
      <div class="screen">
        <div class="title-card">
          <h2 class="screen-title">You saved the grasslands! 🌈</h2>
          <p class="subtitle">Every Highland Charm is home. The colour is back, the Three-Headed Wolf is just three shy pups now, and ${players === 2 ? 'two heroes' : 'a hero'} will be sung about for a hundred summers.</p>
          <div class="win-stats">
            <div><b>${heroes}</b></div>
            <div>⏱️ ${mins}m ${secs}s &nbsp;·&nbsp; 💎 ${stats.charms ?? 7} / 7 Charms &nbsp;·&nbsp; 🐺 ${stats.kos ?? 0} wolves & bears bonked &nbsp;·&nbsp; 😵 ${stats.downs ?? 0} tumbles</div>
            <div class="birthday">Happy 10th birthday, Zoë! 🎂🐄</div>
          </div>
          <div class="btn-row">
            <button class="btn" data-action="again">Play Again</button>
            <button class="btn ghost" data-action="quit">Back to Title</button>
          </div>
        </div>
      </div>
    `);
    el.querySelector('[data-action="again"]').addEventListener('click', () => this.h.onRestart?.());
    el.querySelector('[data-action="quit"]').addEventListener('click', () => this.h.onQuit?.());
  }

  showLose() {
    const el = this._show('lose', `
      <div class="screen dim">
        <div class="title-card">
          <h2 class="screen-title">Wolf Hollow was too much this time…</h2>
          <p class="subtitle">Every hero takes a tumble. Shake it off and try again!</p>
          <div class="btn-row">
            <button class="btn" data-action="again">Try Again</button>
            <button class="btn ghost" data-action="quit">Back to Title</button>
          </div>
        </div>
      </div>
    `);
    el.querySelector('[data-action="again"]').addEventListener('click', () => this.h.onRestart?.());
    el.querySelector('[data-action="quit"]').addEventListener('click', () => this.h.onQuit?.());
  }
}
