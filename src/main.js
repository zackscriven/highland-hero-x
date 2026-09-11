import { Game } from './game/Game.js';

function showError(err) {
  const el = document.createElement('div');
  el.style.cssText = `
    position:fixed;inset:0;background:#1a0000;color:#ff6666;
    font-family:monospace;font-size:14px;padding:24px;
    white-space:pre-wrap;overflow:auto;z-index:9999;
  `;
  el.textContent = 'GAME ERROR\n\n' + (err?.stack ?? err);
  document.body.appendChild(el);
}

window.addEventListener('error', (e) => showError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

try {
  const game = new Game(document.getElementById('app'));
  game.start();
} catch (err) {
  showError(err);
}
