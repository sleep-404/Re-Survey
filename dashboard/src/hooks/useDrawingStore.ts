import { create } from 'zustand';
import type { Position } from 'geojson';

interface DrawingState {
  // State
  isDrawing: boolean;
  vertices: Position[];

  // Actions
  startDrawing: () => void;
  addVertex: (position: Position) => void;
  updateLastVertex: (position: Position) => void;
  removeLastVertex: () => void;
  finishDrawing: () => Position[] | null;
  cancelDrawing: () => void;

  // Selectors
  getVertices: () => Position[];
  canFinish: () => boolean;
}

export const useDrawingStore = create<DrawingState>((set, get) => ({
  // Initial state
  isDrawing: false,
  vertices: [],

  // Actions
  startDrawing: () =>
    set({
      isDrawing: true,
      vertices: [],
    }),

  addVertex: (position) =>
    set((state) => ({
      vertices: [...state.vertices, position],
    })),

  updateLastVertex: (position) =>
    set((state) => {
      if (state.vertices.length === 0) return state;
      const newVertices = [...state.vertices];
      newVertices[newVertices.length - 1] = position;
      return { vertices: newVertices };
    }),

  removeLastVertex: () =>
    set((state) => ({
      vertices: state.vertices.slice(0, -1),
    })),

  finishDrawing: () => {
    const { vertices, isDrawing } = get();

    // Need at least 3 vertices for a valid polygon
    if (!isDrawing || vertices.length < 3) {
      return null;
    }

    // Close the polygon by adding the first vertex at the end
    const closedVertices = [...vertices, vertices[0]];

    // Reset state
    set({
      isDrawing: false,
      vertices: [],
    });

    return closedVertices;
  },

  cancelDrawing: () =>
    set({
      isDrawing: false,
      vertices: [],
    }),

  // Selectors
  getVertices: () => get().vertices,
  canFinish: () => get().vertices.length >= 3,
}));
