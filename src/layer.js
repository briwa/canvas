import { parallel } from './step';

export class Layer {
  constructor(targets = [], step = null) {
    const items = [targets].flat(Infinity);

    this.step = step;
    this.layers = items.filter((item) => item instanceof Layer);
    this.targets = items.flatMap((item) => (item instanceof Layer ? item.targets : [item]));
    this.parts = parallel(step ? [step, ...this.layers] : this.layers);
  }

  get idle() {
    return this.parts.steps.length === 0;
  }

  get span() {
    return this.idle ? Infinity : this.parts.span;
  }

  get startTime() {
    return this.parts.startTime;
  }

  get finished() {
    return !this.idle && this.parts.finished;
  }

  begin(time) {
    this.parts.begin(time, this.targets);
  }

  update(time) {
    this.parts.update(time);
  }
}

export function layer(targets, step) {
  return new Layer(targets, step);
}
