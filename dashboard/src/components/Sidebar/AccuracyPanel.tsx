import { useState, useCallback, useEffect } from 'react';
import { usePolygonStore } from '../../hooks/usePolygonStore';
import {
  calculateAccuracyMetrics,
  getAccuracyColor,
  formatAccuracy,
  meetsAccuracyTarget,
  generateAccuracySummary,
  type AccuracyMetrics,
  type PolygonAccuracy,
} from '../../utils/accuracy';
import type { Feature, Polygon, FeatureCollection } from 'geojson';
import type { ParcelFeature } from '../../types';

interface AccuracyPanelProps {
  onZoomToPolygon?: (polygonId: string) => void;
  groundTruthUrl?: string;
}

export function AccuracyPanel({
  onZoomToPolygon,
  groundTruthUrl = '/data/ground_truth.geojson',
}: AccuracyPanelProps) {
  const { parcels } = usePolygonStore();
  const [groundTruth, setGroundTruth] = useState<Feature<Polygon>[]>([]);
  const [metrics, setMetrics] = useState<AccuracyMetrics | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [groundTruthLoaded, setGroundTruthLoaded] = useState(false);
  const [showGroundTruth, setShowGroundTruth] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ground truth on mount
  useEffect(() => {
    async function loadGroundTruth() {
      try {
        const response = await fetch(groundTruthUrl);
        if (!response.ok) {
          throw new Error('Ground truth file not found');
        }
        const data: FeatureCollection = await response.json();
        const features = data.features.filter(
          f => f.geometry.type === 'Polygon'
        ) as Feature<Polygon>[];
        setGroundTruth(features);
        setGroundTruthLoaded(true);
        setError(null);
      } catch (e) {
        console.warn('Could not load ground truth:', e);
        setError('Ground truth file not available');
        setGroundTruthLoaded(false);
      }
    }

    loadGroundTruth();
  }, [groundTruthUrl]);

  const handleCalculate = useCallback(async () => {
    if (!groundTruthLoaded) return;

    setIsCalculating(true);

    // Run calculation in next tick to allow UI to update
    await new Promise(resolve => setTimeout(resolve, 10));

    const features = parcels.map((p: ParcelFeature) => ({
      type: 'Feature' as const,
      properties: { ...p.properties },
      geometry: p.geometry,
    })) as Feature<Polygon>[];

    const result = calculateAccuracyMetrics(features, groundTruth);
    setMetrics(result);
    setIsCalculating(false);
  }, [parcels, groundTruth, groundTruthLoaded]);

  const handleExportPriorityList = useCallback(() => {
    if (!metrics) return;

    const summary = generateAccuracySummary(metrics);
    const priorityList = metrics.parcelsNeedingReview
      .map((p, i) => `${i + 1}. Parcel ${p.polygonId}: ${formatAccuracy(p.iou)} (${p.matchType})`)
      .join('\n');

    const content = `${summary}\n\nPriority Review List:\n${priorityList}`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'accuracy_report.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [metrics]);

  const handleZoomTo = useCallback((accuracy: PolygonAccuracy) => {
    onZoomToPolygon?.(accuracy.polygonId);
  }, [onZoomToPolygon]);

  return (
    <div className="p-3 border-t border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-300">Accuracy Metrics</h3>
        <button
          onClick={handleCalculate}
          disabled={isCalculating || !groundTruthLoaded}
          className="px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-700
                     disabled:bg-gray-600 rounded transition-colors"
        >
          {isCalculating ? 'Calculating...' : 'Calculate'}
        </button>
      </div>

      {/* Ground Truth Status */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Ground Truth: {groundTruthLoaded ? (
            <span className="text-green-400">{groundTruth.length} polygons</span>
          ) : (
            <span className="text-red-400">{error || 'Loading...'}</span>
          )}
        </span>
        {groundTruthLoaded && (
          <label className="flex items-center gap-1 text-xs text-gray-400 cursor-pointer">
            <input
              type="checkbox"
              checked={showGroundTruth}
              onChange={(e) => setShowGroundTruth(e.target.checked)}
              className="w-3 h-3"
            />
            Show
          </label>
        )}
      </div>

      {metrics && (
        <div className="space-y-3">
          {/* Overall Score */}
          <div className={`p-3 rounded text-center ${
            meetsAccuracyTarget(metrics)
              ? 'bg-green-900/50'
              : 'bg-red-900/50'
          }`}>
            <div className="text-2xl font-bold" style={{ color: getAccuracyColor(metrics.overallIoU) }}>
              {formatAccuracy(metrics.overallIoU)}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Overall IoU {meetsAccuracyTarget(metrics) ? '(Target: ≥85% ✓)' : '(Target: ≥85% ✗)'}
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Matched</div>
              <div className="text-lg font-semibold text-gray-200">{metrics.matchedCount}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Unmatched</div>
              <div className="text-lg font-semibold text-yellow-400">{metrics.unmatchedCount}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Above 85%</div>
              <div className="text-lg font-semibold text-green-400">{metrics.aboveThresholdCount}</div>
            </div>
            <div className="bg-gray-800 p-2 rounded">
              <div className="text-gray-400">Below 85%</div>
              <div className="text-lg font-semibold text-red-400">{metrics.belowThresholdCount}</div>
            </div>
          </div>

          {/* Parcels Needing Review */}
          {metrics.parcelsNeedingReview.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-400">
                  Parcels Needing Review ({metrics.parcelsNeedingReview.length})
                </span>
                <button
                  onClick={handleExportPriorityList}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  Export List
                </button>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1">
                {metrics.parcelsNeedingReview.slice(0, 20).map((accuracy) => (
                  <div
                    key={accuracy.polygonId}
                    className="flex items-center justify-between p-2 bg-gray-800
                               rounded text-xs hover:bg-gray-700 cursor-pointer"
                    onClick={() => handleZoomTo(accuracy)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getAccuracyColor(accuracy.iou) }}
                      />
                      <span className="text-gray-300 font-mono">
                        {accuracy.polygonId.slice(0, 8)}
                      </span>
                      <span style={{ color: getAccuracyColor(accuracy.iou) }}>
                        {formatAccuracy(accuracy.iou)}
                      </span>
                    </div>
                    <button
                      className="text-blue-400 hover:text-blue-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleZoomTo(accuracy);
                      }}
                    >
                      →
                    </button>
                  </div>
                ))}
                {metrics.parcelsNeedingReview.length > 20 && (
                  <div className="text-xs text-gray-500 text-center py-1">
                    +{metrics.parcelsNeedingReview.length - 20} more...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!metrics && groundTruthLoaded && (
        <p className="text-xs text-gray-500">
          Click Calculate to compare polygons against ground truth and measure accuracy.
        </p>
      )}
    </div>
  );
}
