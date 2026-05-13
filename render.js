import { CONFIG, clamp } from "./sim-core.js";

function drawSource(ctx, source, enabled, label) {
  if (!enabled) {
    return;
  }

  const glowRadius = source.radius * 2.6;
  const glow = ctx.createRadialGradient(source.x, source.y, 0, source.x, source.y, glowRadius);
  glow.addColorStop(0, `${source.color}cc`);
  glow.addColorStop(0.45, `${source.color}55`);
  glow.addColorStop(1, `${source.color}00`);

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(source.x, source.y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = source.color;
  ctx.beginPath();
  ctx.arc(source.x, source.y, source.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(34, 49, 38, 0.88)";
  ctx.font = '700 12px "IBM Plex Mono", monospace';
  ctx.textAlign = "center";
  ctx.fillText(label, source.x, source.y + 4);
}

function drawFeedingPulse(ctx, state) {
  if (state.life.feedingPulse <= 0) {
    return;
  }

  const pulse = state.life.feedingPulse;
  ctx.save();
  ctx.strokeStyle = `rgba(117, 164, 57, ${0.45 * pulse})`;
  ctx.lineWidth = 2 + pulse * 3;
  ctx.beginPath();
  ctx.arc(state.fly.x, state.fly.y, CONFIG.fly.size + 11 + pulse * 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawBitterDanger(ctx, state) {
  if (state.life.bitterExposure <= 0 || !state.controls.bitterEnabled) {
    return;
  }

  const exposure = state.life.bitterExposure;
  ctx.save();
  ctx.strokeStyle = `rgba(193, 79, 70, ${0.2 + exposure * 0.45})`;
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.arc(CONFIG.sources.bitter.x, CONFIG.sources.bitter.y, CONFIG.hazards.bitterRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawFly(ctx, state) {
  const { x, y, theta } = state.fly;
  const size = CONFIG.fly.size;
  const health = state.life.health;
  const stress = state.life.stress;
  const alive = state.life.alive;
  const bodyAlpha = alive ? clamp(0.38 + health * 0.62, 0.34, 1) : 0.28;
  const bodyColor = stress > 0.62 ? "#6b2e2b" : "#2b2a26";

  ctx.save();
  ctx.globalAlpha = bodyAlpha;
  ctx.translate(x, y);
  ctx.rotate(theta);
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.72, size * 0.62);
  ctx.lineTo(-size * 0.34, 0);
  ctx.lineTo(-size * 0.72, -size * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = alive ? "#f9efe1" : "#d8cfc1";
  ctx.beginPath();
  ctx.arc(1, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();

  if (!alive) {
    ctx.strokeStyle = "#2b2a26";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.lineTo(5, 5);
    ctx.moveTo(5, -5);
    ctx.lineTo(-5, 5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTrail(ctx, state) {
  if (state.fly.trail.length < 2) {
    return;
  }

  ctx.save();
  ctx.lineWidth = 1.2;

  for (let index = 1; index < state.fly.trail.length; index += 1) {
    const previous = state.fly.trail[index - 1];
    const current = state.fly.trail[index];
    const alpha = index / state.fly.trail.length;
    ctx.strokeStyle = `rgba(72, 118, 90, ${alpha * 0.18})`;
    ctx.beginPath();
    ctx.moveTo(previous.x, previous.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawWorld(ctx, state) {
  ctx.clearRect(0, 0, CONFIG.world.width, CONFIG.world.height);

  ctx.save();
  ctx.strokeStyle = "rgba(66, 89, 56, 0.23)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, CONFIG.world.width - 20, CONFIG.world.height - 20);
  ctx.restore();

  drawTrail(ctx, state);
  drawSource(ctx, CONFIG.sources.sugar, state.controls.sugarEnabled, "S");
  drawSource(ctx, CONFIG.sources.bitter, state.controls.bitterEnabled, "B");
  drawSource(ctx, CONFIG.sources.light, state.controls.lightEnabled, "L");
  drawBitterDanger(ctx, state);
  drawFeedingPulse(ctx, state);
  drawFly(ctx, state);
}
