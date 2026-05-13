export const NEURON_NAMES = [
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

export const IDX = Object.fromEntries(NEURON_NAMES.map((name, index) => [name, index]));

export const CONFIG = {
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
    sugar: 120,
    bitter: 120,
    light: 100,
    wanderTonic: 5.2,
    wanderFromLowSugar: 4.8,
    wanderFromBitter: 3.2,
  },
  life: {
    initialEnergy: 0.72,
    initialHunger: 0.32,
    initialStress: 0.08,
    initialHealth: 1,
    basalEnergyUse: 0.006,
    movementEnergyUse: 0.028,
    hungerRise: 0.015,
    hungerFromLowEnergy: 0.026,
    stressRecovery: 0.05,
    healthRecovery: 0.02,
    starvationThreshold: 0.82,
    stressDamageThreshold: 0.68,
    starvationDamage: 0.045,
    stressDamage: 0.034,
    criticalEnergyDamage: 0.04,
  },
  feeding: {
    radius: 36,
    energyGain: 0.24,
    hungerRelief: 0.34,
    stressRelief: 0.09,
  },
  hazards: {
    bitterRadius: 86,
    bitterStressGain: 0.21,
    bitterEnergyDrain: 0.045,
    bitterHealthDamage: 0.022,
  },
  animation: {
    fixedDt: 1 / 60,
    maxFrameDt: 0.08,
  },
};

export const CONNECTOME_EDGES = [
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

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

export function normalizeAngle(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) {
    wrapped -= Math.PI * 2;
  }
  while (wrapped < -Math.PI) {
    wrapped += Math.PI * 2;
  }
  return wrapped;
}

export function formatNumber(value) {
  return value.toFixed(2);
}

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

export function createNeuronState() {
  return {
    v: CONFIG.neurons.vRest,
    g: 0,
    spiked: false,
    refractory: 0,
    trace: 0,
  };
}

export function createInitialState(options = {}) {
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
    life: {
      energy: CONFIG.life.initialEnergy,
      hunger: CONFIG.life.initialHunger,
      stress: CONFIG.life.initialStress,
      health: CONFIG.life.initialHealth,
      alive: true,
      ageSeconds: 0,
      feedingPulse: 0,
      bitterExposure: 0,
    },
    neurons: NEURON_NAMES.map(() => createNeuronState()),
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

  if (options.randomizeStart) {
    randomFlyPose(state);
  }
  computeSensoryInputs(state);
  return state;
}

export function resetSimulation(state, { randomizeStart = false } = {}) {
  const previousControls = { ...state.controls };
  const nextState = createInitialState({ randomizeStart });
  nextState.controls = previousControls;
  Object.assign(state, nextState);
  computeSensoryInputs(state);
  return state;
}

export function randomFlyPose(state) {
  const margin = 60;
  state.fly.x = margin + Math.random() * (CONFIG.world.width - margin * 2);
  state.fly.y = margin + Math.random() * (CONFIG.world.height - margin * 2);
  state.fly.theta = Math.random() * Math.PI * 2 - Math.PI;
}

export function moveSource(sourceName, x, y) {
  const source = CONFIG.sources[sourceName];
  const min = CONFIG.world.boundaryPadding + source.radius;
  const maxX = CONFIG.world.width - min;
  const maxY = CONFIG.world.height - min;

  source.x = clamp(x, min, maxX);
  source.y = clamp(y, min, maxY);
}

export function applyAction(state, action) {
  if (Object.prototype.hasOwnProperty.call(action, "leftPressed")) {
    state.interaction.leftPressed = Boolean(action.leftPressed);
  }
  if (Object.prototype.hasOwnProperty.call(action, "rightPressed")) {
    state.interaction.rightPressed = Boolean(action.rightPressed);
  }
  if (typeof action.manualTurn === "number") {
    state.interaction.leftPressed = action.manualTurn < 0;
    state.interaction.rightPressed = action.manualTurn > 0;
  }
}

export function getObservation(state) {
  return {
    life: { ...state.life },
    fly: {
      x: state.fly.x,
      y: state.fly.y,
      theta: state.fly.theta,
    },
    sensory: { ...state.sensory },
    motor: { ...state.motor },
    neurons: Object.fromEntries(
      NEURON_NAMES.map((name, index) => [name, state.neurons[index].trace]),
    ),
  };
}

export function computeSensoryInputs(state) {
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

export function updateNeuralSystem(state, dt, sensoryInputs) {
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

    if (silenced || !state.life.alive) {
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

export function updateFlyMovement(state, dt) {
  if (!state.life.alive) {
    state.motor.forwardSpeed = 0;
    state.motor.turnRate = 0;
    return;
  }

  const forwardTrace = state.neurons[IDX.FORWARD].trace;
  const avoidTrace = state.neurons[IDX.AVOID].trace;
  const turnLeftTrace = state.neurons[IDX.TURN_L].trace;
  const turnRightTrace = state.neurons[IDX.TURN_R].trace;
  const wanderTrace = state.neurons[IDX.WANDER].trace;

  state.wanderBias = lerp(state.wanderBias, Math.random() * 2 - 1, 0.045);

  const fatigueScale = lerp(0.35, 1, state.life.energy);
  const forwardSpeed =
    clamp(
      CONFIG.fly.baseSpeed +
        forwardTrace * CONFIG.fly.forwardGain -
        avoidTrace * CONFIG.fly.avoidSlowdown,
      0,
      CONFIG.fly.maxSpeed,
    ) * fatigueScale;

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

export function updateLifeState(state, dt) {
  const life = state.life;
  life.feedingPulse = Math.max(0, life.feedingPulse - dt * 2.4);
  life.bitterExposure = 0;

  if (!life.alive) {
    return;
  }

  life.ageSeconds += dt;

  const normalizedSpeed = clamp(state.motor.forwardSpeed / CONFIG.fly.maxSpeed, 0, 1);
  life.energy -=
    (CONFIG.life.basalEnergyUse + normalizedSpeed * CONFIG.life.movementEnergyUse) * dt;
  life.hunger +=
    (CONFIG.life.hungerRise + (1 - life.energy) * CONFIG.life.hungerFromLowEnergy) * dt;
  life.stress -= CONFIG.life.stressRecovery * dt;

  if (state.controls.sugarEnabled) {
    const sugarDistance = Math.hypot(
      CONFIG.sources.sugar.x - state.fly.x,
      CONFIG.sources.sugar.y - state.fly.y,
    );
    if (sugarDistance <= CONFIG.feeding.radius) {
      const contact = 1 - sugarDistance / CONFIG.feeding.radius;
      life.energy += CONFIG.feeding.energyGain * contact * dt;
      life.hunger -= CONFIG.feeding.hungerRelief * contact * dt;
      life.stress -= CONFIG.feeding.stressRelief * contact * dt;
      life.feedingPulse = Math.max(life.feedingPulse, contact);
    }
  }

  if (state.controls.bitterEnabled) {
    const bitterDistance = Math.hypot(
      CONFIG.sources.bitter.x - state.fly.x,
      CONFIG.sources.bitter.y - state.fly.y,
    );
    if (bitterDistance <= CONFIG.hazards.bitterRadius) {
      const exposure = 1 - bitterDistance / CONFIG.hazards.bitterRadius;
      life.bitterExposure = exposure;
      life.stress += CONFIG.hazards.bitterStressGain * exposure * dt;
      life.energy -= CONFIG.hazards.bitterEnergyDrain * exposure * dt;
      life.health -= CONFIG.hazards.bitterHealthDamage * exposure * dt;
    }
  }

  if (life.hunger > CONFIG.life.starvationThreshold) {
    life.health -=
      (life.hunger - CONFIG.life.starvationThreshold) * CONFIG.life.starvationDamage * dt;
  }

  if (life.stress > CONFIG.life.stressDamageThreshold) {
    life.health -=
      (life.stress - CONFIG.life.stressDamageThreshold) * CONFIG.life.stressDamage * dt;
  }

  if (life.energy <= 0.04) {
    life.health -= CONFIG.life.criticalEnergyDamage * dt;
  }

  if (
    life.energy > 0.45 &&
    life.hunger < 0.55 &&
    life.stress < 0.36 &&
    life.health < CONFIG.life.initialHealth
  ) {
    life.health += CONFIG.life.healthRecovery * dt;
  }

  life.energy = clamp(life.energy, 0, 1);
  life.hunger = clamp(life.hunger, 0, 1);
  life.stress = clamp(life.stress, 0, 1);
  life.health = clamp(life.health, 0, 1);

  if (life.health <= 0) {
    life.alive = false;
    life.health = 0;
    state.motor.forwardSpeed = 0;
    state.motor.turnRate = 0;
    state.interaction.leftPressed = false;
    state.interaction.rightPressed = false;
  }
}

export function stepSimulation(state, dt) {
  const sensoryInputs = computeSensoryInputs(state);
  updateNeuralSystem(state, dt, sensoryInputs);
  updateFlyMovement(state, dt);
  updateLifeState(state, dt);
  return state;
}
