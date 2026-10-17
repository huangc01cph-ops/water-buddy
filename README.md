# Water Buddy v3.1

Implementation of the selected **v3b measured-progress layout** and **v3d Midnight Teal theme**, with the requested light-red Pause and dark-red Stop controls.

## Open

Open `index.html` directly in a browser. All app assets are inside this folder; there is no installation or build step. The header's earlier-V3 link is an optional link to the sibling historical version.

For an HTTP preview, run `node v3.1/preview-server.cjs` from the project root and visit <http://127.0.0.1:4175/v3.1/>. Stop it with Ctrl+C when finished. The server serves this project folder on the local loopback address only.

## Use

1. Choose a reminder interval, or **Demo · 10 seconds**.
2. Click **Start**. Pause / Resume and Stop work as before.
3. Click **I drank water** while the timer is running or a reminder is due. Each accepted click records one glass, fills one step of the cup, adds an activity entry, and starts the next interval.
4. Open **Preferences** for **Light / Dark / System**, a personal session goal, and optional desktop notifications. Escape closes Preferences and returns focus to its button.

Midnight Teal is the first-visit default. A chosen theme is remembered in this browser when storage is available. System follows operating-system appearance changes. Switching themes does not reset the timer or water count. Theme storage failure falls back to a working setting for the current visit.

At the example goal of eight, each glass adds 12.5 percentage points to the cup. Changing the personal goal recalculates its fill and level markings. At or beyond the goal the cup stays full, while the actual glass count continues. The goal is a personal setting, not a hydration recommendation.

Timer, water count, session goal, and activity reset on reload. **Only the theme is saved.** Keep the page open; sleeping devices and browser suspension can delay a reminder. Desktop notifications require browser support, a secure context and permission; on-page reminders work without desktop notification access.

## Validation

- `node --test v3.1/test.cjs`: eight deterministic behavior tests passed, covering fill increments, goal changes, over-goal counts, pause/resume/stop, overdue countdowns, theme persistence, System changes, blocked storage, and Preferences dismissal.
- Browser review at **390px** and **1280px**: no horizontal page overflow; phone and desktop layouts visually reviewed.
- Browser checks: three recordings produced a 3/8 cup, theme switching retained recorded water, Light persisted after reload, Dark could be restored, and runtime error/warning logs were empty.
- Button colors verified in the browser: Stop `#8b2334`, Pause `#f2b4b9`.
- Screenshots in `previews/`: desktop dark, desktop dark with Preferences, desktop light, phone dark. Recorded glasses in these screenshots are demonstration interactions.
- Desktop notification delivery was not exercised; its existing permission and delivery handling is retained.

## Files

- `index.html`: responsive page structure and inline vector cup.
- `style.css`: light and dark themes, responsive layout, red timer controls.
- `theme.js`: early theme selection, browser storage, system theme updates.
- `script.js`: copied original timer/notification behavior with explicit v3.1 presentation updates.
- `assets/`: local branding asset.
- `test.cjs`: dependency-free behavior checks, with a simulated clock and minimal DOM fixture; these do not replace browser layout checks.
- `CHANGELOG.md`: implementation record and decisions.

Previous versions and mockup images are preserved.
