import { create } from 'zustand';

interface SelectionState {
  // State
  selectedIds: Set<string>;
  hoveredId: string | null;

  // Actions
  select: (id: string) => void;
  selectMultiple: (ids: string[]) => void;
  addToSelection: (id: string) => void;
  removeFromSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: (ids: string[]) => void;
  setHovered: (id: string | null) => void;

  // Selectors
  isSelected: (id: string) => boolean;
  getSelectedIds: () => string[];
  getSelectionCount: () => number;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  // Initial state
  selectedIds: new Set(),
  hoveredId: null,

  // Actions
  select: (id) =>
    set({
      selectedIds: new Set([id]),
    }),

  selectMultiple: (ids) =>
    set({
      selectedIds: new Set(ids),
    }),

  addToSelection: (id) =>
    set((state) => ({
      selectedIds: new Set([...state.selectedIds, id]),
    })),

  removeFromSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedIds);
      newSelection.delete(id);
      return { selectedIds: newSelection };
    }),

  toggleSelection: (id) =>
    set((state) => {
      const newSelection = new Set(state.selectedIds);
      if (newSelection.has(id)) {
        newSelection.delete(id);
      } else {
        newSelection.add(id);
      }
      return { selectedIds: newSelection };
    }),

  clearSelection: () =>
    set({
      selectedIds: new Set(),
    }),

  selectAll: (ids) =>
    set({
      selectedIds: new Set(ids),
    }),

  setHovered: (id) =>
    set({
      hoveredId: id,
    }),

  // Selectors
  isSelected: (id) => get().selectedIds.has(id),

  getSelectedIds: () => Array.from(get().selectedIds),

  getSelectionCount: () => get().selectedIds.size,
}));
