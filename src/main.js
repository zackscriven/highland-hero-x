// Highland Hero X — entry point.
// Boots the game and shows a friendly error overlay if anything explodes.
import { Game } from './Game.js';

function showError(err) {
  const el = document.createElement('div');
  el.id = 'fatal-error';
  el.textContent = 'Oops — the game hit a snag.\n\n' + (err?.stack ?? err);
  document.body.appendChild(el);
  console.error(err);
}

window.addEventListener('error', (e) => showError(e.error ?? e.message));
window.addEventListener('unhandledrejection', (e) => showError(e.reason));

try {
  const game = new Game(document.getElementById('app'));
  game.start();
  // Handy for poking at things from the browser console.
  window.__game = game;
} catch (err) {
  showError(err);
}
