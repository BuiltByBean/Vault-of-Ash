# Vault of Ash — Web Edition

Official site for **Vault of Ash**, a complete offline text adventure (Phase I, v1.0.0).

Centuries after the city of Veyrholm burned, its buried vault has cracked open. 25 chambers, 17 relics, 10 lore discoveries, five endings.

## Structure

| Path | What it is |
|---|---|
| `public/index.html` | Landing site (themed on the game) |
| `public/play/` | The game itself — **unmodified** original release (the server injects a small "⟵ Surface" home link into the served page at request time; the files on disk are untouched) |
| `server.js` | Zero-dependency Node static server |
| `Dockerfile` / `railway.json` | Railway deployment config |

## Run locally

```
npm start
```

Serves on http://localhost:3000 (or `PORT` if set). No `npm install` needed — there are no dependencies.

## Test

```
npm test
```

Runs the game's own automated suite (`public/play/tests/test_game.js`).

## Deploy on Railway

The repo is Railway-ready:

- Builds from the `Dockerfile` (Node 20 alpine, no install step).
- Server binds `::` (dual-stack) on `process.env.PORT`.
- Healthcheck at `/healthz` (configured in `railway.json`).

Either connect the GitHub repo in the Railway dashboard, or from this directory:

```
railway up
```

## Credits

Game design, writing, and engine: the original **VAULT_OF_ASH** release, served verbatim from `public/play/`. Site wrapper built around it for the web edition.
