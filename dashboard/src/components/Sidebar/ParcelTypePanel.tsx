import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useHistoryStore, createChangeTypeAction } from '../../hooks/useHistoryStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import type { ParcelType } from '../../types';

export function ParcelTypePanel() {
  const { getSelectedIds, getSelectionCount } = useSelectionStore();
  const { getParcelsByIds, setParcelsType } = usePolygonStore();
  const { pushAction } = useHistoryStore();

  const selectedIds = getSelectedIds();
  const selectionCount = getSelectionCount();
  const selectedParcels = getParcelsByIds(selectedIds);

  // Get current type(s) of selected parcels
  const currentTypes = new Set(selectedParcels.map((p) => p.properties.parcelType));
  const isMixed = currentTypes.size > 1;
  const currentType = isMixed ? null : Array.from(currentTypes)[0];

  const handleTypeChange = (newType: ParcelType) => {
    if (selectedIds.length === 0) return;

    // Record history for each parcel
    selectedParcels.forEach((parcel) => {
      if (parcel.properties.parcelType !== newType) {
        pushAction(
          createChangeTypeAction(
            parcel.properties.id,
            parcel.properties.parcelType,
            newType
          )
        );
      }
    });

    // Apply the change
    setParcelsType(selectedIds, newType);
  };

  if (selectionCount === 0) {
    return (
      <div className="text-center text-sm text-gray-500">
        Select parcels to change their type
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm text-gray-400">
        {selectionCount === 1 ? (
          <>
            Current type:{' '}
            <span className="font-medium text-gray-200">
              {currentType ? PARCEL_TYPES[currentType].label : 'Unknown'}
            </span>
          </>
        ) : (
          <>
            {selectionCount} parcels selected
            {isMixed && (
              <span className="ml-1 text-yellow-500">(mixed types)</span>
            )}
          </>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1">
        {PARCEL_TYPE_ORDER.map((type) => {
          const config = PARCEL_TYPES[type];
          const isActive = currentType === type;

          return (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors ${
                isActive
                  ? 'bg-cyan-600 text-white'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span
                className="h-3 w-3 flex-shrink-0 rounded-sm border border-gray-500"
                style={{ backgroundColor: config.borderColor }}
              />
              <span className="truncate">{config.label}</span>
              <kbd className="ml-auto rounded bg-gray-700 px-1 text-xs text-gray-400">
                {config.shortcut}
              </kbd>
            </button>
          );
        })}
      </div>

      <p className="text-xs text-gray-500">
        Press 1-8 to quickly assign a type to selected parcels
      </p>
    </div>
  );
}
