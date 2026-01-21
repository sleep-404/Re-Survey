import { useMemo } from 'react';
import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useRORStore } from '../../hooks/useRORStore';
import {
  comparePolygonToROR,
  formatArea,
  formatDifferencePercent,
  getMatchQualityColor,
} from '../../utils/areaComparison';

export function AreaComparisonPanel() {
  const { selectedIds } = useSelectionStore();
  const { parcels } = usePolygonStore();
  const { records: rorRecords } = useRORStore();

  // Get comparison for selected polygons
  const comparisons = useMemo(() => {
    if (selectedIds.size === 0) return [];

    return Array.from(selectedIds)
      .map((id) => {
        const polygon = parcels.find((p) => p.properties.id === id);
        if (!polygon) return null;
        return comparePolygonToROR(polygon, rorRecords);
      })
      .filter(Boolean);
  }, [selectedIds, parcels, rorRecords]);

  if (comparisons.length === 0) {
    return (
      <div className="px-4 py-3 text-xs text-gray-500">
        Select a polygon to compare its area with ROR data.
      </div>
    );
  }

  return (
    <div className="space-y-3 px-4 py-3">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Area Comparison
      </h4>

      {comparisons.map((comp) => {
        if (!comp) return null;
        const color = getMatchQualityColor(comp.matchQuality);

        return (
          <div
            key={comp.polygonId}
            className="rounded border border-gray-700 bg-gray-800/50 p-3"
          >
            {/* Header with LP number */}
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-200">
                {comp.lpNumber ? `LP# ${comp.lpNumber}` : 'No LP#'}
              </span>
              <span
                className="rounded px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: color + '20', color }}
              >
                {comp.matchQuality.toUpperCase()}
              </span>
            </div>

            {/* Areas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-400">Drawn Area</span>
                <span className="font-medium text-gray-200">
                  {formatArea(comp.drawnAreaSqm)}
                </span>
              </div>

              {comp.expectedAreaSqm !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">ROR Expected</span>
                  <span className="font-medium text-gray-200">
                    {formatArea(comp.expectedAreaSqm)}
                  </span>
                </div>
              )}

              {comp.differencePercent !== null && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Difference</span>
                  <span className="font-medium" style={{ color }}>
                    {formatDifferencePercent(comp.differencePercent)}
                    {comp.differenceSqm !== null && (
                      <span className="ml-1 text-gray-500">
                        ({comp.differenceSqm > 0 ? '+' : ''}
                        {formatArea(Math.abs(comp.differenceSqm))})
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Visual bar */}
            {comp.expectedAreaSqm !== null && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded bg-gray-700">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, (comp.drawnAreaSqm / comp.expectedAreaSqm) * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-gray-500">
                  <span>0%</span>
                  <span>100% (expected)</span>
                </div>
              </div>
            )}

            {/* No ROR match message */}
            {comp.matchQuality === 'no-match' && (
              <div className="mt-2 text-xs text-gray-500">
                {comp.lpNumber
                  ? 'No ROR record found for this LP number'
                  : 'Polygon has no LP number assigned'}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
