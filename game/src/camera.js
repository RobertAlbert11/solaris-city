// Authored by Solaris City agent (gta6-01)
// camera.js — smooth-follow third-person camera with look-ahead, zoom on foot vs in car, and clamping to world.
import { WORLD_W, WORLD_H } from './world.js';
export class Camera {
  constructor(game, canvas) {
    this.game = game; this.canvas = canvas;
    this.x = 200; this.y = 200; this.zoom = 1; this.shake = 0;
  }
  canvasW() { return innerWidth / this.zoom; }
  canvasH() { return innerHeight / this.zoom; }
  update(dt, live) {
    const g = this.game, p = g.player;
    const target = p.currentVehicle || p;
    const speed = Math.hypot(target.vx || 0, target.vy || 0);
    const lead = p.currentVehicle ? 90 : 40;
    let tx = target.x, ty = target.y;
    if (live && speed > 10) {
      tx += (target.vx / speed) * lead; ty += (target.vy / speed) * lead;
    }
    const k = 1 - Math.pow(0.0001, dt);
    this.x += (tx - this.x) * k; this.y += (ty - this.y) * k;
    const tz = p.currentVehicle ? 0.72 : 1.0;
    // zoom out slightly at high speed for better visibility
    const speedZoom = p.currentVehicle ? Math.max(0.6, 0.72 - speed * 0.0004) : 1.0;
    this.zoom += (Math.min(tz, speedZoom) - this.zoom) * Math.min(1, dt * 3);
    this.shake = Math.max(0, this.shake - dt * 30);
    const sx = (Math.random() - 0.5) * this.shake, sy = (Math.random() - 0.5) * this.shake;
    const half = 0.5 * Math.max(this.canvasW(), this.canvasH());
    this.x = Math.max(half, Math.min(WORLD_W - half, this.x));
    this.y = Math.max(half, Math.min(WORLD_H - half, this.y));
    // apply shake after clamping so it's visible even at world edges
    this.x += sx; this.y += sy;
  }
}
