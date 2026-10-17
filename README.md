# Water Buddy

**Stay Focused. Stay Hydrated.**

Water Buddy is a simple browser app that reminds people to take water breaks while they work or study. It combines a countdown timer with a count of glasses recorded during the current session.

## Features

- Choose a 15-, 30-, 45-, or 60-minute water break interval.
- Use the 10-second Demo Mode to demonstrate the app quickly.
- Start, pause, resume, or stop the countdown.
- See an on-page reminder when it is time for a water break.
- Optionally enable desktop notifications with browser permission.
- Record a glass of water and automatically start the next countdown.
- Use a layout that adapts to phones and larger screens, with labeled controls, visible keyboard focus, and accessible status messages.

## Run locally

1. Download this repository. On GitHub, choose **Code > Download ZIP**, then extract the ZIP file.
2. Keep `index.html`, `style.css`, and `script.js` together in the same folder.
3. Open `index.html` in a web browser.

No installation, account, API key, or build step is required. Desktop notification availability depends on browser support, permission, and a secure context; use the HTTPS GitHub Pages site when demonstrating notifications. On-page reminders still work when desktop notifications are unavailable.

## Quick demonstration

1. Select **Demo Mode — 10 seconds**.
2. Click **Start** and watch the countdown.
3. Optionally click **Pause**, then **Resume**.
4. When the countdown reaches zero, the message **Time for a water break!** appears.
5. Click **I Drank Water**. The glass count increases and a new countdown begins.
6. Click **Stop** to reset the timer and choose a different interval. The current glass count is preserved until the page is refreshed or closed.

To demonstrate desktop notifications, click **Enable Desktop Notifications** and allow notifications before the timer expires. Notifications are silent and delivery also depends on browser and operating system settings.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure, labels, and controls |
| `style.css` | Colors, responsive layout, and control styling |
| `script.js` | Countdown, pause/resume, water counter, and optional notifications |
| `README.md` | Project overview and instructions |

## Built with

HTML, CSS, and vanilla JavaScript using browser APIs. The app has no external libraries or backend service.

## Current limitations

- The timer and glass count reset when the page is refreshed or closed; progress is not saved.
- Keep the page open during use. Browser suspension or a sleeping device can delay reminders; the countdown updates when the page becomes active again.
- Each click records one glass, without measuring its volume or setting a daily hydration target.
- Desktop notifications must be enabled again after reloading the page.

## Publish with GitHub Pages

1. Upload the four project files to the top level of a public GitHub repository.
2. Open the repository's **Settings > Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select the branch containing the files (usually `main`), choose **/(root)**, and click **Save**.
5. Wait for deployment, then copy the published website link shown in Pages settings.

The repository link lets reviewers read the code; the GitHub Pages link lets them use the app in their browser.
