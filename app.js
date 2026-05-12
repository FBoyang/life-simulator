const NEURON_NAMES = [
  "SUGAR",
  "SUGAR_L",
  "SUGAR_R",
  "BITTER",
  "LIGHT_L",
  "LIGHT_R",
  "SEEK",
  "AVOID",
  "TURN_L",
  "TURN_R",
  "FORWARD",
  "WANDER",
];

const IDX = Object.fromEntries(NEURON_NAMES.map((name, index) => [name, index]));

const CONFIG = {
  projectName: "Digital Fly - Tiny Connectome Simulator",
  world: {
    width: 760,
    height: 520,
    boundaryPadding: 18,
    trailMaxPoints: 480,
  },
  fly: {
    x: 138,
    y: 265,
    theta: -0.15,
    size: 13,
    baseSpeed: 5.2,
    forwardGain: 74,
    avoidSlowdown: 18,
    turnGain: 5.8,
    wanderTurnGain: 0.75,
    manualTurnRate: 4.6,
    maxSpeed: 92,
    bounceTurn: Math.PI * 0.58,
  },
  sources: {
    sugar: { x: 566, y: 162, radius: 22, color: "#bfd84e" },
    bitter: { x: 500, y: 260, radius: 24, color: "#d34d43" },
    light: { x: 592, y: 346, radius: 26, color: "#f8d66f" },
  },
  sensors: {
    sugarLambda: 195,
    bitterLambda: 150,
    lightLambda: 230,
  },
  neurons: {
    vRest: 0,
    vReset: 0,
    vThreshold: 1,
    membraneTau: 0.16,
    synTau: 0.24,
    traceTau: 0.52,
    refractoryPeriod: 0.09,
  },
  drives: {
    // Sensory drives are scaled high enough that these LIF sensory neurons spike
    // at realistic arena distances instead of staying subthreshold.
    sugar: 120,
    bitter: 120,
    light: 100,
    wanderTonic: 5.2,
    wanderFromLowSugar: 4.8,
    wanderFromBitter: 3.2,
  },
  animation: {
    fixedDt: 1 / 60,
    maxFrameDt: 0.08,
  },
};

const CONNECTOME_EDGES = [
  { from: "SUGAR", to: "SEEK", weight: 1.5, note: "Appetitive sensory input excites a seeking interneuron." },
  { from: "SUGAR_L", to: "SEEK", weight: 1.1, note: "Left antenna sugar input reinforces the seeking state." },
  { from: "SUGAR_R", to: "SEEK", weight: 1.1, note: "Right antenna sugar input reinforces the seeking state." },
  { from: "SUGAR_L", to: "TURN_L", weight: 0.72, note: "More sugar on the left antenna biases a left turn." },
  { from: "SUGAR_R", to: "TURN_R", weight: 0.72, note: "More sugar on the right antenna biases a right turn." },
  { from: "BITTER", to: "AVOID", weight: 1.55, note: "Aversive sensory input excites an avoidance interneuron." },
  { from: "LIGHT_L", to: "TURN_L", weight: 0.95, note: "Stronger left light nudges the body to turn left toward the lamp." },
  { from: "LIGHT_R", to: "TURN_R", weight: 0.95, note: "Stronger right light nudges the body to turn right toward the lamp." },
  { from: "SEEK", to: "FORWARD", weight: 1.4, note: "Seeking activity promotes forward locomotion." },
  { from: "SEEK", to: "TURN_L", weight: -0.28, note: "Sugar seeking slightly quiets left turning to reduce aimless turning." },
  { from: "SEEK", to: "TURN_R", weight: -0.28, note: "Sugar seeking slightly quiets right turning to reduce aimless turning." },
  { from: "SEEK", to: "WANDER", weight: -0.5, note: "Once sugar is sensed, exploratory wandering is damped." },
  { from: "AVOID", to: "FORWARD", weight: -0.35, note: "Avoidance adds a mild braking signal without fully freezing the fly." },
  { from: "AVOID", to: "TURN_L", weight: 0.85, note: "Avoidance biases the fly into an escape turn." },
  { from: "AVOID", to: "TURN_R", weight: 0.15, note: "A weaker partner turn keeps the escape maneuver broad rather than spinning in place." },
  { from: "AVOID", to: "WANDER", weight: 0.75, note: "Aversive state increases erratic steering." },
  { from: "WANDER", to: "TURN_L", weight: 0.32, note: "Exploratory state can feed left turns." },
  { from: "WANDER", to: "TURN_R", weight: 0.32, note: "Exploratory state can feed right turns." },
  { from: "WANDER", to: "FORWARD", weight: 0.24, note: "Exploration also produces a little ongoing locomotion." },
  { from: "TURN_L", to: "TURN_R", weight: -0.24, note: "Competing turn channels inhibit one another." },
  { from: "TURN_R", to: "TURN_L", weight: -0.24, note: "Competing turn channels inhibit one another." },
];

function buildWeightMatrix() {
  const matrix = Array.from({ length: NEURON_NAMES.length }, () =>
    Array.from({ length: NEURON_NAMES.length }, () => 0),
  );

  for (const edge of CONNECTOME_EDGES) {
    matrix[IDX[edge.from]][IDX[edge.to]] = edge.weight;
  }

  return matrix;
}

const WEIGHT_MATRIX = buildWeightMatrix();

const state = {
  controls: {
    sugarEnabled: true,
    bitterEnabled: false,
    lightEnabled: false,
    silencedNeuron: "",
    synapticScale: 1,
  },
  fly: {
    x: CONFIG.fly.x,
    y: CONFIG.fly.y,
    theta: CONFIG.fly.theta,
    trail: [],
  },
  neurons: [],
  sensory: {
    sugar: 0,
    sugarLeft: 0,
    sugarRight: 0,
    bitter: 0,
    lightLeft: 0,
    lightRight: 0,
  },
  motor: {
    forwardSpeed: 0,
    turnRate: 0,
  },
  interaction: {
    leftPressed: false,
    rightPressed: false,
    draggingSource: "",
    pointerActive: false,
  },
  wanderBias: 0.35,
  accumulator: 0,
  lastFrameTime: 0,
};

const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const activityBars = document.getElementById("activity-bars");
const sensoryReadout = document.getElementById("sensory-readout");
const motorReadout = document.getElementById("motor-readout");
const silencedReadout = document.getElementById("silenced-readout");
const controlReadout = document.getElementById("control-readout");
const sugarToggle = document.getElementById("toggle-sugar");
const bitterToggle = document.getElementById("toggle-bitter");
const lightToggle = document.getElementById("toggle-light");
const silenceSelect = document.getElementById("silence-select");
const synapticScaleInput = document.getElementById("synaptic-scale");
const synapticScaleValue = document.getElementById("synaptic-scale-value");
const resetButton = document.getElementById("reset-button");
const randomizeButton = document.getElementById("randomize-button");

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function normalizeAngle(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) {
    wrapped -= Math.PI * 2;
  }
  while (wrapped < -Math.PI) {
    wrapped += Math.PI * 2;
  }
  return wrapped;
}

function formatNumber(value) {
  return value.toFixed(2);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CONFIG.world.width / rect.width;
  const scaleY = CONFIG.world.height / rect.height;

  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function isSourceDraggable(sourceName) {
  if (sourceName === "sugar") {
    return state.controls.sugarEnabled;
  }
  return false;
}

function updateCanvasCursor() {
  canvas.classList.remove("is-draggable", "is-dragging");

  if (state.interaction.draggingSource) {
    canvas.classList.add("is-dragging");
  } else if (isSourceDraggable("sugar")) {
    canvas.classList.add("is-draggable");
  }
}

function moveSource(sourceName, x, y) {
  const source = CONFIG.sources[sourceName];
  const min = CONFIG.world.boundaryPadding + source.radius;
  const maxX = CONFIG.world.width - min;
  const maxY = CONFIG.world.height - min;

  source.x = clamp(x, min, maxX);
  source.y = clamp(y, min, maxY);
}

function createNeuronState() {
  return {
    v: CONFIG.neurons.vRest,
    g: 0,
    spiked: false,
    refractory: 0,
    trace: 0,
  };
}

function computeSensoryInputs() {
  const { x, y, theta } = state.fly;
  const inputs = {
    sugar: 0,
    sugarLeft: 0,
    sugarRight: 0,
    bitter: 0,
    lightLeft: 0,
    lightRight: 0,
  };

  if (state.controls.sugarEnabled) {
    const dx = CONFIG.sources.sugar.x - x;
    const dy = CONFIG.sources.sugar.y - y;
    const distance = Math.hypot(dx, dy);
    const base = Math.exp(-distance / CONFIG.sensors.sugarLambda);
    const angleToSugar = Math.atan2(dy, dx);
    const relativeAngle = normalizeAngle(angleToSugar - theta);
    const rightSignal = Math.sin(relativeAngle);

    inputs.sugar = base;
    inputs.sugarLeft = base * clamp(0.5 - 0.5 * rightSignal, 0, 1);
    inputs.sugarRight = base * clamp(0.5 + 0.5 * rightSignal, 0, 1);
  }

  if (state.controls.bitterEnabled) {
    const dx = CONFIG.sources.bitter.x - x;
    const dy = CONFIG.sources.bitter.y - y;
    const distance = Math.hypot(dx, dy);
    inputs.bitter = Math.exp(-distance / CONFIG.sensors.bitterLambda);
  }

  if (state.controls.lightEnabled) {
    const dx = CONFIG.sources.light.x - x;
    const dy = CONFIG.sources.light.y - y;
    const distance = Math.hypot(dx, dy);
    const base = Math.exp(-distance / CONFIG.sensors.lightLambda);
    const angleToLight = Math.atan2(dy, dx);
    const relativeAngle = normalizeAngle(angleToLight - theta);
    const rightSignal = Math.sin(relativeAngle);
    inputs.lightLeft = base * clamp(0.5 - 0.5 * rightSignal, 0, 1);
    inputs.lightRight = base * clamp(0.5 + 0.5 * rightSignal, 0, 1);
  }

  state.sensory = inputs;
  return inputs;
}

function updateNeuralSystem(dt, sensoryInputs) {
  const externalDrive = Array.from({ length: NEURON_NAMES.length }, () => 0);

  externalDrive[IDX.SUGAR] = sensoryInputs.sugar * CONFIG.drives.sugar * 0.65;
  externalDrive[IDX.SUGAR_L] = sensoryInputs.sugarLeft * CONFIG.drives.sugar;
  externalDrive[IDX.SUGAR_R] = sensoryInputs.sugarRight * CONFIG.drives.sugar;
  externalDrive[IDX.BITTER] = sensoryInputs.bitter * CONFIG.drives.bitter;
  externalDrive[IDX.LIGHT_L] = sensoryInputs.lightLeft * CONFIG.drives.light;
  externalDrive[IDX.LIGHT_R] = sensoryInputs.lightRight * CONFIG.drives.light;

  const lowSugarDrive = 1 - sensoryInputs.sugar;
  externalDrive[IDX.WANDER] =
    CONFIG.drives.wanderTonic +
    lowSugarDrive * CONFIG.drives.wanderFromLowSugar +
    sensoryInputs.bitter * CONFIG.drives.wanderFromBitter;

  for (let index = 0; index < state.neurons.length; index += 1) {
    const neuron = state.neurons[index];
    const neuronName = NEURON_NAMES[index];
    const silenced = state.controls.silencedNeuron === neuronName;

    neuron.spiked = false;
    neuron.trace += (-neuron.trace / CONFIG.neurons.traceTau) * dt;
    neuron.trace = Math.max(0, neuron.trace);

    if (silenced) {
      neuron.v = CONFIG.neurons.vReset;
      neuron.g = 0;
      neuron.refractory = 0;
      continue;
    }

    neuron.g += externalDrive[index] * dt;
    neuron.g += (-neuron.g / CONFIG.neurons.synTau) * dt;

    if (neuron.refractory > 0) {
      neuron.refractory = Math.max(0, neuron.refractory - dt);
      neuron.v = CONFIG.neurons.vReset;
      continue;
    }

    const dv =
      (neuron.g - (neuron.v - CONFIG.neurons.vRest)) / CONFIG.neurons.membraneTau;
    neuron.v += dv * dt;

    if (neuron.v >= CONFIG.neurons.vThreshold) {
      neuron.spiked = true;
      neuron.v = CONFIG.neurons.vReset;
      neuron.refractory = CONFIG.neurons.refractoryPeriod;
      neuron.trace += 1;
    }
  }

  for (let from = 0; from < state.neurons.length; from += 1) {
    if (!state.neurons[from].spiked) {
      continue;
    }

    for (let to = 0; to < state.neurons.length; to += 1) {
      const weight = WEIGHT_MATRIX[from][to];
      if (weight === 0) {
        continue;
      }
      state.neurons[to].g += weight * state.controls.synapticScale;
    }
  }
}

function updateFlyMovement(dt) {
  const forwardTrace = state.neurons[IDX.FORWARD].trace;
  const avoidTrace = state.neurons[IDX.AVOID].trace;
  const turnLeftTrace = state.neurons[IDX.TURN_L].trace;
  const turnRightTrace = state.neurons[IDX.TURN_R].trace;
  const wanderTrace = state.neurons[IDX.WANDER].trace;

  state.wanderBias = lerp(state.wanderBias, Math.random() * 2 - 1, 0.045);

  const forwardSpeed = clamp(
    CONFIG.fly.baseSpeed +
      forwardTrace * CONFIG.fly.forwardGain -
      avoidTrace * CONFIG.fly.avoidSlowdown,
    0,
    CONFIG.fly.maxSpeed,
  );

  const turnRate =
    (turnRightTrace - turnLeftTrace) * CONFIG.fly.turnGain +
    wanderTrace * state.wanderBias * CONFIG.fly.wanderTurnGain;

  const manualTurnInput =
    Number(state.interaction.rightPressed) - Number(state.interaction.leftPressed);
  const finalTurnRate = turnRate + manualTurnInput * CONFIG.fly.manualTurnRate;

  state.motor.forwardSpeed = forwardSpeed;
  state.motor.turnRate = finalTurnRate;

  state.fly.theta = normalizeAngle(state.fly.theta + finalTurnRate * dt);
  state.fly.x += Math.cos(state.fly.theta) * forwardSpeed * dt;
  state.fly.y += Math.sin(state.fly.theta) * forwardSpeed * dt;

  const minX = CONFIG.world.boundaryPadding;
  const minY = CONFIG.world.boundaryPadding;
  const maxX = CONFIG.world.width - CONFIG.world.boundaryPadding;
  const maxY = CONFIG.world.height - CONFIG.world.boundaryPadding;

  let bounced = false;

  if (state.fly.x < minX) {
    state.fly.x = minX;
    bounced = true;
  } else if (state.fly.x > maxX) {
    state.fly.x = maxX;
    bounced = true;
  }

  if (state.fly.y < minY) {
    state.fly.y = minY;
    bounced = true;
  } else if (state.fly.y > maxY) {
    state.fly.y = maxY;
    bounced = true;
  }

  if (bounced) {
    state.fly.theta = normalizeAngle(state.fly.theta + CONFIG.fly.bounceTurn);
  }

  state.fly.trail.push({ x: state.fly.x, y: state.fly.y });
  if (state.fly.trail.length > CONFIG.world.trailMaxPoints) {
    state.fly.trail.shift();
  }
}

function drawSource(source, enabled, label) {
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

function drawFly() {
  const { x, y, theta, size } = {
    x: state.fly.x,
    y: state.fly.y,
    theta: state.fly.theta,
    size: CONFIG.fly.size,
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(theta);
  ctx.fillStyle = "#2b2a26";
  ctx.beginPath();
  ctx.moveTo(size, 0);
  ctx.lineTo(-size * 0.72, size * 0.62);
  ctx.lineTo(-size * 0.34, 0);
  ctx.lineTo(-size * 0.72, -size * 0.62);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#f9efe1";
  ctx.beginPath();
  ctx.arc(1, 0, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTrail() {
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

function drawWorld() {
  ctx.clearRect(0, 0, CONFIG.world.width, CONFIG.world.height);

  ctx.save();
  ctx.strokeStyle = "rgba(66, 89, 56, 0.23)";
  ctx.lineWidth = 2;
  ctx.strokeRect(10, 10, CONFIG.world.width - 20, CONFIG.world.height - 20);
  ctx.restore();

  drawTrail();
  drawSource(CONFIG.sources.sugar, state.controls.sugarEnabled, "S");
  drawSource(CONFIG.sources.bitter, state.controls.bitterEnabled, "B");
  drawSource(CONFIG.sources.light, state.controls.lightEnabled, "L");
  drawFly();
}

function updateActivityPanel() {
  for (const neuronName of NEURON_NAMES) {
    const row = document.getElementById(`activity-${neuronName}`);
    const fill = row.querySelector(".activity-fill");
    const value = row.querySelector(".activity-value");
    const trace = state.neurons[IDX[neuronName]].trace;
    const normalized = clamp(trace / 2.2, 0, 1);
    fill.style.width = `${normalized * 100}%`;
    value.textContent = formatNumber(trace);
    row.dataset.silenced = state.controls.silencedNeuron === neuronName ? "true" : "false";
    row.style.opacity = row.dataset.silenced === "true" ? "0.45" : "1";
  }
}

function updateReadouts() {
  sensoryReadout.textContent =
    `sugar ${formatNumber(state.sensory.sugar)}\n` +
    `sugar_L ${formatNumber(state.sensory.sugarLeft)}\n` +
    `sugar_R ${formatNumber(state.sensory.sugarRight)}\n` +
    `bitter ${formatNumber(state.sensory.bitter)}\n` +
    `light_L ${formatNumber(state.sensory.lightLeft)}\n` +
    `light_R ${formatNumber(state.sensory.lightRight)}`;

  motorReadout.textContent =
    `speed ${formatNumber(state.motor.forwardSpeed)} px/s\n` +
    `turn ${formatNumber(state.motor.turnRate)} rad/s\n` +
    `heading ${formatNumber(state.fly.theta)} rad`;

  silencedReadout.textContent = state.controls.silencedNeuron || "None";
  if (state.interaction.leftPressed && state.interaction.rightPressed) {
    controlReadout.textContent = "Manual hold";
  } else if (state.interaction.leftPressed) {
    controlReadout.textContent = "Manual left";
  } else if (state.interaction.rightPressed) {
    controlReadout.textContent = "Manual right";
  } else {
    controlReadout.textContent = "Autopilot";
  }
}

function populateControls() {
  for (const neuronName of NEURON_NAMES) {
    const option = document.createElement("option");
    option.value = neuronName;
    option.textContent = neuronName;
    silenceSelect.appendChild(option);
  }

  sugarToggle.checked = state.controls.sugarEnabled;
  bitterToggle.checked = state.controls.bitterEnabled;
  lightToggle.checked = state.controls.lightEnabled;
  silenceSelect.value = state.controls.silencedNeuron;
  synapticScaleInput.value = String(state.controls.synapticScale);
  synapticScaleValue.textContent = formatNumber(state.controls.synapticScale);

  sugarToggle.addEventListener("change", (event) => {
    state.controls.sugarEnabled = event.target.checked;
    updateCanvasCursor();
  });

  bitterToggle.addEventListener("change", (event) => {
    state.controls.bitterEnabled = event.target.checked;
  });

  lightToggle.addEventListener("change", (event) => {
    state.controls.lightEnabled = event.target.checked;
  });

  silenceSelect.addEventListener("change", (event) => {
    state.controls.silencedNeuron = event.target.value;
    updateReadouts();
    updateActivityPanel();
  });

  synapticScaleInput.addEventListener("input", (event) => {
    state.controls.synapticScale = Number(event.target.value);
    synapticScaleValue.textContent = formatNumber(state.controls.synapticScale);
  });

  resetButton.addEventListener("click", () => {
    resetSimulation(false);
  });

  randomizeButton.addEventListener("click", () => {
    resetSimulation(true);
  });
}

function buildActivityPanel() {
  for (const neuronName of NEURON_NAMES) {
    const row = document.createElement("div");
    row.className = "activity-row";
    row.id = `activity-${neuronName}`;
    row.innerHTML =
      `<div class="activity-label">${neuronName}</div>` +
      '<div class="activity-track"><div class="activity-fill"></div></div>' +
      '<div class="activity-value">0.00</div>';
    activityBars.appendChild(row);
  }
}

function randomFlyPose() {
  const margin = 60;
  state.fly.x = margin + Math.random() * (CONFIG.world.width - margin * 2);
  state.fly.y = margin + Math.random() * (CONFIG.world.height - margin * 2);
  state.fly.theta = Math.random() * Math.PI * 2 - Math.PI;
}

function handlePointerDown(event) {
  if (!isSourceDraggable("sugar")) {
    return;
  }

  const point = getCanvasPoint(event);
  const sugar = CONFIG.sources.sugar;
  const distance = Math.hypot(point.x - sugar.x, point.y - sugar.y);

  if (distance <= sugar.radius * 1.6) {
    state.interaction.draggingSource = "sugar";
    state.interaction.pointerActive = true;
    moveSource("sugar", point.x, point.y);
    computeSensoryInputs();
    drawWorld();
    updateReadouts();
    updateCanvasCursor();
    canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  }
}

function handlePointerMove(event) {
  if (state.interaction.draggingSource !== "sugar") {
    return;
  }

  const point = getCanvasPoint(event);
  moveSource("sugar", point.x, point.y);
  computeSensoryInputs();
  drawWorld();
  updateReadouts();
  event.preventDefault();
}

function handlePointerUp(event) {
  if (!state.interaction.draggingSource) {
    return;
  }

  state.interaction.draggingSource = "";
  state.interaction.pointerActive = false;
  updateCanvasCursor();

  if (canvas.hasPointerCapture(event.pointerId)) {
    canvas.releasePointerCapture(event.pointerId);
  }
}

function handleKeyChange(event, pressed) {
  if (event.key === "ArrowLeft") {
    state.interaction.leftPressed = pressed;
    event.preventDefault();
  }

  if (event.key === "ArrowRight") {
    state.interaction.rightPressed = pressed;
    event.preventDefault();
  }
}

function setupInteractionHandlers() {
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", handlePointerUp);
  canvas.addEventListener("pointercancel", handlePointerUp);

  window.addEventListener("keydown", (event) => handleKeyChange(event, true));
  window.addEventListener("keyup", (event) => handleKeyChange(event, false));
  window.addEventListener("blur", () => {
    state.interaction.leftPressed = false;
    state.interaction.rightPressed = false;
    state.interaction.draggingSource = "";
    state.interaction.pointerActive = false;
    updateCanvasCursor();
  });
}

function resetSimulation(randomizeStart) {
  state.neurons = NEURON_NAMES.map(() => createNeuronState());
  state.fly.trail = [];
  state.wanderBias = 0.35;
  state.accumulator = 0;
  state.lastFrameTime = 0;
  state.interaction.draggingSource = "";
  state.interaction.pointerActive = false;

  if (randomizeStart) {
    randomFlyPose();
  } else {
    state.fly.x = CONFIG.fly.x;
    state.fly.y = CONFIG.fly.y;
    state.fly.theta = CONFIG.fly.theta;
  }

  computeSensoryInputs();
  state.motor.forwardSpeed = 0;
  state.motor.turnRate = 0;
  updateCanvasCursor();
  updateReadouts();
  updateActivityPanel();
  drawWorld();
}

function stepSimulation(dt) {
  const sensoryInputs = computeSensoryInputs();
  updateNeuralSystem(dt, sensoryInputs);
  updateFlyMovement(dt);
}

function frame(frameTime) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = frameTime;
  }

  const frameDt = clamp((frameTime - state.lastFrameTime) / 1000, 0, CONFIG.animation.maxFrameDt);
  state.lastFrameTime = frameTime;
  state.accumulator += frameDt;

  while (state.accumulator >= CONFIG.animation.fixedDt) {
    stepSimulation(CONFIG.animation.fixedDt);
    state.accumulator -= CONFIG.animation.fixedDt;
  }

  drawWorld();
  updateReadouts();
  updateActivityPanel();
  requestAnimationFrame(frame);
}

function init() {
  document.title = CONFIG.projectName;
  buildActivityPanel();
  populateControls();
  setupInteractionHandlers();
  resetSimulation(false);
  requestAnimationFrame(frame);
}

init();
