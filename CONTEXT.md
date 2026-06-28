# ascii-studio

A browser-based audio-visual tool. Users upload music, compose a scene of ASCII art elements, and wire audio signals to visual properties via bindings — so the art animates in real time as the track plays.

## Language

### The work

**Composition**: A named, user-created audio-visual work. Contains a canvas layout, a set of elements, a set of bindings, and a reference to an uploaded audio track. Multiple compositions are saved locally and managed through an in-app modal.
_Avoid_: Scene, project, file, page

**Canvas**: The fixed-size visual area on which elements are composed. Dimensions are set per-composition. Inherited from ascii-editor's DOM-based layout model.
_Avoid_: Stage, viewport, artboard, board

### Elements

**Element**: An ASCII art object placed at an absolute position on the canvas. Has one of four types — `text`, `ascii_art`, `divider`, or `decorative` — plus visual properties and zero or more bindings.
_Avoid_: Object, widget, component, sprite, item

**Visual Property**: An animatable attribute of an element. The bindable visual properties are: `hue` (0–360°), `fontSize`, `x`, `y`, `rotation`, `opacity`, and `content`.
_Avoid_: Attribute, field, parameter, style

### Audio

**Audio Track**: The audio file uploaded to a composition. The source from which signals are extracted during playback.
_Avoid_: Song, file, audio source, music

**Signal**: A real-time audio measurement, normalized to 0.0–1.0, extracted from the playing track via the Web Audio API. The four signals in v1 are `volume`, `bass`, `mid`, and `treble`.
_Avoid_: Audio attribute, audio value, input, channel, feature

**Playback**: The runtime state of the audio track: playing or paused, current position, and whether looping is enabled. Controls when signals are emitted.
_Avoid_: Player state, audio state

### Animation

**Binding**: A live connection between one signal and one visual property of one element. Includes a transform and, when the target property is `content`, a frame sequence. Bindings are stored globally in the composition, not on elements.
_Avoid_: Mapping, link, connection, rule, animation

**Transform**: The per-binding configuration that maps a signal (0.0–1.0) to a target property range. Defined by a min value, a max value, and an invert flag.
_Avoid_: Mapping function, scale, range, easing

**Frame Sequence**: An ordered list of content strings attached to a `content` binding. The signal value selects the active frame by index. Edited as one frame per line in a textarea.
_Avoid_: Keyframes, animation frames, content list, states
