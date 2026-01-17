import { useState } from 'react';
import { useModeStore, MODE_LABELS } from '../../hooks/useModeStore';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useHistoryStore } from '../../hooks/useHistoryStore';
import { exportShapefile } from '../../utils/exportShapefile';
import type { AppMode } from '../../types';

interface ToolButtonProps {
  mode: AppMode;
  currentMode: AppMode;
  onClick: () => void;
  disabled?: boolean;
  shortcut: string;
}

function ToolButton({ mode, currentMode, onClick, disabled, shortcut }: ToolButtonProps) {
  const isActive = mode === currentMode;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
        isActive
          ? 'bg-cyan-600 text-white'
          : disabled
          ? 'cursor-not-allowed bg-gray-800 text-gray-500'
          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
      }`}
    >
      <span>{MODE_LABELS[mode]}</span>
      <kbd className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
        {shortcut}
      </kbd>
    </button>
  );
}

export function ToolPanel() {
  const { mode, enterDrawMode, enterEditMode, enterSplitMode, exitToSelectMode } = useModeStore();
  const { getSelectionCount } = useSelectionStore();
  const { parcels } = usePolygonStore();
  const { canUndo, canRedo, undo, redo } = useHistoryStore();
  const [isExporting, setIsExporting] = useState(false);

  const selectionCount = getSelectionCount();
  const hasSingleSelection = selectionCount === 1;

  const handleExport = async () => {
    if (parcels.length === 0) {
      alert('No parcels to export');
      return;
    }

    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      await exportShapefile(parcels, `parcels_${timestamp}`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Tools
        </h3>
        <div className="space-y-1">
          <ToolButton
            mode="select"
            currentMode={mode}
            onClick={exitToSelectMode}
            shortcut="V"
          />
          <ToolButton
            mode="draw"
            currentMode={mode}
            onClick={enterDrawMode}
            shortcut="N"
          />
          <ToolButton
            mode="edit-vertices"
            currentMode={mode}
            onClick={enterEditMode}
            disabled={!hasSingleSelection}
            shortcut="E"
          />
          <ToolButton
            mode="split"
            currentMode={mode}
            onClick={enterSplitMode}
            disabled={!hasSingleSelection}
            shortcut="S"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Actions
        </h3>
        <div className="space-y-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
              canUndo()
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'cursor-not-allowed bg-gray-800 text-gray-500'
            }`}
          >
            <span>Undo</span>
            <kbd className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
              Z
            </kbd>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
              canRedo()
                ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                : 'cursor-not-allowed bg-gray-800 text-gray-500'
            }`}
          >
            <span>Redo</span>
            <kbd className="rounded bg-gray-700 px-1.5 py-0.5 text-xs text-gray-400">
              ⇧Z
            </kbd>
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || parcels.length === 0}
            className={`flex w-full items-center justify-between rounded px-3 py-2 text-sm transition-colors ${
              isExporting || parcels.length === 0
                ? 'cursor-not-allowed bg-gray-800 text-gray-500'
                : 'bg-cyan-700 text-white hover:bg-cyan-600'
            }`}
          >
            <span>{isExporting ? 'Exporting...' : 'Export Shapefile'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
