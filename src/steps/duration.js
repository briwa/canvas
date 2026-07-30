import { BaseStep } from './base';

export class DurationStep extends BaseStep {
  constructor({ duration, entities } = {}) {
    super({ entities });

    this.duration = duration;
  }

  get span() {
    return this.duration ?? null;
  }

  get progress() {
    if (!this.duration) throw new Error('A duration is required');

    return Math.min(this.elapsed / this.duration, 1);
  }

  get finished() {
    return this.done || this.progress >= 1;
  }
}
