import { useModeStore, MODE_LABELS, MODE_HINTS } from '../../hooks/useModeStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useHistoryStore, createDeleteAction } from '../../hooks/useHistoryStore';

interface BottomBarProps {
  className?: string;
}

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
      return `${sqm.toFixed(0)} m²`;
    } else if (sqm < 10000) {
      return `${(sqm / 1000).toFixed(2)} km²`;
    } else {
      // Convert to acres (1 acre = 4046.86 sqm)
      const acres = sqm / 4046.86;
      return `${acres.toFixed(2)} ac`;
    }
  };

  // Handle delete action
  const handleDelete = () => {
    if (selectedIds.length === 0) return;

    // Confirm if deleting many parcels
    if (selectedIds.length >= 5) {
      if (!confirm(`Delete ${selectedIds.length} parcels?`)) {
        return;
      }
    }

    // Record history
    pushAction(createDeleteAction(selectedParcels));

    // Delete parcels
    deleteParcels(selectedIds);
    clearSelection();
  };

  return (
    <div
      className={`flex items-center justify-between border-t border-gray-700 bg-gray-900 px-4 py-2 ${className}`}
    >
      {/* Left: Mode Indicator */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-gray-500">
            Mode
          </span>
          <span className="rounded bg-cyan-600 px-2 py-0.5 text-sm font-medium text-white">
            {MODE_LABELS[mode]}
          </span>
        </div>

        {/* Hints based on mode */}
        <span className="text-sm text-gray-400">{MODE_HINTS[mode]}</span>
      </div>

      {/* Right: Selection Info & Actions */}
      <div className="flex items-center gap-4">
        {selectionCount > 0 ? (
          <>
            {/* Selection count and area */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">Selected:</span>
              <span className="font-medium text-gray-200">{selectionCount}</span>
              {totalArea > 0 && (
                <>
                  <span className="text-gray-600">•</span>
                  <span className="text-gray-400">{formatArea(totalArea)}</span>
                </>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <ActionButton
                label="Delete"
                shortcut="D"
                onClick={handleDelete}
                variant="danger"
              />
              {selectionCount >= 2 && (
                <ActionButton
                  label="Merge"
                  shortcut="M"
                  onClick={() => {/* TODO: Implement merge */}}
                />
              )}
              {selectionCount === 1 && (
                <>
                  <ActionButton
                    label="Split"
                    shortcut="S"
                    onClick={() => useModeStore.getState().enterSplitMode()}
                  />
                  <ActionButton
                    label="Edit"
                    shortcut="E"
                    onClick={() => useModeStore.getState().enterEditMode()}
                  />
                </>
              )}
            </div>
          </>
        ) : (
          <span className="text-sm text-gray-500">No selection</span>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  label: string;
  shortcut: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

function ActionButton({
  label,
  shortcut,
  onClick,
  variant = 'default',
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded px-2 py-1 text-sm transition-colors ${
        variant === 'danger'
          ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
      }`}
    >
      {label}
      <kbd className="rounded bg-gray-800 px-1 text-xs text-gray-500">
        {shortcut}
      </kbd>
    </button>
  );
}
