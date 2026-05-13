import assert from "assert";
import {
  CONFIG,
  applyAction,
  createInitialState,
  getObservation,
  resetSimulation,
  stepSimulation,
} from "../sim-core.js";

function runSeconds(state, seconds) {
  const dt = CONFIG.animation.fixedDt;
  const steps = Math.ceil(seconds / dt);
  for (let index = 0; index < steps; index += 1) {
    stepSimulation(state, dt);
  }
}

function testEnergyDecaysAwayFromFood() {
  const state = createInitialState();
  state.controls.sugarEnabled = false;
  const before = state.life.energy;
  runSeconds(state, 4);
  assert.ok(state.life.energy < before, "energy should decay when no food is available");
}

function testSugarFeedingImprovesLifeState() {
  const state = createInitialState();
  state.fly.x = CONFIG.sources.sugar.x;
  state.fly.y = CONFIG.sources.sugar.y;
  state.life.energy = 0.25;
  state.life.hunger = 0.72;
  state.life.stress = 0.42;

  runSeconds(state, 2);

  assert.ok(state.life.energy > 0.25, "sugar contact should restore energy");
  assert.ok(state.life.hunger < 0.72, "sugar contact should reduce hunger");
  assert.ok(state.life.stress < 0.42, "feeding should mildly reduce stress");
}

function testBitterExposureRaisesStress() {
  const state = createInitialState();
  state.controls.bitterEnabled = true;
  state.fly.x = CONFIG.sources.bitter.x;
  state.fly.y = CONFIG.sources.bitter.y;
  const beforeStress = state.life.stress;
  const beforeEnergy = state.life.energy;

  runSeconds(state, 2);

  assert.ok(state.life.stress > beforeStress, "bitter exposure should raise stress");
  assert.ok(state.life.energy < beforeEnergy, "bitter exposure should drain energy");
}

function testDeathStopsMovement() {
  const state = createInitialState();
  state.controls.sugarEnabled = false;
  state.life.energy = 0;
  state.life.hunger = 1;
  state.life.health = 0.01;

  runSeconds(state, 8);

  assert.strictEqual(state.life.alive, false, "health depletion should make the fly inactive");
  assert.strictEqual(state.motor.forwardSpeed, 0, "inactive fly should stop moving");
}

function testResetRevivesAndObservationShape() {
  const state = createInitialState();
  state.controls.bitterEnabled = true;
  state.life.alive = false;
  state.life.health = 0;
  applyAction(state, { manualTurn: 1 });

  resetSimulation(state, { randomizeStart: true });
  const observation = getObservation(state);

  assert.strictEqual(state.life.alive, true, "reset should revive the fly");
  assert.strictEqual(state.controls.bitterEnabled, true, "reset should preserve source controls");
  assert.strictEqual(state.interaction.rightPressed, false, "reset should clear manual steering");
  assert.strictEqual(typeof observation.life.energy, "number", "observation should expose life values");
  assert.strictEqual(typeof observation.neurons.FORWARD, "number", "observation should expose neuron traces");
}

testEnergyDecaysAwayFromFood();
testSugarFeedingImprovesLifeState();
testBitterExposureRaisesStress();
testDeathStopsMovement();
testResetRevivesAndObservationShape();

console.log("sim-core tests passed");
