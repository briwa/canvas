import { Renderer } from './renderer';

export class Scene {
  constructor({ canvas, renderer, entities = [], step = null, inputs = [], loop = false } = {}) {
    this.renderer = renderer ?? (canvas ? new Renderer(canvas) : null);
    this.entities = entities.flat(Infinity);
    this.step = step;
    this.inputs = [inputs].flat();
    this.loop = loop;
    this.paused = false;
    this.started = false;
    this.elapsed = 0;
    this.time = null;
    this.initial = this.entities.map((entity) => entity.snapshot());
    this.resets = new Set();

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
      this.elapsed = 0;
      this.step?.begin(0);
    }

    this.step?.update(this.elapsed);

    return this;
  }

  paint() {
    if (!this.renderer) return this;

    this.renderer.clear();
    this.renderer.render(this.entities);

    return this;
  }

  render(time) {
    this.advance(time);
    this.paint();

    if (this.loop && this.finished) this.reset();

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
    this.started = false;
    this.elapsed = 0;

    this.entities.forEach((entity, i) => entity.restore(this.initial[i]));

    for (const input of this.inputs) input.reset();
    for (const fn of this.resets) fn(this);

    return this;
  }

  onReset(fn) {
    this.resets.add(fn);
    return () => this.resets.delete(fn);
  }

  destroy() {
    for (const input of this.inputs) input.detach();

    this.resets.clear();

    return this;
  }
}
