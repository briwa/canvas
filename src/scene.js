import { Renderer } from './renderer';

export class Scene {
  constructor({ canvas, renderer, timelines = [], input = null, loop = false } = {}) {
    this.renderer = renderer ?? (canvas ? new Renderer(canvas) : null);
    this.timelines = timelines;
    this.input = input;
    this.loop = loop;
    this.startTime = null;
    this.time = 0;

    if (this.input) this.input.attach(this.renderer?.canvas ?? null);

    this.build();
  }

  build() {
    this.entities = this.timelines.flatMap((timeline) => timeline.entities);
    this.draws = this.renderer
      ? this.entities.map((entity) => this.renderer.resolve(entity))
      : this.entities.map(() => null);

    return this;
  }

  get elapsed() {
    return this.startTime === null ? 0 : this.time - this.startTime;
  }

  get span() {
    let max = null;

    for (const timeline of this.timelines) {
      const span = timeline.span;

      if (span === null) continue;
      if (max === null || span > max) max = span;
    }

    return max;
  }

  get finished() {
    let leads = false;

    for (const timeline of this.timelines) {
      if (timeline.span === null) continue;

      leads = true;
      if (!timeline.finished) return false;
    }

    return leads;
  }

  advance(time) {
    if (this.startTime === null) this.startTime = time;

    this.time = time;

    const elapsed = time - this.startTime;

    for (const timeline of this.timelines) {
      timeline.update(elapsed, this.input);
    }

    return this;
  }

  paint() {
    if (!this.renderer) return this;

    this.renderer.clear();
    this.renderer.render(this.entities, this.draws);

    return this;
  }

  render(time) {
    this.advance(time);
    this.paint();

    if (this.loop && this.finished) this.reset();
    if (this.input) this.input.flush();

    return this;
  }

  reset() {
    this.startTime = null;
    this.time = 0;

    for (const timeline of this.timelines) {
      timeline.reset();
    }

    if (this.input) this.input.reset();

    return this;
  }

  destroy() {
    if (this.input) this.input.detach();

    return this;
  }
}
