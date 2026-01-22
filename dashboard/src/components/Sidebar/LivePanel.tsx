import { useCallback } from 'react';
import { useLiveSegmentationStore, type SAMModelType } from '../../hooks/useLiveSegmentationStore';
import { useLayerStore } from '../../hooks/useLayerStore';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import { Icon } from '../shared/Icon';

const MODEL_OPTIONS: { value: SAMModelType; label: string; description: string }[] = [
  { value: 'vit_b', label: 'ViT-B (Fast)', description: 'Base model, fastest inference' },
  { value: 'vit_l', label: 'ViT-L (Balanced)', description: 'Large model, better accuracy' },
  { value: 'vit_h', label: 'ViT-H (Best)', description: 'Huge model, highest accuracy' },
];

const QUALITY_OPTIONS = [
  { value: 256, label: 'Fast', description: 'Lower resolution, faster' },
  { value: 512, label: 'Balanced', description: 'Good balance' },
  { value: 1024, label: 'High', description: 'Higher detail, slower' },
];

export function LivePanel() {
  const {
    isDrawingBox,
    currentBox,
    drawnBoxes,
    selectedModel,
    maxDimension,
    minArea,
    pointsPerSide,
    simplifyTolerance,
    isProcessing,
    lastError,
    lastProcessingTime,
    totalSegmentCount,
    setDrawingBox,
    setSelectedModel,
    setMaxDimension,
    setMinArea,
    setPointsPerSide,
    setSimplifyTolerance,
    runSegmentation,
    clearAllSegments,
    clearError,
  } = useLiveSegmentationStore();

  const { activeDataSource, setActiveDataSource } = useLayerStore();
  const { setParcels } = usePolygonStore();

  const handleStartDrawing = useCallback(() => {
    setDrawingBox(true);
    clearError();
  }, [setDrawingBox, clearError]);

  const handleCancelDrawing = useCallback(() => {
    setDrawingBox(false);
    useLiveSegmentationStore.getState().setCurrentBox(null);
  }, [setDrawingBox]);

  const handleRunSegmentation = useCallback(async () => {
    await runSegmentation();
    // Auto-switch to live data source after successful segmentation
    if (!useLiveSegmentationStore.getState().lastError) {
      setActiveDataSource('live');
    }
  }, [runSegmentation, setActiveDataSource]);

  const handleReset = useCallback(() => {
    clearAllSegments();
    // If currently viewing live data, clear the map immediately
    if (activeDataSource === 'live') {
      setParcels([]);
    }
  }, [clearAllSegments, activeDataSource, setParcels]);

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatBounds = (box: { minLng: number; maxLng: number; minLat: number; maxLat: number }) => {
    return `${box.minLat.toFixed(5)}, ${box.minLng.toFixed(5)} → ${box.maxLat.toFixed(5)}, ${box.maxLng.toFixed(5)}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
          Live AI Segmentation <div className="h-[1px] flex-1 bg-gray-800" />
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Draw a bounding box on the map, select a model, and run AI segmentation in real-time.
        </p>
      </div>

      {/* Step 1: Draw Bounding Box */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">1</span>
          <span className="text-xs font-medium text-gray-300">Draw Region</span>
        </div>

        {isDrawingBox ? (
          <div className="space-y-2">
            <div className="p-3 bg-cyan-900/20 border border-cyan-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-cyan-300 text-xs">
                <Icon name="draw" className="text-sm animate-pulse" />
                <span>Click and drag on the map to draw a box</span>
              </div>
            </div>
            <button
              onClick={handleCancelDrawing}
              className="w-full px-3 py-2 text-xs font-medium text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded transition-colors"
            >
              Cancel Drawing
            </button>
          </div>
        ) : currentBox ? (
          <div className="space-y-2">
            <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
              <div className="flex items-center gap-2 text-green-300 text-xs mb-1">
                <Icon name="check_circle" className="text-sm" />
                <span>Region selected</span>
              </div>
              <div className="text-[10px] text-gray-500 font-mono">
                {formatBounds(currentBox)}
              </div>
            </div>
            <button
              onClick={handleStartDrawing}
              className="w-full px-3 py-2 text-xs font-medium text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 rounded transition-colors"
            >
              Draw New Box
            </button>
          </div>
        ) : (
          <button
            onClick={handleStartDrawing}
            className="w-full px-4 py-3 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-colors"
          >
            <Icon name="crop_free" className="text-lg" />
            Draw Bounding Box
          </button>
        )}
      </div>

      {/* Step 2: Select Model */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">2</span>
          <span className="text-xs font-medium text-gray-300">Select Model</span>
        </div>

        <div className="space-y-1.5">
          {MODEL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className={`flex items-start gap-3 p-2.5 rounded cursor-pointer transition-colors ${
                selectedModel === option.value
                  ? 'bg-cyan-950/30 border border-cyan-800/50'
                  : 'hover:bg-gray-800 border border-transparent'
              }`}
            >
              <input
                type="radio"
                name="model"
                value={option.value}
                checked={selectedModel === option.value}
                onChange={() => setSelectedModel(option.value)}
                disabled={isProcessing}
                className="mt-0.5 text-cyan-500 focus:ring-cyan-500/50 bg-gray-900 border-gray-600"
              />
              <div>
                <span className={`text-xs font-medium ${
                  selectedModel === option.value ? 'text-cyan-100' : 'text-gray-300'
                }`}>
                  {option.label}
                </span>
                <p className="text-[10px] text-gray-500 mt-0.5">{option.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Step 3: Segmentation Settings */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">3</span>
          <span className="text-xs font-medium text-gray-300">Settings</span>
        </div>

        <div className="space-y-4 pl-1">
          {/* Quality / Resolution */}
          <div>
            <label className="text-[10px] text-gray-500 uppercase tracking-wide mb-2 block">Quality</label>
            <div className="flex gap-1">
              {QUALITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setMaxDimension(option.value)}
                  disabled={isProcessing}
                  className={`flex-1 px-2 py-1.5 text-[10px] font-medium rounded border transition-colors ${
                    maxDimension === option.value
                      ? 'bg-cyan-900/30 border-cyan-700 text-cyan-300'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  }`}
                  title={option.description}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min Area Filter */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Min Area</label>
              <span className="text-[10px] text-cyan-400 font-mono">{minArea} m²</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="100"
              value={minArea}
              onChange={(e) => setMinArea(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
              <span>100</span>
              <span>5000 m²</span>
            </div>
          </div>

          {/* Simplify Tolerance */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Boundary Smoothing</label>
              <span className="text-[10px] text-cyan-400 font-mono">{simplifyTolerance.toFixed(1)} m</span>
            </div>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={simplifyTolerance}
              onChange={(e) => setSimplifyTolerance(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
              <span>Detailed</span>
              <span>Smooth</span>
            </div>
          </div>

          {/* Points Per Side (Density) */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] text-gray-500 uppercase tracking-wide">Segment Density</label>
              <span className="text-[10px] text-cyan-400 font-mono">{pointsPerSide} pts</span>
            </div>
            <input
              type="range"
              min="8"
              max="32"
              step="4"
              value={pointsPerSide}
              onChange={(e) => setPointsPerSide(Number(e.target.value))}
              disabled={isProcessing}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
              <span>Fewer segments</span>
              <span>More segments</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 4: Run Segmentation */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center">4</span>
          <span className="text-xs font-medium text-gray-300">Run Segmentation</span>
        </div>

        <button
          onClick={handleRunSegmentation}
          disabled={!currentBox || isProcessing}
          className={`w-full px-4 py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2 transition-colors ${
            !currentBox || isProcessing
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-900/30'
          }`}
        >
          {isProcessing ? (
            <>
              <Icon name="sync" className="text-lg animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Icon name="auto_awesome" className="text-lg" />
              Run AI Segmentation
            </>
          )}
        </button>

        {isProcessing && (
          <p className="text-[10px] text-gray-500 text-center mt-2">
            This may take 5-15 seconds depending on region size
          </p>
        )}
      </div>

      {/* Error Display */}
      {lastError && (
        <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Icon name="error" className="text-red-400 text-sm mt-0.5" />
            <div>
              <span className="text-xs text-red-300 font-medium">Error</span>
              <p className="text-[10px] text-red-400/80 mt-0.5">{lastError}</p>
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {totalSegmentCount > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            Results <div className="h-[1px] flex-1 bg-gray-800" />
          </h3>

          <div className="space-y-3">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Segments</div>
                <div className="text-xl font-bold text-cyan-400">{totalSegmentCount}</div>
              </div>
              <div className="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div className="text-[10px] text-gray-500 uppercase mb-1">Regions</div>
                <div className="text-xl font-bold text-cyan-400">{drawnBoxes.length}</div>
              </div>
            </div>

            {lastProcessingTime && (
              <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                <Icon name="timer" className="text-xs" />
                Last processing time: {formatTime(lastProcessingTime)}
              </div>
            )}

            {/* View Results Button */}
            <button
              onClick={() => setActiveDataSource('live')}
              className="w-full px-3 py-2 text-xs font-medium text-cyan-400 hover:text-cyan-300 border border-cyan-700/50 hover:border-cyan-600 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="visibility" className="text-sm" />
              View Live Segments in Layers
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              disabled={isProcessing}
              className="w-full px-3 py-2 text-xs font-medium text-red-400 hover:text-red-300 border border-red-800/50 hover:border-red-700 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Icon name="delete_sweep" className="text-sm" />
              Reset All Live Segments
            </button>
          </div>
        </div>
      )}

      {/* Help Text */}
      {totalSegmentCount === 0 && !isProcessing && (
        <div className="p-4 bg-gray-800/30 border border-gray-700/50 rounded-lg">
          <div className="flex items-start gap-3">
            <Icon name="info" className="text-gray-500 text-lg mt-0.5" />
            <div>
              <p className="text-xs text-gray-400 mb-2">
                Live segmentation lets you run AI boundary detection on any area of the map in real-time.
              </p>
              <ul className="text-[10px] text-gray-500 space-y-1">
                <li>• Results accumulate across multiple regions</li>
                <li>• Switch to "Live Segmentation" in Layers to edit</li>
                <li>• All editing tools work on live segments</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
