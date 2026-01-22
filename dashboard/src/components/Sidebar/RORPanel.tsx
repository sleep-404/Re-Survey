import { useState, useCallback, useEffect } from 'react';
import { useRORStore } from '../../hooks/useRORStore';
import { Icon } from '../shared/Icon';
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
    if (useRORStore.getState().records.length === 0) {
      loadFromUrl('/data/Nibhanupudi-annonymized ROR.xlsx').catch(() => {
        console.log('ROR file not found at default location');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const formatArea = (sqm: number) => {
    if (sqm < 10000) return `${sqm.toFixed(0)} m²`;
    return `${(sqm / 10000).toFixed(2)} ha`;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          ROR Records
        </h3>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="text-[10px] text-cyan-500 hover:text-cyan-400 font-medium flex items-center gap-0.5 transition-colors"
        >
          {showUpload ? 'Cancel' : 'Upload'}
          {!showUpload && <Icon name="north_east" className="text-[10px]" />}
        </button>
      </div>

      {/* File upload */}
      {showUpload && (
        <div className="rounded border border-dashed border-gray-600 p-3">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="w-full text-xs text-gray-400 file:mr-2 file:rounded file:border-0
                       file:bg-gray-700 file:px-2 file:py-1 file:text-xs file:text-gray-300"
          />
          <p className="mt-1 text-xs text-gray-500">Upload ROR Excel file (.xlsx)</p>
        </div>
      )}

      {/* Status */}
      {isLoading && (
        <div className="text-xs text-gray-400 flex items-center gap-2">
          <Icon name="sync" className="text-sm animate-spin" />
          Loading ROR data...
        </div>
      )}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-800/30">
          {error}
        </div>
      )}

      {/* Search */}
      {records.length > 0 && (
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500">
            <Icon name="search" className="text-sm" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search LP#, Survey#..."
            className="w-full bg-gray-900/50 border border-gray-700 rounded text-xs py-2 pl-8 pr-3
                       text-gray-300 placeholder-gray-600 focus:outline-none focus:border-cyan-500/50
                       focus:ring-1 focus:ring-cyan-500/20 transition-all"
          />
        </div>
      )}

      {/* Stats */}
      {records.length > 0 && (
        <div className="flex items-center justify-start text-[10px] text-gray-500 px-1">
          <span>Showing {Math.min(filteredRecords.length, 50)} of {records.length} records</span>
        </div>
      )}

      {/* Records list */}
      {records.length > 0 && (
        <div className="max-h-64 space-y-2 overflow-y-auto no-scrollbar">
          {filteredRecords.slice(0, 50).map((record) => (
            <div
              key={record.lpNumber}
              onClick={() => handleRecordClick(record)}
              className={`p-2.5 rounded-md cursor-pointer transition-colors group ${
                selectedLpNumber === record.lpNumber
                  ? 'bg-cyan-900/30 border border-cyan-700/50'
                  : 'bg-gray-800/40 border border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium text-gray-200">
                  LP# {record.lpNumber}
                </span>
                <span className="text-[10px] text-gray-500 group-hover:text-gray-400 transition-colors">
                  {record.landType || 'Unknown'}
                </span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                Area: {formatArea(record.extentSqm)}
              </div>
            </div>
          ))}
          {filteredRecords.length > 50 && (
            <div className="text-center pt-2 pb-1">
              <span className="text-[10px] text-gray-500 hover:text-gray-400 cursor-pointer transition-colors">
                +{filteredRecords.length - 50} more records...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && records.length === 0 && !error && (
        <div className="py-4 text-center">
          <Icon name="description" className="text-3xl text-gray-600 mb-2" />
          <p className="text-xs text-gray-500">
            No ROR data loaded.<br />Click Upload to load an Excel file.
          </p>
        </div>
      )}
    </div>
  );
}
