import { useMemo } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { Icon } from '../shared/Icon';

const AREA_PRESETS = [
  { label: 'All', value: 0 },
  { label: '10m²', value: 10 },
  { label: '50m²', value: 50 },
  { label: '100m²', value: 100 },
  { label: '500m²', value: 500 },
];

export function LayerPanel() {
  const { parcels, isLoading } = usePolygonStore();

  const {
    showOriTiles,
    setShowOriTiles,
    showSatellite,
    setShowSatellite,
    showPolygons,
    setShowPolygons,
    activeDataSource,
    setActiveDataSource,
    showGroundTruthOverlay,
    setShowGroundTruthOverlay,
    showConflictHighlighting,
    setShowConflictHighlighting,
    minAreaThreshold: minAreaFilter,
    setMinAreaThreshold: setMinAreaFilter,
  } = useLayerStore();

  // Calculate stats
  const stats = useMemo(() => {
    if (parcels.length === 0) return null;

    const areas = parcels.map(p => p.properties.area ?? 0).filter(a => a > 0);
    if (areas.length === 0) return null;

    const total = areas.reduce((sum, a) => sum + a, 0);
    const sortedAreas = [...areas].sort((a, b) => a - b);
    const hiddenCount = parcels.filter(p => (p.properties.area ?? 0) < minAreaFilter).length;

    return {
      total: parcels.length,
      totalArea: total,
      min: Math.min(...areas),
      max: Math.max(...areas),
      avg: total / areas.length,
      median: sortedAreas[Math.floor(sortedAreas.length / 2)],
      hiddenCount,
    };
  }, [parcels, minAreaFilter]);

  const formatArea = (sqm: number): string => {
    if (sqm >= 10000) {
      return `${(sqm / 10000).toFixed(2)} ha`;
    } else if (sqm >= 1000) {
      return `${(sqm / 1000).toFixed(1)}k m²`;
    }
    return `${sqm.toFixed(1)} m²`;
  };

  return (
    <div className="space-y-6">
      {/* Data Source */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          Data Source <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <div className="space-y-2">
          <label
            className={`flex items-center gap-3 p-2.5 rounded cursor-pointer group transition-colors ${
              activeDataSource === 'sam'
                ? 'bg-cyan-950/20 border border-cyan-900/50'
                : 'hover:bg-gray-800'
            }`}
          >
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'sam'}
              onChange={() => setActiveDataSource('sam')}
              className="text-cyan-500 focus:ring-cyan-500/50 bg-gray-900 border-gray-600"
            />
            <span className={`text-xs font-medium transition-colors ${
              activeDataSource === 'sam' ? 'text-cyan-100' : 'text-gray-300 group-hover:text-white'
            }`}>
              SAM AI Output <span className="text-gray-500 ml-1">(12,032)</span>
            </span>
          </label>
          <label
            className={`flex items-center gap-3 p-2.5 rounded cursor-pointer group transition-colors ${
              activeDataSource === 'working'
                ? 'bg-cyan-950/20 border border-cyan-900/50'
                : 'hover:bg-gray-800'
            }`}
          >
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'working'}
              onChange={() => setActiveDataSource('working')}
              className="text-cyan-500 focus:ring-cyan-500/50 bg-gray-900 border-gray-600"
            />
            <span className={`text-xs font-medium transition-colors ${
              activeDataSource === 'working' ? 'text-cyan-100' : 'text-gray-300 group-hover:text-white'
            }`}>
              Working Layer <span className="text-gray-500 ml-1">(editable)</span>
            </span>
          </label>
          <label
            className={`flex items-center gap-3 p-2.5 rounded cursor-pointer group transition-colors ${
              activeDataSource === 'ground_truth'
                ? 'bg-cyan-950/20 border border-cyan-900/50'
                : 'hover:bg-gray-800'
            }`}
          >
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'ground_truth'}
              onChange={() => setActiveDataSource('ground_truth')}
              className="text-cyan-500 focus:ring-cyan-500/50 bg-gray-900 border-gray-600"
            />
            <span className={`text-xs font-medium transition-colors ${
              activeDataSource === 'ground_truth' ? 'text-cyan-100' : 'text-gray-300 group-hover:text-white'
            }`}>
              Ground Truth <span className="text-green-400 ml-1">(105)</span>
            </span>
          </label>
        </div>
        {isLoading && (
          <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
            <Icon name="sync" className="text-sm animate-spin" />
            Loading...
          </div>
        )}
      </div>

      {/* Layer Visibility */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          Layer Visibility <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <div className="space-y-2 pl-1">
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showOriTiles}
              onChange={(e) => setShowOriTiles(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            ORI Tiles
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showSatellite}
              onChange={(e) => setShowSatellite(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            Google Satellite
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-0 focus:ring-offset-0"
            />
            Show Polygons
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showGroundTruthOverlay}
              onChange={(e) => setShowGroundTruthOverlay(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-0 focus:ring-offset-0"
            />
            GT Overlay <span className="text-red-400 ml-1">(dashed)</span>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer hover:text-white select-none">
            <input
              type="checkbox"
              checked={showConflictHighlighting}
              onChange={(e) => setShowConflictHighlighting(e.target.checked)}
              className="rounded border-gray-600 bg-gray-800 text-yellow-500 focus:ring-0 focus:ring-offset-0"
            />
            Conflict Highlighting
          </label>
        </div>
      </div>

      {/* Min Area Filter */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          Min Area Filter <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <div className="px-1 mb-2">
          <input
            type="range"
            min="0"
            max="1000"
            value={minAreaFilter}
            onChange={(e) => setMinAreaFilter(Number(e.target.value))}
            className="w-full appearance-none bg-transparent focus:outline-none focus:ring-0"
          />
          <div className="flex justify-between text-[9px] text-gray-500 font-mono mt-1">
            <span>0</span>
            <span>1000 m²</span>
          </div>
        </div>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {AREA_PRESETS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => setMinAreaFilter(preset.value)}
              className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                minAreaFilter === preset.value
                  ? 'bg-cyan-900/20 border-cyan-700 text-cyan-400 font-bold shadow-sm shadow-cyan-900/10'
                  : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        {stats && stats.hiddenCount > 0 && (
          <div className="p-2.5 bg-orange-950/30 border border-orange-800/30 rounded flex items-start gap-2.5">
            <Icon name="warning" className="text-orange-500 text-sm shrink-0 mt-0.5" />
            <span className="text-[10px] text-orange-200/80 leading-snug">
              Hiding <span className="font-bold text-orange-100">{stats.hiddenCount.toLocaleString()}</span> small parcels below threshold.
            </span>
          </div>
        )}
      </div>

      {/* Dataset Overview */}
      {stats && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Dataset Overview <div className="h-[1px] flex-1 bg-gray-800" />
          </h3>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Total Parcels</div>
              <div className="text-2xl font-bold text-cyan-400 tracking-tight">
                {stats.total.toLocaleString()}
              </div>
            </div>
            <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
              <div className="text-[10px] text-gray-500 uppercase mb-1">Total Area</div>
              <div className="text-2xl font-bold text-cyan-400 tracking-tight">
                {(stats.totalArea / 10000).toFixed(2)}
                <span className="text-base text-gray-500 font-normal ml-1">ha</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Area Distribution */}
      {stats && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Area Distribution <div className="h-[1px] flex-1 bg-gray-800" />
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800/30 p-2 rounded border border-gray-800 flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase">Min</span>
              <span className="text-xs text-gray-300 font-mono">{formatArea(stats.min)}</span>
            </div>
            <div className="bg-gray-800/30 p-2 rounded border border-gray-800 flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase">Avg</span>
              <span className="text-xs text-gray-300 font-mono">{formatArea(stats.avg)}</span>
            </div>
            <div className="bg-gray-800/30 p-2 rounded border border-gray-800 flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase">Median</span>
              <span className="text-xs text-gray-300 font-mono">{formatArea(stats.median)}</span>
            </div>
            <div className="bg-gray-800/30 p-2 rounded border border-gray-800 flex flex-col">
              <span className="text-[9px] text-gray-500 uppercase">Max</span>
              <span className="text-xs text-gray-300 font-mono">{formatArea(stats.max)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
