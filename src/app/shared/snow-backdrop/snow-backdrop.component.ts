import type { AfterViewInit, ElementRef, OnDestroy } from '@angular/core';
import { Component, NgZone, ViewChild, inject } from '@angular/core';

interface Flake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  drift: number;
  phase: number;
  alpha: number;
}

/**
 * App-wide backdrop: Christmas red, subtle dots and softly falling snow.
 * Mounted once in the root; pages keep a transparent `ion-content` so it shows through.
 */
@Component({
  selector: 'app-snow-backdrop',
  template: '<canvas #canvas aria-hidden="true"></canvas>',
  styles: `
    :host {
      position: fixed;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(circle, rgba(255, 255, 255, .13) 1px, transparent 1px) 0 0 / 50px 50px,
        radial-gradient(circle, rgba(255, 255, 255, .07) 1px, transparent 1px) 25px 25px / 80px 80px,
        #8b1e24;
    }
    canvas { display: block; width: 100%; height: 100%; }
  `,
})
export class SnowBackdropComponent implements AfterViewInit, OnDestroy {
  private readonly zone = inject(NgZone);
  @ViewChild('canvas', { static: true }) private canvas!: ElementRef<HTMLCanvasElement>;

  private ctx: CanvasRenderingContext2D | null = null;
  private flakes: Flake[] = [];
  private width = 0;
  private height = 0;
  private frame = 0;
  private last = 0;
  private reduceMotion = false;
  private readonly onResize = (): void => this.resize();
  private readonly onVisibility = (): void => {
    if (document.hidden) this.stop();
    else this.start();
  };

  ngAfterViewInit(): void {
    this.ctx = this.canvas.nativeElement.getContext('2d');
    if (!this.ctx) return;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.resize();
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    if (this.reduceMotion) this.draw();
    else this.start();
  }

  ngOnDestroy(): void {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
  }

  private resize(): void {
    const canvas = this.canvas.nativeElement;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    canvas.width = Math.round(this.width * dpr);
    canvas.height = Math.round(this.height * dpr);
    this.ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.min(90, Math.max(30, Math.round((this.width * this.height) / 14000)));
    this.flakes = Array.from({ length: count }, () => this.flake(true));
    if (this.reduceMotion) this.draw();
  }

  private flake(anywhere: boolean): Flake {
    const radius = 1 + Math.random() * 2.6;
    return {
      x: Math.random() * this.width,
      y: anywhere ? Math.random() * this.height : -radius * 2,
      radius,
      speed: 14 + radius * 9 + Math.random() * 10,
      drift: 8 + Math.random() * 16,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.35 + Math.random() * 0.5,
    };
  }

  private start(): void {
    if (this.reduceMotion || this.frame) return;
    this.last = 0;
    this.zone.runOutsideAngular(() => {
      const tick = (time: number): void => {
        const dt = this.last ? Math.min((time - this.last) / 1000, 0.05) : 0;
        this.last = time;
        this.step(dt, time / 1000);
        this.draw();
        this.frame = requestAnimationFrame(tick);
      };
      this.frame = requestAnimationFrame(tick);
    });
  }

  private stop(): void {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  private step(dt: number, t: number): void {
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      f.y += f.speed * dt;
      f.x += Math.sin(t * 0.8 + f.phase) * f.drift * dt;
      if (f.y - f.radius > this.height) this.flakes[i] = this.flake(false);
      else if (f.x < -10) f.x = this.width + 10;
      else if (f.x > this.width + 10) f.x = -10;
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    if (!ctx) return;
    ctx.clearRect(0, 0, this.width, this.height);
    for (const f of this.flakes) {
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
