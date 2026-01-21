import { useMemo } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import * as turf from '@turf/turf';
import type { Feature, Polygon } from 'geojson';
import type { ParcelType } from '../../types';

interface TypeStats {
  type: ParcelType;
  count: number;
  areaSqm: number;
  percentage: number;
}

export function StatisticsPanel() {
  const { parcels } = usePolygonStore();

  // Calculate statistics
  const stats = useMemo(() => {
    if (parcels.length === 0) return null;

    // Calculate areas
    const areasById: Record<string, number> = {};
    let totalArea = 0;

    parcels.forEach((p) => {
      let area = p.properties.area;
      if (!area) {
        try {
          area = turf.area(p as Feature<Polygon>);
        } catch {
          area = 0;
        }
      }
      areasById[p.properties.id] = area;
      totalArea += area;
    });

    // Count by type
    const byType: TypeStats[] = PARCEL_TYPE_ORDER.map((type) => {
      const ofType = parcels.filter((p) => p.properties.parcelType === type);
      const areaSqm = ofType.reduce(
        (sum, p) => sum + (areasById[p.properties.id] || 0),
        0
      );
      return {
        type,
        count: ofType.length,
        areaSqm,
        percentage:
          parcels.length > 0 ? (ofType.length / parcels.length) * 100 : 0,
      };
    });

    // Area statistics
    const areas = Object.values(areasById).sort((a, b) => a - b);
    const minArea = areas[0] || 0;
    const maxArea = areas[areas.length - 1] || 0;
    const medianArea = areas[Math.floor(areas.length / 2)] || 0;
    const avgArea = totalArea / parcels.length;

    return {
      totalCount: parcels.length,
      totalArea,
      byType: byType.filter((t) => t.count > 0), // Only show types with parcels
      minArea,
      maxArea,
      medianArea,
      avgArea,
    };
  }, [parcels]);

  const formatArea = (sqm: number) => {
    if (sqm < 1000) return `${sqm.toFixed(0)} m²`;
    if (sqm < 10000) return `${(sqm / 1000).toFixed(1)}k m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  const formatLargeArea = (sqm: number) => {
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  if (!stats) {
    return (
      <div className="p-3 text-xs text-gray-500">
        No parcels loaded. Load data to see statistics.
      </div>
    );
  }

  // Find max count for bar scaling
  const maxCount = Math.max(...stats.byType.map((t) => t.count));

  return (
    <div className="space-y-4 p-4">
      {/* Overview */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Overview
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded bg-gray-800 p-2">
            <div className="text-lg font-bold text-cyan-400">
              {stats.totalCount.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400">Total Parcels</div>
          </div>
          <div className="rounded bg-gray-800 p-2">
            <div className="text-lg font-bold text-cyan-400">
              {formatLargeArea(stats.totalArea)}
            </div>
            <div className="text-xs text-gray-400">Total Area</div>
          </div>
        </div>
      </div>

      {/* Area Statistics */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Area Distribution
        </h3>
        <div className="grid grid-cols-4 gap-1 text-xs">
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">
              {formatArea(stats.minArea)}
            </div>
            <div className="text-gray-500">Min</div>
          </div>
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">
              {formatArea(stats.avgArea)}
            </div>
            <div className="text-gray-500">Avg</div>
          </div>
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">
              {formatArea(stats.medianArea)}
            </div>
            <div className="text-gray-500">Median</div>
          </div>
          <div className="rounded bg-gray-800 p-1.5 text-center">
            <div className="font-medium text-gray-300">
              {formatArea(stats.maxArea)}
            </div>
            <div className="text-gray-500">Max</div>
          </div>
        </div>
      </div>

      {/* By Type Bar Chart */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          By Parcel Type
        </h3>
        <div className="space-y-1.5">
          {stats.byType.map((item) => {
            const config = PARCEL_TYPES[item.type];
            const barWidth = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

            return (
              <div key={item.type} className="group">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: config.borderColor }}
                    />
                    <span className="text-gray-300">{config.label}</span>
                  </div>
                  <span className="text-gray-400">
                    {item.count} ({item.percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="mt-0.5 h-1.5 overflow-hidden rounded bg-gray-800">
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: config.borderColor,
                    }}
                  />
                </div>
                <div className="text-right text-xs text-gray-500">
                  {formatArea(item.areaSqm)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
