// Keyboard input. Tracks held keys and one-frame "just pressed" state.

export class Input {
  constructor() {
    this.keys  = new Set();
    this._prev = new Set();
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      e.preventDefault(); // stop arrow keys from scrolling the page
    });
    window.addEventListener('keyup',  (e) => this.keys.delete(e.code));
    window.addEventListener('blur',   () => { this.keys.clear(); this._prev.clear(); });
  }

  isDown(code)     { return this.keys.has(code); }
  isJustDown(code) { return this.keys.has(code) && !this._prev.has(code); }

  // Call once per frame AFTER all input checks.
  tick() {
    this._prev = new Set(this.keys);
  }

  // Returns a normalized 2D vector { x, z } in world-XZ space.
  getMoveVector() {
    let x = 0, z = 0;
    if (this.isDown('KeyW') || this.isDown('ArrowUp'))    z -= 1;
    if (this.isDown('KeyS') || this.isDown('ArrowDown'))  z += 1;
    if (this.isDown('KeyA') || this.isDown('ArrowLeft'))  x -= 1;
    if (this.isDown('KeyD') || this.isDown('ArrowRight')) x += 1;
    const len = Math.hypot(x, z);
    if (len > 0) { x /= len; z /= len; }
    return { x, z };
  }
}
