import { describe, expect, it, vi } from 'vitest';

import { Entity, circle, line, rect } from '../src/entity';
import { Input } from '../src/inputs';
import { layer } from '../src/layer';
import { linear, mix, polar } from '../src/math';
import { Scene } from '../src/scene';
import {
  forever,
  move,
  parallel,
  repeat,
  sequence,
  step,
  tween,
  until,
  wait,
} from '../src/step';

function fade(targets, duration) {
  return tween(targets, { alpha: 1 }, { duration, ease: linear, from: { alpha: 0 } });
}

function drift(targets, dx, duration) {
  return tween(targets, (e) => ({ x0: e.x0 + dx, x1: e.x1 + dx }), { duration, ease: linear });
}

function fadeIn(duration) {
  return tween({ alpha: 1 }, { duration, ease: linear, from: { alpha: 0 } });
}

function shift(dx, duration) {
  return tween((e) => ({ x0: e.x0 + dx, x1: e.x1 + dx }), { duration, ease: linear });
}

function play(scene, from, to, each = 100) {
  for (let time = from; time <= to; time += each) scene.render(time);
}

describe('steps', () => {
  describe('span', () => {
    it('adds up a sequence, and is endless when any part is', () => {
      expect(sequence(wait(100), wait(200)).span).toBe(300);
      expect(sequence(wait(100), until(() => false)).span).toBe(null);
      expect(sequence(until(() => false), forever(() => {})).span).toBe(Infinity);
      expect(sequence().span).toBe(0);
    });

    it('takes the longest part of a parallel, ignoring endless ones', () => {
      expect(parallel(wait(100), wait(300)).span).toBe(300);
      expect(parallel(wait(100), forever(() => {})).span).toBe(100);
      expect(parallel(wait(100), until(() => false)).span).toBe(null);
      expect(parallel(forever(() => {}), repeat(wait(10))).span).toBe(Infinity);
      expect(parallel().span).toBe(0);
    });

    it('multiplies a repeat by its count', () => {
      expect(repeat(wait(100), 3).span).toBe(300);
      expect(repeat(wait(100)).span).toBe(Infinity);
      expect(repeat(until(() => false), 3).span).toBe(null);
    });

    it('spreads a staggered tween over its duration', () => {
      expect(tween([rect(), rect()], { alpha: 0 }, { duration: 900, stagger: 600 }).span).toBe(1500);
    });
  });

  describe('step', () => {
    it('starts once and updates with its own clock', () => {
      const start = vi.fn();
      const seen = [];
      const s = step({ duration: 500, start, update: (s) => seen.push([s.elapsed, s.dt]) });

      s.begin(1000);
      s.update(1000);
      s.update(1200);
      s.update(1500);

      expect(start).toHaveBeenCalledTimes(1);
      expect(seen).toEqual([
        [0, 0],
        [200, 200],
        [500, 300],
      ]);
      expect(s.progress).toBe(1);
      expect(s.finished).toBe(true);
    });

    it('can end itself early', () => {
      const s = step({ update: (s) => s.elapsed >= 300 && s.complete() });

      s.begin(0);
      s.update(200);
      expect(s.finished).toBe(false);
      s.update(300);
      expect(s.finished).toBe(true);
    });

    it('waits for a condition', () => {
      let ready = false;
      const s = until(() => ready);

      s.begin(0);
      s.update(100);
      expect(s.finished).toBe(false);

      ready = true;
      s.update(200);
      expect(s.finished).toBe(true);
    });

    it('never ends when forever', () => {
      const update = vi.fn();
      const s = forever(update);

      s.begin(0);
      s.update(1e9);

      expect(update).toHaveBeenCalledTimes(1);
      expect(s.finished).toBe(false);
    });
  });

  describe('tween', () => {
    it('works out its values from each target when it starts', () => {
      const a = rect({ x0: 0, x1: 10 });
      const b = rect({ x0: 100, x1: 110 });
      const s = drift([a, [b]], 50, 1000);

      s.begin(0);
      a.x0 = 20;
      s.update(500);

      expect(a.x0).toBe(25);
      expect(b.x0).toBe(125);
    });

    it('staggers the starts across the targets', () => {
      const cards = [rect(), rect(), rect()];
      const s = tween(cards, { alpha: 1 }, { duration: 100, stagger: 200, ease: linear, from: { alpha: 0 } });

      cards.forEach((card) => (card.alpha = 0.9));
      s.begin(0);
      s.update(50);

      expect(cards.map((c) => c.alpha)).toEqual([0.5, 0.9, 0.9]);

      s.update(150);
      expect(cards.map((c) => c.alpha)).toEqual([1, 0.5, 0.9]);

      s.update(300);
      expect(cards.map((c) => c.alpha)).toEqual([1, 1, 1]);
      expect(s.finished).toBe(true);
    });

    it('tweens colours', () => {
      const e = rect({ color: { r: 0, g: 0, b: 0 } });
      const s = tween(e, { color: { r: 200, b: 100 } }, { duration: 100, ease: linear });

      s.begin(0);
      s.update(50);

      expect(e.color).toEqual({ r: 100, g: 0, b: 50 });
      expect(e.style).toBe('rgb(100 0 50)');
    });
  });

  describe('move', () => {
    it('shifts each target by an offset from wherever it is', () => {
      const a = rect({ x0: 0, x1: 10, y0: 0, y1: 10 });
      const b = rect({ x0: 50, x1: 60, y0: 20, y1: 30 });
      const s = move([a, b], { x: 100, y: -20 }, { duration: 100, ease: linear });

      s.begin(0);
      s.update(50);

      expect(a).toMatchObject({ x0: 50, x1: 60, y0: -10, y1: 0 });
      expect(b).toMatchObject({ x0: 100, x1: 110, y0: 10, y1: 20 });
    });

    it('leaves the other axis alone for whatever else is moving it', () => {
      const e = rect({ x0: 0, x1: 10, y0: 0, y1: 10 });
      const s = move(e, { y: 40 }, { duration: 100, ease: linear });

      s.begin(0);
      e.x0 = 70;
      s.update(100);

      expect(e).toMatchObject({ x0: 70, y0: 40, y1: 50 });
    });
  });

  describe('layer', () => {
    it('draws its children in order, going into nested layers', () => {
      const [a, b, c, d] = [rect(), rect(), rect(), rect()];

      expect(layer([a, layer([b, [c]]), d]).targets).toEqual([a, b, c, d]);
      expect(layer(a).targets).toEqual([a]);
    });

    it('gives its targets to every step inside it', () => {
      const a = rect({ x0: 0, x1: 10 });
      const b = rect({ x0: 50, x1: 60 });
      const l = layer([a, [b]], sequence(move({ x: 10 }, { duration: 100, ease: linear }), tween({ alpha: 0 }, { duration: 100, ease: linear })));

      l.begin(0);
      l.update(100);
      l.update(200);

      expect(a).toMatchObject({ x0: 10, alpha: 0 });
      expect(b).toMatchObject({ x0: 60, alpha: 0 });
    });

    it('lets a step name its own targets instead', () => {
      const a = rect();
      const b = rect();
      const l = layer(a, parallel(tween({ alpha: 0.5 }, { duration: 100, ease: linear }), tween(b, { alpha: 0 }, { duration: 100, ease: linear })));

      l.begin(0);
      l.update(100);

      expect(a.alpha).toBe(0.5);
      expect(b.alpha).toBe(0);
    });

    it('runs nested layers alongside its own step, each on its own targets', () => {
      const body = rect({ x0: 0, x1: 10, y0: 0, y1: 10 });
      const head = rect({ x0: 0, x1: 10, y0: 0, y1: 10 });
      const l = layer([layer(body), layer(head, fadeIn(100))], move({ x: 50 }, { duration: 100, ease: linear }));

      l.begin(0);
      l.update(50);

      expect(body).toMatchObject({ x0: 25, alpha: 1 });
      expect(head).toMatchObject({ x0: 25, alpha: 0.5 });
    });

    it('keeps its targets through repeats and later steps', () => {
      const e = rect({ x0: 0, x1: 10 });
      const l = layer(e, repeat(sequence(wait(50), move({ x: 10 }, { duration: 50, ease: linear })), 3));

      l.begin(0);
      for (let time = 0; time <= 300; time += 25) l.update(time);

      expect(l.finished).toBe(true);
      expect(e.x0).toBeCloseTo(30);
    });

    it('hands its targets to custom steps', () => {
      const a = rect();
      const b = rect();
      const seen = [];

      layer([a, b], step({ duration: 100, start: (s) => seen.push(s.targets) })).begin(0);

      expect(seen).toEqual([[a, b]]);
    });

    it('never holds up finishing when it has no step', () => {
      const e = rect();
      const s = parallel(layer(rect()), layer(e, fadeIn(100)), layer([rect(), layer(rect())]));

      s.begin(0);
      s.update(50);
      expect(s.finished).toBe(false);

      s.update(100);
      expect(s.finished).toBe(true);
    });
  });

  describe('targets', () => {
    it('can be given directly to step and forever', () => {
      const e = rect();
      const seen = [];

      const a = step(e, { start: (s) => seen.push(s.targets) });
      const b = forever([e], (s) => seen.push(s.targets));
      a.begin(0);
      b.begin(0);
      b.update(10);

      expect(seen).toEqual([[e], [e]]);
    });

    it('are required for steps that use them outside a layer', () => {
      expect(() => tween({ alpha: 0 }, { duration: 100 }).begin(0)).toThrow(/no targets/);
      expect(() => move({ x: 5 }).begin(0)).toThrow(/put it in a layer/);

      const custom = step({ update: (s) => s.targets });
      custom.begin(0);
      expect(() => custom.update(10)).toThrow(/no targets/);
    });

    it('are not needed for steps that do not use them', () => {
      const s = sequence(wait(10), until(() => true), forever(() => {}));

      expect(() => {
        s.begin(0);
        s.update(100);
      }).not.toThrow();
    });
  });

  describe('sequence', () => {
    it('plays its steps one after another', () => {
      const e = rect({ x0: 0 });
      const s = sequence(drift(e, 100, 100), wait(100), drift(e, -100, 100));

      s.begin(0);

      for (const [time, x] of [
        [0, 0],
        [50, 50],
        [100, 100],
        [150, 100],
        [250, 50],
        [300, 0],
      ]) {
        s.update(time);
        expect(e.x0).toBeCloseTo(x);
      }

      expect(s.finished).toBe(true);
    });

    it('carries the overshoot into the next step instead of losing it', () => {
      const e = rect({ x0: 0 });
      const s = sequence(wait(100), drift(e, 100, 100));

      s.begin(0);
      s.update(0);
      s.update(130);

      expect(e.x0).toBeCloseTo(30);
    });

    it('runs through several short steps in one frame', () => {
      const e = rect({ x0: 0 });
      const s = sequence(wait(10), wait(10), drift(e, 100, 100));

      s.begin(0);
      s.update(70);

      expect(s.index).toBe(2);
      expect(e.x0).toBeCloseTo(50);
    });
  });

  describe('parallel', () => {
    it('finishes with the parts that end, leaving endless ones running', () => {
      const tick = vi.fn();
      const s = parallel(wait(100), wait(300), forever(tick));

      s.begin(0);
      s.update(100);
      expect(s.finished).toBe(false);
      s.update(300);
      expect(s.finished).toBe(true);

      s.update(400);
      expect(tick).toHaveBeenCalledTimes(3);
    });

    it('waits for open-ended parts', () => {
      let ready = false;
      const s = parallel(wait(100), until(() => ready));

      s.begin(0);
      s.update(500);
      expect(s.finished).toBe(false);

      ready = true;
      s.update(600);
      expect(s.finished).toBe(true);
    });

    it('never finishes when every part is endless', () => {
      const s = parallel(forever(() => {}), repeat(wait(10)));

      s.begin(0);
      s.update(1e6);

      expect(s.finished).toBe(false);
    });
  });

  describe('repeat', () => {
    it('stops after the given count', () => {
      const e = rect({ x0: 0 });
      const s = repeat(drift(e, 10, 100), 3);

      s.begin(0);
      for (let time = 0; time <= 400; time += 50) s.update(time);

      expect(s.count).toBe(3);
      expect(s.finished).toBe(true);
      expect(e.x0).toBeCloseTo(30);
    });

    it('keeps time over many rounds at an uneven frame rate', () => {
      const s = repeat(sequence(wait(1010)));
      let last = 0;

      s.begin(0);
      for (let time = 0; time <= 600_000; time += 16.7) {
        s.update(time);
        last = time;
      }

      expect(s.count).toBe(Math.floor(last / 1010));
    });

    it('stays in step with another loop of the same length', () => {
      const a = rect({ x0: 0 });
      const b = rect({ x0: 0 });
      const s = parallel(
        repeat(sequence(drift(a, 10, 300), drift(a, -10, 300))),
        repeat(sequence(drift(b, 10, 200), drift(b, 0, 100), drift(b, -10, 300))),
      );

      s.begin(0);
      for (let time = 0; time <= 60_000; time += 16.7) s.update(time);

      expect(a.x0).toBeCloseTo(b.x0, 5);
    });

    it('does not hang on steps that take no time', () => {
      const s = repeat(sequence());

      s.begin(0);
      s.update(100);

      expect(s.finished).toBe(false);
    });
  });
});

describe('Scene', () => {
  function build({ loop = false } = {}) {
    const bands = [rect({ alpha: 0 }), rect({ alpha: 0 })];
    const canopies = [0, 60].map((x) => rect({ x0: x, x1: x + 40 }));
    const hero = rect({ x0: 10, x1: 36, alpha: 0 });

    const scene = new Scene({
      loop,
      layers: [
        layer(bands, repeat(sequence(fadeIn(600), fadeIn(600)))),
        layer(canopies, repeat(sequence(shift(8, 300), shift(-8, 300)))),
        layer(hero, sequence(fadeIn(200), shift(100, 600))),
      ],
    });

    return { scene, bands, canopies, hero };
  }

  it('draws its layers back to front', () => {
    const { scene, bands, canopies, hero } = build();

    expect(scene.targets).toEqual([...bands, ...canopies, hero]);
  });

  it('paints every entity through its own draw function', () => {
    const draw = vi.fn();
    const ctx = { save() {}, restore() {}, clearRect: vi.fn() };
    const canvas = { width: 10, height: 10, getContext: () => ctx };
    const custom = new Entity({ draw, color: { r: 1, g: 2, b: 3 }, alpha: 0.5 });

    new Scene({ canvas, layers: [layer(custom)] }).render(0);

    expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 10, 10);
    expect(draw).toHaveBeenCalledWith(ctx, custom);
    expect(ctx.fillStyle).toBe('rgb(1 2 3)');
    expect(ctx.globalAlpha).toBe(0.5);
  });

  it('runs everything off one clock that starts on the first frame', () => {
    const { scene, canopies } = build();

    scene.advance(1000);
    scene.advance(1300);

    expect(scene.elapsed).toBe(300);
    expect(canopies[0].x0).toBeCloseTo(8);

    scene.advance(1600);

    expect(canopies[0].x0).toBeCloseTo(0);
  });

  it('finishes with the parts that end and keeps the endless ones going', () => {
    const { scene, bands, hero } = build();

    play(scene, 0, 700);
    expect(scene.finished).toBe(false);

    scene.render(800);
    expect(scene.finished).toBe(true);
    expect(hero.alpha).toBe(1);
    expect(hero.x0).toBeCloseTo(110);

    scene.render(1100);
    expect(bands[0].alpha).toBeCloseTo(5 / 6);
    expect(hero.x0).toBeCloseTo(110);
  });

  it('never finishes when no layer has a step', () => {
    const scene = new Scene({ layers: [layer(rect()), layer([rect()])] });

    scene.render(0);

    expect(scene.finished).toBe(false);
  });

  it('rewinds its targets and the clock on reset', () => {
    const { scene, canopies, hero } = build();

    play(scene, 0, 800);
    scene.reset();

    expect(scene.finished).toBe(false);
    expect(scene.elapsed).toBe(0);
    expect(hero).toMatchObject({ x0: 10, alpha: 0 });
    expect(canopies[0].x0).toBe(0);

    scene.render(5000);

    expect(scene.elapsed).toBe(0);

    scene.render(5100);

    expect(scene.elapsed).toBe(100);
    expect(hero.alpha).toBeCloseTo(0.5);
  });

  it('tells whoever is listening when it resets', () => {
    const { scene } = build({ loop: true });
    const first = vi.fn();
    const second = vi.fn();

    scene.onReset(first);
    const off = scene.onReset(second);

    scene.reset();
    expect(first).toHaveBeenCalledWith(scene);
    expect(second).toHaveBeenCalledTimes(1);

    off();
    play(scene, 0, 800);

    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('says when it finishes, once per run', () => {
    const { scene } = build();
    const finish = vi.fn();
    scene.onFinish(finish);

    play(scene, 0, 700);
    expect(finish).not.toHaveBeenCalled();

    scene.render(800);
    expect(finish).toHaveBeenCalledTimes(1);
    expect(finish).toHaveBeenCalledWith(scene);

    play(scene, 900, 2000);
    expect(finish).toHaveBeenCalledTimes(1);

    scene.reset();
    play(scene, 3000, 3800);
    expect(finish).toHaveBeenCalledTimes(2);
  });

  it('can be reset by hand once it finishes', () => {
    const { scene, hero } = build();
    const reset = vi.fn();
    scene.onReset(reset);
    scene.onFinish(() => scene.reset());

    play(scene, 0, 800);

    expect(reset).toHaveBeenCalledTimes(1);
    expect(hero).toMatchObject({ x0: 10, alpha: 0 });

    scene.render(900);
    expect(scene.elapsed).toBe(0);
    expect(scene.finished).toBe(false);
  });

  it('says it finished before it loops', () => {
    const { scene } = build({ loop: true });
    const calls = [];
    scene.onFinish(() => calls.push('finish'));
    scene.onReset(() => calls.push('reset'));

    play(scene, 0, 800);
    play(scene, 900, 1700);

    expect(calls).toEqual(['finish', 'reset', 'finish', 'reset']);
  });

  it('never says it finished when nothing ends', () => {
    const scene = new Scene({ layers: [layer(rect(), forever(() => {}))] });
    const finish = vi.fn();
    scene.onFinish(finish);

    play(scene, 0, 5000);

    expect(finish).not.toHaveBeenCalled();
  });

  it('stops telling a listener that has gone', () => {
    const { scene } = build();
    const finish = vi.fn();
    const off = scene.onFinish(finish);

    off();
    play(scene, 0, 800);

    expect(finish).not.toHaveBeenCalled();
  });

  it('loops itself once it finishes', () => {
    const { scene, hero } = build({ loop: true });
    const reset = vi.fn();
    scene.onReset(reset);

    play(scene, 0, 700);
    expect(reset).not.toHaveBeenCalled();

    scene.render(800);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(scene.finished).toBe(false);
    expect(hero.x0).toBe(10);

    scene.render(900);
    expect(scene.elapsed).toBe(0);
  });

  it('can have looping switched on after it finished', () => {
    const { scene, hero } = build();

    play(scene, 0, 1000);
    expect(hero.x0).toBeCloseTo(110);

    scene.loop = true;
    scene.render(1100);

    expect(hero.x0).toBe(10);
  });

  it('holds still while paused and carries on without jumping', () => {
    const { scene, canopies } = build();

    play(scene, 0, 100);
    scene.pause();
    play(scene, 200, 5000);

    expect(scene.paused).toBe(true);
    expect(scene.elapsed).toBe(100);
    expect(canopies[0].x0).toBeCloseTo(8 / 3);

    scene.play();
    scene.render(5100);

    expect(scene.elapsed).toBe(200);
  });

  it('starts from zero when played after a reset while paused', () => {
    const { scene } = build();

    play(scene, 0, 300);
    scene.pause();
    scene.reset();
    play(scene, 400, 600);
    scene.play();

    scene.render(700);
    expect(scene.elapsed).toBe(0);

    scene.render(800);
    expect(scene.elapsed).toBe(100);
  });

  it('attaches, flushes, resets and detaches its inputs', () => {
    class Probe extends Input {
      bindings() {
        return { ping: this.onPing };
      }

      onPing() {
        this.pinged = true;
      }
    }

    const probe = new Probe();
    const flush = vi.spyOn(probe, 'flush');
    const reset = vi.spyOn(probe, 'reset');
    const canvas = new EventTarget();
    Object.assign(canvas, {
      width: 1,
      height: 1,
      getContext: () => ({ save() {}, restore() {}, clearRect() {} }),
    });

    const scene = new Scene({ canvas, inputs: [probe] });

    canvas.dispatchEvent(new Event('ping'));
    expect(probe.pinged).toBe(true);

    scene.render(0);
    expect(flush).toHaveBeenCalledTimes(1);

    scene.reset();
    expect(reset).toHaveBeenCalledTimes(1);

    scene.destroy();
    probe.pinged = false;
    canvas.dispatchEvent(new Event('ping'));
    expect(probe.pinged).toBe(false);
  });
});

describe('Entity', () => {
  it('keeps its colour string in step with its colour', () => {
    const e = rect({ color: { r: 10, g: 20, b: 30 } });

    expect(e.style).toBe('rgb(10 20 30)');

    e.color.g = 99.6;
    expect(e.style).toBe('rgb(10 100 30)');

    e.color = { r: 1, g: 2, b: 3 };
    expect(e.style).toBe('rgb(1 2 3)');
  });

  it('restores everything it had, including extra fields', () => {
    const e = line({ x1: 5, color: { r: 1 } });
    e.tint = 'red';
    const color = e.color;
    const state = e.snapshot();

    Object.assign(e, { x1: 50, t1: 0.2, tint: 'blue', ease: Math.sqrt });
    e.color.r = 200;

    e.restore(state);

    expect(e).toMatchObject({ x1: 5, t1: 1, tint: 'red', ease: linear });
    expect(e.color).toBe(color);
    expect(e.style).toBe('rgb(1 0 0)');
  });

  it('only carries the fields its shape needs', () => {
    expect(rect()).not.toHaveProperty('t0');
    expect(circle()).not.toHaveProperty('startAngle');
    expect(line()).toMatchObject({ t0: 0, t1: 1, segments: 32, ease: linear });
  });
});

describe('math', () => {
  it('mixes two colours', () => {
    expect(mix({ r: 0, g: 100, b: 200 }, { r: 100, g: 100, b: 0 }, 0.25)).toEqual({ r: 25, g: 100, b: 150 });
  });

  it('finds the point at an angle in degrees, 0 being up and turning anticlockwise', () => {
    const origin = { x: 100, y: 100 };
    const at = (angle) => {
      const { x, y } = polar(origin, angle, 10);
      return [Math.round(x * 1e6) / 1e6 + 0, Math.round(y * 1e6) / 1e6 + 0];
    };

    expect(at(0)).toEqual([100, 90]);
    expect(at(90)).toEqual([90, 100]);
    expect(at(180)).toEqual([100, 110]);
    expect(at(-90)).toEqual([110, 100]);
    expect(at(360)).toEqual([100, 90]);
  });
});
