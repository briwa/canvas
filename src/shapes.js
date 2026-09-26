import { linear } from './math';

export function drawRect(ctx, entity) {
  ctx.fillRect(entity.x0, entity.y0, entity.x1 - entity.x0, entity.y1 - entity.y0);
}

function trace(ctx, entity, startAngle, endAngle) {
  ctx.beginPath();
  ctx.ellipse(
    (entity.x0 + entity.x1) / 2,
    (entity.y0 + entity.y1) / 2,
    Math.abs(entity.x1 - entity.x0) / 2,
    Math.abs(entity.y1 - entity.y0) / 2,
    0,
    startAngle,
    endAngle,
  );
}

export function drawCircle(ctx, entity) {
  trace(ctx, entity, 0, Math.PI * 2);
  ctx.fill();
}

export function drawArc(ctx, entity) {
  ctx.lineWidth = entity.lineWidth;

  trace(ctx, entity, entity.startAngle, entity.endAngle);
  ctx.stroke();
}

export function drawLine(ctx, entity) {
  const { x0, y0, t0, t1, ease, segments } = entity;
  const dx = entity.x1 - x0;
  const dy = entity.y1 - y0;

  ctx.lineWidth = entity.lineWidth;

  ctx.beginPath();
  ctx.moveTo(x0 + dx * t0, y0 + dy * ease(t0));

  const count = ease === linear ? 1 : segments;

  for (let i = 1; i <= count; i++) {
    const t = t0 + ((t1 - t0) * i) / count;
    ctx.lineTo(x0 + dx * t, y0 + dy * ease(t));
  }

  ctx.stroke();
}
