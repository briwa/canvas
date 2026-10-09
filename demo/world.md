# World

```sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

A scene plays a timeline over a set of shapes that never changes. A world is for things that come and go while it runs: add and remove shapes, spawn ones that only last as long as their step, and give them steps or state machines. Steps run on the world's own clock, which stops while it's paused. A world has no timeline, so there is no `seek` or `reset`.

| option | what it is |
| --- | --- |
| `canvas` | the `<canvas>` to draw on |
| `inputs` | a `MouseInput` or `KeyboardInput` to listen with (see [input](#input)) |

| method | what it does |
| --- | --- |
| `add(shapes, step?)` | draw `shapes` from now on, and run `step` on them if given |
| `spawn(shapes, step, done?)` | add `shapes` and run `step` on them, then remove them once it ends and call `done` |
| `remove(shapes)` | stop drawing `shapes`, and stop every step running on them |
| `run(shapes, step, done?)` | run `step` on `shapes`, then call `done`; returns a function that stops it |
| `after(ms, fn)` / `every(ms, fn)` | call `fn` once later, or over and over; each returns a function that stops it |
| `onUpdate(fn)` | call `fn(world)` each frame after the steps; returns a function that stops listening |
| `render(time)` | move to `time` (in ms) and draw |
| `pause()` / `play()` | stop and resume the clock |
| `destroy()` | stop listening to inputs, and stop every step |

`world.dt` is the time since the last frame, and `world.elapsed` is the time on the world's clock. Shapes are drawn in the order they were added, unless they have a `z`: lower goes behind. Anywhere a step goes, a function that makes one works too.

## spawn

A spawned shape lives for as long as its step does. `remove` it to cut that short; its `done` isn't called then.

Stars spawn on their own, and click to throw sparks. The bar at the bottom counts the stars and sparks in the world. Change how often stars fall and how many sparks a click throws from the figure's settings.

```sandbox=js viz 640x300 control=none code
const { World, MouseInput, rect, circle, line, move, moveTo, tween, wait, parallel, sequence, linear, easeInOutSine, mix, polar } = Canvas;

const HORIZON = 230;
const STAR = { r: 255, g: 236, b: 196 };
const SPARK = { r: 255, g: 190, b: 112 };

const rate = knob(220, { min: 40, max: 800, step: 10 });
const burst = knob(10, { min: 3, max: 30, step: 1 });

const mouse = new MouseInput();
const world = new World({ canvas, inputs: [mouse] });

const sky = Array.from({ length: 5 }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / 5,
    y1: ((i + 1) * HORIZON) / 5 + 1,
    color: mix({ r: 14, g: 16, b: 36 }, { r: 62, g: 46, b: 90 }, i / 4),
  }),
);

const hills = [
  circle({ x0: -140, x1: 360, y0: HORIZON - 64, y1: HORIZON + 300, z: 1, color: { r: 26, g: 32, b: 50 } }),
  circle({ x0: 300, x1: 820, y0: HORIZON - 36, y1: HORIZON + 300, z: 1, color: { r: 22, g: 27, b: 42 } }),
];

const meter = rect({ x0: 16, x1: 16, y0: height - 14, y1: height - 10, z: 2, color: SPARK });

world.add(sky).add(hills).add(meter);

const scenery = world.size;

const fall = () =>
  parallel(
    move({ x: 240, y: 150 }, { duration: 1500, ease: linear }),
    sequence(tween({ alpha: 1 }, { duration: 300 }), wait(500), tween({ alpha: 0 }, { duration: 700 })),
  );

world.every(rate, () => {
  const x = Math.random() * width - 120;
  const y = Math.random() * 90;

  world.spawn(line({ x0: x, y0: y, x1: x + 16, y1: y + 10, alpha: 0, lineWidth: 2, color: STAR }), fall);
});

world.onUpdate(() => {
  meter.x1 = 16 + (world.size - scenery) * 6;

  if (!mouse.pressed) return;

  for (let i = 0; i < burst; i++) {
    const to = polar(mouse, (i * 360) / burst + Math.random() * 20, 40 + Math.random() * 30);

    world.spawn(
      circle({ x0: mouse.x - 3, x1: mouse.x + 3, y0: mouse.y - 3, y1: mouse.y + 3, z: 2, color: SPARK }),
      parallel(moveTo({ x: to.x - 3, y: to.y - 3 }, { duration: 600, ease: easeInOutSine }), tween({ alpha: 0 }, { duration: 600 })),
    );
  }
});

loop((t) => world.render(t));
onCleanup(() => world.destroy());
```

## machine

`machine(shapes?, { initial, states })` is a step that is always in one of its `states`, starting with `initial`. Each state can have:

| field | what it is |
| --- | --- |
| `step` | the step to play while in the state, started over each time it's entered; or a function `(m) => step` to make a fresh one |
| `on(m)` | checked each frame; return a state's name to go there |
| `done` | the state to go to once the step ends |
| `exit(m)` | called on the way out, e.g. to tidy up after being cut short |

| on the machine | what it is |
| --- | --- |
| `state` | the name of the state it's in |
| `is(...names)` | whether it's in any of them |
| `go(name)` | go to `name` on the next frame |
| `elapsed` | ms since it entered the state |

It works in a world, and in a scene's layer too. It never finishes.

Click the figure first. Walk with ← → or A / D, and hop with space, ↑ or W. Watch out for acorns. The figure's settings change how fast it walks, how high it hops, and how often acorns fall.

```sandbox=js viz 640x300 control=none code
const { World, Entity, KeyboardInput, machine, rect, circle, step, forever, tween, move, wait, sequence, parallel, repeat, clamp, easeInOutSine, linear, mix } = Canvas;

const HORIZON = 230;
const JUMP = ['space', 'arrowup', 'w'];
const LEFT = ['arrowleft', 'a'];
const RIGHT = ['arrowright', 'd'];
const SHIRT = { r: 232, g: 98, b: 76 };
const BRUISE = { r: 150, g: 92, b: 160 };

const speed = knob(0.22, { min: 0.05, max: 0.6, step: 0.01 });
const hop = knob(78, { min: 20, max: 160, step: 1 });
const drop = knob(450, { min: 150, max: 1500, step: 10 });

canvas.tabIndex = 0;

const keyboard = new KeyboardInput({ prevent: [...JUMP, ...LEFT, ...RIGHT] });
const world = new World({ canvas, inputs: [keyboard] });

const sky = Array.from({ length: 5 }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / 5,
    y1: ((i + 1) * HORIZON) / 5 + 1,
    color: mix({ r: 78, g: 140, b: 206 }, { r: 192, g: 220, b: 240 }, i / 4),
  }),
);
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 34, g: 50, b: 42 } });
const canopy = rect({ x0: 0, x1: width, y0: 0, y1: 26, z: 2, color: { r: 46, g: 98, b: 64 } });

const body = rect({ x0: 300, x1: 326, y0: HORIZON - 44, y1: HORIZON, color: { ...SHIRT } });
const head = circle({ x0: 304, x1: 322, y0: HORIZON - 62, y1: HORIZON - 44, color: { r: 246, g: 208, b: 178 } });
const hero = [body, head];

const label = new Entity({
  x0: 16,
  y0: height - 24,
  text: '',
  color: { r: 220, g: 232, b: 220 },
  draw: (ctx, e) => {
    ctx.font = '14px ui-monospace, monospace';
    ctx.fillText(e.text, e.x0, e.y0);
  },
});

function drive(s) {
  const dir = keyboard.axis(LEFT, RIGHT);
  if (!dir) return;

  const dx = clamp(dir * speed * s.dt, 8 - body.x0, width - 8 - body.x1);

  for (const part of s.targets) {
    part.x0 += dx;
    part.x1 += dx;
  }
}

function land(m) {
  const dy = HORIZON - body.y1;

  for (const part of m.targets) {
    part.y0 += dy;
    part.y1 += dy;
  }
}

const lift = (y, duration = 260) => move({ y }, { duration, ease: easeInOutSine });
const shake = (x) => move({ x }, { duration: 60, ease: linear });

const jumped = () => keyboard.pressed(...JUMP) && 'jump';
const walking = () => keyboard.axis(LEFT, RIGHT) !== 0;

const brain = machine({
  initial: 'idle',
  states: {
    idle: {
      step: () => repeat(sequence(lift(-3, 600), lift(3, 600))),
      on: () => jumped() || (walking() && 'walk'),
      exit: land,
    },
    walk: {
      step: () => forever(drive),
      on: () => jumped() || (!walking() && 'idle'),
    },
    jump: {
      step: () => parallel(forever(drive), sequence(lift(-hop), lift(hop))),
      done: 'land',
      exit: land,
    },
    land: {
      step: () => sequence(lift(4, 80), lift(-4, 80)),
      done: 'idle',
      exit: land,
    },
    dizzy: {
      step: () =>
        parallel(
          sequence(repeat(sequence(shake(-5), shake(10), shake(-5)), 4), wait(240)),
          tween(body, { color: BRUISE }, { duration: 120 }),
        ),
      exit: () => Object.assign(body.color, SHIRT),
      done: 'idle',
    },
  },
});

const acorns = new Set();

world.add(sky).add([ground, canopy, label]).add(hero, brain);

world.every(drop, () => {
  const x = 20 + Math.random() * (width - 40);

  const acorn = circle({ x0: x - 6, x1: x + 6, y0: 14, y1: 28, color: { r: 120, g: 78, b: 42 } });

  acorns.add(acorn);
  world.spawn(
    acorn,
    sequence(move({ y: HORIZON - 28 }, { duration: 1600, ease: (p) => p * p }), tween({ alpha: 0 }, { duration: 300 })),
    () => acorns.delete(acorn),
  );
});

world.onUpdate(() => {
  for (const acorn of acorns) {
    const hit = acorn.x1 > head.x0 && acorn.x0 < head.x1 && acorn.y1 > head.y0 && acorn.y0 < body.y1;

    if (hit && acorn.alpha === 1 && !brain.is('dizzy')) {
      acorns.delete(acorn);
      world.remove(acorn);
      brain.go('dizzy');
    }
  }

  label.text = brain.state;
});

loop((t) => world.render(t));
onCleanup(() => world.destroy());
```
