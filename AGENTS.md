# AGENTS.md

## Cursor Cloud specific instructions

`fluid` is a single, frontend-only web app (no backend/database). It uses **Vite+** (`vite` is overridden to `@voidzero-dev/vite-plus-core`) + **React Router v8 (SSR)** + **Tailwind v4**, managed with **npm** (`package-lock.json`). There are three routes under a shared sidebar shell: `/` (概览), `/components`, `/settings`, plus a bottom-right AI chat popup (open with ⌘I) whose replies are simulated client-side (no LLM/API).

### Node version (important, non-obvious)
This repo requires **Node 24** (matches the `Dockerfile`; `react-router` needs `node >=22.22` and `vite-plus` needs `^22.18 || >=24.11`). The system default `node` on the PATH is `/exec-daemon/node` (v22.14), which is **below** the required version and shadows nvm even after `nvm alias default 24`. Before running any npm script (`dev`, `build`, `start`, `typecheck`), prepend the nvm Node 24 bin to PATH for the shell/tmux session:

```bash
export PATH="$HOME/.nvm/versions/node/v24.18.1/bin:$PATH"   # or: nvm use 24
```

`npm ci` itself succeeds under the system Node, but the dev/build/serve commands should run under Node 24.

### Run / build / test / lint
Commands are defined in `package.json` and `README.md`; run them from the repo root with Node 24 on PATH.

- Dev server: `npm run dev` → serves on `http://localhost:5173/` (run it in a persistent tmux session).
- Build: `npm run build`; serve the prod build with `npm run start`.
- Typecheck: `npm run typecheck` (runs `react-router typegen` first, which generates `.react-router/types` needed by `tsc`).
- Format + lint + typecheck: `npx vp check` (the Vite+ CLI binary is `vp`, **not** `vite-plus`). Use `npx vp check --fix` to auto-fix formatting.
- React Doctor health gate: `npm run doctor` / `npm run doctor:score` (repo policy targets score 100; see `.cursor/rules/react-doctor.mdc`). Note: the current committed codebase scores 0 with pre-existing findings, so `--scope changed` is the practical gate for new work.

There is **no automated test framework** in this repo — validate changes via `typecheck`, `vp check`, React Doctor, and manual browser testing of the three routes + the ⌘I AI chat popup.
