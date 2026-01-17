import { useState } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import type { ParcelType } from '../../types';

interface LayerToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}

function LayerToggle({ label, checked, onChange, color }: LayerToggleProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900"
      />
      {color && (
        <span
          className="h-3 w-3 rounded-sm border border-gray-600"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="text-sm text-gray-300">{label}</span>
    </label>
  );
}

export function LayerPanel() {
  const { parcels } = usePolygonStore();

  // Layer visibility state
  const [showImagery, setShowImagery] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [visibleTypes, setVisibleTypes] = useState<Set<ParcelType>>(
    new Set(PARCEL_TYPE_ORDER)
  );

  // Count parcels by type
  const typeCounts = PARCEL_TYPE_ORDER.reduce((acc, type) => {
    acc[type] = parcels.filter((p) => p.properties.parcelType === type).length;
    return acc;
  }, {} as Record<ParcelType, number>);

  const toggleType = (type: ParcelType) => {
    const newVisible = new Set(visibleTypes);
    if (newVisible.has(type)) {
      newVisible.delete(type);
    } else {
      newVisible.add(type);
    }
    setVisibleTypes(newVisible);
  };

  const showAll = () => setVisibleTypes(new Set(PARCEL_TYPE_ORDER));
  const hideAll = () => setVisibleTypes(new Set());

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Base Layers
        </h3>
        <div className="space-y-2">
          <LayerToggle
            label="ORI Imagery"
            checked={showImagery}
            onChange={setShowImagery}
          />
          <LayerToggle
            label="Polygons"
            checked={showPolygons}
            onChange={setShowPolygons}
          />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Parcel Types
          </h3>
          <div className="flex gap-1">
            <button
              onClick={showAll}
              className="text-xs text-cyan-500 hover:text-cyan-400"
            >
              All
            </button>
            <span className="text-gray-600">|</span>
            <button
              onClick={hideAll}
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
                    checked={visibleTypes.has(type)}
                    onChange={() => toggleType(type)}
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

      <div className="border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Total Parcels</span>
          <span className="font-medium text-gray-200">{parcels.length}</span>
        </div>
      </div>
    </div>
  );
}
