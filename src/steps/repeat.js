import { BaseStep } from './base';

export class RepeatStep extends BaseStep {
  constructor(step, { times = Infinity, entities } = {}) {
    super({ entities });

    this.step = step;
    this.times = times;
    this.count = 0;
  }

  begin(time, entities) {
    super.begin(time, entities);

    this.count = 0;
    this.step.begin(time, this.entities);
  }

  get span() {
    if (this.times === Infinity) return null;

    const span = this.step.span;

    return span === null ? null : span * this.times;
  }

  get finished() {
    return this.done || this.count >= this.times;
  }

  update(time) {
    super.update(time);

    if (this.finished) return;

    this.step.update(time);

    if (!this.step.finished) return;

    this.count++;

    if (this.finished) return;

    this.step.begin(time, this.entities);
    this.step.update(time);
  }

  destroy() {
    this.step.destroy();
  }
}
