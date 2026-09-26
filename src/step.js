import { Tweener } from './tweener';

function end(step, time) {
  const span = step.span;

  return span > 0 && span < Infinity ? Math.min(step.startTime + span, time) : time;
}

export class Step {
  constructor({ duration = null, start, update } = {}) {
    this.duration = duration;
    this.onStart = start;
    this.onUpdate = update;
    this.tweener = new Tweener();
    this.startTime = 0;
    this.time = 0;
    this.dt = 0;
    this.done = false;
  }

  get span() {
    return this.duration;
  }

  get elapsed() {
    return this.time - this.startTime;
  }

  get progress() {
    if (this.duration === null) return this.done ? 1 : 0;

    return this.duration > 0 ? Math.min(this.elapsed / this.duration, 1) : 1;
  }

  get finished() {
    return this.done || (this.duration !== null && this.elapsed >= this.duration);
  }

  begin(time) {
    this.startTime = time;
    this.time = time;
    this.dt = 0;
    this.done = false;
    this.tweener.clear();
    this.onStart?.(this);
  }

  update(time) {
    this.dt = time - this.time;
    this.time = time;
    this.onUpdate?.(this);
    this.tweener.update(this.elapsed);
  }

  tween(target, options) {
    this.tweener.add(target, options);
    return this;
  }

  complete() {
    this.done = true;
  }
}

class Sequence {
  constructor(steps) {
    this.steps = steps;
    this.startTime = 0;
    this.cursor = 0;
    this.index = -1;
    this.step = null;
    this.done = false;
  }

  get span() {
    let total = 0;

    for (const step of this.steps) {
      const span = step.span;

      if (span === Infinity) return Infinity;
      if (total !== null) total = span === null ? null : total + span;
    }

    return total;
  }

  get finished() {
    return this.done;
  }

  begin(time) {
    this.startTime = time;
    this.cursor = time;
    this.index = -1;
    this.step = null;
    this.done = false;
  }

  update(time) {
    while (!this.done) {
      if (!this.step) {
        const next = this.steps[this.index + 1];

        if (!next) {
          this.done = true;
          return;
        }

        this.index++;
        this.step = next;
        next.begin(this.cursor);
      }

      this.step.update(time);

      if (!this.step.finished) return;

      this.cursor = end(this.step, time);
      this.step = null;
    }
  }
}

class Parallel {
  constructor(steps) {
    this.steps = steps;
    this.startTime = 0;
  }

  get span() {
    let max = 0;
    let open = false;
    let endless = this.steps.length > 0;

    for (const step of this.steps) {
      const span = step.span;

      if (span === Infinity) continue;

      endless = false;

      if (span === null) open = true;
      else max = Math.max(max, span);
    }

    if (endless) return Infinity;

    return open ? null : max;
  }

  get finished() {
    let ends = this.steps.length === 0;

    for (const step of this.steps) {
      if (step.span === Infinity) continue;

      ends = true;
      if (!step.finished) return false;
    }

    return ends;
  }

  begin(time) {
    this.startTime = time;

    for (const step of this.steps) {
      step.begin(time);
    }
  }

  update(time) {
    for (const step of this.steps) {
      if (!step.finished) step.update(time);
    }
  }
}

class Repeat {
  constructor(step, times) {
    this.step = step;
    this.times = times;
    this.startTime = 0;
    this.count = 0;
  }

  get span() {
    if (this.times === Infinity) return Infinity;

    const span = this.step.span;

    return span === null || span === Infinity ? span : span * this.times;
  }

  get finished() {
    return this.count >= this.times;
  }

  begin(time) {
    this.startTime = time;
    this.count = 0;
    this.step.begin(time);
  }

  update(time) {
    while (!this.finished) {
      this.step.update(time);

      if (!this.step.finished) return;

      this.count++;

      if (this.finished) return;

      const at = end(this.step, time);
      this.step.begin(at);

      if (at === time) {
        this.step.update(time);
        return;
      }
    }
  }
}

export function step(options) {
  return new Step(options);
}

export function wait(duration) {
  return new Step({ duration });
}

export function until(predicate) {
  return new Step({
    update(s) {
      if (predicate(s)) s.complete();
    },
  });
}

export function forever(update) {
  return new Step({ duration: Infinity, update });
}

export function tween(targets, to, { duration = 0, stagger = 0, ease, from } = {}) {
  const list = [targets].flat(Infinity);

  return new Step({
    duration: duration + stagger,
    start(s) {
      const gap = list.length > 1 ? stagger / (list.length - 1) : 0;

      list.forEach((target, i) => {
        s.tween(target, {
          startAt: i * gap,
          duration,
          ease,
          from: typeof from === 'function' ? from(target, i) : from,
          to: typeof to === 'function' ? to(target, i) : to,
        });
      });
    },
  });
}

export function move(targets, { x, y }, options) {
  return tween(
    targets,
    (target) => ({
      ...(x !== undefined && { x0: target.x0 + x, x1: target.x1 + x }),
      ...(y !== undefined && { y0: target.y0 + y, y1: target.y1 + y }),
    }),
    options,
  );
}

export function sequence(...steps) {
  return new Sequence(steps.flat());
}

export function parallel(...steps) {
  return new Parallel(steps.flat());
}

export function repeat(step, times = Infinity) {
  return new Repeat(step, times);
}
