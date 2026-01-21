import { useMemo } from 'react';
import { useLayerStore } from '../../hooks/useLayerStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';

export function AreaFilterSlider() {
  const { minAreaThreshold, setMinAreaThreshold } = useLayerStore();
  const { parcels } = usePolygonStore();

  // Calculate area statistics
  const areaStats = useMemo(() => {
    if (parcels.length === 0) return null;

    const areas = parcels
      .map((p) => {
        try {
          return turf.area(p as Feature<Polygon>);
        } catch {
          return 0;
        }
      })
      .sort((a, b) => a - b);

    return {
      min: areas[0],
      max: areas[areas.length - 1],
      median: areas[Math.floor(areas.length / 2)],
      p10: areas[Math.floor(areas.length * 0.1)],
      p25: areas[Math.floor(areas.length * 0.25)],
    };
  }, [parcels]);

  // Count how many would be filtered
  const filteredCount = useMemo(() => {
    if (minAreaThreshold === 0) return 0;
    return parcels.filter((p) => {
      try {
        return turf.area(p as Feature<Polygon>) < minAreaThreshold;
      } catch {
        return false;
      }
    }).length;
  }, [parcels, minAreaThreshold]);

  const formatArea = (sqm: number) => {
    if (sqm < 1000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  // Preset values for quick selection
  const presets = [
    { label: 'All', value: 0 },
    { label: '10m²', value: 10 },
    { label: '50m²', value: 50 },
    { label: '100m²', value: 100 },
    { label: '500m²', value: 500 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-gray-400">Min Area Filter</h4>
        <span className="text-xs text-gray-500">
          {filteredCount > 0 && `Hiding ${filteredCount}`}
        </span>
      </div>

      {/* Current value display */}
      <div className="text-sm font-medium text-gray-200">
        {minAreaThreshold === 0 ? 'Show All' : `≥ ${formatArea(minAreaThreshold)}`}
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={1000}
        step={10}
        value={minAreaThreshold}
        onChange={(e) => setMinAreaThreshold(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-700 accent-cyan-500"
      />

      {/* Preset buttons */}
      <div className="flex flex-wrap gap-1">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => setMinAreaThreshold(preset.value)}
            className={`rounded px-2 py-0.5 text-xs transition-colors ${
              minAreaThreshold === preset.value
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      {areaStats && (
        <div className="mt-2 space-y-1 text-xs text-gray-500">
          <div className="flex justify-between">
            <span>Smallest:</span>
            <span>{formatArea(areaStats.min)}</span>
          </div>
          <div className="flex justify-between">
            <span>Median:</span>
            <span>{formatArea(areaStats.median)}</span>
          </div>
          <div className="flex justify-between">
            <span>Largest:</span>
            <span>{formatArea(areaStats.max)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
