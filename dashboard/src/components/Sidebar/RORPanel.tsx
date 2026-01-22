import { useState, useCallback, useEffect } from 'react';
import { useRORStore } from '../../hooks/useRORStore';
import type { RORRecord } from '../../types/ror';

interface RORPanelProps {
  onSelectParcel?: (lpNumber: number) => void;
}

export function RORPanel({ onSelectParcel }: RORPanelProps) {
  const {
    records,
    isLoading,
    error,
    searchQuery,
    selectedLpNumber,
    loadFromUrl,
    loadFromFile,
    setSearchQuery,
    selectLpNumber,
    getFilteredRecords,
  } = useRORStore();

  const [showUpload, setShowUpload] = useState(false);

  // Auto-load Nibanupudi ROR on mount (only once)
  useEffect(() => {
    // Only attempt if store is empty
    if (useRORStore.getState().records.length === 0) {
      loadFromUrl('/data/Nibhanupudi-annonymized ROR.xlsx').catch(() => {
        console.log('ROR file not found at default location');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only on mount

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFromFile(file);
      setShowUpload(false);
    }
  }, [loadFromFile]);

  const handleRecordClick = useCallback((record: RORRecord) => {
    selectLpNumber(record.lpNumber);
    onSelectParcel?.(record.lpNumber);
  }, [selectLpNumber, onSelectParcel]);

  const filteredRecords = getFilteredRecords();

  // Format area display
  const formatArea = (sqm: number) => {
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  return (
    <div className="space-y-3">
      {/* Header with upload option */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          ROR Data
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-xs text-cyan-500 hover:text-cyan-400"
        >
          {showUpload ? 'Cancel' : 'Upload'}
        </button>
      </div>

      {/* File upload */}
      {showUpload && (
        <div className="rounded border border-dashed border-gray-600 p-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-full text-xs text-gray-400 file:mr-2 file:rounded file:border-0
                       file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:text-gray-300"
          />
          <p className="mt-1 text-xs text-gray-500">Upload ROR Excel file</p>
        </div>
      )}

      {/* Status */}
      {isLoading && (
        <div className="text-xs text-gray-400">Loading ROR data...</div>
      )}
      {error && (
        <div className="text-xs text-red-400">{error}</div>
      )}

      {/* Search */}
      {records.length > 0 && (
        <div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search LP#, Survey#, Type..."
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5
                       text-sm text-gray-200 placeholder-gray-500 focus:border-cyan-500
                       focus:outline-none"
          />
        </div>
      )}

      {/* Stats */}
      {records.length > 0 && (
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>{filteredRecords.length} of {records.length} records</span>
          <span>
            Total: {formatArea(records.reduce((sum, r) => sum + r.extentSqm, 0))}
          </span>
        </div>
      )}

      {/* Records list */}
      {records.length > 0 && (
        <div className="max-h-64 space-y-1 overflow-y-auto">
          {filteredRecords.slice(0, 50).map((record) => (
            <div
              key={record.lpNumber}
              onClick={() => handleRecordClick(record)}
              className={`cursor-pointer rounded p-2 text-xs transition-colors ${
                selectedLpNumber === record.lpNumber
                  ? 'bg-cyan-900/50 border border-cyan-500'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-gray-200">
                  LP# {record.lpNumber}
                </span>
                <span className="text-gray-400">
                  {formatArea(record.extentSqm)}
                </span>
              </div>
              {record.landType && (
                <div className="mt-1 text-gray-500">{record.landType}</div>
              )}
              {record.oldSurveyNumber && (
                <div className="text-gray-500">Survey: {record.oldSurveyNumber}</div>
              )}
            </div>
          ))}
          {filteredRecords.length > 50 && (
            <div className="py-2 text-center text-xs text-gray-500">
              +{filteredRecords.length - 50} more records...
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && records.length === 0 && !error && (
        <div className="py-4 text-center text-xs text-gray-500">
          No ROR data loaded. Click Upload to load an Excel file.
        </div>
      )}
    </div>
  );
}
