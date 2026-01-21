import { useState, useEffect, useCallback } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { validateTopology, type TopologyValidationResult } from '../../utils/topology';
import { exportShapefile } from '../../utils/exportShapefile';
import type { Feature, Polygon } from 'geojson';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { parcels } = usePolygonStore();
  const [validationResult, setValidationResult] = useState<TopologyValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Run validation when dialog opens
  useEffect(() => {
    if (isOpen && parcels.length > 0) {
      setIsValidating(true);
      setExportStatus('idle');

      // Run in next tick for UI responsiveness
      setTimeout(() => {
        const features = parcels.map((p) => ({
          type: 'Feature' as const,
          properties: { ...p.properties },
          geometry: p.geometry,
        })) as Feature<Polygon>[];

        const result = validateTopology(features);
        setValidationResult(result);
        setIsValidating(false);
      }, 10);
    }
  }, [isOpen, parcels]);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setExportStatus('idle');

    try {
      await exportShapefile(parcels, 'parcels');
      setExportStatus('success');

      // Close dialog after short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (e) {
      console.error('Export failed:', e);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  }, [parcels, onClose]);

  if (!isOpen) return null;

  const errorCount = validationResult
    ? validationResult.overlaps.length + validationResult.gaps.length
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gray-700 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-100">
            Export Shapefile
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Download polygons as ESRI Shapefile (.zip)
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Summary */}
          <div className="bg-gray-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Polygons</span>
              <span className="text-cyan-400 font-medium">{parcels.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Output CRS</span>
              <span className="text-gray-200">EPSG:32644 (UTM 44N)</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Format</span>
              <span className="text-gray-200">.shp, .shx, .dbf, .prj</span>
            </div>
          </div>

          {/* Validation Status */}
          {isValidating ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-cyan-400 rounded-full" />
              Checking for topology errors...
            </div>
          ) : validationResult && (
            <div className={`p-3 rounded-lg text-sm ${
              validationResult.isValid
                ? 'bg-green-900/30 text-green-300'
                : 'bg-yellow-900/30 text-yellow-300'
            }`}>
              {validationResult.isValid ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  No topology errors detected
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-400">⚠</span>
                    {errorCount} topology error{errorCount !== 1 ? 's' : ''} detected
                  </div>
                  <div className="text-xs text-gray-400">
                    {validationResult.overlaps.length} overlap{validationResult.overlaps.length !== 1 ? 's' : ''},{' '}
                    {validationResult.gaps.length} gap{validationResult.gaps.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning for errors */}
          {!isValidating && validationResult && !validationResult.isValid && (
            <p className="text-xs text-gray-500">
              You can still export with errors, but the shapefile may not meet quality requirements.
              Consider fixing errors in the Validate tab first.
            </p>
          )}

          {/* Export Status */}
          {exportStatus === 'success' && (
            <div className="p-3 rounded-lg bg-green-900/30 text-green-300 text-sm flex items-center gap-2">
              <span>✓</span>
              Export complete! Check your downloads.
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="p-3 rounded-lg bg-red-900/30 text-red-300 text-sm flex items-center gap-2">
              <span>✗</span>
              Export failed. Please try again.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-700/50 flex gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-gray-100
                       bg-gray-600 hover:bg-gray-500 disabled:opacity-50 rounded transition-colors"
          >
            Cancel
          </button>

          {!validationResult?.isValid && validationResult && (
            <button
              onClick={handleExport}
              disabled={isExporting || isValidating}
              className="px-4 py-2 text-sm font-medium text-white
                         bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 rounded transition-colors"
            >
              {isExporting ? 'Exporting...' : 'Export Anyway'}
            </button>
          )}

          <button
            onClick={handleExport}
            disabled={isExporting || isValidating || parcels.length === 0}
            className="px-4 py-2 text-sm font-medium text-white
                       bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 rounded transition-colors"
          >
            {isExporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
