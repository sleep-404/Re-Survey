import { useModeStore, MODE_LABELS } from '../../hooks/useModeStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useHistoryStore, createDeleteAction, createMergeAction } from '../../hooks/useHistoryStore';
import { union, featureCollection } from '@turf/turf';
import type { ParcelFeature } from '../../types';

interface BottomBarProps {
  className?: string;
}

// Keyboard hints per mode
const MODE_KEYBOARD_HINTS: Record<string, Array<{ keys: string[]; action: string }>> = {
  select: [
    { keys: ['Click'], action: 'to select' },
    { keys: ['Shift', 'Click'], action: 'to add' },
    { keys: ['D'], action: 'to delete' },
    { keys: ['M'], action: 'to merge' },
  ],
  draw: [
    { keys: ['Click'], action: 'to add vertex' },
    { keys: ['Enter'], action: 'to finish' },
    { keys: ['Esc'], action: 'to cancel' },
  ],
  edit: [
    { keys: ['Drag'], action: 'vertex to move' },
    { keys: ['Enter'], action: 'to finish' },
    { keys: ['Esc'], action: 'to cancel' },
  ],
  split: [
    { keys: ['Click'], action: 'to draw split line' },
    { keys: ['Enter'], action: 'to split' },
    { keys: ['Esc'], action: 'to cancel' },
  ],
};

export function BottomBar({ className = '' }: BottomBarProps) {
  const { mode } = useModeStore();
  const { getSelectedIds, getSelectionCount, clearSelection } = useSelectionStore();
  const { getParcelsByIds, deleteParcels } = usePolygonStore();
  const { pushAction } = useHistoryStore();

  const selectedIds = getSelectedIds();
  const selectionCount = getSelectionCount();
  const selectedParcels = getParcelsByIds(selectedIds);

  // Calculate total area of selected parcels
  const totalArea = selectedParcels.reduce((sum, p) => {
    return sum + (p.properties.area ?? 0);
  }, 0);

  // Format area for display
  const formatArea = (sqm: number): string => {
    if (sqm < 1000) {
      return `${sqm.toFixed(1)} m²`;
    } else if (sqm < 10000) {
      return `${(sqm / 1000).toFixed(2)} km²`;
    } else {
      const acres = sqm / 4046.86;
      return `${acres.toFixed(2)} ac`;
    }
  };

  // Handle delete action
  const handleDelete = () => {
    if (selectedIds.length === 0) return;

    if (selectedIds.length >= 5) {
      if (!confirm(`Delete ${selectedIds.length} parcels?`)) {
        return;
      }
    }

    pushAction(createDeleteAction(selectedParcels));
    deleteParcels(selectedIds);
    clearSelection();
  };

  // Handle merge action
  const handleMerge = () => {
    if (selectedParcels.length < 2) return;

    try {
      const mergedResult = union(featureCollection(
        selectedParcels.map(p => ({
          type: 'Feature' as const,
          properties: {},
          geometry: p.geometry,
        }))
      ));
      if (!mergedResult || !mergedResult.geometry) {
        alert('Failed to merge polygons. Make sure they are adjacent or overlapping.');
        return;
      }

      const mergedParcel: ParcelFeature = {
        type: 'Feature',
        geometry: mergedResult.geometry as GeoJSON.Polygon,
        properties: {
          id: `merged-${Date.now()}`,
          parcelType: selectedParcels[0].properties.parcelType,
          area: selectedParcels.reduce((sum, p) => sum + (p.properties.area ?? 0), 0),
        },
      };

      pushAction(createMergeAction(selectedParcels, mergedParcel));

      const { mergeParcels } = usePolygonStore.getState();
      mergeParcels(selectedIds, mergedParcel);

      clearSelection();
      useSelectionStore.getState().select(mergedParcel.properties.id);
    } catch (err) {
      console.error('Merge failed:', err);
      alert('Failed to merge polygons. They may not be compatible for merging.');
    }
  };

  const hints = MODE_KEYBOARD_HINTS[mode] ?? MODE_KEYBOARD_HINTS.select;

  return (
    <footer
      className={`h-12 bg-[#1f2937] border-t border-gray-700 flex items-center justify-between px-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] ${className}`}
    >
      {/* Left: Mode Indicator */}
      <div className="flex items-center gap-4 min-w-[200px]">
        <span className="px-3 py-1 rounded-full bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 font-bold uppercase tracking-wider text-[10px] shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          {MODE_LABELS[mode]} Mode
        </span>
      </div>

      {/* Center: Keyboard Hints */}
      <div className="hidden lg:flex items-center gap-6 text-xs text-gray-400 font-medium bg-gray-900/50 px-4 py-1.5 rounded-full border border-gray-700/50">
        {hints.map((hint, index) => (
          <span key={index} className="flex items-center gap-1.5">
            {hint.keys.map((key, keyIndex) => (
              <span key={keyIndex} className="flex items-center gap-1">
                <kbd className="font-sans font-bold text-gray-200 bg-gray-700 px-1.5 rounded border border-gray-600">
                  {key}
                </kbd>
                {keyIndex < hint.keys.length - 1 && <span>+</span>}
              </span>
            ))}
            <span>{hint.action}</span>
            {index < hints.length - 1 && (
              <span className="w-1 h-1 rounded-full bg-gray-600 ml-4" />
            )}
          </span>
        ))}
      </div>

      {/* Right: Selection Info */}
      <div className="flex items-center justify-end min-w-[200px]">
        {selectionCount > 0 ? (
          <div className="text-gray-300 text-sm font-mono bg-gray-800 px-3 py-1 rounded border border-gray-700 flex items-center gap-3">
            <span>
              Selected: <span className="text-cyan-400 font-bold">{selectionCount}</span> parcel{selectionCount !== 1 ? 's' : ''}
            </span>
            {totalArea > 0 && (
              <>
                <span className="w-[1px] h-3 bg-gray-600" />
                <span>
                  Area: <span className="text-cyan-400 font-bold">{formatArea(totalArea)}</span>
                </span>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-gray-500">No selection</span>
        )}
      </div>

      {/* Hidden action handlers - triggered by keyboard shortcuts */}
      <button
        className="hidden"
        onClick={handleDelete}
        data-action="delete"
        aria-hidden
      />
      <button
        className="hidden"
        onClick={handleMerge}
        data-action="merge"
        aria-hidden
      />
    </footer>
  );
}
