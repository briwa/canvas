# machine

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

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

It works anywhere a step does: in `scene.add(shapes, m)`, or as a layer's step. It never finishes.

Click the figure first. Walk with ← → or A / D, and hop with space, ↑ or W. Watch out for acorns. The figure's settings change how fast it walks, how high it hops, and how often acorns fall.

```js sandbox=canvas 640x300 control=none code
const { Scene, Entity, KeyboardInput, machine, rect, circle, step, forever, tween, move, wait, sequence, parallel, repeat, clamp, easeInOutSine, linear, mix } = Canvas;

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
const scene = new Scene({ canvas, inputs: [keyboard] });

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

scene.add(sky).add([ground, canopy, label]).add(hero, brain);

scene.every(drop, () => {
  const x = 20 + Math.random() * (width - 40);

  const acorn = circle({ x0: x - 6, x1: x + 6, y0: 14, y1: 28, color: { r: 120, g: 78, b: 42 } });

  acorns.add(acorn);
  scene.spawn(
    acorn,
    sequence(move({ y: HORIZON - 28 }, { duration: 1600, ease: (p) => p * p }), tween({ alpha: 0 }, { duration: 300 })),
    () => acorns.delete(acorn),
  );
});

scene.onUpdate(() => {
  for (const acorn of acorns) {
    const hit = acorn.x1 > head.x0 && acorn.x0 < head.x1 && acorn.y1 > head.y0 && acorn.y0 < body.y1;

    if (hit && acorn.alpha === 1 && !brain.is('dizzy')) {
      acorns.delete(acorn);
      scene.remove(acorn);
      brain.go('dizzy');
    }
  }

  label.text = brain.state;
});

loop((t) => scene.render(t));
onCleanup(() => scene.destroy());
```
