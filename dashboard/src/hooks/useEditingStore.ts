import { create } from 'zustand';
import type { Position } from 'geojson';

interface EditingState {
  // State
  editingPolygonId: string | null;
  originalCoordinates: Position[] | null;
  currentCoordinates: Position[] | null;
  draggedVertexIndex: number | null;
  selectedVertexIndex: number | null;
  isDragging: boolean;

  // Actions
  startEditing: (polygonId: string, coordinates: Position[]) => void;
  updateVertex: (index: number, position: Position) => void;
  startDragging: (vertexIndex: number) => void;
  stopDragging: () => void;
  selectVertex: (index: number | null) => void;
  deleteVertex: (index: number) => void;
  deleteSelectedVertex: () => void;
  addVertex: (afterIndex: number, position: Position) => void;
  finishEditing: () => Position[] | null;
  cancelEditing: () => void;

  // Selectors
  isEditing: () => boolean;
  getCoordinates: () => Position[] | null;
}

export const useEditingStore = create<EditingState>((set, get) => ({
  // Initial state
  editingPolygonId: null,
  originalCoordinates: null,
  currentCoordinates: null,
  draggedVertexIndex: null,
  selectedVertexIndex: null,
  isDragging: false,

  // Actions
  startEditing: (polygonId, coordinates) =>
    set({
      editingPolygonId: polygonId,
      // Remove the closing vertex (last one that duplicates first)
      originalCoordinates: coordinates.slice(0, -1),
      currentCoordinates: coordinates.slice(0, -1),
      draggedVertexIndex: null,
      isDragging: false,
    }),

  updateVertex: (index, position) =>
    set((state) => {
      if (!state.currentCoordinates) return state;
      const newCoords = [...state.currentCoordinates];
      newCoords[index] = position;
      return { currentCoordinates: newCoords };
    }),

  startDragging: (vertexIndex) =>
    set({
      draggedVertexIndex: vertexIndex,
      selectedVertexIndex: vertexIndex,
      isDragging: true,
    }),

  stopDragging: () =>
    set({
      draggedVertexIndex: null,
      isDragging: false,
      // Keep selectedVertexIndex - vertex stays selected after drag
    }),

  selectVertex: (index) =>
    set({ selectedVertexIndex: index }),

  deleteVertex: (index) =>
    set((state) => {
      if (!state.currentCoordinates) return state;
      // Need at least 3 vertices for a valid polygon
      if (state.currentCoordinates.length <= 3) return state;
      const newCoords = state.currentCoordinates.filter((_, i) => i !== index);
      // Clear selection if deleted vertex was selected
      const newSelectedIndex = state.selectedVertexIndex === index ? null :
        (state.selectedVertexIndex !== null && state.selectedVertexIndex > index)
          ? state.selectedVertexIndex - 1
          : state.selectedVertexIndex;
      return { currentCoordinates: newCoords, selectedVertexIndex: newSelectedIndex };
    }),

  deleteSelectedVertex: () => {
    const { selectedVertexIndex, currentCoordinates } = get();
    if (selectedVertexIndex === null || !currentCoordinates) return;
    // Need at least 3 vertices for a valid polygon
    if (currentCoordinates.length <= 3) return;
    const newCoords = currentCoordinates.filter((_, i) => i !== selectedVertexIndex);
    set({ currentCoordinates: newCoords, selectedVertexIndex: null });
  },

  addVertex: (afterIndex, position) =>
    set((state) => {
      if (!state.currentCoordinates) return state;
      const newCoords = [...state.currentCoordinates];
      newCoords.splice(afterIndex + 1, 0, position);
      return { currentCoordinates: newCoords };
    }),

  finishEditing: () => {
    const { currentCoordinates, editingPolygonId } = get();

    if (!currentCoordinates || !editingPolygonId) {
      return null;
    }

    // Close the polygon by adding the first vertex at the end
    const closedCoords = [...currentCoordinates, currentCoordinates[0]];

    // Reset state
    set({
      editingPolygonId: null,
      originalCoordinates: null,
      currentCoordinates: null,
      draggedVertexIndex: null,
      selectedVertexIndex: null,
      isDragging: false,
    });

    return closedCoords;
  },

  cancelEditing: () =>
    set({
      editingPolygonId: null,
      originalCoordinates: null,
      currentCoordinates: null,
      draggedVertexIndex: null,
      selectedVertexIndex: null,
      isDragging: false,
    }),

  // Selectors
  isEditing: () => get().editingPolygonId !== null,
  getCoordinates: () => get().currentCoordinates,
}));
