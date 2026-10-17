"use strict";
// Load before styles to apply a remembered theme without flashing the light palette.
window.waterBuddyTheme = (() => {
  const key = "water-buddy-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  let choice = "dark";
  let saved = false;
  try {
    const previous = localStorage.getItem(key);
    if (["light", "dark", "system"].includes(previous)) {
      choice = previous;
      saved = true;
    }
  } catch { /* Themes still work when browser storage is unavailable. */ }
  function apply() {
    const resolved = choice === "system" ? (media.matches ? "dark" : "light") : choice;
    document.documentElement.dataset.theme = resolved;
    document.querySelector('meta[name="theme-color"]').content = resolved === "dark" ? "#0d2028" : "#f6f8f4";
  }
  media.addEventListener("change", () => { if (choice === "system") apply(); });
  apply();
  return {
    get choice() { return choice; },
    get saved() { return saved; },
    set(value) {
      if (!["light", "dark", "system"].includes(value)) return;
      choice = value;
      saved = false;
      try { localStorage.setItem(key, choice); saved = true; } catch { /* Session-only fallback. */ }
      apply();
    },
  };
})();
