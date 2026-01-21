/**
 * ContextMenu component for right-click actions on the map.
 * Shows different options based on what's clicked (polygon, empty space, selection).
 */

import { useEffect, useRef, useCallback } from 'react';
import * as turf from '@turf/turf';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useModeStore } from '../../hooks/useModeStore';
import type { ParcelFeature } from '../../types';
import type { Polygon } from 'geojson';

interface MenuItem {
  label: string;
  shortcut?: string;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
}

interface ContextMenuProps {
  x: number;
  y: number;
  polygonId: string | null;
  onClose: () => void;
  onZoomToSelection?: () => void;
  onZoomToExtent?: () => void;
}

export function ContextMenu({
  x,
  y,
  polygonId,
  onClose,
  onZoomToSelection,
  onZoomToExtent,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const { selectedIds, addToSelection, removeFromSelection, clearSelection, selectAll } = useSelectionStore();
  const { parcels, deleteParcels, mergeParcels } = usePolygonStore();
  const { setMode } = useModeStore();

  const isSelected = polygonId ? selectedIds.has(polygonId) : false;
  const selectionCount = selectedIds.size;

  // Build menu items based on context
  const getMenuItems = useCallback((): MenuItem[] => {
    if (polygonId && !isSelected) {
      // Clicked on unselected polygon
      return [
        {
          label: 'Select',
          action: () => {
            clearSelection();
            addToSelection(polygonId);
          },
        },
        {
          label: 'Add to Selection',
          shortcut: 'Shift+Click',
          action: () => addToSelection(polygonId),
        },
        { label: 'divider', action: () => {} },
        {
          label: 'Zoom to Polygon',
          action: () => {
            clearSelection();
            addToSelection(polygonId);
            onZoomToSelection?.();
          },
        },
      ];
    }

    if (selectionCount === 1) {
      // Single polygon selected
      const selectedId = [...selectedIds][0];
      return [
        {
          label: 'Edit Vertices',
          shortcut: 'E',
          action: () => setMode('edit-vertices'),
        },
        {
          label: 'Split',
          shortcut: 'S',
          action: () => setMode('split'),
        },
        { label: 'divider', action: () => {} },
        {
          label: 'Zoom to Polygon',
          action: () => onZoomToSelection?.(),
        },
        { label: 'divider', action: () => {} },
        {
          label: 'Delete',
          shortcut: 'D',
          action: () => {
            deleteParcels([selectedId]);
            clearSelection();
          },
          danger: true,
        },
      ];
    }

    if (selectionCount > 1) {
      // Multiple polygons selected
      const selectedIdsArray = [...selectedIds];
      return [
        {
          label: `Merge ${selectionCount} Polygons`,
          shortcut: 'M',
          action: () => {
            // Get the parcels to merge
            const parcelsToMerge = parcels.filter(p => selectedIds.has(p.properties.id));
            if (parcelsToMerge.length < 2) return;

            // Create merged geometry using turf.union
            try {
              const features = parcelsToMerge.map(p => ({
                type: 'Feature' as const,
                properties: {},
                geometry: p.geometry as Polygon,
              }));

              const merged = turf.union(turf.featureCollection(features));
              if (!merged) return;

              // Create the merged parcel
              const mergedParcel: ParcelFeature = {
                type: 'Feature',
                properties: {
                  id: `merged-${Date.now()}`,
                  parcelType: parcelsToMerge[0].properties.parcelType,
                },
                geometry: merged.geometry as Polygon,
              };

              mergeParcels(selectedIdsArray, mergedParcel);
              clearSelection();
            } catch (e) {
              console.error('Failed to merge parcels:', e);
            }
          },
        },
        { label: 'divider', action: () => {} },
        {
          label: 'Zoom to Selection',
          action: () => onZoomToSelection?.(),
        },
        { label: 'divider', action: () => {} },
        {
          label: `Delete ${selectionCount} Polygons`,
          shortcut: 'D',
          action: () => {
            deleteParcels(selectedIdsArray);
            clearSelection();
          },
          danger: true,
        },
      ];
    }

    // Clicked on empty space
    return [
      {
        label: 'Draw New Polygon',
        shortcut: 'N',
        action: () => setMode('draw'),
      },
      { label: 'divider', action: () => {} },
      {
        label: 'Select All',
        shortcut: 'Ctrl+A',
        action: () => selectAll(parcels.map(p => p.properties.id)),
      },
      {
        label: 'Fit to Extent',
        shortcut: 'F',
        action: () => onZoomToExtent?.(),
      },
    ];
  }, [
    polygonId,
    isSelected,
    selectionCount,
    selectedIds,
    parcels,
    addToSelection,
    removeFromSelection,
    clearSelection,
    selectAll,
    deleteParcels,
    mergeParcels,
    setMode,
    onZoomToSelection,
    onZoomToExtent,
  ]);

  const menuItems = getMenuItems();

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(x, window.innerWidth - 200),
    y: Math.min(y, window.innerHeight - 300),
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 min-w-[180px] bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 overflow-hidden"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y,
      }}
    >
      {menuItems.map((item, index) => {
        if (item.label === 'divider') {
          return <div key={index} className="h-px bg-gray-700 my-1" />;
        }

        return (
          <button
            key={index}
            onClick={() => {
              item.action();
              onClose();
            }}
            disabled={item.disabled}
            className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between
                        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                        ${item.danger
                          ? 'text-red-400 hover:bg-red-900/30'
                          : 'text-gray-200 hover:bg-gray-700'
                        }`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="text-xs text-gray-500 ml-4">{item.shortcut}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
