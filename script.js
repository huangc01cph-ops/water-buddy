"use strict";

const modeSelector = document.getElementById("mode");
const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("start-button");
const waterButton = document.getElementById("water-button");
const waterCounter = document.getElementById("water-counter");
const reminder = document.getElementById("reminder");

const modeDurations = {
  normal: 30 * 60,
  demo: 10,
};

let sessionStarted = false;
let glassesRecorded = 0;
let sessionDuration = modeDurations.normal;
let deadline = null;
let intervalId = null;

// Convert seconds into a two-digit minutes:seconds display.
function displayTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  timerDisplay.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

// Recalculate from the deadline so delayed callbacks do not add timer drift.
function updateCountdown() {
  if (deadline === null) return;

  const secondsRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  displayTime(secondsRemaining);

  if (secondsRemaining === 0) {
    clearInterval(intervalId);
    intervalId = null;
    deadline = null;
    reminder.hidden = false;
  }
}

// Both Start and water recording reuse this single countdown setup.
function restartCountdown() {
  clearInterval(intervalId);
  reminder.hidden = true;
  deadline = Date.now() + sessionDuration * 1000;
  displayTime(sessionDuration);
  intervalId = setInterval(updateCountdown, 250);
}

modeSelector.addEventListener("change", () => {
  if (sessionStarted) return;
  displayTime(modeDurations[modeSelector.value]);
});

startButton.addEventListener("click", () => {
  // Guard against repeated starts as well as disabling the controls.
  if (sessionStarted) return;

  sessionStarted = true;
  startButton.disabled = true;
  modeSelector.disabled = true;
  waterButton.disabled = false;
  sessionDuration = modeDurations[modeSelector.value];

  restartCountdown();
});

waterButton.addEventListener("click", () => {
  if (!sessionStarted) return;

  glassesRecorded += 1;
  waterCounter.textContent =
    `${glassesRecorded} ${glassesRecorded === 1 ? "glass" : "glasses"}`;
  restartCountdown();
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateCountdown();
});

// Explicitly reset controls in case the browser restores their previous values.
modeSelector.value = "normal";
modeSelector.disabled = false;
startButton.disabled = false;
waterButton.disabled = true;
waterCounter.textContent = "0 glasses";
reminder.hidden = true;
displayTime(modeDurations.normal);
