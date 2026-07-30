import { RepeatStep, SequenceStep } from './steps';

export class Timeline {
  constructor({ entities = [], steps = [], repeat = false } = {}) {
    this.entities = entities.flat(Infinity);

    const sequence = new SequenceStep(steps, { entities: this.entities });

    this.root = repeat
      ? new RepeatStep(sequence, { times: repeat === true ? Infinity : repeat })
      : sequence;

    this.initial = this.entities.map((entity) => entity.snapshot());
    this.started = false;
  }

  get span() {
    return this.root.span;
  }

  get finished() {
    return this.started && this.root.finished;
  }

  reset() {
    this.started = false;

    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].restore(this.initial[i]);
    }
  }

  update(time) {
    if (!this.started) {
      this.started = true;
      this.root.begin(time);
    }

    return this.root.update(time);
  }
}
