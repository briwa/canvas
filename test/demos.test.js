import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { FRAME, figure, figures, find, hash, install, mount, parse, play, uninstall } from './harness.js';

const CORAL = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const PAGES = ['getting-started.md', 'steps.md', 'scene.md', 'input.md'];

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
      const external = text.indexOf('```sandbox=external label=@briwa.dev/canvas\nhttps://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js\n```');

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
  it('bounces the ball from side to side', () => {
    const fig = open('getting-started.md', 'Getting started');
    const trace = play(fig, { to: 2400 });
    const ball = (t) => parse(find(at(trace, t), CORAL)[0]);

    expect(ball(0)).toMatchObject({ x0: 40, x1: 80, y0: 80, y1: 120 });
    expect(ball(600).x0).toBeCloseTo(300, 0);
    expect(ball(1200)).toMatchObject({ x0: 560, x1: 600 });
    expect(ball(2400)).toMatchObject({ x0: 40, x1: 80 });
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
      'stroke',
      'fill',
    ]);
    expect(first[1]).toBe('rect 20 60 80 80 | rgb(224 122 95) a=1');
    expect(first[2]).toBe('fill E165,100,40,40,0,0,6.28 | rgb(224 122 95) a=1');
    expect(first[3]).toBe('stroke M230,140 L310,60 | rgb(224 122 95) a=1 w=4');
    expect(first[4]).toBe('stroke E375,100,40,40,0,0,0 | rgb(224 122 95) a=1 w=4');
    expect(first[6]).toBe('fill M585,60 L625,140 L545,140 | rgb(224 122 95) a=1');

    expect(at(trace, 1200)[4]).toBe('stroke E375,100,40,40,0,0,6.28 | rgb(224 122 95) a=1 w=4');
    expect(at(trace, 1200)[5]).toMatch(/^stroke M440,140( L[\d.]+,[\d.]+){32} \|/);
    expect(at(trace, 1200)[5]).toContain('L520,60 |');
    expect(at(trace, 2000)).toEqual(at(trace, 1200));
    expect(at(trace, 3200)).toEqual(first);
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

  describe('all together', () => {
    const INK = { r: 236, g: 232, b: 222 };
    const start = () => open('steps.md', 'All together');
    const planet = (ops) => parse(find(ops, BLUE).find((op) => op.startsWith('fill')));
    const moon = (ops) => parse(find(ops, INK).find((op) => op.startsWith('fill')));
    const strokes = (ops) => find(ops, INK).filter((op) => op.includes('w=3'));
    const bars = (ops) => ops.slice(3, 12).map(parse);

    it('draws each kind of shape in order', () => {
      const [frame] = play(start(), { to: 0 });

      expect(frame.ops.map((op) => op.split(' ')[0])).toEqual([
        'clear',
        'rect',
        'stroke',
        ...Array(9).fill('rect'),
        'stroke',
        'fill',
        'fill',
        'fill',
        ...Array(32).fill('stroke'),
      ]);
      expect(frame.ops[1]).toBe('rect 0 0 960 320 | rgb(30 30 40) a=1');
      expect(frame.ops[2]).toBe('stroke M56,239 L264,239 | rgb(236 232 222) a=0.3 w=2');
    });

    it('orbits the planet around the sun and the moon around the planet', () => {
      const trace = play(start(), { to: 6000 });

      expect(planet(at(trace, 0))).toMatchObject({ cx: 575, cy: 160, rx: 9 });
      expect(planet(at(trace, 1500))).toMatchObject({ cx: 480, cy: 205 });
      expect(planet(at(trace, 3000))).toMatchObject({ cx: 385, cy: 160 });
      expect(planet(at(trace, 4500))).toMatchObject({ cx: 480, cy: 115 });
      expect(planet(at(trace, 6000))).toMatchObject({ cx: 575, cy: 160 });

      for (const t of [0, 700, 1400, 2380, 5000]) {
        const p = planet(at(trace, t));
        const m = moon(at(trace, t));
        const angle = (t / 1400) * Math.PI * 2;

        expect(m.cx).toBeCloseTo(p.cx + Math.cos(angle) * 20, 1);
        expect(m.cy).toBeCloseTo(p.cy + Math.sin(angle) * 20, 1);
        expect(m.rx).toBe(3.5);
      }
    });

    it('bounces the equalizer bars to a new height every beat', () => {
      const trace = play(start(), { to: 2400 });

      for (const { ops } of trace) {
        for (const bar of bars(ops)) {
          expect(bar.y1).toBe(235);
          expect(bar.y0).toBeGreaterThanOrEqual(85);
          expect(bar.y0).toBeLessThanOrEqual(225);
        }
      }

      const heights = (t) => bars(at(trace, t)).map((bar) => bar.y0);

      for (let beat = 240; beat <= 2400; beat += 240) {
        expect(heights(beat)).not.toEqual(heights(beat - 240));
      }
    });

    it('scribbles a line, holds it, fades it out, and scribbles a new one', () => {
      const trace = play(start(), { to: 5400 });
      const lines = (t) => strokes(at(trace, t));
      const visible = (t) => lines(t).filter((op) => parse(op).alpha > 0);

      expect(lines(0)).toHaveLength(32);
      expect(visible(0).length).toBeGreaterThan(4);

      for (const op of visible(2600)) {
        const [, x, y] = /M([-\d.]+),([-\d.]+)/.exec(op).map(Number);

        expect(x).toBeGreaterThanOrEqual(664);
        expect(x).toBeLessThanOrEqual(936);
        expect(y).toBeGreaterThanOrEqual(100);
        expect(y).toBeLessThanOrEqual(220);
        expect(parse(op).alpha).toBe(1);
      }

      expect(lines(1300)).not.toEqual(lines(2600));
      expect(lines(2600)).toEqual(lines(3500));
      expect(visible(3980)).toHaveLength(0);
      expect(visible(4000).length).toBeGreaterThan(4);
      expect(lines(4000)).not.toEqual(lines(0));
    });

    it('draws the same frames as the shapes demo it replaced', () => {
      const trace = play(start(), { to: 8000 });

      expect(hashes(trace)).toMatchSnapshot();
      expect(at(trace, 2000)).toMatchSnapshot('frame 2000');
    });
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

    it('walks the hero across, hops, and fades them out', () => {
      const trace = play(start(), { to: 6920 });

      expect(hero(at(trace, 0)).body).toMatchObject({ x0: 60, y0: 284, alpha: 0 });
      expect(hero(at(trace, 700)).body).toMatchObject({ x0: 60, y0: 284, alpha: 1 });
      expect(hero(at(trace, 3200)).body).toMatchObject({ x0: 390, y0: 284, alpha: 1 });
      expect(hero(at(trace, 3460)).body).toMatchObject({ x0: 390, y0: 242 });
      expect(hero(at(trace, 3460)).head).toMatchObject({ cx: 403, cy: 232 });
      expect(hero(at(trace, 3720)).body).toMatchObject({ x0: 390, y0: 284 });
      expect(hero(at(trace, 6220)).body).toMatchObject({ x0: 720, y0: 284, alpha: 1 });
      expect(hero(at(trace, 6920)).body).toMatchObject({ x0: 720, y0: 284, alpha: 0 });
    });

    it('bobs while walking', () => {
      const trace = play(start(), { to: 3200 }).filter(({ time }) => time >= 700);
      const lows = trace.map(({ ops }) => hero(ops).body.y0);

      expect(Math.min(...lows)).toBeCloseTo(284 - 7, 0);
      expect(Math.max(...lows)).toBe(284);
    });

    it('loops back to the first frame once the hero is done', () => {
      const trace = play(start(), { to: 6960 });

      expect(at(trace, 6940)).toEqual(at(trace, 0));
      expect(at(trace, 6960)).toEqual(at(trace, 20));
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

      for (const t of [0, 1500, 3340, 6920]) {
        expect(at(trace, t)).toMatchSnapshot(`frame ${t}`);
      }
    });
  });

  describe('your own controls', () => {
    const start = () => {
      const fig = open('scene.md', 'Your own controls');
      const button = (text) => fig.elements.find((el) => el.textContent === text);
      const controls = { pause: button('pause'), reset: button('reset'), loop: button('loop: on') };
      const resets = fig.elements.find((el) => el.tagName === 'SPAN');

      return { fig, controls, resets };
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
        'resets: 0',
      ]);
    });

    it('rolls the ball across, fades it, and loops, counting each reset', () => {
      const { fig, resets } = start();
      const trace = play(fig, { to: 1960 });

      expect(ball(at(trace, 0))).toMatchObject({ x0: 20, alpha: 1 });
      expect(ball(at(trace, 1500))).toMatchObject({ x0: 580, alpha: 1 });
      expect(ball(at(trace, 1900))).toMatchObject({ x0: 580, alpha: 0 });
      expect(ball(at(trace, 1920))).toMatchObject({ x0: 20, alpha: 1 });
      expect(resets.textContent).toBe('resets: 1');
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
      const { fig, controls, resets } = start();
      const trace = play(fig, {
        to: 1100,
        onFrame: script({ 1000: () => controls.reset.click() }),
      });

      expect(at(trace, 1000)).toEqual(at(trace, 0));
      expect(at(trace, 1100)).toEqual(at(trace, 100));
      expect(resets.textContent).toBe('resets: 1');
    });

    it('stays at the end with looping off, and loops again once it is back on', () => {
      const { fig, controls, resets } = start();
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
      expect(resets.textContent).toBe('resets: 1');
    });
  });
});

describe('input', () => {
  describe('mouse', () => {
    const LANTERN = { r: 255, g: 232, b: 172 };
    const GLOW = { r: 255, g: 178, b: 92 };
    const BURST = { r: 255, g: 214, b: 160 };
    const HOME = { cx: 230, cy: 118 };
    const start = () => open('input.md', 'MouseInput');
    const lantern = (ops) => parse(find(ops, LANTERN)[0]);
    const glow = (ops) => parse(find(ops, GLOW)[0]);
    const burst = (ops) => parse(find(ops, BURST)[0]);

    it('draws the scenery behind the lantern', () => {
      const [{ ops }] = play(start(), { to: 0 });

      expect(ops).toHaveLength(1 + 5 + 1 + 2 + 2 + 3);
      expect(ops.slice(-3).map((op) => op.split(' ')[0])).toEqual(['stroke', 'fill', 'fill']);
      expect(find(ops, GLOW)[0]).toBe(ops.at(-2));
      expect(find(ops, LANTERN)[0]).toBe(ops.at(-1));
    });

    it('sways the trees back and forth', () => {
      const trace = play(start(), { to: 3400 });
      const canopy = (t) => parse(at(trace, t)[9]);

      expect(canopy(0).cx).toBeCloseTo(66);
      expect(canopy(1700).cx).toBeCloseTo(71);
      expect(canopy(3400).cx).toBeCloseTo(66);
    });

    it('eases the lantern and its glow after the pointer, and back home when it leaves', () => {
      const fig = start();
      const trace = play(fig, {
        to: 3000,
        onFrame: script({
          200: () => fig.canvas.fire('pointermove', { clientX: 100, clientY: 80 }),
          1600: () => fig.canvas.fire('pointerleave'),
        }),
      });

      expect(lantern(at(trace, 180))).toMatchObject(HOME);
      expect(lantern(at(trace, 200)).cx).toBeLessThan(230);
      expect(lantern(at(trace, 240)).cx).toBeLessThan(lantern(at(trace, 220)).cx);
      expect(lantern(at(trace, 1400))).toMatchObject({ cx: 100, cy: 80 });
      expect(glow(at(trace, 1400))).toMatchObject({ cx: 100, cy: 80, rx: 38 });
      expect(lantern(at(trace, 3000))).toMatchObject(HOME);
    });

    it('scales pointer positions into canvas pixels', () => {
      const fig = start();
      fig.canvas.getBoundingClientRect = () => ({ left: 10, top: 20, width: 230, height: 150 });

      const trace = play(fig, {
        to: 2000,
        onFrame: script({ 0: () => fig.canvas.fire('pointermove', { clientX: 60, clientY: 70 }) }),
      });

      expect(lantern(at(trace, 2000))).toMatchObject({ cx: 100, cy: 100 });
    });

    it('brightens the glow while held and dims it once let go', () => {
      const fig = start();
      const trace = play(fig, {
        to: 3000,
        onFrame: script({
          200: () => fig.canvas.fire('pointerdown', { clientX: 230, clientY: 118 }),
          1400: () => fig.canvas.fire('pointerup', { clientX: 230, clientY: 118 }),
        }),
      });

      expect(glow(at(trace, 0)).alpha).toBe(0.22);
      expect(glow(at(trace, 220)).alpha).toBeGreaterThan(0.22);
      expect(glow(at(trace, 1380)).alpha).toBe(0.55);
      expect(glow(at(trace, 1420)).alpha).toBeLessThan(0.55);
      expect(glow(at(trace, 3000)).alpha).toBe(0.22);
    });

    it('bursts a ring out from every click, ignoring clicks mid-burst', () => {
      const fig = start();
      const trace = play(fig, {
        to: 2000,
        onFrame: script({
          400: () => {
            fig.canvas.fire('pointerdown', { clientX: 100, clientY: 80 });
            fig.canvas.fire('pointerup', { clientX: 100, clientY: 80 });
          },
          600: () => fig.canvas.fire('pointerdown', { clientX: 300, clientY: 150 }),
          1200: () => fig.canvas.fire('pointerdown', { clientX: 300, clientY: 150 }),
        }),
      });

      expect(burst(at(trace, 380)).alpha).toBe(0);
      expect(burst(at(trace, 400))).toMatchObject({ cx: 100, cy: 80, rx: 5, ry: 5, alpha: 0.6 });
      expect(burst(at(trace, 620))).toMatchObject({ cx: 100, cy: 80 });
      expect(burst(at(trace, 660))).toMatchObject({ cx: 100, cy: 80, rx: 37.5, alpha: 0.3 });
      expect(burst(at(trace, 920))).toMatchObject({ cx: 100, cy: 80, rx: 70, alpha: 0 });
      expect(burst(at(trace, 1200))).toMatchObject({ cx: 300, cy: 150, rx: 5, alpha: 0.6 });
    });
  });

  describe('keyboard', () => {
    const BODY = { r: 232, g: 98, b: 76 };
    const HEAD = { r: 246, g: 208, b: 178 };
    const start = () => open('input.md', 'KeyboardInput');
    const body = (ops) => parse(find(ops, BODY)[0]);
    const head = (ops) => parse(find(ops, HEAD)[0]);
    const key = (fig, type, name) => () => fig.canvas.fire(type, { key: name });

    it('makes the canvas focusable and draws the hero in front', () => {
      const fig = start();
      const [{ ops }] = play(fig, { to: 0 });

      expect(fig.canvas.tabIndex).toBe(0);
      expect(ops).toHaveLength(1 + 5 + 1 + 2 + 2 + 2);
      expect(find(ops, BODY)[0]).toBe(ops.at(-2));
      expect(find(ops, HEAD)[0]).toBe(ops.at(-1));
    });

    it('walks while an arrow is held', () => {
      const fig = start();
      const trace = play(fig, {
        to: 1600,
        onFrame: script({ 400: key(fig, 'keydown', 'ArrowRight'), 1400: key(fig, 'keyup', 'ArrowRight') }),
      });

      expect(body(at(trace, 380))).toMatchObject({ x0: 40, x1: 66 });
      expect(body(at(trace, 400))).toMatchObject({ x0: 44, x1: 70 });
      expect(body(at(trace, 1400))).toMatchObject({ x0: 240, x1: 266 });
      expect(head(at(trace, 1400))).toMatchObject({ cx: 253 });
      expect(body(at(trace, 1600))).toMatchObject({ x0: 240 });
    });

    it('walks left with A and stops at the edges', () => {
      const fig = start();
      const trace = play(fig, {
        to: 5000,
        onFrame: script({
          0: key(fig, 'keydown', 'a'),
          1000: key(fig, 'keyup', 'a'),
          1200: key(fig, 'keydown', 'd'),
        }),
      });

      expect(body(at(trace, 20))).toMatchObject({ x0: 36 });
      expect(body(at(trace, 1000))).toMatchObject({ x0: 8, x1: 34 });
      expect(body(at(trace, 5000))).toMatchObject({ x0: 426, x1: 452 });
    });

    it('cancels out opposite directions', () => {
      const fig = start();
      const trace = play(fig, {
        to: 400,
        onFrame: script({
          0: () => {
            key(fig, 'keydown', 'ArrowLeft')();
            key(fig, 'keydown', 'ArrowRight')();
          },
        }),
      });

      expect(body(at(trace, 400))).toMatchObject({ x0: 40 });
    });

    it('hops on a jump key and ignores more jumps mid-air', () => {
      const fig = start();
      const trace = play(fig, {
        to: 1400,
        onFrame: script({
          200: key(fig, 'keydown', ' '),
          300: key(fig, 'keyup', ' '),
          400: key(fig, 'keydown', 'ArrowUp'),
          500: key(fig, 'keyup', 'ArrowUp'),
          1000: key(fig, 'keydown', 'W'),
        }),
      });

      expect(body(at(trace, 200))).toMatchObject({ y0: 166, y1: 210 });
      expect(body(at(trace, 460))).toMatchObject({ y0: 88, y1: 132 });
      expect(body(at(trace, 720))).toMatchObject({ y0: 166, y1: 210 });
      expect(body(at(trace, 900))).toMatchObject({ y0: 166 });
      expect(body(at(trace, 1260))).toMatchObject({ y0: 88 });
    });

    it('does not repeat a hop while the key is held down', () => {
      const fig = start();
      const trace = play(fig, {
        to: 1600,
        onFrame: script({
          200: key(fig, 'keydown', ' '),
          400: key(fig, 'keydown', ' '),
          800: key(fig, 'keydown', ' '),
        }),
      });

      expect(body(at(trace, 1060))).toMatchObject({ y0: 166 });
    });

    it('walks and hops at the same time', () => {
      const fig = start();
      const trace = play(fig, {
        to: 600,
        onFrame: script({ 0: key(fig, 'keydown', 'd'), 200: key(fig, 'keydown', 'w') }),
      });

      expect(body(at(trace, 460))).toMatchObject({ x0: 132, y0: 88 });
    });

    it('stops the browser from handling the keys it uses', () => {
      const fig = start();

      for (const name of [' ', 'ArrowUp', 'w', 'ArrowLeft', 'a', 'ArrowRight', 'd']) {
        expect(fig.canvas.fire('keydown', { key: name }).defaultPrevented).toBe(true);
        expect(fig.canvas.fire('keyup', { key: name }).defaultPrevented).toBe(true);
      }

      expect(fig.canvas.fire('keydown', { key: 'x' }).defaultPrevented).toBe(false);
      expect(fig.canvas.fire('keydown', { key: 'Tab' }).defaultPrevented).toBe(false);
    });

    it('lets go of every key when the canvas loses focus', () => {
      const fig = start();
      const trace = play(fig, {
        to: 400,
        onFrame: script({ 0: key(fig, 'keydown', 'd'), 200: () => fig.canvas.fire('blur') }),
      });

      expect(body(at(trace, 180))).toMatchObject({ x0: 76 });
      expect(body(at(trace, 400))).toMatchObject({ x0: 76 });
    });

    it('stops listening once cleaned up', () => {
      const fig = start();
      play(fig, { to: 100 });
      fig.cleanup();

      expect(key(fig, 'keydown', ' ')().defaultPrevented).toBe(false);
    });
  });

  it('draws the same frames as the input demo it replaced', () => {
    const mouse = open('input.md', 'MouseInput');
    const keyboard = open('input.md', 'KeyboardInput');
    const pointer = (type, x, y) => () => mouse.canvas.fire(type, { clientX: x, clientY: y });
    const key = (type, name) => () => keyboard.canvas.fire(type, { key: name });

    const events = {
      200: [pointer('pointermove', 120, 90)],
      400: [key('keydown', 'ArrowRight')],
      600: [pointer('pointerdown', 140, 100)],
      900: [pointer('pointerup', 140, 100)],
      1200: [pointer('pointerdown', 300, 60)],
      1300: [pointer('pointerup', 300, 60)],
      1400: [key('keydown', ' ')],
      1500: [key('keyup', ' ')],
      1600: [() => mouse.canvas.fire('pointerleave')],
      2000: [key('keyup', 'ArrowRight')],
      2200: [key('keydown', 'a')],
      2400: [key('keydown', 'w')],
      2500: [key('keyup', 'w')],
      3000: [key('keyup', 'a')],
    };

    const mouseTrace = [];
    const keyboardTrace = [];

    for (let t = 0; t <= 6000; t += FRAME) {
      for (const fire of events[t] ?? []) fire();
      mouseTrace.push({ time: t, ops: mouse.tick(t) });
      keyboardTrace.push({ time: t, ops: keyboard.tick(t) });
    }

    expect(hashes(mouseTrace)).toMatchSnapshot('mouse');
    expect(hashes(keyboardTrace)).toMatchSnapshot('keyboard');
    expect(at(mouseTrace, 1400)).toMatchSnapshot('mouse frame 1400');
    expect(at(keyboardTrace, 1660)).toMatchSnapshot('keyboard frame 1660');
  });
});
