# Task 2 Report: Rewrite CanvasBackground as Radial Blob Renderer

## Status
**DONE**

## Files Changed
- `components/editor/CanvasBackground.tsx` — full rewrite (111 insertions, 110 deletions)

## TypeScript Verification
```
npx tsc --noEmit
(no output — zero errors)
```

## Commits Made
```
3b22f7c feat: rewrite background as radial gradient blob renderer with film grain
```

## Implementation Summary

### What Was Done
Completely rewrote `CanvasBackground.tsx` to replace the Lissajous curve renderer with a radial gradient blob renderer. The new implementation:

1. **Blob System**: N blobs (one per palette color) orbit their centers using independent Lissajous curves defined by `BLOB_ORBITS[]`
2. **Radial Gradients**: Each blob renders as a radial gradient (center opaque → edges transparent)
3. **Dark Mode Support**: Respects `BackgroundConfig.darkMode` boolean:
   - Light mode: `globalCompositeOperation = 'source-over'`, cream background
   - Dark mode: `globalCompositeOperation = 'screen'`, near-black `rgb(10,8,12)` background
4. **Film Grain**: Offscreen canvas with randomized alpha values, refreshed every 3 frames, composited at 0.45 opacity
5. **Audio Reactivity**:
   - **Bass**: Beat detection (threshold 0.65, minInterval 300ms) triggers 0.25 second bloom pulse
   - **Mid**: Drives time advancement speed (t += 0.006 + mid * reactivity * 0.01)
   - **Treble**: Applies phase shift to orbit paths (twists the orbit geometry)
   - **Volume**: Expands both orbit spread and blob radius

### Key Implementation Details
- **Animation State**: Maintains `t` (time) and `beatPulse` across frames
- **Grain Refresh**: Updates grain ImageData every 3 frames to balance performance and visual texture variety
- **Resize Handling**: ResizeObserver detects canvas changes and recreates grain canvas as needed
- **Disabled State**: When `cfg.enabled === false`, renders solid background with no blobs
- **Color Fallback**: Uses `DEFAULT_BACKGROUND.colors` if `cfg.colors` is empty

### Visual Behavior
- **Without Audio**: Soft overlapping color blobs slowly drift across the canvas, covering the entire surface with smooth gradients
- **With Audio**: 
  - Beat pulses expand blob radius significantly (0.18 × half-min)
  - Treble twists the orbit paths for dynamic shape morphing
  - Volume expands orbit spread and blob radius
  - Mid accelerates the time advancement for faster drift
- **Grain**: Subtle film grain texture adds warmth and tactile quality, refreshed regularly but not excessively

## Concerns
None. Implementation follows the brief exactly:
- All required interfaces consumed (BackgroundConfig, audioEngine signals, BeatDetector)
- All rendering specifications met (radial gradients, composite operations, grain overlay)
- Dark mode fully integrated
- TypeScript clean (zero errors)
- Code matches brief verbatim

## Next Steps
Task 3 will integrate this with `BackgroundPanel` UI controls for dark mode toggle and color management.
Fix: grainFrame = 2 added to setupGrain (commit 057a62c). tsc: 0 errors.
