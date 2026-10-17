"use strict";

const modeSelector = document.getElementById("mode");
const timerDisplay = document.getElementById("timer");
const startButton = document.getElementById("start-button");
const pauseButton = document.getElementById("pause-button");
const waterButton = document.getElementById("water-button");
const waterCounter = document.getElementById("water-counter");
const reminder = document.getElementById("reminder");
const notificationButton = document.getElementById("notification-button");
const notificationStatus = document.getElementById("notification-status");

// Browser permission and this page's opt-in are separate: opt-in never persists.
let desktopNotificationsEnabled = false;
let notificationsEnabledAt = null;
let permissionRequestPending = false;
let permissionRequested = false;

function updateNotificationControl(message) {
  notificationButton.textContent = desktopNotificationsEnabled
    ? "Disable Desktop Notifications" : "Enable Desktop Notifications";
  notificationButton.setAttribute("aria-pressed", String(desktopNotificationsEnabled));
  notificationStatus.textContent = message;
}

function notificationsUnavailable(message) {
  desktopNotificationsEnabled = false;
  notificationsEnabledAt = null;
  notificationButton.disabled = true;
  updateNotificationControl(message);
}

notificationButton.addEventListener("click", async () => {
  if (notificationButton.disabled || permissionRequestPending) return;
  if (desktopNotificationsEnabled) {
    desktopNotificationsEnabled = false;
    notificationsEnabledAt = null;
    updateNotificationControl("Desktop notifications are disabled.");
    return;
  }
  if (!("Notification" in window) || !window.isSecureContext) {
    notificationsUnavailable("Desktop notifications are unavailable. On-page reminders still work.");
    return;
  }

  try {
    let permission = Notification.permission;
    if (permission === "default" && !permissionRequested) {
      permissionRequested = true;
      permissionRequestPending = true;
      notificationButton.disabled = true;
      updateNotificationControl("Waiting for Chrome notification permission.");
      // Request directly from this click, never on page load or expiration.
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      notificationsUnavailable("Desktop notifications are unavailable: permission was not granted. On-page reminders still work.");
      return;
    }
    // Process an overdue countdown before enabling, without a retroactive alert.
    updateCountdown();
    notificationsEnabledAt = Date.now();
    desktopNotificationsEnabled = true;
    notificationButton.disabled = false;
    updateNotificationControl("Desktop notifications are enabled.");
  } catch {
    notificationsUnavailable("Desktop notifications are unavailable. On-page reminders still work.");
  } finally {
    permissionRequestPending = false;
  }
});

function notifyWaterBreak(expiredDeadline) {
  if (!desktopNotificationsEnabled || notificationsEnabledAt === null ||
      notificationsEnabledAt >= expiredDeadline) return;
  try {
    if (!("Notification" in window) || Notification.permission !== "granted") {
      notificationsUnavailable("Desktop notifications are unavailable. On-page reminders still work.");
      return;
    }
    const notification = new Notification("Water Buddy", {
      body: "Time for a water break! Stay Focused. Stay Hydrated",
      silent: true,
    });
    notification.onerror = () => {
      notificationsUnavailable("Desktop notification delivery failed. On-page reminders still work.");
    };
  } catch {
    notificationsUnavailable("Desktop notification delivery failed. On-page reminders still work.");
  }
}

const modeDurations = {
  minutes15: 900,
  normal: 30 * 60,
  minutes45: 2700,
  minutes60: 3600,
  demo: 10,
};

let timerState = "idle"; // idle, running, paused, or expired
let remainingMilliseconds = 0;
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
  if (timerState !== "running" || deadline === null) return;

  const secondsRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  displayTime(secondsRemaining);

  if (secondsRemaining === 0) {
    const expiredDeadline = deadline;
    clearInterval(intervalId);
    intervalId = null;
    deadline = null;
    timerState = "expired";
    remainingMilliseconds = 0;
    reminder.hidden = false;
    updateControls();
    // State is already expired, so later updates cannot notify again.
    notifyWaterBreak(expiredDeadline);
  }
}

// Keep labels and enabled controls consistent with the timer state.
function updateControls() {
  startButton.textContent = timerState === "idle" ? "Start" : "Stop";
  startButton.dataset.action = timerState === "idle" ? "start" : "stop";
  startButton.disabled = false;
  modeSelector.disabled = timerState !== "idle";
  pauseButton.textContent = timerState === "paused" ? "Resume" : "Pause";
  pauseButton.disabled = timerState !== "running" && timerState !== "paused";
  waterButton.disabled = timerState !== "running" && timerState !== "expired";
}

// Start, Resume, and water recording share one interval setup.
function restartCountdown(durationMilliseconds = sessionDuration * 1000) {
  clearInterval(intervalId);
  reminder.hidden = true;
  timerState = "running";
  remainingMilliseconds = durationMilliseconds;
  deadline = Date.now() + durationMilliseconds;
  displayTime(Math.ceil(durationMilliseconds / 1000));
  intervalId = setInterval(updateCountdown, 250);
  updateControls();
}

modeSelector.addEventListener("change", () => {
  if (timerState !== "idle") return;
  displayTime(modeDurations[modeSelector.value]);
});

startButton.addEventListener("click", () => {
  if (timerState === "idle") {
    sessionDuration = modeDurations[modeSelector.value];
    restartCountdown();
    return;
  }

  // Stop resets the timer and controls while preserving recorded water.
  clearInterval(intervalId);
  intervalId = null;
  deadline = null;
  timerState = "idle";
  remainingMilliseconds = 0;
  displayTime(sessionDuration);
  reminder.hidden = true;
  updateControls();
});

pauseButton.addEventListener("click", () => {
  if (timerState === "paused") {
    restartCountdown(remainingMilliseconds);
    return;
  }
  if (timerState !== "running") return;

  // Check the actual deadline before pausing, including delayed tab updates.
  updateCountdown();
  if (timerState !== "running") return;
  remainingMilliseconds = Math.max(0, deadline - Date.now());
  if (remainingMilliseconds === 0) {
    updateCountdown();
    return;
  }
  clearInterval(intervalId);
  intervalId = null;
  deadline = null;
  timerState = "paused";
  displayTime(Math.ceil(remainingMilliseconds / 1000));
  updateControls();
});

waterButton.addEventListener("click", () => {
  if (waterButton.disabled || (timerState !== "running" && timerState !== "expired")) return;

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
updateControls();
waterCounter.textContent = "0 glasses";
reminder.hidden = true;
displayTime(modeDurations.normal);
notificationButton.disabled = false;
updateNotificationControl("Desktop notifications are disabled.");
if (!("Notification" in window) || !window.isSecureContext) {
  notificationsUnavailable("Desktop notifications are unavailable. On-page reminders still work.");
} else if (Notification.permission === "denied") {
  notificationsUnavailable("Desktop notifications are unavailable: Chrome permission is blocked. On-page reminders still work.");
}
