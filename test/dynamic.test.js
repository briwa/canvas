import { describe, expect, it, vi } from 'vitest';

import { circle, rect } from '../src/entity';
import { Input } from '../src/inputs';
import { layer } from '../src/layer';
import { machine } from '../src/machine';
import { linear } from '../src/math';
import { Scene } from '../src/scene';
import { forever, move, sequence, tween, wait } from '../src/step';

function shift(dx, duration) {
  return move({ x: dx }, { duration, ease: linear });
}

function play(target, from, to, each = 100) {
  for (let time = from; time <= to; time += each) target.render(time);
}

function drawn() {
  return { clear: vi.fn(), render: vi.fn() };
}

describe('machine', () => {
  function hopper(e, extra = {}) {
    return machine([e], {
      initial: 'idle',
      states: {
        idle: { step: () => forever(() => {}) },
        hop: { step: () => sequence(shift(100, 200), shift(-100, 200)), done: 'idle' },
        ...extra,
      },
    });
  }

  it('starts in its initial state', () => {
    const m = hopper(rect());

    m.begin(0);
    m.update(0);

    expect(m.state).toBe('idle');
    expect(m.is('idle', 'hop')).toBe(true);
  });

  it('runs a state\'s step on its targets, then moves on when it is done', () => {
    const e = rect();
    const m = hopper(e);

    m.begin(0);
    m.update(0);
    m.go('hop');
    m.update(100);

    expect(m.state).toBe('hop');
    expect(e.x0).toBe(0);

    m.update(300);
    expect(e.x0).toBe(100);
    expect(m.elapsed).toBe(200);

    m.update(500);
    expect(e.x0).toBe(0);
    expect(m.state).toBe('idle');
    expect(m.elapsed).toBe(0);
  });

  it('carries the overshoot into the next state', () => {
    const e = rect();
    const m = machine([e], {
      initial: 'a',
      states: {
        a: { step: () => shift(100, 100), done: 'b' },
        b: { step: () => shift(100, 100), done: 'a' },
      },
    });

    m.begin(0);
    m.update(0);
    m.update(150);

    expect(m.state).toBe('b');
    expect(m.elapsed).toBe(50);
    expect(e.x0).toBe(150);
  });

  it('switches when a state\'s check says so, on that same frame', () => {
    const e = rect();
    let pressed = false;
    const m = hopper(e, { idle: { step: () => forever(() => {}), on: () => pressed && 'hop' } });

    m.begin(0);
    m.update(0);
    m.update(100);
    expect(m.state).toBe('idle');

    pressed = true;
    m.update(200);
    expect(m.state).toBe('hop');

    pressed = false;
    m.update(300);
    expect(e.x0).toBe(50);
  });

  it('calls exit on the way out, so an interrupted state can tidy up', () => {
    const e = rect();
    const seen = [];
    const m = machine([e], {
      initial: 'a',
      states: {
        a: { step: () => shift(100, 1000), exit: (m) => { seen.push('exit a'); m.targets[0].x0 = 0; } },
        b: { step: (m) => (seen.push(`step b at ${m.elapsed}`), null) },
      },
    });

    m.begin(0);
    m.update(0);
    m.update(500);
    m.go('b').update(600);

    expect(seen).toEqual(['exit a', 'step b at 0']);
    expect(e.x0).toBe(0);
    expect(m.step).toBe(null);
  });

  it('takes a step as it is, and starts it over each time', () => {
    const e = rect();
    const m = machine([e], { initial: 'a', states: { a: { step: shift(10, 100), done: 'a' } } });

    m.begin(0);
    m.update(0);
    m.update(250);

    expect(e.x0).toBe(25);
  });

  it('builds a fresh step each time a state is entered', () => {
    const run = vi.fn(() => wait(100));
    const m = machine([rect()], { initial: 'a', states: { a: { step: run, done: 'a' } } });

    m.begin(0);
    m.update(0);
    m.update(250);

    expect(run).toHaveBeenCalledTimes(3);
    expect(new Set(run.mock.results.map((r) => r.value)).size).toBe(3);
  });

  it('throws for a state that is not there', () => {
    const m = hopper(rect());

    expect(() => machine([rect()], { initial: 'nope', states: {} })).toThrow(/initial state/);
    expect(() => m.go('fly')).toThrow('There is no state "fly". The states are: idle, hop.');
  });

  it('works inside a layer and never finishes', () => {
    const e = rect();
    const m = machine({ initial: 'a', states: { a: { step: () => shift(10, 100) } } });
    const scene = new Scene({ renderer: drawn(), layers: [layer([e], m), layer([rect()], wait(100))] });

    play(scene, 0, 300);

    expect(e.x0).toBe(10);
    expect(scene.finished).toBe(true);
    expect(m.span).toBe(Infinity);
  });

  it('can be reset by its scene', () => {
    const e = rect();
    const m = machine({ initial: 'a', states: { a: { step: () => shift(10, 100), done: 'b' }, b: {} } });
    const scene = new Scene({ renderer: drawn(), layers: [layer([e], m)] });

    play(scene, 0, 300);
    expect(m.state).toBe('b');

    scene.reset();
    scene.render(400);
    expect(m.state).toBe('a');
    expect(e.x0).toBe(0);
  });
});

describe('adding', () => {
  it('draws what has been added, by z and then in order', () => {
    const renderer = drawn();
    const scene = new Scene({ renderer });
    const a = rect();
    const b = rect({ z: -1 });
    const c = rect();

    scene.add([a, b]).add([c, a]);
    scene.render(0);

    expect(renderer.render).toHaveBeenCalledWith([b, a, c]);
    expect(scene.size).toBe(3);
  });

  it('runs a step on what it adds, on its own clock', () => {
    const e = rect();
    const scene = new Scene({ renderer: drawn() });

    scene.render(1000);
    scene.add([e], shift(100, 200));
    play(scene, 1100, 1400);

    expect(e.x0).toBe(100);
  });

  it('applies a new step straight away', () => {
    const e = rect();
    const scene = new Scene();

    scene.render(0);
    scene.add([e], tween({ alpha: 0.5 }, { duration: 100, from: { alpha: 0 } }));

    expect(e.alpha).toBe(0);
  });

  it('runs a step to the end, then calls back', () => {
    const e = rect();
    const scene = new Scene();
    const done = vi.fn();

    scene.render(0);
    scene.run([e], shift(10, 100), done);
    play(scene, 0, 300);

    expect(done).toHaveBeenCalledTimes(1);
    expect(done).toHaveBeenCalledWith(scene);
    expect(scene.has(e)).toBe(false);
  });

  it('can stop a step before it ends', () => {
    const e = rect();
    const scene = new Scene();

    scene.render(0);
    const stop = scene.run([e], shift(100, 200));
    scene.render(100);
    stop();
    scene.render(200);

    expect(e.x0).toBe(50);
  });

  it('stops the steps on what it removes', () => {
    const e = rect();
    const other = rect();
    const scene = new Scene();

    scene.render(0);
    scene.add([e], shift(100, 200)).add([other], shift(100, 200));
    scene.render(100);
    scene.remove([e]);
    scene.render(200);

    expect(e.x0).toBe(50);
    expect(other.x0).toBe(100);
    expect(scene.has(e)).toBe(false);
  });

  it('calls back later, and every so often', () => {
    const scene = new Scene();
    const later = vi.fn();
    const often = vi.fn();

    scene.render(0);
    scene.after(250, later);
    const stop = scene.every(100, often);
    play(scene, 0, 500, 50);

    expect(later).toHaveBeenCalledTimes(1);
    expect(often).toHaveBeenCalledTimes(5);

    stop();
    play(scene, 550, 800, 50);
    expect(often).toHaveBeenCalledTimes(5);
  });

  it('catches up on calls when a frame is late', () => {
    const scene = new Scene();
    const often = vi.fn();

    scene.render(0);
    scene.every(100, often);
    scene.render(350);

    expect(often).toHaveBeenCalledTimes(3);
  });

  it('calls its update functions each frame, after the steps', () => {
    const e = rect();
    const scene = new Scene();
    const seen = [];

    scene.add([e], shift(100, 100));
    const stop = scene.onUpdate((w) => seen.push([w.dt, e.x0]));
    play(scene, 0, 100, 50);
    stop();
    scene.render(150);

    expect(seen).toEqual([
      [0, 0],
      [50, 50],
      [50, 100],
    ]);
  });

  it('holds its clock while paused', () => {
    const e = rect();
    const scene = new Scene();

    scene.render(0);
    scene.add([e], shift(100, 200));
    scene.render(100);
    scene.pause();
    play(scene, 200, 500);
    scene.play();
    scene.render(600);

    expect(scene.elapsed).toBe(200);
    expect(e.x0).toBe(100);
  });

  it('lets steps add and remove things while it runs', () => {
    const scene = new Scene();
    const a = rect();
    const b = rect();

    scene.render(0);
    scene.add([a], sequence(wait(100), forever(() => scene.remove([a]).add([b], shift(10, 100)))));
    play(scene, 100, 300);

    expect(scene.has(a)).toBe(false);
    expect(scene.has(b)).toBe(true);
    expect(b.x0).toBe(10);
  });

  it('takes a shape or an array of them', () => {
    const scene = new Scene();
    const a = rect();
    const b = rect();

    scene.render(0);
    scene.add(a, shift(10, 100)).add([b]);
    play(scene, 0, 100);
    scene.remove(a);

    expect(a.x0).toBe(10);
    expect(scene.has(a)).toBe(false);
    expect(scene.has(b)).toBe(true);
    expect(() => scene.run('dot', wait(1))).toThrow('run() takes a shape or an array of them, like scene.run(shape).');
  });

  it('listens to its inputs and lets them go', () => {
    class Probe extends Input {
      flush = vi.fn();
      detach = vi.fn();
    }

    const probe = new Probe();
    const scene = new Scene({ inputs: [probe] });

    scene.render(0);
    scene.destroy();

    expect(probe.flush).toHaveBeenCalledTimes(1);
    expect(probe.detach).toHaveBeenCalledTimes(1);
  });
});

describe('spawn', () => {
  it('adds shapes for as long as their step runs', () => {
    const scene = new Scene();
    const a = rect();
    const done = vi.fn();

    scene.render(0);
    scene.spawn(a, shift(100, 200), done);
    scene.render(100);

    expect(a.x0).toBe(50);
    expect(scene.has(a)).toBe(true);

    scene.render(200);
    expect(a.x0).toBe(100);
    expect(scene.has(a)).toBe(false);
    expect(done).toHaveBeenCalledWith(scene);
  });

  it('can be cut short by removing the shapes', () => {
    const scene = new Scene();
    const a = rect();
    const done = vi.fn();

    scene.render(0);
    scene.spawn([a], () => shift(100, 200), done);
    scene.render(100);
    scene.remove(a);
    scene.render(200);

    expect(a.x0).toBe(50);
    expect(done).not.toHaveBeenCalled();
  });

  it('can be stopped, leaving the shapes in', () => {
    const scene = new Scene();
    const a = rect();

    scene.render(0);
    const stop = scene.spawn(a, shift(100, 200));
    stop();
    scene.render(200);

    expect(scene.has(a)).toBe(true);
    expect(a.x0).toBe(0);
  });
});

describe('reset', () => {
  it('goes back to the first frame, keeping what was there and dropping what came after', () => {
    const scene = new Scene();
    const hero = rect();
    const later = rect();
    const ticks = vi.fn();

    scene.add(hero, shift(100, 200));
    scene.every(100, ticks);
    scene.render(0);
    scene.render(100);
    scene.spawn(later, wait(1000));
    scene.render(200);

    expect(hero.x0).toBe(100);
    expect(ticks).toHaveBeenCalledTimes(2);

    scene.reset();

    expect(hero.x0).toBe(0);
    expect(scene.has(hero)).toBe(true);
    expect(scene.has(later)).toBe(false);

    scene.render(300);
    scene.render(400);

    expect(scene.elapsed).toBe(100);
    expect(hero.x0).toBe(50);
    expect(ticks).toHaveBeenCalledTimes(3);
  });
});
