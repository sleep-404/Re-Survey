import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import type { ParcelType } from '../../types';

export function LayerPanel() {
  const { parcels, isLoading } = usePolygonStore();

  // Get layer state from global store (persists across tab switches)
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
    visibleParcelTypes,
    toggleParcelType,
    setVisibleParcelTypes,
  } = useLayerStore();

  // Count parcels by type
  const typeCounts = PARCEL_TYPE_ORDER.reduce(
    (acc, type) => {
      acc[type] = parcels.filter((p) => p.properties.parcelType === type).length;
      return acc;
    },
    {} as Record<ParcelType, number>
  );

  const showAllTypes = () =>
    setVisibleParcelTypes(new Set(PARCEL_TYPE_ORDER));
  const hideAllTypes = () => setVisibleParcelTypes(new Set());

  return (
    <div className="space-y-4">
      {/* Data Source Selection */}
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Data Source
        </h3>
        <div className="space-y-1">
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-800">
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'working'}
              onChange={() => setActiveDataSource('working')}
              className="h-4 w-4 border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">Working Layer</span>
            <span className="ml-auto text-xs text-gray-500">(editable)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-800">
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'sam'}
              onChange={() => setActiveDataSource('sam')}
              className="h-4 w-4 border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">SAM Output</span>
            <span className="ml-auto text-xs text-blue-400">12,032</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 hover:bg-gray-800">
            <input
              type="radio"
              name="dataSource"
              checked={activeDataSource === 'ground_truth'}
              onChange={() => setActiveDataSource('ground_truth')}
              className="h-4 w-4 border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500"
            />
            <span className="text-sm text-gray-300">Ground Truth</span>
            <span className="ml-auto text-xs text-green-400">105</span>
          </label>
        </div>
        {isLoading && (
          <div className="mt-2 text-xs text-gray-500">Loading...</div>
        )}
      </div>

      {/* Ground Truth Overlay Toggle */}
      <div className="border-t border-gray-700 pt-3">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={showGroundTruthOverlay}
            onChange={(e) => setShowGroundTruthOverlay(e.target.checked)}
            className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-red-500 focus:ring-red-500 focus:ring-offset-gray-900"
          />
          <span className="text-sm text-gray-300">Show GT Overlay</span>
          <span className="ml-auto text-xs text-red-400">(dashed red)</span>
        </label>
      </div>

      {/* Base Layers */}
      <div className="border-t border-gray-700 pt-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Base Layers
        </h3>
        <div className="space-y-2">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showOriTiles}
              onChange={(e) => setShowOriTiles(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">ORI Tiles</span>
            <span className="ml-auto text-xs text-gray-500">(drone)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showSatellite}
              onChange={(e) => setShowSatellite(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">Google Satellite</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
            />
            <span className="text-sm text-gray-300">Polygons</span>
          </label>
        </div>
      </div>

      {/* Parcel Type Filters */}
      <div className="border-t border-gray-700 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Parcel Types
          </h3>
          <div className="flex gap-1">
            <button
              onClick={showAllTypes}
              className="text-xs text-cyan-500 hover:text-cyan-400"
            >
              All
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={hideAllTypes}
              className="text-xs text-cyan-500 hover:text-cyan-400"
            >
              None
            </button>
          </div>
        </div>
        <div className="space-y-1">
          {PARCEL_TYPE_ORDER.map((type) => {
            const config = PARCEL_TYPES[type];
            const count = typeCounts[type];

            return (
              <label
                key={type}
                className="flex cursor-pointer items-center justify-between rounded px-2 py-1 hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={visibleParcelTypes.has(type)}
                    onChange={() => toggleParcelType(type)}
                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
                  />
                  <span
                    className="h-3 w-3 rounded-sm border border-gray-600"
                    style={{ backgroundColor: config.borderColor }}
                  />
                  <span className="text-sm text-gray-300">{config.label}</span>
                </div>
                <span className="text-xs text-gray-500">{count}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Total Count */}
      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Parcels</span>
          <span className="font-medium text-gray-200">{parcels.length}</span>
        </div>
      </div>
    </div>
  );
}
