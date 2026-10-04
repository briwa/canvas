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

export function straight() {
  return 0;
}

export function drawLine(ctx, entity) {
  const { x0, y0, t0, t1, offset, segments } = entity;
  const dx = entity.x1 - x0;
  const dy = entity.y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  const nx = dy / length;
  const ny = -dx / length;

  const at = (t) => {
    const o = offset(t, entity);

    return [x0 + dx * t + nx * o, y0 + dy * t + ny * o];
  };

  ctx.lineWidth = entity.lineWidth;

  ctx.beginPath();
  ctx.moveTo(...at(t0));

  const count = offset === straight ? 1 : segments;

  for (let i = 1; i <= count; i++) {
    ctx.lineTo(...at(t0 + ((t1 - t0) * i) / count));
  }

  ctx.stroke();
}
