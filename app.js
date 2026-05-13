import { CONFIG, clamp, createInitialState, resetSimulation, stepSimulation } from "./sim-core.js";
import { drawWorld } from "./render.js";
import { createUi } from "./ui.js";

const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");
const state = createInitialState();
const ui = createUi({ state, canvas, ctx });

function frame(frameTime) {
  if (!state.lastFrameTime) {
    state.lastFrameTime = frameTime;
  }

  const frameDt = clamp((frameTime - state.lastFrameTime) / 1000, 0, CONFIG.animation.maxFrameDt);
  state.lastFrameTime = frameTime;
  state.accumulator += frameDt;

  while (state.accumulator >= CONFIG.animation.fixedDt) {
    stepSimulation(state, CONFIG.animation.fixedDt);
    state.accumulator -= CONFIG.animation.fixedDt;
  }

  drawWorld(ctx, state);
  ui.updateReadouts();
  ui.updateActivityPanel();
  requestAnimationFrame(frame);
}

function init() {
  document.title = CONFIG.projectName;
  ui.buildActivityPanel();
  ui.populateControls();
  ui.setupInteractionHandlers();
  resetSimulation(state, { randomizeStart: false });
  ui.updateCanvasCursor();
  ui.updateReadouts();
  ui.updateActivityPanel();
  drawWorld(ctx, state);
  requestAnimationFrame(frame);
}

init();
