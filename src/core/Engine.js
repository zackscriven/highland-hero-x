// Owns the WebGL renderer, the shared scene, global lights, and multi-viewport rendering.
import * as THREE from 'three';

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x93d4ff);
    this.scene.fog = new THREE.Fog(0x93d4ff, 80, 210);

    // Lighting: a warm sun + hemisphere fill + a per-viewport ambient that the zone tints.
    this.sun = new THREE.DirectionalLight(0xfff1d6, 2.4);
    this.sun.position.set(40, 70, 30);
    this.hemi = new THREE.HemisphereLight(0xdcefff, 0x6f8f4a, 0.9);
    this.ambient = new THREE.AmbientLight(0xfff4e0, 0.55);
    this.scene.add(this.sun, this.hemi, this.ambient);

    this.width = 1;
    this.height = 1;
    this.viewports = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setViewports(viewports) {
    this.viewports = viewports;
    this.resize();
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.renderer.setSize(this.width, this.height, false);
    for (const vp of this.viewports) vp.resize(this.width, this.height);
  }

  render() {
    const r = this.renderer;
    const multi = this.viewports.length > 1;
    r.setScissorTest(multi);
    for (const vp of this.viewports) {
      const p = vp.px;
      r.setViewport(p.x, p.y, p.w, p.h);
      if (multi) r.setScissor(p.x, p.y, p.w, p.h);

      // Apply this viewport's atmosphere before drawing. Fog/background are scene-global,
      // so we swap them per viewport — cheap, and it lets two players be in different zones.
      const a = vp.atmo;
      this.scene.background.copy(a.sky);
      this.scene.fog.color.copy(a.sky);
      this.scene.fog.near = a.fogNear;
      this.scene.fog.far = a.fogFar;
      this.ambient.color.copy(a.ambient);
      this.ambient.intensity = a.ambientIntensity;

      r.render(this.scene, vp.camera);
    }
    r.setScissorTest(false);
  }
}
