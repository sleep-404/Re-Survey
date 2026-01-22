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

  return (
    <div className="p-5">
      <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
        Area Comparison <div className="h-[1px] flex-1 bg-gray-800" />
      </h3>

      {comparisons.length === 0 ? (
        <div className="bg-[#1f2937] rounded-lg p-4 border border-gray-700 shadow-sm">
          <p className="text-xs text-gray-500 text-center">
            Select a parcel to compare with ROR
          </p>
        </div>
      ) : (
        comparisons.map((comp) => {
          if (!comp) return null;
          const color = getMatchQualityColor(comp.matchQuality);
          const qualityLabels: Record<string, string> = {
            excellent: 'EXCELLENT',
            good: 'GOOD',
            fair: 'FAIR',
            poor: 'POOR',
            'no-match': 'NO MATCH',
          };

          return (
            <div
              key={comp.polygonId}
              className="bg-[#1f2937] rounded-lg border border-gray-700 shadow-sm overflow-hidden"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-white">
                    {comp.lpNumber ? `LP# ${comp.lpNumber}` : 'No LP#'}
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded border"
                    style={{
                      backgroundColor: `${color}15`,
                      color,
                      borderColor: `${color}30`,
                    }}
                  >
                    {qualityLabels[comp.matchQuality]}
                  </span>
                </div>

                {/* Areas */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-gray-400">
                    <span>Drawn Area:</span>
                    <span className="text-gray-200 font-medium">
                      {formatArea(comp.drawnAreaSqm)}
                    </span>
                  </div>

                  {comp.expectedAreaSqm !== null && (
                    <div className="flex justify-between text-gray-400">
                      <span>ROR Expected:</span>
                      <span className="text-gray-200 font-medium">
                        {formatArea(comp.expectedAreaSqm)}
                      </span>
                    </div>
                  )}

                  {comp.differencePercent !== null && (
                    <div
                      className="flex justify-between mt-2 pt-2 border-t border-gray-700/50"
                      style={{ color }}
                    >
                      <span>Difference:</span>
                      <span className="font-bold">
                        {formatDifferencePercent(comp.differencePercent)}
                        {comp.differenceSqm !== null && (
                          <span className="ml-1">
                            ({comp.differenceSqm > 0 ? '+' : ''}
                            {formatArea(Math.abs(comp.differenceSqm))})
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* No ROR match message */}
                {comp.matchQuality === 'no-match' && (
                  <div className="mt-3 text-xs text-gray-500">
                    {comp.lpNumber
                      ? 'No ROR record found for this LP number'
                      : 'Assign LP number to compare with ROR'}
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {comp.expectedAreaSqm !== null && (
                <div className="h-1 bg-gray-800 w-full">
                  <div
                    className="h-full transition-all"
                    style={{
                      width: `${Math.min(100, (comp.drawnAreaSqm / comp.expectedAreaSqm) * 100)}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 8px ${color}60`,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
