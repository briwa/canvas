import { Entity } from './entity';
import { Tweener } from './tweener';

function isTargets(value) {
  return Array.isArray(value) || value instanceof Entity;
}

function list(targets) {
  return targets === undefined || targets === null ? null : [targets].flat(Infinity);
}

function end(step, time) {
  const span = step.span;

  return span > 0 && span < Infinity ? Math.min(step.startTime + span, time) : time;
}

export class Step {
  constructor({ targets, duration = null, start, update } = {}) {
    this.own = list(targets);
    this.resolved = this.own;
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

  get targets() {
    if (!this.resolved) {
      throw new Error('This step has no targets. Pass them in, or put it in a layer.');
    }

    return this.resolved;
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

  begin(time, targets = null) {
    this.resolved = this.own ?? targets;
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
    this.targets = null;
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

  begin(time, targets = null) {
    this.startTime = time;
    this.targets = targets;
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
        next.begin(this.cursor, this.targets);
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

  begin(time, targets = null) {
    this.startTime = time;

    for (const step of this.steps) {
      step.begin(time, targets);
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
    this.targets = null;
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

  begin(time, targets = null) {
    this.startTime = time;
    this.targets = targets;
    this.count = 0;
    this.step.begin(time, targets);
  }

  update(time) {
    while (!this.finished) {
      this.step.update(time);

      if (!this.step.finished) return;

      this.count++;

      if (this.finished) return;

      const at = end(this.step, time);
      this.step.begin(at, this.targets);

      if (at === time) {
        this.step.update(time);
        return;
      }
    }
  }
}

export function step(...args) {
  const [targets, options] = isTargets(args[0]) ? args : [undefined, args[0]];

  return new Step({ ...options, targets });
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

export function forever(...args) {
  const [targets, update] = isTargets(args[0]) ? args : [undefined, args[0]];

  return new Step({ targets, duration: Infinity, update });
}

export function tween(...args) {
  const [targets, to, { duration = 0, stagger = 0, ease, from } = {}] = isTargets(args[0])
    ? args
    : [undefined, ...args];

  return new Step({
    targets,
    duration: duration + stagger,
    start(s) {
      const gap = s.targets.length > 1 ? stagger / (s.targets.length - 1) : 0;

      s.targets.forEach((target, i) => {
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

export function move(...args) {
  const [targets, { x, y }, options] = isTargets(args[0]) ? args : [undefined, ...args];
  const to = (target) => ({
    ...(x !== undefined && { x0: target.x0 + x, x1: target.x1 + x }),
    ...(y !== undefined && { y0: target.y0 + y, y1: target.y1 + y }),
  });

  return targets === undefined ? tween(to, options) : tween(targets, to, options);
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
