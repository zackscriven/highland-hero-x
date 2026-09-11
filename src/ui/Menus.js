// Full-screen menus: title, pause, win/lose. Skin & mode selection arrive in later phases.
import { NAMES } from '../data/constants.js';
import { KEY_LABELS } from '../core/InputMap.js';

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

  showPause() {
    const el = this._show('pause', `
      <div class="screen dim">
        <div class="title-card">
          <h2 class="screen-title">Paused</h2>
          <p class="subtitle">Take a breath, wee cow.</p>
          <div class="btn-row">
            <button class="btn" data-action="resume">Resume</button>
            <button class="btn ghost" data-action="quit">Back to Title</button>
          </div>
        </div>
      </div>
    `);
    el.querySelector('[data-action="resume"]').addEventListener('click', () => this.h.onResume?.());
    el.querySelector('[data-action="quit"]').addEventListener('click', () => this.h.onQuit?.());
  }
}
