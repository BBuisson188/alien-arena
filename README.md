# Alien Arena

Alien Arena is a browser-based arcade game built with plain HTML, CSS, and JavaScript canvas.

## Play Locally

Double-click `Launch Alien Arena.cmd` to start a local server and open the game in your browser.

Or serve the folder manually with:

```powershell
python -m http.server 4177 -b 127.0.0.1
```

Then open:

```text
http://127.0.0.1:4177/
```

## Publishing

This project is ready to publish as a static GitHub Pages site from the repository root.

Recommended GitHub Pages setting:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

## Offline Web App

Alien Arena is set up as an installable web app. After the game is opened once from the published site while online, `sw.js` caches the game shell, icons, manifest, styles, scripts, and sprites so the saved iPad Home Screen app can launch again without Wi-Fi.

The global Firestore leaderboard is optional at startup. If the device is offline, the game uses the local leaderboard immediately and queues qualifying named scores for the next online session.

For the offline install flow on iPad:

1. Open the published game in Safari while connected to Wi-Fi.
2. Wait for the first game screen to appear.
3. Use Share -> Add to Home Screen.
4. Launch the Home Screen app once while still online so Safari can finish installing the cache.
5. Airplane mode should then continue to load the game. Global scores will sync later when Wi-Fi returns.

## App Icons

The active icon files are:

- `assets/icons/apple-touch-icon.png`: iPhone/iPad home screen icon
- `assets/icons/favicon.ico`: browser tab icon
- `assets/icons/icon-192.png`: web app manifest icon
- `assets/icons/icon-512.png`: web app manifest icon
- `site.webmanifest`: install metadata for GitHub Pages/static hosting

Extra generated icon files were renamed with `delete` in the filename so they can be manually removed later.

## Local Leaderboard

Alien Arena stores the top 10 scores in browser `localStorage` on the current device as a fallback.

The game also reads and writes a global Firestore leaderboard at:

```text
leaderboards/alien-arena/scores
```

After a run ends:

- Top 10 scores prompt for a player name.
- Scores outside the top 10 go straight to the leaderboard and show the new score without a name.
- Qualifying named scores are saved locally first, then queued for Firestore sync.
- If Firestore is unavailable, offline, or blocked, the local leaderboard still works.
- Queued scores retry when the game can reach Firestore again. Only scores that still qualify for the global top 10 are uploaded; lower queued scores are dropped from the local sync queue.
- The `Scores` button opens the global top 10 when available, otherwise the local top 10.

Firestore is intentionally create-only from the browser game. The client reads global scores and creates new score documents, but it never updates, deletes, or prunes Firestore documents. Firestore rules should keep:

```text
allow update, delete: if false;
```

## Project Files

- `index.html`: page shell
- `Launch Alien Arena.cmd`: double-click local server/browser launcher
- `styles.css`: page and arcade cabinet styling
- `sw.js`: offline app cache for installed/Home Screen play
- `app.js`: game logic and canvas rendering
- `firebase-config.js`: Firebase Web SDK app config
- `assets/`: source board and extracted sprites
- `site.webmanifest`: install/app icon metadata
- `HANDOFF.md`: implementation notes and current open items

## Mobile Controls

The game uses overlaid touch controls: a left/right pad in the lower-left corner and a round fire button in the lower-right corner. The page viewport and control handlers are set up to reduce iOS double-tap zoom while playing.
