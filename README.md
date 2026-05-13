# Alien Arena

Alien Arena is a browser-based arcade game built with plain HTML, CSS, and JavaScript canvas.

## Play Locally

Open `index.html` in a browser, or serve the folder with a simple static server.

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

## Project Files

- `index.html`: page shell
- `styles.css`: page and arcade cabinet styling
- `app.js`: game logic and canvas rendering
- `assets/`: source board and extracted sprites
- `HANDOFF.md`: implementation notes and current open items
