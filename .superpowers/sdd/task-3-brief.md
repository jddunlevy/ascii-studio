### Task 3: Add dark/light toggle to BackgroundPanel

**Files:**
- Modify: `components/editor/BackgroundPanel.tsx`

**Interfaces:**
- Consumes: `BackgroundConfig.darkMode: boolean`
- Consumes: `updateBackground({ darkMode: boolean })`
- Produces: THEME section above PALETTE with ◻ LIGHT / ◼ DARK toggle buttons

- [ ] **Step 1: Add THEME section to BackgroundPanel**

In `components/editor/BackgroundPanel.tsx`, find the PALETTE section header:

```tsx
      {/* Palette */}
      <SectionHeader>PALETTE</SectionHeader>
```

Insert a THEME section immediately before it:

```tsx
      {/* Theme */}
      <SectionHeader>THEME</SectionHeader>
      <div style={{ padding: '4px 8px', display: 'flex', gap: 4 }}>
        {(['light', 'dark'] as const).map((mode) => {
          const isActive = (cfg.darkMode ?? false) === (mode === 'dark');
          return (
            <button
              key={mode}
              onClick={() => updateBackground({ darkMode: mode === 'dark' })}
              style={{
                flex: 1,
                padding: '3px 0',
                background: isActive ? 'var(--accent)' : 'var(--surface)',
                color: isActive ? 'var(--bg)' : 'var(--muted)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--muted)'}`,
                cursor: 'pointer',
                fontSize: 9,
                letterSpacing: '0.08em',
                fontFamily: 'inherit',
              }}
            >
              {mode === 'light' ? '\u25fb LIGHT' : '\u25fc DARK'}
            </button>
          );
        })}
      </div>
```

Note: `\u25fb` = ◻, `\u25fc` = ◼ (Unicode escape to avoid encoding issues in source).

- [ ] **Step 2: Remove the GLOW MODE section**

The `glow` field is now superseded by the dark/light mode toggle (dark mode IS the glow mode via screen blend). Remove the GLOW MODE checkbox section entirely from the JSX.

Find and delete this block:

```tsx
      {/* Glow mode */}
      <SectionHeader>STYLE</SectionHeader>
      <div style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: 6 }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            margin: 0,
            fontSize: 11,
            color: 'var(--text)',
          }}
        >
          <input
            type="checkbox"
            checked={cfg.glow}
            onChange={(e) => updateBackground({ glow: e.target.checked })}
          />
          GLOW MODE
        </label>
      </div>
```

Leave the `glow` field on the type and in storage — do not remove it from `BackgroundConfig` or `DEFAULT_BACKGROUND` (old saved compositions have it; removing it from the type would require another migration). Simply remove the UI control.

- [ ] **Step 3: Verify TypeScript compiles with zero errors**

Run: `npx tsc --noEmit`

Expected: zero errors across the entire project.

- [ ] **Step 4: Run the app and verify toggle**

Run: `npm run dev`

Open the BACKGROUND panel:
- THEME row shows ◻ LIGHT (active/accent) and ◼ DARK buttons
- Clicking ◼ DARK: canvas shifts to near-black, blobs glow via screen blend
- Clicking ◻ LIGHT: canvas returns to cream/aura look with source-over blend
- GLOW MODE checkbox is gone — no orphaned control
- PALETTE, REACTIVITY slider still work in both modes

- [ ] **Step 5: Commit**

```bash
git add components/editor/BackgroundPanel.tsx
git commit -m "feat: add dark/light theme toggle, remove orphaned glow checkbox"
```
