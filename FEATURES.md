# ASCII Studio - Feature Documentation

**Version:** 0.0.1  
**Last Updated:** 2026-06-30

ASCII Studio is an audio-reactive visual composition tool for creating animated ASCII/text art synchronized to music.

---

## Core Features

### 1. Canvas & Composition System

**Canvas**
- Configurable canvas dimensions (default: 1200×800)
- Grid-based positioning system (default: 8px grid)
- Visual grid toggle (press `G`)
- Drag-and-drop element placement from palette
- Multi-element composition with z-index layering

**Element Management**
- Select elements by clicking
- Keyboard shortcuts:
  - Arrow keys: nudge by grid size
  - Shift + Arrow keys: nudge by 4× grid size
  - Delete/Backspace: remove selected element
  - Escape: deselect

**Compositions**
- Create, save, load, and delete compositions
- Auto-save to localStorage
- Name compositions (double-click title to edit)
- Each composition stores: elements, bindings, canvas config, background settings

---

### 2. Element Types

**Text**
- Single or multi-line text content
- Editable via Inspector panel
- Font selection (JetBrains Mono, IBM Plex Mono, Fira Code, VT323)
- Font size control (8-96px)

**ASCII Art**
- Multi-line ASCII/Unicode art
- Monospace font rendering
- Same font/size controls as Text

**Divider**
- Repeating character patterns (e.g., `─`, `═`, `•`)
- Auto-fills width of element
- Customizable pattern character(s)

**Visualizer** (Audio-reactive)
- **Spectrum**: Frequency spectrum bars
  - Vertical or horizontal orientation
  - 4-32 frequency bars
  - Customizable bar character (█, ▓, |, etc.)
  - Smoothing and decay controls
  - Real-time frequency analysis via Web Audio API
  
- **Pulse**: Animated pulsing sprite
  - Render styles: star (★), dot (·), wave (~≈~), block (▓)
  - Size and opacity scale with audio signal
  
- **Text**: Template-based dynamic text
  - Signal variables: `{volume}`, `{bass}`, `{mid}`, `{treble}`
  - Format modifiers: `:bar`, `:percent`, `:decimal`
  - Example: `BASS: {bass:bar}` displays as `BASS: ████░░░░░░`

**Strobe Effects** (all visualizers)
- Optional beat-reactive flashing
- Configurable threshold (0-1)
- Adjustable flash speed (50-500ms)

---

### 3. Inspector Panel

**Universal Properties** (all elements)
- Position (X, Y coordinates)
- Size (Width, Height)
- Rotation (-360° to 360°)
- Opacity (0-1)
- Color (HSL sliders)
- Z-index (layer order)
- Lock (prevent accidental edits)
- Gradient overlay toggle

**Type-Specific Properties**
- Text/ASCII Art: Font, font size, content
- Divider: Pattern character(s)
- Visualizer: Audio signal, render style, spectrum/pulse/text settings

---

### 4. Audio System

**Audio Player**
- Load audio files (MP3, WAV, OGG, etc.)
- Play/Pause controls
- Scrubber timeline
- Loop toggle
- Time display (current / duration)

**Audio Analysis** (Web Audio API)
- FFT size: 2048
- Frequency analysis (0-22kHz)
- Four extracted signals:
  - **Volume**: Overall RMS amplitude
  - **Bass**: 20-250 Hz
  - **Mid**: 250-2000 Hz
  - **Treble**: 2000-20000 Hz
- Real-time signal extraction at 60fps

**Audio Engine Features**
- `audioEngine.loadFile()` - Load audio buffer
- `audioEngine.play()` / `pause()` / `stop()` - Playback control
- `audioEngine.seek()` - Scrub to timestamp
- `audioEngine.getSignals()` - Get current audio signals
- `audioEngine.getFrequencyData()` - Get raw FFT data

---

### 5. Binding System

**Audio-to-Visual Bindings**
- Map any audio signal to any visual property
- Bindable properties:
  - `hue` - Color hue shift
  - `fontSize` - Text size
  - `x`, `y` - Position
  - `rotation` - Rotation angle
  - `opacity` - Transparency
  - `content` - Text content (frame-based animation)

**Transform Controls**
- Min/Max range mapping
- Invert toggle
- Per-binding configuration

**Binding Presets** (quick-add buttons)
- Bass Pulse (bass → fontSize, 13-32px)
- Volume Fade (volume → opacity, 0.3-1.0)
- Treble Spin (treble → rotation, 0-360°)
- Mid Hue Shift (mid → hue, 0-360°)

**Binding Preview**
- Live preview showing signal → property mapping
- Shows output at 0%, 50%, 100% signal levels

---

### 6. Background System

**Audio-Reactive Background**
- Enable/disable toggle
- Base color (resting state)
- React color (peak state)
- Signal selection (volume, bass, mid, treble)
- Reactivity slider (0-1, controls blend strength)
- Smooth color interpolation

**Color Palette** (48 swatches)
- Blacks & near-blacks
- Dark tints
- Deep saturated colors
- Mids & brights
- Lights & pastels
- Greys & white
- Native color picker for custom colors

**Rendering**
- Canvas-based background (not CSS)
- Real-time color lerp based on audio signal
- Low-pass filter for smooth transitions
- Auto-resizes with canvas

---

### 7. Animation System

**Animation Loop**
- 60fps RequestAnimationFrame loop
- Per-frame binding evaluation
- Live value overrides applied to elements
- Automatic stop on pause

**Live Overrides**
- Runtime property modifications via bindings
- Non-destructive (original values preserved)
- Instant updates on audio changes

---

### 8. Utilities & Libraries

**Audio Utilities**
- `SpectrumCalculator` - Frequency bar amplitude calculation, smoothing, decay
- `BeatDetector` - Beat detection for strobe effects (threshold crossing with debounce)
- `signals.ts` - Signal extraction (volume, bass, mid, treble from FFT)

**Storage**
- LocalStorage-based composition persistence
- JSON serialization
- Storage migration system for backward compatibility

**Defaults**
- Default colors, fonts, canvas dimensions
- Default background configuration
- Element factory functions

---

## Technical Stack

- **Framework**: Next.js 16.2.9 (App Router)
- **React**: 19.2.4
- **TypeScript**: 5.x
- **State Management**: Zustand 5.0.14
- **Drag & Drop**: @dnd-kit/core 6.3.1
- **Audio**: Web Audio API (native browser)
- **Testing**: Vitest 4.1.9
- **Styling**: CSS-in-JS (inline styles)

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `G` | Toggle canvas grid |
| `Arrow Keys` | Nudge selected element by grid size |
| `Shift + Arrow Keys` | Nudge by 4× grid size |
| `Delete` / `Backspace` | Remove selected element |
| `Escape` | Deselect element |
| `Double-click title` | Edit composition name |

---

## Architecture Decisions

See `docs/adr/` for detailed architectural decision records:

1. **Bindings Stored Globally** - Bindings live at composition level, not nested in elements
2. **Separate App from ASCII Editor** - Studio is the composition tool; renderer is separate
3. **Compose Then Animate** - Static composition first, then bind to audio
4. **DOM Rendering Not Canvas** - Elements rendered as DOM nodes for flexibility

---

## Project Structure

```
ascii-studio/
├── app/                        # Next.js app router
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── compositions/           # Composition modal
│   └── editor/                 # Editor UI components
│       ├── AudioPlayer.tsx
│       ├── BackgroundPanel.tsx
│       ├── BindingPanel.tsx
│       ├── Canvas.tsx
│       ├── CanvasBackground.tsx
│       ├── EditorShell.tsx
│       ├── ElementRenderer.tsx
│       ├── ElementWrapper.tsx
│       ├── Inspector.tsx
│       ├── Palette.tsx
│       ├── binding/            # Binding presets & preview
│       └── visualizer/         # Visualizer components
│           ├── PulseRenderer.tsx
│           ├── SpectrumRenderer.tsx
│           ├── StrobeLayer.tsx
│           ├── TextVisualRenderer.tsx
│           ├── VisualizerModal.tsx
│           ├── VisualizerPanel.tsx
│           └── VisualizerRenderer.tsx
├── lib/
│   ├── animation/              # Animation loop
│   ├── audio/                  # Audio engine & utilities
│   │   ├── audioEngine.ts
│   │   ├── BeatDetector.ts
│   │   ├── signals.ts
│   │   └── SpectrumCalculator.ts
│   ├── composition/            # Composition defaults & storage
│   ├── library/                # Element palette definitions
│   ├── store/                  # Zustand store
│   └── types.ts                # TypeScript definitions
└── docs/
    └── adr/                    # Architecture decision records
```

---

## Known Limitations

- No audio file included (user must load their own)
- No export/render functionality (runtime-only)
- No undo/redo system
- No collaborative editing
- Web Audio API requires user gesture to start (browser security)
- LocalStorage has ~5-10MB limit (composition count limited)

---

## Future Considerations

- Export to video/GIF
- Audio waveform visualization
- More visualizer types (VU meter, oscilloscope)
- Keyframe animation system
- MIDI input support
- Shader-based effects
- Multi-track audio support
