// lib/store/studioStore.ts
import { create } from 'zustand';
import type {
  CompositionSpec,
  Element,
  Binding,
  LiveValues,
  BackgroundConfig,
  VisualizerElement,
  GlobalAudioConfig,
  ElementSensitivity,
} from '@/lib/types';
import { saveComposition } from '@/lib/composition/storage';
import { DEFAULT_BACKGROUND, DEFAULT_GLOBAL_AUDIO } from '@/lib/composition/defaults';

interface StudioState {
  composition: CompositionSpec | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  loop: boolean;
  liveValues: LiveValues;
  selectedElementId: string | null;
  activeTab: 'palette' | 'bindings' | 'presets';

  loadComposition(comp: CompositionSpec): void;
  updateCompositionName(name: string): void;
  addElement(el: Element): void;
  updateElement(id: string, changes: Partial<Element>): void;
  removeElement(id: string): void;
  addBinding(b: Binding): void;
  updateBinding(id: string, changes: Partial<Binding>): void;
  removeBinding(id: string): void;
  setLiveValues(values: LiveValues): void;
  setSelectedElementId(id: string | null): void;
  setActiveTab(tab: 'palette' | 'bindings' | 'presets'): void;
  setPlayback(
    state: Partial<
      Pick<StudioState, 'isPlaying' | 'currentTime' | 'duration' | 'loop'>
    >
  ): void;
  updateBackground(changes: Partial<BackgroundConfig>): void;
  addVisualizer(visualizer: VisualizerElement): void;
  updateVisualizer(id: string, changes: Partial<VisualizerElement>): void;
  updateGlobalAudioConfig(changes: Partial<GlobalAudioConfig>): void;
  setElementSensitivity(elementId: string, sensitivity: ElementSensitivity | null): void;
  persistComposition(): void;
}

const useStudioStore = create<StudioState>((set, get) => ({
  composition: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  loop: false,
  liveValues: {},
  selectedElementId: null,
  activeTab: 'palette',

  loadComposition(comp) {
    set({ composition: comp, selectedElementId: null, liveValues: {} });
  },

  updateCompositionName(name) {
    set((s) => {
      if (!s.composition) return s;
      return { composition: { ...s.composition, name } };
    });
  },

  addElement(el) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: [...s.composition.elements, el],
        },
      };
    });
  },

  updateElement(id, changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: s.composition.elements.map((el) =>
            el.id === id ? ({ ...el, ...changes } as Element) : el
          ),
        },
      };
    });
  },

  removeElement(id) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: s.composition.elements.filter((el) => el.id !== id),
          bindings: s.composition.bindings.filter((b) => b.elementId !== id),
        },
        selectedElementId:
          s.selectedElementId === id ? null : s.selectedElementId,
      };
    });
  },

  addBinding(b) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          bindings: [...s.composition.bindings, b],
        },
      };
    });
  },

  updateBinding(id, changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          bindings: s.composition.bindings.map((b) =>
            b.id === id ? { ...b, ...changes } : b
          ),
        },
      };
    });
  },

  removeBinding(id) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          bindings: s.composition.bindings.filter((b) => b.id !== id),
        },
      };
    });
  },

  setLiveValues(values) {
    set({ liveValues: values });
  },

  setSelectedElementId(id) {
    set({ selectedElementId: id });
  },

  setActiveTab(tab) {
    set({ activeTab: tab });
  },

  setPlayback(state) {
    set(state);
  },

  updateBackground(changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          background: { ...DEFAULT_BACKGROUND, ...(s.composition.background ?? {}), ...changes },
        },
      };
    });
  },

  addVisualizer: (visualizer: VisualizerElement) =>
    set((state) => {
      if (!state.composition) return state;
      return {
        composition: {
          ...state.composition,
          elements: [...state.composition.elements, visualizer],
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateVisualizer: (id: string, changes: Partial<VisualizerElement>) =>
    set((state) => {
      if (!state.composition) return state;
      return {
        composition: {
          ...state.composition,
          elements: state.composition.elements.map((el) =>
            el.id === id && el.type === 'visualizer'
              ? { ...el, ...changes }
              : el
          ),
          updatedAt: new Date().toISOString(),
        },
      };
    }),

  updateGlobalAudioConfig(changes) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          globalAudioConfig: {
            ...DEFAULT_GLOBAL_AUDIO,
            ...(s.composition.globalAudioConfig ?? {}),
            ...changes,
          },
        },
      };
    });
  },

  setElementSensitivity(elementId, sensitivity) {
    set((s) => {
      if (!s.composition) return s;
      return {
        composition: {
          ...s.composition,
          elements: s.composition.elements.map((el) =>
            el.id === elementId
              ? { ...el, sensitivity: sensitivity ?? undefined }
              : el
          ),
        },
      };
    });
  },

  persistComposition() {
    const { composition } = get();
    if (!composition) return;
    const updated = {
      ...composition,
      updatedAt: new Date().toISOString(),
    };
    set({ composition: updated });
    saveComposition(updated);
  },
}));

export default useStudioStore;
