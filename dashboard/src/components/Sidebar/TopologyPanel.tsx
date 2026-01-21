import { useState, useCallback } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
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
      // Update polygon store with fixed geometries
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

      // Re-validate
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

  const autoFixableCount = validationResult
    ? [...validationResult.overlaps, ...validationResult.gaps].filter(e => e.canAutoFix).length
    : 0;

  return (
    <div className="p-3 border-t border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Topology Validation</h3>
        <button
          onClick={handleValidate}
          disabled={isValidating}
          className="px-3 py-1 text-xs font-medium bg-blue-600 hover:bg-blue-700
                     disabled:bg-gray-600 rounded transition-colors"
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </button>
      </div>

      {validationResult && (
        <div className="space-y-3">
          {/* Summary */}
          <div className={`p-2 rounded text-sm ${
            validationResult.isValid
              ? 'bg-green-900/50 text-green-300'
              : 'bg-red-900/50 text-red-300'
          }`}>
            {validationResult.isValid ? (
              <span>✓ No topology errors</span>
            ) : (
              <span>
                ✗ {validationResult.overlaps.length} overlaps, {validationResult.gaps.length} gaps
              </span>
            )}
          </div>

          {/* Fix All Button */}
          {!validationResult.isValid && autoFixableCount > 0 && (
            <button
              onClick={handleFixAll}
              className="w-full px-3 py-1.5 text-xs font-medium bg-yellow-600
                         hover:bg-yellow-700 rounded transition-colors"
            >
              Fix {autoFixableCount} Auto-fixable Errors
            </button>
          )}

          {/* Error List */}
          {!validationResult.isValid && (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {/* Overlaps */}
              {validationResult.overlaps.map((overlap) => (
                <div
                  key={overlap.id}
                  className="flex items-center justify-between p-2 bg-red-900/30
                             rounded text-xs hover:bg-red-900/50 cursor-pointer"
                  onClick={() => handleZoomTo(overlap)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">⬛</span>
                    <span className="text-gray-300">
                      Overlap ({formatArea(overlap.area)})
                    </span>
                    {overlap.canAutoFix && (
                      <span className="text-yellow-400 text-[10px]">auto-fix</span>
                    )}
                  </div>
                  <button
                    className="text-blue-400 hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomTo(overlap);
                    }}
                  >
                    →
                  </button>
                </div>
              ))}

              {/* Gaps */}
              {validationResult.gaps.map((gap) => (
                <div
                  key={gap.id}
                  className="flex items-center justify-between p-2 bg-blue-900/30
                             rounded text-xs hover:bg-blue-900/50 cursor-pointer"
                  onClick={() => handleZoomTo(gap)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400">◇</span>
                    <span className="text-gray-300">
                      Gap ({formatArea(gap.area)})
                    </span>
                    {gap.canAutoFix && (
                      <span className="text-yellow-400 text-[10px]">auto-fix</span>
                    )}
                  </div>
                  <button
                    className="text-blue-400 hover:text-blue-300"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleZoomTo(gap);
                    }}
                  >
                    →
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Area Summary */}
          {!validationResult.isValid && (
            <div className="text-xs text-gray-400 pt-2 border-t border-gray-700">
              <div>Total overlap area: {formatArea(validationResult.totalOverlapArea)}</div>
              <div>Total gap area: {formatArea(validationResult.totalGapArea)}</div>
            </div>
          )}
        </div>
      )}

      {!validationResult && (
        <p className="text-xs text-gray-500">
          Click Validate to check for overlaps and gaps between polygons.
        </p>
      )}
    </div>
  );
}
