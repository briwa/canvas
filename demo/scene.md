# Scene

```sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

| option | what it is |
| --- | --- |
| `canvas` | the `<canvas>` to draw on |
| `layers` | drawn back to front, all running at once |
| `inputs` | a `MouseInput` or `KeyboardInput` to listen with (see [input](#input)) |
| `loop` | start over once every layer that can end has ended |

| method | what it does |
| --- | --- |
| `render(time)` | move to `time` (in ms) and draw |
| `pause()` / `play()` | stop and resume the clock; `scene.paused` says which |
| `reset()` | put every target back how it started and start the clock again |
| `onReset(fn)` | call `fn` on every reset; returns a function that stops listening |
| `onFinish(fn)` | call `fn` each time the scene finishes; returns a function that stops listening |
| `destroy()` | stop listening to inputs |

`layer(targets, step?)` draws its targets in order, which can be shapes or other layers. Its step works on every target inside it, unless a step names its own. A layer without a step just draws.

## Finishing and looping

Layers that run forever, or have no step, don't count towards finishing. With `loop: true`, the scene starts over once the rest is done.

```sandbox=js viz 960x480 control=auto code
const { Scene, layer, circle, rect, step, tween, move, sequence, repeat, easeInOutSine, linear, mix } = Canvas;

const HORIZON = 330;
const BANDS = 6;
const SUN = 34;

const DUSK = { top: { r: 38, g: 32, b: 62 }, low: { r: 216, g: 118, b: 82 } };
const DAWN = { top: { r: 46, g: 56, b: 96 }, low: { r: 196, g: 122, b: 132 } };
const DAY = { top: { r: 78, g: 140, b: 206 }, low: { r: 190, g: 218, b: 238 } };

function walk({ duration, dx, strides, lift = 7 }) {
  const beats = strides * 2;
  const span = duration / beats;

  return step({
    duration,
    start(s) {
      for (const part of s.targets) {
        s.tween(part, { startAt: 0, duration, ease: linear, to: { x0: part.x0 + dx, x1: part.x1 + dx } });

        const { y0, y1 } = part;

        for (let i = 0; i < beats; i++) {
          const up = i % 2 === 0;

          s.tween(part, {
            startAt: i * span,
            duration: span,
            ease: easeInOutSine,
            from: { y0: up ? y0 : y0 - lift, y1: up ? y1 : y1 - lift },
            to: { y0: up ? y0 - lift : y0, y1: up ? y1 - lift : y1 },
          });
        }
      }
    },
  });
}

function tree(x, scale) {
  const trunk = rect({
    x0: x - (13 * scale) / 2,
    x1: x + (13 * scale) / 2,
    y0: HORIZON - 74 * scale,
    y1: HORIZON,
    color: { r: 54, g: 40, b: 34 },
  });

  const canopy = circle({
    x0: x - (66 * scale) / 2,
    x1: x + (66 * scale) / 2,
    y0: HORIZON - 74 * scale - 60 * scale + 14 * scale,
    y1: HORIZON - 74 * scale + 14 * scale,
    color: { r: 46, g: 98, b: 64 },
  });

  return { trunk, canopy };
}

const bands = Array.from({ length: BANDS }, (_, i) =>
  rect({
    x0: 0,
    x1: width,
    y0: (i * HORIZON) / BANDS,
    y1: ((i + 1) * HORIZON) / BANDS + 1,
    color: mix(DUSK.top, DUSK.low, i / (BANDS - 1)),
  }),
);

const sun = circle({ x0: 664, x1: 664 + SUN, y0: HORIZON + 26, y1: HORIZON + 26 + SUN, color: { r: 250, g: 226, b: 168 } });
const ground = rect({ x0: 0, x1: width, y0: HORIZON, y1: height, color: { r: 34, g: 50, b: 42 } });

const trees = [tree(120, 1), tree(310, 0.8), tree(620, 1.1), tree(848, 0.9)];
const trunks = trees.map((t) => t.trunk);
const canopies = trees.map((t) => t.canopy);

const body = rect({ x0: 60, x1: 86, y0: HORIZON - 46, y1: HORIZON, alpha: 0, color: { r: 232, g: 98, b: 76 } });
const head = circle({ x0: 64, x1: 82, y0: HORIZON - 66, y1: HORIZON - 46, alpha: 0, color: { r: 246, g: 208, b: 178 } });
const hero = [body, head];

const skyTo = ({ top, low }, duration) =>
  tween((_, i) => ({ color: mix(top, low, i / (BANDS - 1)) }), { duration, ease: linear });

const sunTo = (y0, duration, ease) => tween({ y0, y1: y0 + SUN }, { duration, ease });

const sway = (x) => move({ x }, { duration: 1300, ease: easeInOutSine });

const hop = (y) => move({ y }, { duration: 260, ease: easeInOutSine });

const scene = new Scene({
  canvas,
  loop: true,
  layers: [
    layer(bands, repeat(sequence(skyTo(DAWN, 2200), skyTo(DAY, 2800), skyTo(DUSK, 2800)))),
    layer(
      sun,
      repeat(
        sequence(
          sunTo(HORIZON - 4, 2200, linear),
          sunTo(68, 2800, easeInOutSine),
          sunTo(HORIZON + 26, 2800, easeInOutSine),
        ),
      ),
    ),
    layer([ground, trunks]),
    layer(canopies, repeat(sequence(sway(7), sway(-7)))),
    layer(
      hero,
      sequence(
        tween({ alpha: 1 }, { duration: 700 }),
        walk({ duration: 2500, dx: 330, strides: 7 }),
        hop(-42),
        hop(42),
        walk({ duration: 2500, dx: 330, strides: 7 }),
        tween({ alpha: 0 }, { duration: 700 }),
      ),
    ),
  ],
});

loop((t) => scene.render(t));
```

## Your own controls

`onReset` fires on every reset, including the ones from looping.

```sandbox=js viz=root 640x300 control=none code
const { Scene, layer, circle, tween, sequence, easeInOutSine } = Canvas;

const canvas = document.createElement('canvas');
canvas.width = width;
canvas.height = height - 48;

const bar = document.createElement('div');
bar.style.cssText = 'display:flex;gap:8px;align-items:center;justify-content:center;height:48px;font:13px system-ui';
root.append(canvas, bar);

function button(label, onClick) {
  const el = document.createElement('button');
  el.textContent = label;
  el.onclick = onClick;
  bar.append(el);
  return el;
}

const ball = circle({ x0: 20, y0: 106, x1: 60, y1: 146, color: { r: 224, g: 122, b: 95 } });

const scene = new Scene({
  canvas,
  loop: true,
  layers: [
    layer(
      ball,
      sequence(
        tween({ x0: width - 60, x1: width - 20 }, { duration: 1500, ease: easeInOutSine }),
        tween({ alpha: 0 }, { duration: 400 }),
      ),
    ),
  ],
});

const pause = button('pause', () => {
  if (scene.paused) scene.play();
  else scene.pause();
  pause.textContent = scene.paused ? 'play' : 'pause';
});

button('reset', () => scene.reset());

const looping = button('loop: on', () => {
  scene.loop = !scene.loop;
  looping.textContent = scene.loop ? 'loop: on' : 'loop: off';
});

const resets = document.createElement('span');
resets.textContent = 'resets: 0';
bar.append(resets);

let count = 0;
scene.onReset(() => {
  count++;
  resets.textContent = `resets: ${count}`;
});

loop((t) => scene.render(t));
```
