# Task 1 Report: Scaffold ascii-studio

**Date:** 2026-06-28  
**Status:** DONE

---

## What Was Done

### 1.1 — create-next-app

`npx create-next-app@latest ascii-studio --typescript --tailwind --app --no-src-dir --import-alias "@/*"` was run from `C:\Users\jaxon\code` (the parent directory).

**Deviation:** The existing `.superpowers/`, `CONTEXT.md`, and `docs/` files caused create-next-app to abort with a "directory contains conflicting files" error. Resolution: those three items were temporarily moved to `/tmp/ascii-studio-backup/`, create-next-app ran successfully, then all three were restored. No files were lost.

create-next-app auto-initialized a git repo and made the commit `42afdca Initial commit from Create Next App`.

Versions installed:
- next: 16.2.9
- react / react-dom: 19.2.4
- tailwindcss: ^4 (v4 — uses `@import "tailwindcss"` syntax, not `@tailwind` directives)

### 1.2 — Runtime dependencies

```
npm install zustand @dnd-kit/core @dnd-kit/utilities nanoid
```

Installed: zustand ^5.0.14, @dnd-kit/core ^6.3.1, @dnd-kit/utilities ^3.2.2, nanoid ^5.1.16

### 1.3 — Dev/test dependencies

```
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Installed: vitest ^4.1.9, @vitejs/plugin-react ^6.0.3, jsdom ^29.1.1, @testing-library/react ^16.3.2, @testing-library/jest-dom ^6.9.1

### 1.4 — vitest.config.ts

Created at `C:\Users\jaxon\code\ascii-studio\vitest.config.ts` verbatim from brief.

### 1.5 — vitest.setup.ts

Created at `C:\Users\jaxon\code\ascii-studio\vitest.setup.ts` verbatim from brief.

### 1.6 — package.json scripts

Added `"test": "vitest run"` and `"test:watch": "vitest"`. Also corrected `"lint"` from `"eslint"` (create-next-app default) to `"next lint"` (brief spec). Full scripts block matches brief exactly.

### 1.7 — app/globals.css

Replaced with full theme CSS verbatim from brief:
- `@import "tailwindcss"` (Tailwind v4 syntax)
- 5-token CSS vars: --bg, --surface, --text, --muted, --accent
- Global reset, body with monospace font stack, button/input/label base styles
- No border-radius anywhere

### 1.8 — app/layout.tsx

Replaced with minimal layout verbatim from brief. No Google Fonts import — fonts loaded from system only.

### 1.9 — TypeScript verification

```
npx tsc --noEmit
```

Result: no output, exit code 0. Zero TypeScript errors.

### 1.10 — Git commit

`git init` was not needed (create-next-app already initialized the repo). Staged and committed all scaffold changes:

```
git add app/globals.css app/layout.tsx package.json package-lock.json vitest.config.ts vitest.setup.ts .superpowers/ CONTEXT.md docs/
git commit -m "feat: scaffold ascii-studio"
```

Commit hash: `13af7d9`

---

## Deviations from Brief

| # | Item | Deviation |
|---|------|-----------|
| 1.1 | create-next-app | Had to temporarily relocate `.superpowers/`, `CONTEXT.md`, `docs/` to avoid CLI conflict error. All restored afterward. |
| 1.6 | lint script | Changed from `"eslint"` (create-next-app default) to `"next lint"` (brief spec). |
| 1.9 | Dev server | Brief says `npm run dev`; task instructions say use `npx tsc --noEmit`. Used tsc — result: clean. |
| 1.10 | git init | Skipped `git init` because create-next-app already ran it. Went straight to `git add && git commit`. |

---

## Test Results

`npx tsc --noEmit` — exit code 0, no errors.

No unit tests were written in this task (vitest infrastructure only). `npm test` would run vitest against zero test files — expected output is "no test files found."

---

## Concerns

- `npm audit` reports 2 moderate severity vulnerabilities in the dependency tree (pre-existing from create-next-app). Not blocking.
- Git LF/CRLF warnings appeared on Windows during commit — cosmetic, no functional impact.
- `vitest.config.ts` uses `__dirname` which requires `moduleResolution` to support it. Works fine because tsconfig.json targets Node (Next.js default).
