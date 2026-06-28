// lib/store/studioStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import useStudioStore from './studioStore';
import { createComposition, createElement } from '@/lib/composition/defaults';
import { nanoid } from 'nanoid';
import type { Binding } from '@/lib/types';

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
