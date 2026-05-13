import { CONFIG, NEURON_NAMES, IDX, clamp, computeSensoryInputs, formatNumber, moveSource, resetSimulation } from "./sim-core.js";
import { drawWorld } from "./render.js";

function getElement(id) {
  return document.getElementById(id);
}

function formatPercent(value) {
  return `${Math.round(clamp(value, 0, 1) * 100)}%`;
}

function formatAge(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function setLifeBar(elements, name, value) {
  const row = elements.lifeRows[name];
  row.fill.style.width = formatPercent(value);
  row.value.textContent = name === "age" ? formatAge(value) : formatPercent(value);
  row.root.dataset.level = value > 0.7 ? "high" : value < 0.3 ? "low" : "mid";
}

export function createUi({ state, canvas, ctx }) {
  const elements = {
    activityBars: getElement("activity-bars"),
    sensoryReadout: getElement("sensory-readout"),
    motorReadout: getElement("motor-readout"),
    silencedReadout: getElement("silenced-readout"),
    controlReadout: getElement("control-readout"),
    lifeStatus: getElement("life-status"),
    sugarToggle: getElement("toggle-sugar"),
    bitterToggle: getElement("toggle-bitter"),
    lightToggle: getElement("toggle-light"),
    silenceSelect: getElement("silence-select"),
    synapticScaleInput: getElement("synaptic-scale"),
    synapticScaleValue: getElement("synaptic-scale-value"),
    resetButton: getElement("reset-button"),
    randomizeButton: getElement("randomize-button"),
    lifeRows: {
      energy: {
        root: getElement("life-energy-row"),
        fill: getElement("life-energy-fill"),
        value: getElement("life-energy-value"),
      },
      hunger: {
        root: getElement("life-hunger-row"),
        fill: getElement("life-hunger-fill"),
        value: getElement("life-hunger-value"),
      },
      stress: {
        root: getElement("life-stress-row"),
        fill: getElement("life-stress-fill"),
        value: getElement("life-stress-value"),
      },
      health: {
        root: getElement("life-health-row"),
        fill: getElement("life-health-fill"),
        value: getElement("life-health-value"),
      },
      age: {
        root: getElement("life-age-row"),
        fill: getElement("life-age-fill"),
        value: getElement("life-age-value"),
      },
    },
  };

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

  function updateActivityPanel() {
    for (const neuronName of NEURON_NAMES) {
      const row = getElement(`activity-${neuronName}`);
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

  function updateLifePanel() {
    setLifeBar(elements, "energy", state.life.energy);
    setLifeBar(elements, "hunger", state.life.hunger);
    setLifeBar(elements, "stress", state.life.stress);
    setLifeBar(elements, "health", state.life.health);
    setLifeBar(elements, "age", clamp(state.life.ageSeconds / 180, 0, 1));
    elements.lifeRows.age.value.textContent = formatAge(state.life.ageSeconds);
    elements.lifeStatus.textContent = state.life.alive ? "Active" : "Inactive";
    elements.lifeStatus.dataset.alive = state.life.alive ? "true" : "false";
    document.body.dataset.alive = state.life.alive ? "true" : "false";
  }

  function updateReadouts() {
    elements.sensoryReadout.textContent =
      `sugar ${formatNumber(state.sensory.sugar)}\n` +
      `sugar_L ${formatNumber(state.sensory.sugarLeft)}\n` +
      `sugar_R ${formatNumber(state.sensory.sugarRight)}\n` +
      `bitter ${formatNumber(state.sensory.bitter)}\n` +
      `light_L ${formatNumber(state.sensory.lightLeft)}\n` +
      `light_R ${formatNumber(state.sensory.lightRight)}`;

    elements.motorReadout.textContent =
      `speed ${formatNumber(state.motor.forwardSpeed)} px/s\n` +
      `turn ${formatNumber(state.motor.turnRate)} rad/s\n` +
      `heading ${formatNumber(state.fly.theta)} rad`;

    elements.silencedReadout.textContent = state.controls.silencedNeuron || "None";
    if (!state.life.alive) {
      elements.controlReadout.textContent = "Inactive";
    } else if (state.interaction.leftPressed && state.interaction.rightPressed) {
      elements.controlReadout.textContent = "Manual hold";
    } else if (state.interaction.leftPressed) {
      elements.controlReadout.textContent = "Manual left";
    } else if (state.interaction.rightPressed) {
      elements.controlReadout.textContent = "Manual right";
    } else {
      elements.controlReadout.textContent = "Autopilot";
    }

    updateLifePanel();
  }

  function buildActivityPanel() {
    elements.activityBars.textContent = "";
    for (const neuronName of NEURON_NAMES) {
      const row = document.createElement("div");
      row.className = "activity-row";
      row.id = `activity-${neuronName}`;
      row.innerHTML =
        `<div class="activity-label">${neuronName}</div>` +
        '<div class="activity-track"><div class="activity-fill"></div></div>' +
        '<div class="activity-value">0.00</div>';
      elements.activityBars.appendChild(row);
    }
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
      computeSensoryInputs(state);
      drawWorld(ctx, state);
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
    computeSensoryInputs(state);
    drawWorld(ctx, state);
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
    if (!state.life.alive) {
      return;
    }

    if (event.key === "ArrowLeft") {
      state.interaction.leftPressed = pressed;
      event.preventDefault();
    }

    if (event.key === "ArrowRight") {
      state.interaction.rightPressed = pressed;
      event.preventDefault();
    }
  }

  function resetAndRefresh(randomizeStart) {
    resetSimulation(state, { randomizeStart });
    elements.sugarToggle.checked = state.controls.sugarEnabled;
    elements.bitterToggle.checked = state.controls.bitterEnabled;
    elements.lightToggle.checked = state.controls.lightEnabled;
    elements.silenceSelect.value = state.controls.silencedNeuron;
    elements.synapticScaleInput.value = String(state.controls.synapticScale);
    elements.synapticScaleValue.textContent = formatNumber(state.controls.synapticScale);
    updateCanvasCursor();
    updateReadouts();
    updateActivityPanel();
    drawWorld(ctx, state);
  }

  function populateControls() {
    elements.silenceSelect.textContent = "";
    const noneOption = document.createElement("option");
    noneOption.value = "";
    noneOption.textContent = "None";
    elements.silenceSelect.appendChild(noneOption);

    for (const neuronName of NEURON_NAMES) {
      const option = document.createElement("option");
      option.value = neuronName;
      option.textContent = neuronName;
      elements.silenceSelect.appendChild(option);
    }

    elements.sugarToggle.checked = state.controls.sugarEnabled;
    elements.bitterToggle.checked = state.controls.bitterEnabled;
    elements.lightToggle.checked = state.controls.lightEnabled;
    elements.silenceSelect.value = state.controls.silencedNeuron;
    elements.synapticScaleInput.value = String(state.controls.synapticScale);
    elements.synapticScaleValue.textContent = formatNumber(state.controls.synapticScale);

    elements.sugarToggle.addEventListener("change", (event) => {
      state.controls.sugarEnabled = event.target.checked;
      updateCanvasCursor();
    });

    elements.bitterToggle.addEventListener("change", (event) => {
      state.controls.bitterEnabled = event.target.checked;
    });

    elements.lightToggle.addEventListener("change", (event) => {
      state.controls.lightEnabled = event.target.checked;
    });

    elements.silenceSelect.addEventListener("change", (event) => {
      state.controls.silencedNeuron = event.target.value;
      updateReadouts();
      updateActivityPanel();
    });

    elements.synapticScaleInput.addEventListener("input", (event) => {
      state.controls.synapticScale = Number(event.target.value);
      elements.synapticScaleValue.textContent = formatNumber(state.controls.synapticScale);
    });

    elements.resetButton.addEventListener("click", () => {
      resetAndRefresh(false);
    });

    elements.randomizeButton.addEventListener("click", () => {
      resetAndRefresh(true);
    });
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

  return {
    buildActivityPanel,
    populateControls,
    setupInteractionHandlers,
    updateActivityPanel,
    updateCanvasCursor,
    updateReadouts,
  };
}
