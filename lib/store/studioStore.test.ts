// lib/store/studioStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import useStudioStore from './studioStore';
import { createComposition, createElement } from '@/lib/composition/defaults';
import { nanoid } from 'nanoid';
import type { Binding, VisualizerElement } from '@/lib/types';

beforeEach(() => {
  useStudioStore.setState({
    composition: null,
    liveValues: {},
    selectedElementId: null,
    activeTab: 'palette',
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    loop: false,
  });
});

describe('loadComposition', () => {
  it('sets the composition in state', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    expect(useStudioStore.getState().composition).toEqual(comp);
  });
});

describe('addElement', () => {
  it('adds element to composition.elements', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const el = createElement('text', { x: 0, y: 0 }, 0);
    useStudioStore.getState().addElement(el);
    expect(useStudioStore.getState().composition!.elements).toHaveLength(1);
    expect(useStudioStore.getState().composition!.elements[0].id).toBe(el.id);
  });
});

describe('removeElement', () => {
  it('removes element and also removes its bindings', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);

    const el = createElement('text', { x: 0, y: 0 }, 0);
    useStudioStore.getState().addElement(el);

    const binding: Binding = {
      id: nanoid(),
      elementId: el.id,
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(1);

    useStudioStore.getState().removeElement(el.id);
    expect(useStudioStore.getState().composition!.elements).toHaveLength(0);
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(0);
  });
});

describe('addBinding / removeBinding', () => {
  it('adds a binding to composition.bindings', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const binding: Binding = {
      id: nanoid(),
      elementId: 'el-1',
      signal: 'bass',
      property: 'hue',
      transform: { min: 0, max: 360, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(1);
  });

  it('removes a binding by id', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const binding: Binding = {
      id: 'bind-1',
      elementId: 'el-1',
      signal: 'treble',
      property: 'fontSize',
      transform: { min: 10, max: 48, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    useStudioStore.getState().removeBinding('bind-1');
    expect(useStudioStore.getState().composition!.bindings).toHaveLength(0);
  });
});

describe('updateBinding', () => {
  it('patches a binding by id', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const binding: Binding = {
      id: 'bind-2',
      elementId: 'el-1',
      signal: 'volume',
      property: 'opacity',
      transform: { min: 0, max: 1, invert: false },
    };
    useStudioStore.getState().addBinding(binding);
    useStudioStore.getState().updateBinding('bind-2', { signal: 'mid' });
    const updated = useStudioStore
      .getState()
      .composition!.bindings.find((b) => b.id === 'bind-2');
    expect(updated?.signal).toBe('mid');
    expect(updated?.property).toBe('opacity');
  });
});

describe('visualizer actions', () => {
  it('adds a visualizer element', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const { addVisualizer, composition } = useStudioStore.getState();

    const visualizer: VisualizerElement = {
      id: 'vis-1',
      type: 'visualizer',
      visualType: 'spectrum',
      renderStyle: 'bars',
      audioSignal: 'bass',
      strobe: { enabled: false, threshold: 0.7, speed: 100 },
      fontSize: 13,
      position: { x: 100, y: 100 },
      size: { w: 200, h: 100 },
      z: 1,
      rotation: 0,
      opacity: 1,
      color: { h: 200, s: 50, l: 50 },
      locked: false,
      spectrum: {
        barCount: 8,
        freqRanges: [20, 60, 250, 500, 2000, 4000, 8000, 16000, 20000],
        barChar: '█',
        direction: 'vertical',
        spacing: 2,
        smoothing: 0.7,
        peakHold: false,
        decaySpeed: 0.8,
      },
    };

    addVisualizer(visualizer);

    const state = useStudioStore.getState();
    expect(state.composition?.elements).toContainEqual(visualizer);
  });

  it('updates a visualizer element', () => {
    const comp = createComposition('test');
    useStudioStore.getState().loadComposition(comp);
    const { addVisualizer, updateVisualizer } = useStudioStore.getState();

    const visualizer: VisualizerElement = {
      id: 'vis-2',
      type: 'visualizer',
      visualType: 'pulse',
      renderStyle: 'star',
      audioSignal: 'volume',
      strobe: { enabled: false, threshold: 0.7, speed: 100 },
      fontSize: 24,
      position: { x: 50, y: 50 },
      size: { w: 40, h: 40 },
      z: 1,
      rotation: 0,
      opacity: 1,
      color: { h: 180, s: 60, l: 50 },
      locked: false,
    };

    addVisualizer(visualizer);
    updateVisualizer('vis-2', { fontSize: 32, audioSignal: 'bass' });

    const state = useStudioStore.getState();
    const updated = state.composition?.elements.find(el => el.id === 'vis-2') as VisualizerElement;
    expect(updated.fontSize).toBe(32);
    expect(updated.audioSignal).toBe('bass');
  });
});
