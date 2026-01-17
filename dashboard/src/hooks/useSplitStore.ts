import { create } from 'zustand';
import type { Position } from 'geojson';

interface SplitState {
  // State
  isSplitting: boolean;
  targetPolygonId: string | null;
  lineVertices: Position[];

  // Actions
  startSplit: (polygonId: string) => void;
  addVertex: (position: Position) => void;
  updateLastVertex: (position: Position) => void;
  removeLastVertex: () => void;
  finishSplit: () => Position[] | null;
  cancelSplit: () => void;

  // Selectors
  getVertices: () => Position[];
  canFinish: () => boolean;
}

export const useSplitStore = create<SplitState>((set, get) => ({
  // Initial state
  isSplitting: false,
  targetPolygonId: null,
  lineVertices: [],

  // Actions
  startSplit: (polygonId) =>
    set({
      isSplitting: true,
      targetPolygonId: polygonId,
      lineVertices: [],
    }),

  addVertex: (position) =>
    set((state) => ({
      lineVertices: [...state.lineVertices, position],
    })),

  updateLastVertex: (position) =>
    set((state) => {
      if (state.lineVertices.length === 0) return state;
      const newVertices = [...state.lineVertices];
      newVertices[newVertices.length - 1] = position;
      return { lineVertices: newVertices };
    }),

  removeLastVertex: () =>
    set((state) => ({
      lineVertices: state.lineVertices.slice(0, -1),
    })),

  finishSplit: () => {
    const { lineVertices, isSplitting } = get();

    // Need at least 2 vertices for a split line
    if (!isSplitting || lineVertices.length < 2) {
      return null;
    }

    const result = [...lineVertices];

    // Reset state
    set({
      isSplitting: false,
      targetPolygonId: null,
      lineVertices: [],
    });

    return result;
  },

  cancelSplit: () =>
    set({
      isSplitting: false,
      targetPolygonId: null,
      lineVertices: [],
    }),

  // Selectors
  getVertices: () => get().lineVertices,
  canFinish: () => get().lineVertices.length >= 2,
}));
