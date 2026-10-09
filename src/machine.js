import { end, isTargets, list } from './step';

const HOPS = 16;

export class Machine {
  constructor({ targets, initial, states }) {
    if (!states || !Object.hasOwn(states, initial)) {
      throw new TypeError(`machine() needs an initial state that is one of its states, got "${initial}".`);
    }

    this.own = list(targets);
    this.resolved = this.own;
    this.initial = initial;
    this.states = states;
    this.state = null;
    this.step = null;
    this.pending = null;
    this.startTime = 0;
    this.enteredAt = 0;
    this.time = 0;
  }

  get span() {
    return Infinity;
  }

  get finished() {
    return false;
  }

  get targets() {
    if (!this.resolved) {
      throw new Error('This machine has no targets. Pass them in, or put it in a layer or a world.');
    }

    return this.resolved;
  }

  get elapsed() {
    return this.time - this.enteredAt;
  }

  is(...names) {
    return names.includes(this.state);
  }

  go(name) {
    this.check(name);
    this.pending = name;

    return this;
  }

  check(name) {
    if (!Object.hasOwn(this.states, name)) {
      throw new TypeError(`There is no state "${name}". The states are: ${Object.keys(this.states).join(', ')}.`);
    }
  }

  enter(name, time) {
    this.check(name);

    if (this.state !== null) this.states[this.state].exit?.(this);

    const state = this.states[name];

    this.state = name;
    this.enteredAt = time;
    this.time = time;
    this.step = typeof state.step === 'function' ? state.step(this) : (state.step ?? null);
    this.step?.begin(time, this.targets);
  }

  begin(time, targets = null) {
    this.resolved = this.own ?? targets;
    this.startTime = time;
    this.state = null;
    this.pending = null;
    this.enter(this.initial, time);
  }

  update(time) {
    this.time = time;

    for (let hop = 0; hop < HOPS; hop++) {
      const next = this.pending ?? this.states[this.state].on?.(this);

      this.pending = null;

      if (next) this.enter(next, time);

      this.step?.update(time);

      const done = this.states[this.state].done;

      if (!done || !this.step?.finished) return;

      this.enter(done, end(this.step, time));
      this.time = time;
    }
  }
}

export function machine(...args) {
  const [targets, options] = isTargets(args[0]) ? args : [undefined, args[0]];

  return new Machine({ ...options, targets });
}
