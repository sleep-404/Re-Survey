/**
 * Auto-save hook for persisting polygon data to localStorage.
 * Saves every 30 seconds and on significant changes.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { usePolygonStore } from './usePolygonStore';
import { useHistoryStore } from './useHistoryStore';
import type { ParcelFeature } from '../types';

const STORAGE_KEY = 'boundaryai-session';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export interface SavedSession {
  timestamp: number;
  polygonCount: number;
  editCount: number;
  parcels: ParcelFeature[];
  history: {
    undoStack: ReturnType<typeof useHistoryStore.getState>['undoStack'];
    redoStack: ReturnType<typeof useHistoryStore.getState>['redoStack'];
  };
}

export function useAutoSave() {
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSavedIndicator, setShowSavedIndicator] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(() => {
    const polygonState = usePolygonStore.getState();
    const historyState = useHistoryStore.getState();

    const session: SavedSession = {
      timestamp: Date.now(),
      polygonCount: polygonState.parcels.length,
      editCount: historyState.undoStack.length,
      parcels: polygonState.parcels,
      history: {
        undoStack: historyState.undoStack,
        redoStack: historyState.redoStack,
      },
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      setLastSaved(new Date());
      setShowSavedIndicator(true);

      // Hide indicator after 2 seconds
      setTimeout(() => setShowSavedIndicator(false), 2000);
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  }, []);

  const load = useCallback((): SavedSession | null => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as SavedSession;
    } catch (e) {
      console.error('Failed to load session:', e);
      return null;
    }
  }, []);

  const restore = useCallback((session: SavedSession) => {
    usePolygonStore.getState().setParcels(session.parcels);
    // Optionally restore history - might be too complex for MVP
    // useHistoryStore.getState().restore(session.history);
  }, []);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  }, []);

  const hasSession = useCallback((): boolean => {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }, []);

  // Auto-save on interval
  useEffect(() => {
    const intervalId = setInterval(() => {
      const parcels = usePolygonStore.getState().parcels;
      if (parcels.length > 0) {
        save();
      }
    }, AUTO_SAVE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [save]);

  // Save on significant changes (debounced)
  useEffect(() => {
    const unsubscribe = usePolygonStore.subscribe((state, prevState) => {
      // Only save if parcel count changed significantly
      if (state.parcels.length !== prevState.parcels.length) {
        // Debounce saves
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }
        saveTimeoutRef.current = setTimeout(() => {
          save();
        }, 1000);
      }
    });

    return () => {
      unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [save]);

  return {
    save,
    load,
    restore,
    clear,
    hasSession,
    lastSaved,
    showSavedIndicator,
  };
}

/**
 * Get saved session without hook (for initial load).
 */
export function getSavedSession(): SavedSession | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    return JSON.parse(data) as SavedSession;
  } catch (e) {
    return null;
  }
}

/**
 * Clear saved session without hook.
 */
export function clearSavedSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear session:', e);
  }
}
