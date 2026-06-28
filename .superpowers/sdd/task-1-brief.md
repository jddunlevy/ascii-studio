## Task 1: Scaffold

- [ ] **1.1** Run the following command to create the Next.js project. If the CLI prompts interactively, answer: App Router = yes, import alias = `@/*`.

```bash
npx create-next-app@latest ascii-studio --typescript --tailwind --app --no-src-dir --import-alias "@/*"
cd ascii-studio
```

- [ ] **1.2** Install runtime dependencies:

```bash
npm install zustand @dnd-kit/core @dnd-kit/utilities nanoid
```

- [ ] **1.3** Install dev/test dependencies:

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **1.4** Create `vitest.config.ts` at the project root:

```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
```

- [ ] **1.5** Create `vitest.setup.ts` at the project root:

```typescript
import '@testing-library/jest-dom';
```

- [ ] **1.6** Add test scripts to `package.json`. Open `package.json` and add to the `"scripts"` object:

```json
"test": "vitest run",
"test:watch": "vitest"
```

Full `scripts` block should look like:

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint",
  "test": "vitest run",
  "test:watch": "vitest"
}
```

- [ ] **1.7** Replace `app/globals.css` with the full theme CSS:

```css
@import "tailwindcss";

:root {
  --bg: #f5f0e8;
  --surface: #ede8df;
  --text: #2a2520;
  --muted: #8a8075;
  --accent: #5a6e4a;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'JetBrains Mono', 'IBM Plex Mono', 'Fira Code', monospace;
  font-size: 13px;
  line-height: 1.4;
}

button {
  font-family: inherit;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid var(--muted);
  background: var(--surface);
  color: var(--text);
  padding: 3px 8px;
}
button:hover { border-color: var(--accent); color: var(--accent); }

input, select, textarea {
  font-family: inherit;
  font-size: 11px;
  border: 1px solid var(--muted);
  background: var(--bg);
  color: var(--text);
  padding: 3px 6px;
}
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--accent); }

label {
  font-size: 9px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
  display: block;
  margin-bottom: 2px;
}
```

- [ ] **1.8** Replace `app/layout.tsx` with minimal layout (fonts loaded from system):

```tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ascii-studio',
  description: 'audio-visual ASCII art studio',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **1.9** Verify the dev server starts with no TypeScript errors:

```bash
npm run dev
```

Expected: server starts at `http://localhost:3000`, terminal shows no TS compile errors.

- [ ] **1.10** Initialize git and make the first commit:

```bash
git init && git add . && git commit -m "feat: scaffold ascii-studio"
```

---

