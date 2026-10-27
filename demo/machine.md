# Machine

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## machine

`machine(targets?, options)` → `Machine`

A step that is always in one of its states.

| parameter | type | default | description |
| --- | --- | --- | --- |
| `targets` | `Entity \| Entity[]` | layer's shapes | Shapes its steps work on. |
| `options.initial` | `string` | required | State to start in. |
| `options.states` | `{ [name]: State }` | required | The states. |

| `State` field | type | description |
| --- | --- | --- |
| `step` | `Step \| (m) => Step` | Runs while in the state, from the start each time it's entered. |
| `on` | `(m) => string \| false` | Checked every frame. Return a state's name to go there. |
| `done` | `string` | State to go to once `step` ends. |
| `exit` | `(m) => void` | Called on the way out. |

| member | type | description |
| --- | --- | --- |
| `state` | `string` | Current state. |
| `elapsed` | `number` | Ms since it entered the state. |
| `is(...names)` | `boolean` | Whether it's in any of `names`. |
| `go(name)` | `this` | Goes to `name` on the next frame. |

| returns | |
| --- | --- |
| `Machine` | A step that never finishes. |

```js sandbox=canvas 640x200 code expand
const { Scene, layer, Entity, circle, machine, move, tween } = Canvas;

const ball = circle({ x0: 40, y0: 80, x1: 80, y1: 120, color: { r: 224, g: 122, b: 95 } });

const brain = machine({
  initial: 'right',
  states: {
    right: { step: move({ x: 520 }, { duration: 1200 }), done: 'rest' },
    rest: {
      step: tween({ alpha: 0.4 }, { duration: 300 }),
      on: (m) => m.elapsed >= 800 && (ball.x0 > width / 2 ? 'left' : 'right'),
      exit: () => (ball.alpha = 1),
    },
    left: { step: move({ x: -520 }, { duration: 1200 }), done: 'rest' },
  },
});

const label = new Entity({
  x0: 16,
  y0: height - 16,
  color: { r: 150, g: 158, b: 168 },
  draw(ctx) {
    ctx.font = '14px monospace';
    ctx.fillText(brain.state, 16, height - 16);
  },
});

const scene = new Scene({ canvas, layers: [layer([ball], brain), layer([label])] });

loop((t) => scene.render(t));
```

The [demo](#demo) has a bigger one, played with the keyboard.
