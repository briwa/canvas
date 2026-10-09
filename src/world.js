import { Renderer } from './renderer';
import { isTargets, list, repeat, sequence, step, wait } from './step';

function make(source) {
  return typeof source === 'function' ? source() : source;
}

function targetsOf(targets, method) {
  if (!isTargets(targets)) throw new TypeError(`${method}() takes a shape or an array of them, like world.${method}(shape).`);

  return list(targets);
}

function byDepth(a, b) {
  return (a.z ?? 0) - (b.z ?? 0);
}

export class World {
  constructor({ canvas, renderer, inputs = [] } = {}) {
    this.renderer = renderer ?? (canvas ? new Renderer(canvas) : null);
    this.inputs = [inputs].flat();
    this.entities = new Set();
    this.runs = new Set();
    this.updates = new Set();
    this.paused = false;
    this.elapsed = 0;
    this.dt = 0;
    this.time = null;

    for (const input of this.inputs) input.attach(this.renderer?.canvas ?? null);
  }

  get size() {
    return this.entities.size;
  }

  has(entity) {
    return this.entities.has(entity);
  }

  add(targets, behaviour = null) {
    const items = targetsOf(targets, 'add');

    for (const item of items) this.entities.add(item);

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
      if (run.targets.some((target) => gone.includes(target))) this.runs.delete(run);
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

    if (!run.step.finished) return;

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

  advance(time) {
    const dt = this.time === null ? 0 : time - this.time;
    this.time = time;

    if (this.paused) {
      this.dt = 0;
      return this;
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

  destroy() {
    for (const input of this.inputs) input.detach();

    this.runs.clear();
    this.updates.clear();

    return this;
  }
}
