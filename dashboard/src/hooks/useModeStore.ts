import { create } from 'zustand';
import type { AppMode } from '../types';

interface ModeState {
  // State
  mode: AppMode;
  previousMode: AppMode | null;

  // Actions
  setMode: (mode: AppMode) => void;
  enterDrawMode: () => void;
  enterEditMode: () => void;
  enterSplitMode: () => void;
  exitToSelectMode: () => void;
  revertToPreviousMode: () => void;

  // Selectors
  isSelectMode: () => boolean;
  isDrawMode: () => boolean;
  isEditMode: () => boolean;
  isSplitMode: () => boolean;
}

export const useModeStore = create<ModeState>((set, get) => ({
  // Initial state
  mode: 'select',
  previousMode: null,

  // Actions
  setMode: (mode) =>
    set((state) => ({
      mode,
      previousMode: state.mode,
    })),

  enterDrawMode: () =>
    set((state) => ({
      mode: 'draw',
      previousMode: state.mode,
    })),

  enterEditMode: () =>
    set((state) => ({
      mode: 'edit-vertices',
      previousMode: state.mode,
    })),

  enterSplitMode: () =>
    set((state) => ({
      mode: 'split',
      previousMode: state.mode,
    })),

  exitToSelectMode: () =>
    set({
      mode: 'select',
      previousMode: null,
    }),

  revertToPreviousMode: () =>
    set((state) => ({
      mode: state.previousMode ?? 'select',
      previousMode: null,
    })),

  // Selectors
  isSelectMode: () => get().mode === 'select',
  isDrawMode: () => get().mode === 'draw',
  isEditMode: () => get().mode === 'edit-vertices',
  isSplitMode: () => get().mode === 'split',
}));

// Mode labels for UI display
export const MODE_LABELS: Record<AppMode, string> = {
  select: 'Select',
  draw: 'Draw',
  'edit-vertices': 'Edit Vertices',
  split: 'Split',
};

// Mode hints for bottom bar
export const MODE_HINTS: Record<AppMode, string> = {
  select: 'Click polygon to select • Shift+click to add • D delete • M merge',
  draw: 'Click to place vertices • Double-click to finish • Esc cancel',
  'edit-vertices': 'Drag vertex to move • Click edge to add • Right-click to delete • Esc done',
  split: 'Draw a line across the polygon • Enter to split • Esc cancel',
};
