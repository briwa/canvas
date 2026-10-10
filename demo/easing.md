# easing

```text sandbox=external label=@briwa.dev/canvas
https://cdn.jsdelivr.net/npm/@briwa.dev/canvas/dist/index.iife.js
```

## curves

A dot goes from 0 to 1 and back, `ease(progress)` sets where it is, and the marks show where it sits at even steps of time.

```js sandbox=canvas 640x300 code
const { Scene, layer, Entity, path, circle, tween, wait, sequence, repeat, forever, linear } = Canvas;

const name = knob('easeInOutSine', {
  options: ['linear', 'easeInOutSine', 'easeInOutSineInverse', 'easeInSine', 'easeOutSine', 'easeOutLog', 'easeInExpo', 'easeInOutCubic', 'easeOutBack'],
});
const duration = knob(1200, { min: 200, max: 4000, step: 100 });
const hold = knob(400, { min: 0, max: 2000, step: 100 });

const ease = Canvas[name];

const INK = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const MUTED = { r: 150, g: 158, b: 168 };

const plot = { x0: 40, y0: 250, x1: 240, y1: 50 };
const track = { x0: 300, x1: 600, y: 150 };

const curve = path({
  x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y0,
  segments: 120,
  lineWidth: 3,
  color: INK,
  offset: (t) => ease(t) * (plot.y0 - plot.y1),
});

const axes = [
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y0, lineWidth: 1, color: MUTED }),
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x0, y1: plot.y1, lineWidth: 1, color: MUTED }),
  path({ x0: plot.x0, y0: plot.y0, x1: plot.x1, y1: plot.y1, lineWidth: 1, alpha: 0.5, color: MUTED }),
  path({ x0: track.x0, y0: track.y, x1: track.x1, y1: track.y, lineWidth: 1, color: MUTED }),
];

const marks = Array.from({ length: 21 }, (_, i) => {
  const x = track.x0 + (track.x1 - track.x0) * ease(i / 20);

  return path({ x0: x, y0: track.y + 18, x1: x, y1: track.y + 30, lineWidth: 2, color: BLUE });
});

const dot = (color) => circle({ x0: 0, y0: 0, x1: 0, y1: 0, color });
const onCurve = dot(INK);
const onTrack = dot(INK);
const linearGhost = dot(MUTED);

const text = (x0, y0, value) =>
  new Entity({
    x0,
    y0,
    value,
    color: MUTED,
    draw(ctx, e) {
      ctx.font = '12px monospace';
      ctx.fillText(e.value, e.x0, e.y0);
    },
  });

const readout = text(track.x0, 240, '');
const clock = new Entity({ progress: 0, draw() {} });

const place = (entity, x, y, r) => Object.assign(entity, { x0: x - r, y0: y - r, x1: x + r, y1: y + r });

const scene = new Scene({
  canvas,
  layers: [
    layer([axes, curve, marks, text(plot.x0, 275, 'progress →'), text(plot.x0 - 30, plot.y1 - 12, 'ease(progress)'), text(track.x0, 110, 'grey: linear, coral: ' + name)]),
    layer(
      [clock],
      repeat(
        sequence(
          tween({ progress: 1 }, { duration, ease: linear }),
          wait(hold),
          tween({ progress: 0 }, { duration, ease: linear }),
          wait(hold),
        ),
      ),
    ),
    layer(
      [linearGhost, onCurve, onTrack, readout],
      forever(() => {
        const p = clock.progress;
        const e = ease(p);

        place(onCurve, plot.x0 + (plot.x1 - plot.x0) * p, plot.y0 - (plot.y0 - plot.y1) * e, 6);
        place(onTrack, track.x0 + (track.x1 - track.x0) * e, track.y, 9);
        place(linearGhost, track.x0 + (track.x1 - track.x0) * p, track.y, 6);
        readout.value = `progress ${p.toFixed(2)}   ease ${e.toFixed(2)}`;
      }),
    ),
  ],
});

loop((t) => scene.render(t));
```

## sequence

Chain up to three moves, and watch the speed where one hands over to the next. Turn on `matchSpeed` to pick each later duration so the speed carries over.

```js sandbox=canvas 640x480 control=default code
const { Scene, layer, Entity, path, circle, move, step, wait, sequence, forever } = Canvas;

const EASES = ['linear', 'easeInSine', 'easeOutSine', 'easeInOutSine', 'easeOutLog', 'easeInExpo', 'easeInOutCubic', 'easeOutBack', 'easeInOutSineInverse'];

const distance1 = knob(100, { min: -300, max: 400, step: 10 });
const duration1 = knob(1000, { min: 100, max: 6000, step: 100 });
const ease1 = knob('easeInSine', { options: EASES });
const leg2 = knob(true);
const distance2 = knob(100, { min: -300, max: 400, step: 10 });
const duration2 = knob(5000, { min: 100, max: 6000, step: 100 });
const ease2 = knob('easeOutLog', { options: EASES });
const leg3 = knob(false);
const distance3 = knob(-40, { min: -300, max: 400, step: 10 });
const duration3 = knob(800, { min: 100, max: 6000, step: 100 });
const ease3 = knob('easeInOutSine', { options: EASES });
const matchSpeed = knob(false);
const drift = knob(false);
const fade = knob(1500, { min: 200, max: 6000, step: 100 });

const INK = { r: 224, g: 122, b: 95 };
const BLUE = { r: 118, g: 176, b: 222 };
const MUTED = { r: 150, g: 158, b: 168 };
const FRAME = 1000 / 60;

const legs = [
  { distance: distance1, duration: duration1, name: ease1 },
  leg2 && { distance: distance2, duration: duration2, name: ease2 },
  leg3 && { distance: distance3, duration: duration3, name: ease3 },
]
  .filter(Boolean)
  .map((leg) => ({ ...leg, ease: Canvas[leg.name] }));

const H = 1e-4;
const startSpeed = (leg) => ((leg.ease(H) - leg.ease(0)) / H) * (leg.distance / leg.duration);
const endSpeed = (leg) => ((leg.ease(1) - leg.ease(1 - H)) / H) * (leg.distance / leg.duration);

if (matchSpeed) {
  legs.forEach((leg, i) => {
    const before = i && endSpeed(legs[i - 1]);
    const slope = ((leg.ease(H) - leg.ease(0)) / H) * leg.distance;

    if (before && slope / before > 0) leg.duration = Math.min(20000, Math.max(16, Math.round(slope / before)));
  });
}

const starts = legs.map((_, i) => legs.slice(0, i).reduce((sum, leg) => sum + leg.duration, 0));
const total = starts.at(-1) + legs.at(-1).duration;
const glide = endSpeed(legs.at(-1));
const span = total + (drift ? 4 * fade : 600);

const position = (time) => {
  let x = 0;

  for (const [i, leg] of legs.entries()) {
    if (time < starts[i] + leg.duration) return x + leg.distance * leg.ease(Math.max(0, (time - starts[i]) / leg.duration));
    x += leg.distance;
  }

  return drift ? x + glide * fade * (1 - Math.exp(-(time - total) / fade)) : x;
};

const speed = (time) => (position(time + 0.5) - position(time - 0.5)) * FRAME;

const samples = Array.from({ length: 401 }, (_, i) => (span * i) / 400);
const lowest = Math.min(0, ...samples.map(position));
const highest = Math.max(1, ...samples.map(position));
const fastest = Math.max(0.01, ...samples.map((t) => Math.abs(speed(t))));

const graph = { x0: 40, x1: 600 };
const scale = (graph.x1 - graph.x0) / (highest - lowest);

const plot = (y, value, color) =>
  path({ x0: graph.x0, y0: y, x1: graph.x1, y1: y, segments: 400, lineWidth: 2, color, offset: (t) => value(t * span) });

const text = (x0, y0, value, color = MUTED) =>
  new Entity({
    x0,
    y0,
    value,
    color,
    draw(ctx, e) {
      ctx.font = '12px monospace';
      e.value.split('\n').forEach((line, i) => ctx.fillText(line, e.x0, e.y0 + i * 16));
    },
  });

const seams = starts.slice(1).map((time, i) => {
  const x = graph.x0 + ((graph.x1 - graph.x0) * time) / span;
  const from = endSpeed(legs[i]) * FRAME;
  const to = startSpeed(legs[i + 1]) * FRAME;

  return {
    line: path({ x0: x, y0: 90, x1: x, y1: 300, lineWidth: 1, alpha: 0.6, color: BLUE }),
    label: `seam ${i + 1}: ${from.toFixed(2)} → ${to.toFixed(2)} px/frame${Math.abs(from - to) > 0.01 ? '' : ', matched'}`,
  };
});

const code = [
  'sequence(',
  ...legs.map((leg) => `  move({ x: ${leg.distance} }, { duration: ${leg.duration}, ease: ${leg.name} }),`),
  ...(drift ? [`  forever(...), // ${(glide * FRAME).toFixed(2)} px/frame, fading over ${fade}ms`] : []),
  ')',
].join('\n');

const dot = circle({ x0: graph.x0 - lowest * scale - 8, y0: 42, x1: graph.x0 - lowest * scale + 8, y1: 58, color: INK });
const cursor = path({ x0: graph.x0, y0: 90, x1: graph.x0, y1: 300, lineWidth: 1, color: INK });

const steps = legs.map((leg) => move({ x: leg.distance * scale }, { duration: leg.duration, ease: leg.ease }));
const driftStep = forever((s) => {
  const moved = glide * scale * Math.exp(-s.elapsed / fade) * s.dt;

  for (const target of s.targets) {
    target.x0 += moved;
    target.x1 += moved;
  }
});

const scene = new Scene({
  canvas,
  layers: [
    layer([
      path({ x0: graph.x0, y0: 50, x1: graph.x1, y1: 50, lineWidth: 1, color: MUTED }),
      path({ x0: graph.x0, y0: 250, x1: graph.x1, y1: 250, lineWidth: 1, color: MUTED }),
      plot(180, (t) => ((position(t) - lowest) / (highest - lowest)) * 90, INK),
      plot(250, (t) => (speed(t) / fastest) * 45, BLUE),
      seams.map((seam) => seam.line),
      text(graph.x0, 84, 'position'),
      text(graph.x0, 204, 'speed'),
      text(graph.x0, 330, seams.map((seam) => seam.label).join('\n') || 'one move, no seams'),
      text(graph.x0, 400, code),
    ]),
    layer([dot], sequence(...steps, drift ? driftStep : wait(600))),
    layer(
      [cursor],
      step({
        duration: span,
        update(s) {
          cursor.x0 = cursor.x1 = graph.x0 + ((graph.x1 - graph.x0) * Math.min(s.elapsed, span)) / span;
        },
      }),
    ),
  ],
});

scene.onFinish(() => reset());

loop((t) => scene.render(t));
```
