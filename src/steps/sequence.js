import { BaseStep } from './base';

export class SequenceStep extends BaseStep {
  constructor(steps, { entities } = {}) {
    super({ entities });

    this.steps = steps;

    this.reset();
  }

  reset() {
    this.index = -1;
    this.step = null;
    this.done = false;
  }

  begin(time, entities, input) {
    this.reset();
    super.begin(time, entities, input);
  }

  get span() {
    let total = 0;

    for (const step of this.steps) {
      if (step.span === null) return null;
      total += step.span;
    }

    return total;
  }

  update(time) {
    super.update(time);

    while (!this.done) {
      if (!this.step) {
        const next = this.steps[this.index + 1];
        if (!next) {
          this.done = true;
          return null;
        }

        this.index++;
        this.step = next;
        next.begin(time, this.entities, this.input);
      }

      const step = this.step;
      step.update(time);

      if (!step.finished) return step;

      step.destroy();
      this.step = null;
    }

    return null;
  }
}
