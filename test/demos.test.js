import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FRAME, figure, figures, find, hash, install, mount, parse, play, uninstall } from './harness.js';

const CORAL = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const PAGES = ['getting-started.md', 'steps.md', 'scene.md', 'machine.md'];

beforeEach(() => {
  install({ seed: 7 });
});

afterEach(() => {
  uninstall();
});

function hashes(trace) {
  return trace.map(({ time, ops }) => `${time}: ${hash(ops)}`);
}

function at(trace, time) {
  return trace.find((frame) => frame.time === time).ops;
}

function script(events) {
  return (time) => events[time]?.();
}

function open(file, heading, n) {
  return mount(figure(file, heading, n));
}

describe('every page', () => {
  for (const page of PAGES) {
    it(`${page} loads the library before its figures`, () => {
      const text = readFileSync(new URL(`../demo/${page}`, import.meta.url), 'utf8');
      const external = text.indexOf('```text sandbox=external label=@briwa.dev/canvas\nhttps://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js\n```');

      expect(external).toBeGreaterThan(0);
      expect(external).toBeLessThan(figures(page)[0].from);
    });

    for (const [i, block] of figures(page).entries()) {
      it(`${page} > ${block.heading} #${i} runs and shows its code`, () => {
        const fig = mount(block);
        const trace = play(fig, { to: 3000, each: 100 });

        expect(block.showCode).toBe(true);
        expect(trace.every(({ ops }) => ops.length > 1)).toBe(true);
        expect(hashes(trace)).toMatchSnapshot();

        fig.cleanup();
      });
    }
  }
});

describe('getting started', () => {
  it('bounces the ball there and back once, then tells the sandbox to reset', () => {
    const fig = open('getting-started.md', 'Getting started');
    const trace = play(fig, {
      to: 2400,
      onFrame: (t) => expect(fig.resets).toBe(0),
    });
    const ball = (t) => parse(find(at(trace, t), CORAL)[0]);

    expect(ball(0)).toMatchObject({ x0: 40, x1: 80, y0: 80, y1: 120 });
    expect(ball(600).x0).toBeCloseTo(300, 0);
    expect(ball(1200)).toMatchObject({ x0: 560, x1: 600 });
    expect(ball(2400)).toMatchObject({ x0: 40, x1: 80 });
    expect(fig.resets).toBe(1);

    play(fig, { from: 2420, to: 4000 });
    expect(fig.resets).toBe(1);
  });

  it('draws each kind of shape, and a custom one', () => {
    const fig = open('getting-started.md', 'Shapes');
    const trace = play(fig, { to: 3200 });
    const first = at(trace, 0);

    expect(first.map((op) => op.split(' ')[0])).toEqual([
      'clear',
      'rect',
      'fill',
      'stroke',
      'stroke',
      'fill',
      'fill',
    ]);
    expect(first[1]).toBe('rect 20 60 80 80 | rgb(224 122 95) a=1');
    expect(first[2]).toBe('fill E165,100,40,40,0,0,6.28 | rgb(224 122 95) a=1');
    expect(first[3]).toBe('stroke E270,100,40,40,0,0,0 | rgb(224 122 95) a=1 w=4');
    expect(first[4]).toMatch(/^stroke M335,140( L335,140){32} \|/);
    expect(first[5]).toMatch(/^fill M440,110 .* L455,82.22 .* L520,110 L520,140 L440,140 \|/);
    expect(first[6]).toBe('fill M585,60 L625,140 L545,140 | rgb(224 122 95) a=1');

    expect(at(trace, 1200)[3]).toBe('stroke E270,100,40,40,0,0,6.28 | rgb(224 122 95) a=1 w=4');
    expect(at(trace, 1200)[4]).toMatch(/^stroke M335,140 L335.85,135.85( L[\d.]+,[\d.]+){31} \|/);
    expect(at(trace, 1200)[4]).toContain('L415,60 |');
    expect(at(trace, 2000)).toEqual(at(trace, 1200));
    expect(at(trace, 3200)).toEqual(first);
    expect(fig.resets).toBe(1);
  });

  it('tells the sandbox to reset only once the shapes are done', () => {
    const fig = open('getting-started.md', 'Shapes');

    play(fig, { to: 3180 });
    expect(fig.resets).toBe(0);

    play(fig, { from: 3200, to: 3200 });
    expect(fig.resets).toBe(1);
  });
});

describe('helpers', () => {
  it('turns the hand anticlockwise from 12, blending its colour over a turn', () => {
    const fig = open('getting-started.md', 'Helpers');
    const trace = play(fig, { to: 6000 });
    const hand = (t) => at(trace, t).at(-1);

    expect(at(trace, 0)).toHaveLength(1 + 12 + 1);
    expect(at(trace, 0)[1]).toBe('stroke M320,30 L320,20 | rgb(118 176 222) a=1 w=2');
    expect(at(trace, 0)[4]).toBe('stroke M250,100 L240,100 | rgb(118 176 222) a=1 w=2');
    expect(hand(0)).toBe('stroke M320,100 L320,36 | rgb(224 122 95) a=1 w=4');
    expect(hand(1500)).toBe('stroke M320,100 L384,100 | rgb(171 149 159) a=1 w=4');
    expect(hand(3000)).toBe('stroke M320,100 L320,164 | rgb(118 176 222) a=1 w=4');
    expect(hand(6000)).toBe(hand(0));
  });
});

describe('steps', () => {
  it('staggers the dots up and back down, changing colour', () => {
    const fig = open('steps.md', 'tween');
    const trace = play(fig, { to: 1800 });
    const dots = (t) => at(trace, t).slice(1).map(parse);

    expect(dots(0).map((d) => d.y0)).toEqual(Array(8).fill(150));
    expect(dots(200)[0].y0).toBeLessThan(150);
    expect(dots(200)[7].y0).toBe(150);

    for (const op of at(trace, 900).slice(1)) {
      expect(parse(op).y0).toBe(50);
      expect(op).toContain('rgb(224 122 95)');
    }

    for (const op of at(trace, 1800).slice(1)) {
      expect(parse(op).y0).toBe(150);
      expect(op).toContain('rgb(118 176 222)');
    }
  });

  describe('cards', () => {
    const ACCENT = 'rgb(244 63 94)';
    const cards = (ops) => ops.slice(1);
    const start = () => open('steps.md', 'tween', 1);

    it('lays the cards out in a grid', () => {
      const [frame] = play(start(), { to: 0 });

      expect(cards(frame.ops)).toHaveLength(60);
      expect(parse(cards(frame.ops)[0])).toMatchObject({ x0: 9.6, y0: 33.6, y1: 70.4 });
      expect(parse(cards(frame.ops)[1])).toMatchObject({ x0: 96.87, y0: 9.6, y1: 70.4 });
      expect(parse(cards(frame.ops)[11])).toMatchObject({ x0: 9.6, y0: 89.6, y1: 150.4 });
      expect(parse(cards(frame.ops)[59])).toMatchObject({ x0: 358.69, y0: 409.6 });
    });

    it('staggers the cards in, then shifts them to the accent, then loops', () => {
      const trace = play(start(), { to: 3100 });

      for (const card of cards(at(trace, 0)).map(parse)) expect(card.alpha).toBe(0);

      const mid = cards(at(trace, 400)).map(parse);
      expect(mid[0].alpha).toBeCloseTo(0.44, 2);
      expect(mid[59].alpha).toBe(0);
      expect(mid[20].alpha).toBeGreaterThan(mid[40].alpha);

      cards(at(trace, 1500)).forEach((op, i) => {
        expect(parse(op)).toMatchObject({ alpha: 1, y0: Math.floor(i / 11) * 80 + 9.6 });
        expect(op).not.toContain('rgb(30 41 59)');
      });

      for (const op of cards(at(trace, 3000))) {
        expect(op).toContain(ACCENT);
        expect(parse(op).alpha).toBe(0.25);
      }

      expect(at(trace, 3020)).toEqual(at(trace, 0));
      expect(at(trace, 3100)).toEqual(at(trace, 80));
    });

    it('slides each card up as it fades in', () => {
      const trace = play(start(), { to: 1500 });
      const card = (t) => parse(cards(at(trace, t))[0]);

      expect(card(20).y0).toBeCloseTo(9.6 + 24 * (1 - 20 / 900), 1);
      expect(card(20).y1).toBe(70.4);
      expect(card(900).y0).toBe(9.6);
    });

    it('draws the same frames as the perf demo it replaced', () => {
      const trace = play(start(), { to: 6400 });

      expect(hashes(trace)).toMatchSnapshot();
      expect(at(trace, 800)).toMatchSnapshot('frame 800');
    });
  });

  it('walks one square round in a sequence while the other blinks in parallel', () => {
    const fig = open('steps.md', 'move, sequence, parallel, repeat, wait');
    const trace = play(fig, { to: 2800 });
    const walker = (t) => parse(find(at(trace, t), CORAL)[0]);
    const blinker = (t) => parse(find(at(trace, t), BLUE)[0]);

    expect(walker(0)).toMatchObject({ x0: 180, y0: 50 });
    expect(walker(500)).toMatchObject({ x0: 380, y0: 50 });
    expect(walker(1000)).toMatchObject({ x0: 380, y0: 130 });
    expect(walker(1300)).toMatchObject({ x0: 380, y0: 130 });
    expect(walker(1800)).toMatchObject({ x0: 180, y0: 130 });
    expect(walker(2300)).toMatchObject({ x0: 180, y0: 50 });
    expect(walker(2600)).toMatchObject({ x0: 180, y0: 50 });
    expect(walker(2800).x0).toBeGreaterThan(180);

    expect(blinker(600).alpha).toBe(0.2);
    expect(blinker(1200).alpha).toBe(1);
    expect(blinker(1800).alpha).toBe(0.2);
  });

  it('blinks at random moments, both eyes together', () => {
    const fig = open('steps.md', 'until');
    const trace = play(fig, { to: 10000 });
    const height = (op) => parse(op).y1 - parse(op).y0;
    const heights = trace.map(({ ops }) => height(ops[1]));
    const shut = heights.filter((h) => h < 10).length;

    expect(heights[0]).toBe(80);
    expect(shut).toBeGreaterThan(0);
    expect(shut).toBeLessThan(heights.length / 4);
    expect(Math.min(...heights)).toBeGreaterThanOrEqual(4);
    expect(Math.max(...heights)).toBe(80);

    for (const { ops } of trace) {
      expect(height(ops[1])).toBe(height(ops[2]));
    }
  });

  it('circles the planet forever', () => {
    const fig = open('steps.md', 'forever');
    const trace = play(fig, { to: 7000 });

    for (const t of [0, 1000, 3000, 7000]) {
      const planet = parse(find(at(trace, t), BLUE)[0]);

      expect(planet.cx).toBeCloseTo(320 + Math.cos(t / 1000) * 160, 1);
      expect(planet.cy).toBeCloseTo(100 + Math.sin(t / 1000) * 60, 1);
    }
  });

  it('shakes the box and settles it back where it was', () => {
    const fig = open('steps.md', 'Your own steps');
    const trace = play(fig, { to: 3000 });
    const box = (t) => parse(at(trace, t)[1]);

    expect(box(780)).toMatchObject({ x0: 280, x1: 360 });
    expect(box(840).x0).not.toBe(280);
    expect(Math.abs(box(840).x0 - 280)).toBeLessThanOrEqual(14);
    expect(box(1400)).toMatchObject({ x0: 280, x1: 360 });
    expect(box(2100)).toMatchObject({ x0: 280 });
    expect(box(2240).x0).not.toBe(280);
  });
});

describe('scene', () => {
  describe('a day in the park', () => {
    const BODY = { r: 232, g: 98, b: 76 };
    const HEAD = { r: 246, g: 208, b: 178 };
    const SUN = { r: 250, g: 226, b: 168 };
    const start = () => open('scene.md', 'Finishing and looping');
    const hero = (ops) => ({ body: parse(find(ops, BODY)[0]), head: parse(find(ops, HEAD)[0]) });

    it('draws the layers back to front', () => {
      const [{ ops }] = play(start(), { to: 0 });

      expect(ops[0]).toBe('clear 0 0 960 480');
      expect(ops).toHaveLength(1 + 6 + 1 + 1 + 4 + 4 + 2);
      expect(find(ops, SUN)[0]).toBe(ops[7]);
      expect(find(ops, BODY)[0]).toBe(ops.at(-2));
      expect(find(ops, HEAD)[0]).toBe(ops.at(-1));
    });

    it('walks the hero across, hops, waits, and fades them out', () => {
      const trace = play(start(), { to: 9320 });

      expect(hero(at(trace, 0)).body).toMatchObject({ x0: 60, y0: 284, alpha: 0 });
      expect(hero(at(trace, 700)).body).toMatchObject({ x0: 60, y0: 284, alpha: 1 });
      expect(hero(at(trace, 3200)).body).toMatchObject({ x0: 390, y0: 284, alpha: 1 });
      expect(hero(at(trace, 3460)).body).toMatchObject({ x0: 390, y0: 242 });
      expect(hero(at(trace, 3460)).head).toMatchObject({ cx: 403, cy: 232 });
      expect(hero(at(trace, 3720)).body).toMatchObject({ x0: 390, y0: 284 });
      expect(hero(at(trace, 6220)).body).toMatchObject({ x0: 720, y0: 284, alpha: 1 });
      expect(hero(at(trace, 8620)).body).toMatchObject({ x0: 720, y0: 284, alpha: 1 });
      expect(hero(at(trace, 9320)).body).toMatchObject({ x0: 720, y0: 284, alpha: 0 });
    });

    it('keeps the hero out after the sun has set, so the sky carries on into the next day', () => {
      const trace = play(start(), { to: 8600 });
      const sun = (time) => parse(find(at(trace, time), SUN)[0]);

      expect(sun(7800).cy).toBe(sun(0).cy);
      expect(hero(at(trace, 7800)).body.alpha).toBe(1);
      expect(sun(8600).cy).toBeLessThan(sun(7800).cy);
      expect(hero(at(trace, 8600)).body.alpha).toBe(1);
    });

    it('bobs while walking', () => {
      const trace = play(start(), { to: 3200 }).filter(({ time }) => time >= 700);
      const lows = trace.map(({ ops }) => hero(ops).body.y0);

      expect(Math.min(...lows)).toBeCloseTo(284 - 7, 0);
      expect(Math.max(...lows)).toBe(284);
    });

    it('loops back to the first frame once the hero is done', () => {
      const trace = play(start(), { to: 9360 });

      expect(at(trace, 9340)).toEqual(at(trace, 0));
      expect(at(trace, 9360)).toEqual(at(trace, 20));
    });

    it('holds still while the figure is paused, and carries on without a jump', () => {
      const plain = play(start(), { to: 3000 });
      const fig = start();
      const frames = [];

      for (let t = 0; t <= 2000; t += FRAME) fig.tick(t);
      for (let i = 0; i < 20; i++) frames.push(fig.tick(2000));
      for (let t = 2020; t < 3000; t += FRAME) fig.tick(t);

      for (const ops of frames) expect(ops).toEqual(at(plain, 2000));
      expect(fig.tick(3000)).toEqual(at(plain, 3000));
    });

    it('draws the same frames as the scene demo it replaced', () => {
      const trace = play(start(), { to: 16000 });

      expect(hashes(trace)).toMatchSnapshot();

      for (const t of [0, 1500, 3340, 8000, 9320]) {
        expect(at(trace, t)).toMatchSnapshot(`frame ${t}`);
      }
    });
  });

  describe('your own controls', () => {
    const start = () => {
      const fig = open('scene.md', 'Your own controls');
      const button = (text) => fig.elements.find((el) => el.textContent === text);
      const controls = { pause: button('pause'), reset: button('reset'), loop: button('loop: on') };
      const finished = fig.elements.find((el) => el.tagName === 'SPAN');

      return { fig, controls, finished };
    };
    const ball = (ops) => parse(ops[1]);

    it('lays out a canvas above a bar of controls', () => {
      const { fig } = start();

      expect(fig.root.children.map((el) => el.tagName)).toEqual(['CANVAS', 'DIV']);
      expect(fig.canvas).toMatchObject({ width: 640, height: 252 });
      expect(fig.root.children[1].children.map((el) => el.textContent)).toEqual([
        'pause',
        'reset',
        'loop: on',
        'finished: 0',
      ]);
    });

    it('rolls the ball across, fades it, and loops, counting each finish', () => {
      const { fig, finished } = start();
      const trace = play(fig, { to: 1960 });

      expect(ball(at(trace, 0))).toMatchObject({ x0: 20, alpha: 1 });
      expect(ball(at(trace, 1500))).toMatchObject({ x0: 580, alpha: 1 });
      expect(ball(at(trace, 1900))).toMatchObject({ x0: 580, alpha: 0 });
      expect(ball(at(trace, 1920))).toMatchObject({ x0: 20, alpha: 1 });
      expect(finished.textContent).toBe('finished: 1');
    });

    it('pauses and plays from its own button', () => {
      const { fig, controls } = start();
      const plain = play(start().fig, { to: 800 });
      const trace = play(fig, {
        to: 1200,
        onFrame: script({
          400: () => controls.pause.click(),
          800: () => controls.pause.click(),
        }),
      });

      expect(controls.pause.textContent).toBe('pause');
      expect(at(trace, 400)).toEqual(at(trace, 380));
      expect(at(trace, 780)).toEqual(at(trace, 380));
      expect(at(trace, 1200)).toEqual(at(plain, 800));
    });

    it('shows play while paused', () => {
      const { controls } = start();

      controls.pause.click();

      expect(controls.pause.textContent).toBe('play');
    });

    it('starts over from its own button', () => {
      const { fig, controls, finished } = start();
      const trace = play(fig, {
        to: 1100,
        onFrame: script({ 1000: () => controls.reset.click() }),
      });

      expect(at(trace, 1000)).toEqual(at(trace, 0));
      expect(at(trace, 1100)).toEqual(at(trace, 100));
      expect(finished.textContent).toBe('finished: 0');
    });

    it('stays at the end with looping off, and loops again once it is back on', () => {
      const { fig, controls, finished } = start();
      const trace = play(fig, {
        to: 3000,
        onFrame: script({
          200: () => {
            controls.loop.click();
            expect(controls.loop.textContent).toBe('loop: off');
          },
          2800: () => controls.loop.click(),
        }),
      });

      expect(controls.loop.textContent).toBe('loop: on');
      expect(ball(at(trace, 2780))).toMatchObject({ x0: 580, alpha: 0 });
      expect(ball(at(trace, 2820))).toMatchObject({ x0: 20, alpha: 1 });
      expect(finished.textContent).toBe('finished: 1');
    });
  });
});

describe('dynamic', () => {
  describe('spawn', () => {
    const SPARK = { r: 255, g: 190, b: 112 };
    const STAR = { r: 255, g: 236, b: 196 };
    const start = () => open('scene.md', 'spawn');
    const meter = (ops) => parse(find(ops, SPARK).find((op) => op.startsWith('rect')));
    const sparks = (ops) => find(ops, SPARK).filter((op) => op.startsWith('fill')).map(parse);
    const click = (fig, x, y) => () => {
      fig.canvas.fire('pointermove', { clientX: x, clientY: y });
      fig.canvas.fire('pointerdown', { clientX: x, clientY: y });
      fig.canvas.fire('pointerup', { clientX: x, clientY: y });
    };

    it('drops stars behind the hills, and removes them once they fade', () => {
      const fig = start();
      const trace = play(fig, { to: 6000 });
      const stars = (t) => find(at(trace, t), STAR);
      const hill = (t) => at(trace, t).findIndex((op) => op.includes('rgb(26 32 50)'));

      expect(stars(0)).toHaveLength(0);
      expect(stars(240)).toHaveLength(1);
      expect(at(trace, 240).indexOf(stars(240)[0])).toBeLessThan(hill(240));
      expect(stars(3000).length).toBeGreaterThan(4);
      expect(stars(3000).length).toBeLessThan(9);
      expect(meter(at(trace, 3000)).x1).toBe(16 + stars(3000).length * 6);
      expect(stars(6000).length).toBeLessThan(9);
    });

    it('throws sparks out from a click that fade and go away', () => {
      const fig = start();
      const trace = play(fig, { to: 2000, onFrame: script({ 1000: click(fig, 300, 120) }) });

      expect(sparks(at(trace, 980))).toHaveLength(0);
      expect(sparks(at(trace, 1000))).toHaveLength(10);
      expect(sparks(at(trace, 1000)).every((s) => s.cx === 300 && s.cy === 120)).toBe(true);

      const spread = sparks(at(trace, 1400)).map((s) => Math.hypot(s.cx - 300, s.cy - 120));

      expect(Math.min(...spread)).toBeGreaterThan(30);
      expect(sparks(at(trace, 1400))[0].alpha).toBeLessThan(0.5);
      expect(sparks(at(trace, 1700))).toHaveLength(0);
    });
  });

  describe('machine', () => {
    const SHIRT = { r: 232, g: 98, b: 76 };
    const BRUISE = { r: 150, g: 92, b: 160 };
    const start = () => open('machine.md', 'machine');
    const body = (ops) => parse(ops.find((op) => op.startsWith('rect') && op.includes(' 26 44 ')));
    const state = (ops) => ops.find((op) => op.startsWith('text')).split(' ')[1];
    const key = (fig, type, name) => () => fig.canvas.fire(type, { key: name });

    it('bobs while idle, and shows its state', () => {
      const fig = start();
      const trace = play(fig, { to: 1200 });

      expect(fig.canvas.tabIndex).toBe(0);
      expect(state(at(trace, 0))).toBe('idle');
      expect(body(at(trace, 0))).toMatchObject({ x0: 300, y1: 230 });
      expect(body(at(trace, 600)).y1).toBe(227);
      expect(body(at(trace, 1200)).y1).toBe(230);
    });

    it('hops, lands, and goes back to idle', () => {
      const fig = start();
      const trace = play(fig, { to: 1200, onFrame: script({ 300: key(fig, 'keydown', ' '), 400: key(fig, 'keyup', ' ') }) });

      expect(state(at(trace, 300))).toBe('jump');
      expect(body(at(trace, 300)).y1).toBe(230);
      expect(body(at(trace, 560)).y1).toBe(152);
      expect(state(at(trace, 820))).toBe('land');
      expect(body(at(trace, 900)).y1).toBe(234);
      expect(state(at(trace, 1000))).toBe('idle');
      expect(body(at(trace, 1000)).y1).toBeCloseTo(230, 1);
    });

    it('walks while an arrow is held, and steers mid-hop', () => {
      const fig = start();
      const trace = play(fig, {
        to: 2000,
        each: 100,
        onFrame: script({
          200: key(fig, 'keydown', 'ArrowRight'),
          600: key(fig, 'keydown', 'w'),
          1000: key(fig, 'keyup', 'ArrowRight'),
          1400: key(fig, 'keydown', 'a'),
        }),
      });

      expect(state(at(trace, 200))).toBe('walk');
      expect(body(at(trace, 500)).x0).toBe(366);
      expect(state(at(trace, 600))).toBe('jump');
      expect(body(at(trace, 900))).toMatchObject({ x0: 432 });
      expect(body(at(trace, 1000)).x0).toBe(432);
      expect(state(at(trace, 1200))).toBe('land');
      expect(state(at(trace, 1300))).toBe('idle');
      expect(state(at(trace, 1400))).toBe('walk');
      expect(body(at(trace, 2000))).toMatchObject({ x0: 300, y1: 230 });
    });

    it('gets dizzy when an acorn lands on it, then shakes it off', () => {
      const fig = start();
      const trace = play(fig, { to: 5600, each: 20 });
      const acorns = (t) => find(at(trace, t), { r: 120, g: 78, b: 42 });

      expect(state(at(trace, 4500))).toBe('idle');
      expect(state(at(trace, 4520))).toBe('dizzy');
      expect(acorns(4520).map(parse).some((a) => a.x1 > 300 && a.x0 < 326 && a.y1 > 168)).toBe(false);
      expect(find(at(trace, 4640), BRUISE)).toHaveLength(1);
      expect(body(at(trace, 5000)).x0).not.toBe(300);
      expect(state(at(trace, 5480))).toBe('idle');
      expect(body(at(trace, 5480)).x0).toBe(300);
      expect(find(at(trace, 5480), SHIRT)).toHaveLength(1);
    });

    it('comes down to the ground when knocked out of a hop', () => {
      const fig = start();
      const trace = play(fig, { to: 4600, each: 20, onFrame: script({ 4300: key(fig, 'keydown', ' ') }) });

      expect(state(at(trace, 4400))).toBe('jump');
      expect(body(at(trace, 4400)).y1).toBeLessThan(210);
      expect(state(at(trace, 4420))).toBe('dizzy');
      expect(body(at(trace, 4420)).y1).toBe(230);
    });
  });
});
