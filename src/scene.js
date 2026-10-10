import { Renderer } from './renderer';
import { isTargets, list, parallel, repeat, sequence, step, wait } from './step';

function make(source) {
  return typeof source === 'function' ? source() : source;
}

function targetsOf(targets, method) {
  if (!isTargets(targets)) throw new TypeError(`${method}() takes a shape or an array of them, like scene.${method}(shape).`);

  return list(targets);
}

function byDepth(a, b) {
  return (a.z ?? 0) - (b.z ?? 0);
}

export class Scene {
  constructor({ canvas, renderer, layers = [], inputs = [], loop = false } = {}) {
    this.renderer = renderer ?? (canvas ? new Renderer(canvas) : null);
    this.inputs = [inputs].flat();
    this.loop = loop;
    this.entities = new Set();
    this.runs = new Set();
    this.updates = new Set();
    this.finishes = new Set();
    this.initial = new Map();
    this.baseline = null;
    this.paused = false;
    this.started = false;
    this.done = false;
    this.elapsed = 0;
    this.dt = 0;
    this.time = null;

    const parts = [layers].flat(Infinity);

    this.root = parts.length ? parallel(parts) : null;

    if (this.root) {
      const targets = parts.flatMap((part) => part.targets);

      this.add(targets);
      this.runs.add({ targets, step: this.root, done: null, keep: true });
      this.root.begin(0, targets);
    }

    for (const input of this.inputs) input.attach(this.renderer?.canvas ?? null);
  }

  get finished() {
    return this.started && !!this.root?.finished;
  }

  get size() {
    return this.entities.size;
  }

  has(entity) {
    return this.entities.has(entity);
  }

  add(targets, behaviour = null) {
    const items = targetsOf(targets, 'add');

    for (const item of items) {
      if (!this.baseline && !this.initial.has(item)) this.initial.set(item, item.snapshot());

      this.entities.add(item);
    }

    if (behaviour) this.run(items, behaviour);

    return this;
  }

  spawn(targets, behaviour, done = null) {
    const items = targetsOf(targets, 'spawn');

    this.add(items);

    return this.run(items, behaviour, () => {
      this.remove(items);
      done?.(this);
    });
  }

  remove(targets) {
    const gone = targetsOf(targets, 'remove');

    for (const entity of gone) this.entities.delete(entity);

    for (const run of this.runs) {
      const touched = run.targets.some((target) => gone.includes(target));

      if (touched && run.targets.every((target) => !this.entities.has(target))) this.runs.delete(run);
    }

    return this;
  }

  run(targets, behaviour, done = null) {
    const run = { targets: targetsOf(targets, 'run'), step: make(behaviour), done };

    this.runs.add(run);
    run.step.begin(this.elapsed, run.targets);
    this.tick(run);

    return () => this.stop(run);
  }

  stop(run) {
    this.runs.delete(run);
  }

  tick(run) {
    run.step.update(this.elapsed);

    if (!run.step.finished || run.keep) return;

    this.stop(run);
    run.done?.(this);
  }

  after(duration, fn) {
    return this.run([], wait(duration), fn);
  }

  every(duration, fn) {
    return this.run([], repeat(sequence(wait(duration), step({ duration: 0, start: () => fn(this) }))));
  }

  onUpdate(fn) {
    this.updates.add(fn);
    return () => this.updates.delete(fn);
  }

  onFinish(fn) {
    this.finishes.add(fn);
    return () => this.finishes.delete(fn);
  }

  advance(time) {
    let dt = this.time === null ? 0 : time - this.time;
    this.time = time;

    if (this.paused) {
      this.dt = 0;
      return this;
    }

    this.baseline ??= { entities: [...this.entities], runs: [...this.runs] };

    if (!this.started) {
      this.started = true;
      dt = 0;
    }

    this.dt = dt;
    this.elapsed += dt;

    for (const run of [...this.runs]) {
      if (this.runs.has(run)) this.tick(run);
    }

    for (const fn of [...this.updates]) fn(this);

    return this;
  }

  paint() {
    if (!this.renderer) return this;

    this.renderer.clear();
    this.renderer.render([...this.entities].sort(byDepth));

    return this;
  }

  render(time) {
    this.advance(time);
    this.paint();

    if (!this.done && this.finished) {
      this.done = true;
      for (const fn of this.finishes) fn(this);
    }

    if (this.loop && this.finished) this.reset();

    for (const input of this.inputs) input.flush();

    return this;
  }

  pause() {
    this.paused = true;
    return this;
  }

  play() {
    this.paused = false;
    return this;
  }

  reset() {
    this.started = false;
    this.done = false;
    this.elapsed = 0;

    if (this.baseline) {
      this.entities = new Set(this.baseline.entities);
      this.runs = new Set(this.baseline.runs);

      for (const [entity, state] of this.initial) entity.restore(state);
      for (const run of this.runs) run.step.begin(0, run.targets);
    }

    for (const input of this.inputs) input.reset();

    return this;
  }

  destroy() {
    for (const input of this.inputs) input.detach();

    this.runs.clear();
    this.updates.clear();
    this.finishes.clear();

    return this;
  }
}
