import { BaseStep } from './base';

export class ParallelStep extends BaseStep {
  constructor(steps, { entities } = {}) {
    super({ entities });

    this.steps = steps;
  }

  begin(time, entities, input) {
    super.begin(time, entities, input);

    for (const step of this.steps) {
      step.begin(time, this.entities, this.input);
    }
  }

  get span() {
    if (!this.steps.length) return 0;

    let max = null;

    for (const step of this.steps) {
      const span = step.span;

      if (span === null) continue;
      if (max === null || span > max) max = span;
    }

    return max;
  }

  get finished() {
    if (this.done) return true;

    return this.steps.every((step) => step.finished);
  }

  update(time) {
    super.update(time);

    for (const step of this.steps) {
      if (!step.finished) step.update(time);
    }
  }

  destroy() {
    for (const step of this.steps) {
      step.destroy();
    }
  }
}
