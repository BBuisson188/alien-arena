# Alien Arena Handoff

## Project Summary

`Alien Arena` is a single-page browser game built with plain HTML, CSS, and canvas JavaScript.

Current gameplay flow:

1. Pick an alien.
2. Pick a UFO.
3. Play through three themed stages: corn maze, beach, and snow peak.
4. Dodge stage-specific enemy shots and shoot enemies with green/purple lasers.
5. After defeating enough enemies, transition to that stage's boss arena.
6. Hit each boss 3 times to clear the stage.

## Current Files

- [index.html](</C:/Users/bbuis/Local Docs/Codex/alien-arena/index.html>)
- [Launch Alien Arena.cmd](</C:/Users/bbuis/Local Docs/Codex/alien-arena/Launch Alien Arena.cmd>)
- [styles.css](</C:/Users/bbuis/Local Docs/Codex/alien-arena/styles.css>)
- [app.js](</C:/Users/bbuis/Local Docs/Codex/alien-arena/app.js>)
- [README.md](</C:/Users/bbuis/Local Docs/Codex/alien-arena/README.md>)
- [firebase-config.js](</C:/Users/bbuis/Local Docs/Codex/alien-arena/firebase-config.js>)
- [site.webmanifest](</C:/Users/bbuis/Local Docs/Codex/alien-arena/site.webmanifest>)
- [version.json](</C:/Users/bbuis/Local Docs/Codex/alien-arena/version.json>)
- [assets/board.png](</C:/Users/bbuis/Local Docs/Codex/alien-arena/assets/board.png>)
- [assets/sprites](</C:/Users/bbuis/Local Docs/Codex/alien-arena/assets/sprites>)

## Publishing Status

The folder has been prepared for static GitHub publishing.

Added publishing/support files:

- `README.md`
- `.gitignore`
- `.gitattributes`
- `.nojekyll`
- `version.json`

Current project version: `0.1.5`

Local playtesting:

- Double-click `Launch Alien Arena.cmd` to start a Python static server on `http://127.0.0.1:4177/` and open the game.
- The launcher is needed because the game uses JavaScript modules and Firebase imports, which should be served over HTTP instead of opened directly from `index.html`.

Icon publishing status:

- `index.html` references `assets/icons/apple-touch-icon.png` for iOS home-screen saves.
- `index.html` references `assets/icons/favicon.ico` for browser tabs.
- Root `site.webmanifest` references `assets/icons/icon-192.png` and `assets/icons/icon-512.png`.
- Extra generated icon files were renamed with `delete` in the filename for manual cleanup.

Leaderboard status:

- Local top 10 scores are stored in browser `localStorage` under `alienArenaLeaderboard`.
- Global top 10 scores read from Firestore path `leaderboards/alien-arena/scores`.
- Global score documents write exactly `playerName`, `score`, `gameId`, and `createdAt`.
- Firebase Authentication is not used.
- End-of-game scores that qualify for top 10 prompt for a name.
- Qualifying named scores are saved locally first, then added to a pending Firestore sync queue in `localStorage` under `alienArenaPendingGlobalScores`.
- Pending global scores retry on leaderboard reads and browser `online` events.
- Pending sync compares against the current global top 10 and uploads only scores that still qualify. Scores that no longer qualify are removed from the local pending queue.
- Firestore failures are caught and the game falls back to the local leaderboard.
- End-of-game scores outside the top 10 show as a recent unnamed score below the leaderboard.
- The `Scores` button opens the global leaderboard when available, otherwise the local leaderboard.
- Browser Firestore access is intentionally limited to reading leaderboard scores and creating score documents with `addDoc`.
- The browser game does not update, delete, or prune Firestore documents. Firestore rules should keep `allow update, delete: if false;`.

Recommended GitHub Pages setup:

- Source: `Deploy from a branch`
- Branch: `main`
- Folder: `/ (root)`

## Asset Status

The original `board.png` was split into separate PNG sprite files under `assets/sprites`.

Available extracted sprites:

- 3 UFOs
- 3 aliens
- 3 archers
- 3 beach boys
- 3 penguins
- 1 base king sprite
- 3 additional king variants for simple left/right/throw animation
- 1 CEO boss sprite
- 1 polar bear boss sprite

Important note:

The sprite extraction/background cleanup was done locally from the board art. Some transparency and edge cleanup was improved, especially for archers, but this still needs visual playtesting in motion.

## Gameplay State

Implemented in [app.js](</C:/Users/bbuis/Local Docs/Codex/alien-arena/app.js>):

- Selection screens for alien and UFO
- 90s arcade-style visual pass with neon checker bands, scanlines, chunky outlined text, and brighter cabinet-style UI
- Corn maze flight scene with heavy/tall corn walls
- Beach stage with sandy beach, ocean, palm trees, beach boys, and thrown umbrellas
- Snow stage with snowy mountains, penguins, and thrown snowballs
- Stage enemy spawning and projectile dodging
- Laser firing with alternating green/purple visuals
- Enemy kill objective set to `10` per stage
- Boss phase transition after each stage objective is complete
- Boss arenas for castle, giant sandcastle, and snow/ice setting
- King movement and simple sprite-frame swapping
- Boss attacks: king axes, CEO umbrellas, and polar bear shark-tooth axes
- Boss defeat sequence with screen shake, squish animation, particles, and a Web Audio bloop-bloop-bloop sound
- Hull/health tracking
- Win/lose overlays

## Current Rules

- Player hull is `3`
- Each enemy or boss projectile hit removes `1` hull
- Player dies at `0` hull
- Each boss requires `3` successful hits
- On the third boss hit, the game enters a short `kingDefeated` animation before the win/next-level overlay
- Each stage objective is `10` enemy kills before boss unlock

## Known Open Items

These are the main things still worth reviewing or polishing:

- Archer transparency should be checked in live gameplay for any remaining body/cape holes or edge artifacts.
- Boss fight controls were changed from orbiting to horizontal movement, but they still need playtesting for feel.
- King sizing, spacing, and dodge readability may still need tuning.
- The king animation is currently a lightweight multi-frame variant system, not a true authored animation set.
- The new king squish animation is canvas-transform based and should be playtested for timing and comedy.
- The bloop sound uses Web Audio and depends on normal browser audio unlock behavior after player interaction.
- The UFO pilot view is currently faked with a drawn-in canopy/pilot silhouette effect, not a fully custom sprite.
- The user specifically wants the pilot to feel like the chosen alien is visible through a semi-transparent cockpit from behind; this may need custom per-alien cockpit art to look right.
- The corn has been pushed toward a louder 90s arcade style, but final art direction is still subjective and may need another pass.
- Beach and snow stage art is newly wired and needs live playtesting for spacing, projectile readability, and balance.
- Some newer beach/snow sprites may still have source-board background remnants and should be checked visually in motion.

## Suggested Next Steps

1. Playtest all three levels and tune enemy spawn pacing, projectile speed, and boss hitbox readability.
2. Revisit sprite PNG cleanup for any remaining background boxes or transparency issues.
3. Improve cockpit presentation so the chosen alien reads clearly as the pilot inside the UFO.
4. Replace simple boss frame variants with better bespoke animation if needed.

## Verification

Latest lightweight verification done:

- `node --check app.js`

What has not been done yet:

- Full browser/runtime visual verification
- Playtesting for final feel and balance
