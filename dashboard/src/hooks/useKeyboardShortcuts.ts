import { useEffect } from 'react';
import { useModeStore } from './useModeStore';
import { useSelectionStore } from './useSelectionStore';
import { usePolygonStore } from './usePolygonStore';
import { useHistoryStore, createDeleteAction, createChangeTypeAction, createMergeAction, createAddAction } from './useHistoryStore';
import { useDrawingStore } from './useDrawingStore';
import { useEditingStore } from './useEditingStore';
import { useSplitStore } from './useSplitStore';
import { getParcelTypeByShortcut } from '../constants/parcelTypes';
import { union, featureCollection, area as turfArea } from '@turf/turf';
import type { ParcelFeature } from '../types';

export function useKeyboardShortcuts() {
  const { mode, enterDrawMode, enterEditMode, enterSplitMode, exitToSelectMode } = useModeStore();
  const { getSelectedIds, getSelectionCount, clearSelection, selectAll, select } = useSelectionStore();
  const { parcels, getParcelsByIds, deleteParcels, setParcelsType, addParcel } = usePolygonStore();
  const { undo, redo, canUndo, canRedo, pushAction } = useHistoryStore();
  const { isDrawing, cancelDrawing, finishDrawing, canFinish } = useDrawingStore();
  const { selectedVertexIndex, deleteSelectedVertex } = useEditingStore();
  const { isSplitting, cancelSplit } = useSplitStore();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Don't handle shortcuts when typing in inputs
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const selectedIds = getSelectedIds();
      const selectionCount = getSelectionCount();

      // Mode shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
          exitToSelectMode();
          return;

        case 'n':
          enterDrawMode();
          return;

        case 'e':
          if (selectionCount === 1) {
            enterEditMode();
          }
          return;

        case 's':
          if (selectionCount === 1 && !e.ctrlKey && !e.metaKey) {
            enterSplitMode();
          }
          return;

        case 'd':
          // In edit-vertices mode, delete selected vertex
          if (mode === 'edit-vertices' && selectedVertexIndex !== null) {
            deleteSelectedVertex();
            return;
          }
          // In select mode, delete selected parcels
          if (selectionCount > 0) {
            const parcelsToDelete = getParcelsByIds(selectedIds);

            // Confirm if deleting many
            if (selectionCount >= 5) {
              if (!confirm(`Delete ${selectionCount} parcels?`)) {
                return;
              }
            }

            pushAction(createDeleteAction(parcelsToDelete));
            deleteParcels(selectedIds);
            clearSelection();
          }
          return;

        case 'm':
          if (selectionCount >= 2) {
            const parcelsToMerge = getParcelsByIds(selectedIds);

            try {
              // Merge all selected polygons using turf union
              const mergedResult = union(featureCollection(
                parcelsToMerge.map(p => ({
                  type: 'Feature' as const,
                  properties: {},
                  geometry: p.geometry,
                }))
              ));

              if (!mergedResult || !mergedResult.geometry) {
                alert('Failed to merge polygons. Make sure they are adjacent or overlapping.');
                return;
              }

              // Create the new merged parcel
              const mergedParcel: ParcelFeature = {
                type: 'Feature',
                geometry: mergedResult.geometry as GeoJSON.Polygon,
                properties: {
                  id: `merged-${Date.now()}`,
                  parcelType: parcelsToMerge[0].properties.parcelType,
                  area: parcelsToMerge.reduce((sum, p) => sum + (p.properties.area ?? 0), 0),
                },
              };

              // Record history for undo
              pushAction(createMergeAction(parcelsToMerge, mergedParcel));

              // Remove original parcels and add merged one
              const { mergeParcels } = usePolygonStore.getState();
              mergeParcels(selectedIds, mergedParcel);

              // Select the new merged parcel
              clearSelection();
              useSelectionStore.getState().select(mergedParcel.properties.id);
            } catch (err) {
              console.error('Merge failed:', err);
              alert('Failed to merge polygons. They may not be compatible for merging.');
            }
          }
          return;

        case 'z':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo()) redo();
            } else {
              if (canUndo()) undo();
            }
          } else if (!e.ctrlKey && !e.metaKey && !e.shiftKey) {
            // Plain Z for quick undo
            if (canUndo()) undo();
          }
          return;

        case 'escape':
          if (isDrawing) {
            // Finish drawing and create polygon if we have enough vertices
            if (canFinish()) {
              const closedVertices = finishDrawing();
              if (closedVertices && closedVertices.length >= 4) {
                // Calculate area
                const geometry: GeoJSON.Polygon = {
                  type: 'Polygon',
                  coordinates: [closedVertices],
                };
                const calculatedArea = turfArea({
                  type: 'Feature',
                  properties: {},
                  geometry,
                });

                // Create a new parcel feature
                const newParcel: ParcelFeature = {
                  type: 'Feature',
                  geometry,
                  properties: {
                    id: `drawn-${Date.now()}`,
                    parcelType: 'unclassified',
                    area: calculatedArea,
                  },
                };

                // Add to store and history
                addParcel(newParcel);
                pushAction(createAddAction(newParcel));

                // Switch back to select mode and select the new parcel
                exitToSelectMode();
                select(newParcel.properties.id);
                return;
              }
            }
            // Not enough vertices - cancel the drawing
            cancelDrawing();
          }
          if (isSplitting) {
            cancelSplit();
          }
          if (mode !== 'select') {
            exitToSelectMode();
          } else {
            clearSelection();
          }
          return;

        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selectAll(parcels.map((p) => p.properties.id));
          }
          return;

        case 'f':
          // TODO: Fit to extent
          return;

        case '+':
        case '=':
          // TODO: Zoom in
          return;

        case '-':
          // TODO: Zoom out
          return;
      }

      // Parcel type shortcuts (1-8)
      if (selectionCount > 0) {
        const parcelType = getParcelTypeByShortcut(e.key);
        if (parcelType) {
          const parcelsToUpdate = getParcelsByIds(selectedIds);

          // Record history
          parcelsToUpdate.forEach((p) => {
            if (p.properties.parcelType !== parcelType) {
              pushAction(
                createChangeTypeAction(
                  p.properties.id,
                  p.properties.parcelType,
                  parcelType
                )
              );
            }
          });

          // Apply change
          setParcelsType(selectedIds, parcelType);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    mode,
    enterDrawMode,
    enterEditMode,
    enterSplitMode,
    exitToSelectMode,
    getSelectedIds,
    getSelectionCount,
    clearSelection,
    selectAll,
    select,
    parcels,
    getParcelsByIds,
    deleteParcels,
    setParcelsType,
    addParcel,
    undo,
    redo,
    canUndo,
    canRedo,
    pushAction,
    isDrawing,
    cancelDrawing,
    finishDrawing,
    canFinish,
    selectedVertexIndex,
    deleteSelectedVertex,
    isSplitting,
    cancelSplit,
  ]);
}
