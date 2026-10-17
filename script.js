"use strict";

let viewReady = false;

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
      updateNotificationControl("Waiting for browser notification permission.");
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
  syncView();
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
  syncView();
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
  notificationsUnavailable("Desktop notifications are unavailable: browser permission is blocked. On-page reminders still work.");
}

// Update the presentation explicitly when the timer or water count changes.
const goalControl = document.getElementById("goal");
const svgNamespace = "http://www.w3.org/2000/svg";
let renderedGoal = null;
let lastRecordedCount = 0;

function svgElement(tag, attributes) {
  const element = document.createElementNS(svgNamespace, tag);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
  return element;
}

function syncView() {
  if (!viewReady) return;
  const goal = Number(goalControl.value);
  const fraction = Math.min(glassesRecorded / goal, 1);
  const levelY = 246 - 196 * fraction;
  document.getElementById("goal-label").textContent = goal;
  const water = document.getElementById("cup-water");
  water.setAttribute("y", levelY);
  water.setAttribute("height", 196 * fraction);
  const surface = document.getElementById("water-surface");
  surface.setAttribute("cy", levelY);
  surface.toggleAttribute("hidden", glassesRecorded === 0);
  const progress = document.getElementById("cup-progress");
  progress.setAttribute("aria-valuemax", goal);
  progress.setAttribute("aria-valuenow", Math.min(glassesRecorded, goal));
  progress.setAttribute("aria-valuetext", `${glassesRecorded} of ${goal} glasses${glassesRecorded >= goal ? "; personal goal reached" : ""}`);
  const ticks = document.getElementById("cup-ticks");
  if (renderedGoal !== goal) {
    ticks.replaceChildren();
    for (let number = 1; number <= goal; number++) {
      const y = 246 - 196 * number / goal;
      const tick = svgElement("line", { x1: 170, x2: 181, y1: y, y2: y, class: "cup-tick", "data-level": number });
      const label = svgElement("text", { x: 194, y: y + 4, class: "cup-tick-label", "data-level": number });
      label.textContent = number;
      ticks.append(tick, label);
    }
    renderedGoal = goal;
  }
  for (const tick of ticks.children) tick.classList.toggle("current", Number(tick.dataset.level) === Math.min(glassesRecorded, goal));
  document.getElementById("cup-level-marker").toggleAttribute("hidden", glassesRecorded === 0);
  document.getElementById("cup-level-dot").setAttribute("cy", levelY);
  document.getElementById("cup-level-line").setAttribute("d", `M154 ${levelY} H183`);
  document.getElementById("cup-level-label").setAttribute("y", levelY + 4);
  document.getElementById("cup-level-label").textContent = `${Math.min(glassesRecorded, goal)}/${goal}`;
  const idle = timerState === "idle";
  const paused = timerState === "paused";
  const expired = timerState === "expired";
  document.getElementById("state-pill").textContent = idle ? "Ready when you are" : paused ? "Taking a pause" : expired ? "Time for a sip" : "In your flow";
  document.getElementById("timer-footnote").textContent = paused ? "Take your time. We’ll be here." : expired ? "A little reset. You’ve earned it." : "Settle in. Your buddy’s got the time.";
  document.getElementById("session-caption").textContent = idle ? "A gentler rhythm for work and study." : paused ? "Paused. Resume whenever you’re ready." : expired ? "Record a glass to begin your next interval." : "Keep this page open for your reminder.";
  document.getElementById("water-helper").textContent = idle ? "Start your timer to record a glass." : paused ? "Resume your timer to record a glass." : glassesRecorded >= goal ? "Personal goal reached. Every sip still counts." : "One click. One level.";
  const [minutes, seconds] = timerDisplay.textContent.split(":").map(Number);
  const remaining = (minutes * 60 + seconds) / modeDurations[modeSelector.value];
  document.getElementById("ring-progress").style.strokeDashoffset = String(911.062 * (1 - Math.max(0, Math.min(1, remaining))));
  if (glassesRecorded > lastRecordedCount) {
    const now = new Date();
    const row = document.createElement("li");
    const label = document.createElement("span");
    label.textContent = `✓ Glass ${glassesRecorded} recorded`;
    const time = document.createElement("time");
    time.dateTime = now.toISOString();
    time.textContent = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    row.append(label, time);
    const list = document.getElementById("activity-list");
    list.prepend(row);
    while (list.children.length > 50) list.lastElementChild.remove();
    list.hidden = false;
    document.getElementById("activity-empty").hidden = true;
    document.getElementById("activity-announcement").textContent = `Glass ${glassesRecorded} recorded.${glassesRecorded === goal ? " Personal goal reached." : ""}`;
  }
  lastRecordedCount = glassesRecorded;
}

const preferencesButton = document.getElementById("preferences-button");
const preferencesPanel = document.getElementById("preferences-panel");
function closePreferences(restoreFocus = false) {
  preferencesPanel.hidden = true;
  preferencesButton.setAttribute("aria-expanded", "false");
  if (restoreFocus) preferencesButton.focus();
}
preferencesButton.addEventListener("click", () => {
  const open = preferencesPanel.hidden;
  preferencesPanel.hidden = !open;
  preferencesButton.setAttribute("aria-expanded", String(open));
  if (open) document.getElementById("close-preferences").focus();
});
document.getElementById("close-preferences").addEventListener("click", () => closePreferences(true));
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && !preferencesPanel.hidden) closePreferences(true);
});
document.addEventListener("click", event => {
  if (!preferencesPanel.hidden && !event.target.closest(".preferences-wrap")) closePreferences();
});
document.addEventListener("focusin", event => {
  if (!preferencesPanel.hidden && !event.target.closest(".preferences-wrap")) closePreferences();
});
function syncThemeChoice() {
  for (const radio of document.querySelectorAll('input[name="theme"]')) radio.checked = radio.value === window.waterBuddyTheme.choice;
  document.getElementById("theme-status").textContent = window.waterBuddyTheme.saved ? "Theme saved on this device." : "Theme applies now. Choose a theme to remember it.";
}
for (const radio of document.querySelectorAll('input[name="theme"]')) {
  radio.addEventListener("change", () => {
    window.waterBuddyTheme.set(radio.value);
    syncThemeChoice();
    if (!window.waterBuddyTheme.saved) document.getElementById("theme-status").textContent = "Theme applies for this visit. Browser storage is unavailable.";
  });
}
goalControl.addEventListener("change", syncView);
viewReady = true;
syncThemeChoice();
syncView();
