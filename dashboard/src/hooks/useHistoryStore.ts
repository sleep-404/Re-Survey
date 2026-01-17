import { create } from 'zustand';
import type { HistoryAction, ParcelFeature, ParcelType } from '../types';
import type { Position } from 'geojson';
import { usePolygonStore } from './usePolygonStore';

interface HistoryState {
  // State
  undoStack: HistoryAction[];
  redoStack: HistoryAction[];
  maxStackSize: number;

  // Actions
  pushAction: (action: HistoryAction) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;

  // Selectors
  canUndo: () => boolean;
  canRedo: () => boolean;
  getUndoCount: () => number;
  getRedoCount: () => number;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  // Initial state
  undoStack: [],
  redoStack: [],
  maxStackSize: 100,

  // Actions
  pushAction: (action) =>
    set((state) => ({
      undoStack: [...state.undoStack.slice(-state.maxStackSize + 1), action],
      redoStack: [], // Clear redo stack on new action
    })),

  undo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return;

    const action = undoStack[undoStack.length - 1];
    const polygonStore = usePolygonStore.getState();

    // Apply reverse action
    switch (action.type) {
      case 'delete':
        // Restore deleted polygons
        action.polygons.forEach((p) => polygonStore.addParcel(p));
        break;

      case 'add':
        // Remove added polygon
        polygonStore.deleteParcel(action.polygon.properties.id);
        break;

      case 'merge':
        // Remove merged polygon, restore originals
        polygonStore.deleteParcel(action.merged.properties.id);
        action.original.forEach((p) => polygonStore.addParcel(p));
        break;

      case 'split':
        // Remove split results, restore original
        action.result.forEach((p) =>
          polygonStore.deleteParcel(p.properties.id)
        );
        polygonStore.addParcel(action.original);
        break;

      case 'edit-vertices':
        // Restore previous vertices
        const parcel = polygonStore.getParcelById(action.polygonId);
        if (parcel && parcel.geometry.type === 'Polygon') {
          const updatedParcel: ParcelFeature = {
            ...parcel,
            geometry: {
              ...parcel.geometry,
              coordinates: [action.before],
            },
          };
          polygonStore.deleteParcel(action.polygonId);
          polygonStore.addParcel(updatedParcel);
        }
        break;

      case 'change-type':
        // Restore previous type
        polygonStore.setParcelType(action.polygonId, action.before);
        break;
    }

    // Move action to redo stack
    set((state) => ({
      undoStack: state.undoStack.slice(0, -1),
      redoStack: [...state.redoStack, action],
    }));
  },

  redo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return;

    const action = redoStack[redoStack.length - 1];
    const polygonStore = usePolygonStore.getState();

    // Re-apply action
    switch (action.type) {
      case 'delete':
        action.polygons.forEach((p) =>
          polygonStore.deleteParcel(p.properties.id)
        );
        break;

      case 'add':
        polygonStore.addParcel(action.polygon);
        break;

      case 'merge':
        action.original.forEach((p) =>
          polygonStore.deleteParcel(p.properties.id)
        );
        polygonStore.addParcel(action.merged);
        break;

      case 'split':
        polygonStore.deleteParcel(action.original.properties.id);
        action.result.forEach((p) => polygonStore.addParcel(p));
        break;

      case 'edit-vertices':
        const parcel = polygonStore.getParcelById(action.polygonId);
        if (parcel && parcel.geometry.type === 'Polygon') {
          const updatedParcel: ParcelFeature = {
            ...parcel,
            geometry: {
              ...parcel.geometry,
              coordinates: [action.after],
            },
          };
          polygonStore.deleteParcel(action.polygonId);
          polygonStore.addParcel(updatedParcel);
        }
        break;

      case 'change-type':
        polygonStore.setParcelType(action.polygonId, action.after);
        break;
    }

    // Move action to undo stack
    set((state) => ({
      undoStack: [...state.undoStack, action],
      redoStack: state.redoStack.slice(0, -1),
    }));
  },

  clear: () =>
    set({
      undoStack: [],
      redoStack: [],
    }),

  // Selectors
  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,
  getUndoCount: () => get().undoStack.length,
  getRedoCount: () => get().redoStack.length,
}));

// Helper functions for creating history actions
export function createDeleteAction(polygons: ParcelFeature[]): HistoryAction {
  return { type: 'delete', polygons };
}

export function createAddAction(polygon: ParcelFeature): HistoryAction {
  return { type: 'add', polygon };
}

export function createMergeAction(
  original: ParcelFeature[],
  merged: ParcelFeature
): HistoryAction {
  return { type: 'merge', original, merged };
}

export function createSplitAction(
  original: ParcelFeature,
  result: ParcelFeature[]
): HistoryAction {
  return { type: 'split', original, result };
}

export function createEditVerticesAction(
  polygonId: string,
  before: Position[],
  after: Position[]
): HistoryAction {
  return { type: 'edit-vertices', polygonId, before, after };
}

export function createChangeTypeAction(
  polygonId: string,
  before: ParcelType,
  after: ParcelType
): HistoryAction {
  return { type: 'change-type', polygonId, before, after };
}
