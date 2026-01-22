import { useModeStore, MODE_LABELS } from '../../hooks/useModeStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useHistoryStore, createDeleteAction, createMergeAction } from '../../hooks/useHistoryStore';
import { Icon } from '../shared/Icon';
import { union, area as turfArea } from '@turf/turf';
import type { AppMode, ParcelFeature } from '../../types';

// Tool icons mapping
const TOOL_ICONS: Record<AppMode, string> = {
  select: 'arrow_selector_tool',
  draw: 'draw',
  'edit-vertices': 'edit_square',
  split: 'content_cut',
};

interface ToolButtonProps {
  mode: AppMode;
  currentMode: AppMode;
  onClick: () => void;
  disabled?: boolean;
}

function ToolButton({ mode, currentMode, onClick, disabled }: ToolButtonProps) {
  const isActive = mode === currentMode;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`relative flex flex-col items-center justify-center gap-2 p-4 rounded-lg transition-all active:scale-95 group ${
        isActive
          ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/40 border border-cyan-500 hover:bg-cyan-500'
          : disabled
          ? 'bg-gray-800/50 text-gray-600 border border-gray-700/50 cursor-not-allowed'
          : 'bg-gray-800 text-gray-400 hover:bg-gray-750 hover:text-white border border-gray-700'
      }`}
    >
      <Icon
        name={TOOL_ICONS[mode]}
        className={`text-2xl group-hover:scale-110 transition-transform ${disabled ? '' : ''}`}
      />
      <span className={`text-xs tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
        {MODE_LABELS[mode]}
      </span>
      {isActive && (
        <div className="absolute inset-0 border-2 border-white/10 rounded-lg pointer-events-none" />
      )}
    </button>
  );
}

export function ToolPanel() {
  const { mode, enterDrawMode, enterEditMode, enterSplitMode, exitToSelectMode } = useModeStore();
  const { getSelectionCount, getSelectedIds, clearSelection } = useSelectionStore();
  const { getParcelsByIds, deleteParcels } = usePolygonStore();
  const { canUndo, canRedo, undo, redo, pushAction } = useHistoryStore();

  const selectionCount = getSelectionCount();
  const selectedIds = getSelectedIds();
  const selectedParcels = getParcelsByIds(selectedIds);
  const hasSingleSelection = selectionCount === 1;

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
      // Convert to clean GeoJSON features for turf
      const features = selectedParcels.map(p => ({
        type: 'Feature' as const,
        properties: {},
        geometry: p.geometry,
      }));

      // Union all polygons - preserves exact boundaries, removes internal edges
      let merged: GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null = features[0] as GeoJSON.Feature<GeoJSON.Polygon>;

      for (let i = 1; i < features.length; i++) {
        if (!merged) break;
        const result = union(merged, features[i] as GeoJSON.Feature<GeoJSON.Polygon>);
        merged = result as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon> | null;
      }

      if (!merged || !merged.geometry) {
        console.error('Union returned null or empty geometry');
        alert('Failed to merge polygons. Make sure they are adjacent or overlapping.');
        return;
      }

      // Handle MultiPolygon (if polygons had gaps) - take largest by area
      let finalGeometry: GeoJSON.Polygon;
      if (merged.geometry.type === 'MultiPolygon') {
        let largestIdx = 0;
        let largestArea = 0;
        merged.geometry.coordinates.forEach((polyCoords, idx) => {
          const polyArea = turfArea({
            type: 'Feature',
            properties: {},
            geometry: { type: 'Polygon', coordinates: polyCoords }
          });
          if (polyArea > largestArea) {
            largestArea = polyArea;
            largestIdx = idx;
          }
        });
        finalGeometry = {
          type: 'Polygon',
          coordinates: merged.geometry.coordinates[largestIdx],
        };
      } else {
        finalGeometry = merged.geometry;
      }

      const calculatedArea = turfArea({
        type: 'Feature',
        properties: {},
        geometry: finalGeometry,
      });

      const mergedParcel: ParcelFeature = {
        type: 'Feature',
        geometry: finalGeometry,
        properties: {
          id: `merged-${Date.now()}`,
          parcelType: selectedParcels[0].properties.parcelType,
          area: calculatedArea,
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

  return (
    <div className="space-y-8">
      {/* Editing Tools */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          Editing Tools <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <ToolButton
            mode="select"
            currentMode={mode}
            onClick={exitToSelectMode}
          />
          <ToolButton
            mode="draw"
            currentMode={mode}
            onClick={enterDrawMode}
          />
          <ToolButton
            mode="edit-vertices"
            currentMode={mode}
            onClick={enterEditMode}
            disabled={!hasSingleSelection}
          />
          <ToolButton
            mode="split"
            currentMode={mode}
            onClick={enterSplitMode}
            disabled={!hasSingleSelection}
          />
        </div>
      </div>

      {/* Actions */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          Actions <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <div className="space-y-3">
          {/* Undo/Redo row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                canUndo()
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Icon name="undo" className="text-sm" /> Undo
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                canRedo()
                  ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                  : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
              }`}
            >
              <Icon name="redo" className="text-sm" /> Redo
            </button>
          </div>

          {/* Delete Parcel */}
          <button
            onClick={handleDelete}
            disabled={selectionCount === 0}
            className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all group ${
              selectionCount > 0
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-red-900/20 hover:border-red-800 hover:text-red-400'
                : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center gap-3">
              <Icon name="delete" className={`text-gray-500 ${selectionCount > 0 ? 'group-hover:text-red-400' : ''}`} />
              Delete Parcel
            </span>
            <span className="text-[10px] opacity-50 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">
              Del
            </span>
          </button>

          {/* Merge Selected */}
          <button
            onClick={handleMerge}
            disabled={selectionCount < 2}
            className={`w-full flex items-center justify-between p-3 rounded-lg border text-xs font-semibold transition-all group ${
              selectionCount >= 2
                ? 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white'
                : 'bg-gray-800/50 border-gray-700/50 text-gray-600 cursor-not-allowed'
            }`}
          >
            <span className="flex items-center gap-3">
              <Icon name="merge" className="text-gray-500 group-hover:text-white" />
              Merge Selected
            </span>
            <span className="text-[10px] opacity-50 bg-gray-900 px-1.5 py-0.5 rounded border border-gray-700">
              M
            </span>
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="p-3 rounded bg-blue-900/20 border border-blue-800/50 text-blue-200 text-xs leading-relaxed flex gap-2">
        <Icon name="info" className="text-sm mt-0.5 shrink-0 text-blue-400" />
        <p>Select multiple parcels using Shift+Click to perform bulk operations like merging.</p>
      </div>
    </div>
  );
}
