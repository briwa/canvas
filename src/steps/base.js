export class BaseStep {
  constructor({ entities } = {}) {
    this.own = entities ?? null;
    this.entities = this.own;
    this.startTime = 0;
    this.time = 0;
    this.done = false;
  }

  begin(time, entities) {
    this.startTime = time;
    this.time = time;
    this.entities = this.own ?? entities ?? null;
    this.done = false;
    this.enter();
  }

  enter() {}

  get span() {
    return null;
  }

  get elapsed() {
    return this.time - this.startTime;
  }

  get finished() {
    return this.done;
  }

  complete() {
    this.done = true;
  }

  update(time) {
    this.time = time;
  }

  destroy() {}
}
