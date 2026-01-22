import { useState, useCallback } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { Icon } from '../shared/Icon';
import {
  validateTopology,
  fixOverlap,
  fixGap,
  type TopologyError,
  type TopologyValidationResult,
} from '../../utils/topology';
import type { Feature, Polygon } from 'geojson';
import type { ParcelFeature } from '../../types';

interface TopologyPanelProps {
  onZoomToError?: (error: TopologyError) => void;
}

export function TopologyPanel({ onZoomToError }: TopologyPanelProps) {
  const { parcels, setParcels } = usePolygonStore();
  const [validationResult, setValidationResult] = useState<TopologyValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const handleValidate = useCallback(async () => {
    setIsValidating(true);

    // Run validation in next tick to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));

    const features = parcels.map((p: ParcelFeature) => ({
      type: 'Feature' as const,
      properties: { ...p.properties },
      geometry: p.geometry,
    })) as Feature<Polygon>[];

    const result = validateTopology(features);
    setValidationResult(result);
    setLastChecked(new Date());
    setIsValidating(false);
  }, [parcels]);

  const handleFixAll = useCallback(() => {
    if (!validationResult) return;

    let currentPolygons = parcels.map((p: ParcelFeature) => ({
      type: 'Feature' as const,
      properties: { ...p.properties },
      geometry: p.geometry,
    })) as Feature<Polygon>[];

    let fixedCount = 0;

    // Fix overlaps first
    for (const overlap of validationResult.overlaps) {
      if (overlap.canAutoFix) {
        const fixed = fixOverlap(overlap, currentPolygons);
        if (fixed) {
          currentPolygons = fixed;
          fixedCount++;
        }
      }
    }

    // Then fix gaps
    for (const gap of validationResult.gaps) {
      if (gap.canAutoFix) {
        const fixed = fixGap(gap, currentPolygons);
        if (fixed) {
          currentPolygons = fixed;
          fixedCount++;
        }
      }
    }

    if (fixedCount > 0) {
      const updatedParcels: ParcelFeature[] = currentPolygons.map(f => ({
        type: 'Feature' as const,
        properties: {
          id: f.properties?.id || '',
          parcelType: f.properties?.parcelType || 'unclassified',
          ...f.properties,
        },
        geometry: f.geometry as ParcelFeature['geometry'],
      }));
      setParcels(updatedParcels);
      handleValidate();
    }
  }, [validationResult, parcels, setParcels, handleValidate]);

  const handleZoomTo = useCallback((error: TopologyError) => {
    onZoomToError?.(error);
  }, [onZoomToError]);

  const formatArea = (area: number): string => {
    if (area < 1) {
      return `${(area * 10000).toFixed(1)} cm²`;
    } else if (area < 10000) {
      return `${area.toFixed(1)} m²`;
    } else {
      return `${(area / 10000).toFixed(2)} ha`;
    }
  };

  const formatLastChecked = (date: Date): string => {
    const diff = Date.now() - date.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    return date.toLocaleTimeString();
  };

  const autoFixableCount = validationResult
    ? [...validationResult.overlaps, ...validationResult.gaps].filter(e => e.canAutoFix).length
    : 0;

  return (
    <div className="p-5 border-t border-gray-800">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        Topology Check <div className="h-[1px] flex-1 bg-gray-800" />
      </h3>

      {/* Validate Button */}
      <button
        onClick={handleValidate}
        disabled={isValidating}
        className="w-full bg-[#2563eb] hover:bg-blue-600 disabled:bg-gray-700 text-white text-sm font-medium py-2.5 px-4 rounded shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 mb-3 transition-colors"
      >
        <Icon name="autorenew" className={`text-lg ${isValidating ? 'animate-spin' : ''}`} />
        {isValidating ? 'Validating...' : 'Run Topology Check'}
      </button>

      {/* Result */}
      {validationResult && (
        <div className="space-y-3">
          {validationResult.isValid ? (
            <div className="bg-green-500/10 border border-green-500/20 rounded p-3">
              <div className="flex items-start gap-2">
                <Icon name="check_circle" className="text-green-400 text-sm mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-green-100">No topology errors found</p>
                  {lastChecked && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      Last checked: {formatLastChecked(lastChecked)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Error Summary */}
              <div className="bg-red-500/10 border border-red-500/20 rounded p-3">
                <div className="flex items-start gap-2">
                  <Icon name="error" className="text-red-400 text-sm mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-red-100">
                      {validationResult.overlaps.length} overlaps, {validationResult.gaps.length} gaps
                    </p>
                    {lastChecked && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        Last checked: {formatLastChecked(lastChecked)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Fix All Button */}
              {autoFixableCount > 0 && (
                <button
                  onClick={handleFixAll}
                  className="w-full px-3 py-2 text-xs font-medium bg-yellow-600 hover:bg-yellow-700 rounded transition-colors flex items-center justify-center gap-2"
                >
                  <Icon name="auto_fix" className="text-sm" />
                  Fix {autoFixableCount} Auto-fixable Errors
                </button>
              )}

              {/* Error List */}
              <div className="max-h-48 overflow-y-auto space-y-1 no-scrollbar">
                {/* Overlaps */}
                {validationResult.overlaps.map((overlap) => (
                  <div
                    key={overlap.id}
                    className="flex items-center justify-between p-2 bg-red-900/30 rounded text-xs hover:bg-red-900/50 cursor-pointer transition-colors"
                    onClick={() => handleZoomTo(overlap)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-sm bg-red-400" />
                      <span className="text-gray-300">
                        Overlap ({formatArea(overlap.area)})
                      </span>
                      {overlap.canAutoFix && (
                        <span className="text-yellow-400 text-[10px] bg-yellow-900/30 px-1 rounded">
                          auto-fix
                        </span>
                      )}
                    </div>
                    <Icon name="arrow_forward" className="text-blue-400 text-sm" />
                  </div>
                ))}

                {/* Gaps */}
                {validationResult.gaps.map((gap) => (
                  <div
                    key={gap.id}
                    className="flex items-center justify-between p-2 bg-blue-900/30 rounded text-xs hover:bg-blue-900/50 cursor-pointer transition-colors"
                    onClick={() => handleZoomTo(gap)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span className="text-gray-300">
                        Gap ({formatArea(gap.area)})
                      </span>
                      {gap.canAutoFix && (
                        <span className="text-yellow-400 text-[10px] bg-yellow-900/30 px-1 rounded">
                          auto-fix
                        </span>
                      )}
                    </div>
                    <Icon name="arrow_forward" className="text-blue-400 text-sm" />
                  </div>
                ))}
              </div>

              {/* Area Summary */}
              <div className="text-[10px] text-gray-500 pt-2 border-t border-gray-700">
                <div>Total overlap area: {formatArea(validationResult.totalOverlapArea)}</div>
                <div>Total gap area: {formatArea(validationResult.totalGapArea)}</div>
              </div>
            </>
          )}
        </div>
      )}

      {!validationResult && (
        <p className="text-xs text-gray-500">
          Run topology check to find overlaps and gaps between parcels.
        </p>
      )}
    </div>
  );
}
