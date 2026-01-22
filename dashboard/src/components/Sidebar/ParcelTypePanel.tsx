import { useSelectionStore } from '../../hooks/useSelectionStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { useHistoryStore, createChangeTypeAction } from '../../hooks/useHistoryStore';
import { PARCEL_TYPES, PARCEL_TYPE_ORDER } from '../../constants/parcelTypes';
import type { ParcelType } from '../../types';

export function ParcelTypePanel() {
  const { getSelectedIds, getSelectionCount } = useSelectionStore();
  const { parcels, getParcelsByIds, setParcelsType } = usePolygonStore();
  const { pushAction } = useHistoryStore();

  const selectedIds = getSelectedIds();
  const selectionCount = getSelectionCount();
  const selectedParcels = getParcelsByIds(selectedIds);

  // Get current type(s) of selected parcels
  const currentTypes = new Set(selectedParcels.map((p) => p.properties.parcelType));
  const isMixed = currentTypes.size > 1;
  const currentType = isMixed ? null : Array.from(currentTypes)[0];
  const currentConfig = currentType ? PARCEL_TYPES[currentType] : null;

  // Calculate selected parcel info
  const selectedArea = selectedParcels.reduce((sum, p) => sum + (p.properties.area ?? 0), 0);
  const selectedLpNo = selectionCount === 1 ? selectedParcels[0]?.properties?.lp_no ?? selectedParcels[0]?.properties?.lpNumber : null;

  // Calculate classification stats
  const totalParcels = parcels.length;
  const classifiedCount = parcels.filter(
    (p) => p.properties.parcelType !== 'unclassified'
  ).length;
  const unclassifiedCount = totalParcels - classifiedCount;
  const classificationPercent = totalParcels > 0 ? (classifiedCount / totalParcels) * 100 : 0;

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

  const formatArea = (sqm: number): string => {
    if (sqm < 1000) {
      return `${sqm.toFixed(1)} m²`;
    }
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  return (
    <div className="space-y-6">
      {/* Current Selection */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          Current Selection <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>

        {selectionCount === 0 ? (
          <div className="bg-[#1f2937] rounded-lg p-4 border border-gray-700 shadow-sm">
            <p className="text-sm text-gray-500 text-center">
              Select parcels to classify
            </p>
          </div>
        ) : (
          <div className="bg-[#1f2937] rounded-lg p-4 border border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-white">
                {selectionCount} parcel{selectionCount !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs text-gray-400">Current Type:</span>
              {isMixed ? (
                <span className="text-xs text-yellow-400">(mixed types)</span>
              ) : currentConfig ? (
                <div className="flex items-center gap-2 px-2 py-1 bg-gray-900/50 rounded border border-gray-600/50">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: currentConfig.borderColor,
                      boxShadow: `0 0 6px ${currentConfig.borderColor}40`,
                    }}
                  />
                  <span className="text-xs font-medium text-gray-200">
                    {currentConfig.label}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-gray-500">Unclassified</span>
              )}
            </div>
            <div className="text-[10px] text-gray-500 font-mono border-t border-gray-700 pt-2 mt-2 leading-relaxed">
              Area: {formatArea(selectedArea)}
              {selectedLpNo && ` • LP#: ${selectedLpNo}`}
            </div>
          </div>
        )}
      </div>

      {/* Assign Type */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Assign Type
          </h3>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">
          Click a type or press 1-8 to classify
        </p>
        <div className="space-y-1">
          {PARCEL_TYPE_ORDER.map((type) => {
            const config = PARCEL_TYPES[type];
            const isActive = currentType === type;

            return (
              <button
                key={type}
                onClick={() => handleTypeChange(type)}
                disabled={selectionCount === 0}
                className={`w-full flex items-center justify-between p-2 rounded text-left group transition-all ${
                  isActive
                    ? 'bg-cyan-950/10 border-l-[3px] border-cyan-500'
                    : 'hover:bg-gray-800 border-l-[3px] border-transparent hover:border-gray-700'
                } ${selectionCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: config.borderColor,
                      boxShadow: isActive ? `0 0 6px ${config.borderColor}40` : 'none',
                    }}
                  />
                  <span
                    className={`text-xs font-medium transition-colors ${
                      isActive
                        ? 'text-cyan-100'
                        : 'text-gray-400 group-hover:text-gray-200'
                    }`}
                  >
                    {config.label}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
                    isActive
                      ? 'text-cyan-400 bg-cyan-950/40 border-cyan-800/50'
                      : 'text-gray-500 bg-gray-800 border-gray-700 group-hover:border-gray-600'
                  }`}
                >
                  {config.shortcut}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Stats */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          Quick Stats <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <div className="bg-gray-800/30 rounded-lg p-3 border border-gray-700/50">
          <div className="flex justify-between items-end mb-1">
            <span className="text-[10px] font-medium text-gray-400">
              Classified: {classifiedCount.toLocaleString()} / {totalParcels.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-cyan-400">
              {classificationPercent.toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden mb-2">
            <div
              className="h-full bg-cyan-500 rounded-full transition-all"
              style={{ width: `${classificationPercent}%` }}
            />
          </div>
          {unclassifiedCount > 0 && (
            <p className="text-[10px] text-gray-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {unclassifiedCount.toLocaleString()} parcels still unclassified
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
