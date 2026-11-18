// Solaris City — camera.js (final authoring pass)
// Smooth third-person follow camera with look-ahead and speed-sensitive zoom.
// Shake decays over time and is applied after world-clamping so it stays visible.

import { WORLD_W, WORLD_H } from './world.js';

// Camera lerp factor per second (converges fast; makes movement feel responsive).
const CAM_LERP_BASE = 0.0001;
// Zoom lerp speed — higher = snappier zoom transitions.
const ZOOM_LERP_SPEED = 3;
// Shake decay rate (units/s). Keep at 30 so a hard hit fades within ~0.3s.
const SHAKE_DECAY = 30;

export class Camera {
  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;
    this.x = 200;
    this.y = 200;
    this.zoom = 1;
    this.shake = 0;
  }

  canvasW() { return innerWidth / this.zoom; }
  canvasH() { return innerHeight / this.zoom; }

  update(dt, live) {
    const g = this.game;
    const p = g.player;
    const target = p.currentVehicle || p;
    const speed = Math.hypot(target.vx || 0, target.vy || 0);
    // Look-ahead offset: more when driving (peripheral speed cues), less on foot.
    const lead = p.currentVehicle ? 90 : 40;

    let tx = target.x, ty = target.y;
    if (live && speed > 10) {
      tx += (target.vx / speed) * lead;
      ty += (target.vy / speed) * lead;
    }

    // Exponential lerp toward target; k approaches 1 as dt grows (frame-rate independent).
    const k = 1 - Math.pow(CAM_LERP_BASE, dt);
    this.x += (tx - this.x) * k;
    this.y += (ty - this.y) * k;

    // Zoom: wider in a vehicle, narrower on foot. Zoom out further at high speed.
    const baseZoom = p.currentVehicle ? 0.72 : 1.0;
    const speedZoom = p.currentVehicle ? Math.max(0.6, 0.72 - speed * 0.0004) : 1.0;
    const targetZoom = Math.min(baseZoom, speedZoom);
    this.zoom += (targetZoom - this.zoom) * Math.min(1, dt * ZOOM_LERP_SPEED);

    // Decay camera shake each frame.
    this.shake = Math.max(0, this.shake - dt * SHAKE_DECAY);

    // Clamp center to keep the viewport fully inside the world.
    const half = 0.5 * Math.max(this.canvasW(), this.canvasH());
    this.x = Math.max(half, Math.min(WORLD_W - half, this.x));
    this.y = Math.max(half, Math.min(WORLD_H - half, this.y));

    // Apply shake AFTER clamping so it never pushes the camera outside world bounds.
    this.x += (Math.random() - 0.5) * this.shake;
    this.y += (Math.random() - 0.5) * this.shake;
  }
}
