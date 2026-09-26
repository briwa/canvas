import { Renderer } from './renderer';
import { parallel } from './step';

const FRAME = 16;

export class Scene {
  constructor({ canvas, renderer, layers = [], inputs = [], loop = false, start = 0 } = {}) {
    this.renderer = renderer ?? (canvas ? new Renderer(canvas) : null);
    this.layers = [layers].flat(Infinity);
    this.targets = this.layers.flatMap((layer) => layer.targets);
    this.step = this.layers.length ? parallel(this.layers) : null;
    this.inputs = [inputs].flat();
    this.loop = loop;
    this.start = start;
    this.origin = start;
    this.paused = false;
    this.started = false;
    this.done = false;
    this.elapsed = 0;
    this.time = null;
    this.initial = this.targets.map((target) => target.snapshot());
    this.resets = new Set();
    this.finishes = new Set();

    for (const input of this.inputs) input.attach(this.renderer?.canvas ?? null);
  }

  get finished() {
    return this.started && !!this.step?.finished;
  }

  advance(time) {
    const dt = this.time === null ? 0 : time - this.time;
    this.time = time;

    if (this.paused) return this;

    if (this.started) {
      this.elapsed += dt;
    } else {
      this.started = true;
      this.elapsed = this.origin;
      this.step?.begin(0);

      for (let t = 0; t < this.origin; t += FRAME) this.step?.update(t);
    }

    this.step?.update(this.elapsed);

    return this;
  }

  paint() {
    if (!this.renderer) return this;

    this.renderer.clear();
    this.renderer.render(this.targets);

    return this;
  }

  render(time) {
    this.advance(time);
    this.paint();

    if (!this.done && this.finished) {
      this.done = true;
      for (const fn of this.finishes) fn(this);
    }

    if (this.loop && this.finished) this.seek(0);

    for (const input of this.inputs) input.flush();

    return this;
  }

  pause() {
    this.paused = true;
    return this;
  }

  play() {
    this.paused = false;
    return this;
  }

  reset() {
    return this.seek(this.start);
  }

  seek(time) {
    this.origin = time;
    this.started = false;
    this.done = false;
    this.elapsed = 0;

    this.targets.forEach((target, i) => target.restore(this.initial[i]));

    for (const input of this.inputs) input.reset();
    for (const fn of this.resets) fn(this);

    return this;
  }

  onReset(fn) {
    this.resets.add(fn);
    return () => this.resets.delete(fn);
  }

  onFinish(fn) {
    this.finishes.add(fn);
    return () => this.finishes.delete(fn);
  }

  destroy() {
    for (const input of this.inputs) input.detach();

    this.resets.clear();
    this.finishes.clear();

    return this;
  }
}
