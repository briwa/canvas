export class Timeline {
  constructor(entities, steps) {
    this.entities = entities;
    this.steps = steps;

    this.reset();
  }

  reset() {
    this.index = -1;
    this.step = null;
    this.done = false;
  }

  update(time) {
    if (this.done) return null;

    if (!this.step) {
      const next = this.steps[this.index + 1];
      if (!next) {
        this.done = true;
        return null;
      }

      this.index++;
      this.step = next;
      this.step.begin(time, this.entities);
    }

    const step = this.step;
    step.update(time);

    if (step.finished) {
      step.destroy();
      this.step = null;
    }

    return step;
  }
}
