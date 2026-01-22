import { create } from 'zustand';
import { area as turfArea } from '@turf/turf';
import type { ParcelFeature } from '../types';

const API_ENDPOINT = 'http://65.0.45.43:8503/api/sam/segment-region';

export type SAMModelType = 'vit_b' | 'vit_l' | 'vit_h';

export interface BoundingBox {
  minLng: number;
  maxLng: number;
  minLat: number;
  maxLat: number;
}

export interface SegmentationRequest {
  bounds: BoundingBox;
  model_type: SAMModelType;
  max_dimension?: number;
  min_area?: number;
  max_area?: number;
}

export interface SegmentResult {
  id: number;
  area_pixels: number;
  area_sqm: number;
  confidence: number;
  bbox: { x: number; y: number; width: number; height: number };
  polygon: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface SegmentationResponse {
  success: boolean;
  segment_count: number;
  bounds: BoundingBox;
  tile_size: {
    original: { width: number; height: number };
    processed: { width: number; height: number };
  };
  scale_factor: number;
  model_used: string;
  processing_time_ms: number;
  segments: SegmentResult[];
  error?: string;
}

interface LiveSegmentationState {
  // Drawing state
  isDrawingBox: boolean;
  currentBox: BoundingBox | null;
  drawnBoxes: BoundingBox[]; // History of drawn boxes

  // Model settings
  selectedModel: SAMModelType;
  maxDimension: number;
  minArea: number;
  maxArea: number;

  // API state
  isProcessing: boolean;
  lastError: string | null;
  lastProcessingTime: number | null;

  // Results
  liveSegments: ParcelFeature[];
  totalSegmentCount: number;

  // Actions
  setDrawingBox: (drawing: boolean) => void;
  setCurrentBox: (box: BoundingBox | null) => void;
  setSelectedModel: (model: SAMModelType) => void;
  setMaxDimension: (dim: number) => void;
  setMinArea: (area: number) => void;
  setMaxArea: (area: number) => void;
  runSegmentation: () => Promise<void>;
  addSegments: (segments: ParcelFeature[]) => void;
  setLiveSegments: (segments: ParcelFeature[]) => void;
  clearAllSegments: () => void;
  clearError: () => void;
}

export const useLiveSegmentationStore = create<LiveSegmentationState>((set, get) => ({
  // Initial state
  isDrawingBox: false,
  currentBox: null,
  drawnBoxes: [],

  selectedModel: 'vit_b',
  maxDimension: 1024,
  minArea: 100,
  maxArea: 500000,

  isProcessing: false,
  lastError: null,
  lastProcessingTime: null,

  liveSegments: [],
  totalSegmentCount: 0,

  // Actions
  setDrawingBox: (drawing) => set({ isDrawingBox: drawing }),

  setCurrentBox: (box) => set({ currentBox: box }),

  setSelectedModel: (model) => set({ selectedModel: model }),

  setMaxDimension: (dim) => set({ maxDimension: dim }),

  setMinArea: (area) => set({ minArea: area }),

  setMaxArea: (area) => set({ maxArea: area }),

  runSegmentation: async () => {
    const { currentBox, selectedModel, maxDimension, minArea, maxArea } = get();

    if (!currentBox) {
      set({ lastError: 'No bounding box selected. Draw a box on the map first.' });
      return;
    }

    set({ isProcessing: true, lastError: null });

    try {
      const requestBody: SegmentationRequest = {
        bounds: currentBox,
        model_type: selectedModel,
        max_dimension: maxDimension,
        min_area: minArea,
        max_area: maxArea,
      };

      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const data: SegmentationResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Segmentation failed');
      }

      // Convert segments to ParcelFeature format
      const existingSegments = get().liveSegments;
      const baseId = existingSegments.length;

      const newFeatures: ParcelFeature[] = data.segments.map((segment, index) => {
        // Calculate area from geometry if backend doesn't provide it
        const calculatedArea = segment.area_sqm || turfArea({
          type: 'Feature',
          properties: {},
          geometry: segment.polygon,
        });

        return {
          type: 'Feature' as const,
          geometry: segment.polygon,
          properties: {
            id: `live-${baseId + index}-${Date.now()}`,
            parcelType: 'unclassified' as const,
            area: calculatedArea,
            area_sqm: calculatedArea,
            confidence: segment.confidence,
            source: 'live-segmentation',
            model: data.model_used,
            segmentId: segment.id,
          },
        };
      });

      // Add to existing segments
      const updatedSegments = [...existingSegments, ...newFeatures];

      // Save drawn box to history
      const updatedBoxes = [...get().drawnBoxes, currentBox];

      set({
        liveSegments: updatedSegments,
        totalSegmentCount: updatedSegments.length,
        drawnBoxes: updatedBoxes,
        isProcessing: false,
        lastProcessingTime: data.processing_time_ms,
        currentBox: null, // Clear current box after successful segmentation
      });

      console.log(`Live segmentation: Added ${newFeatures.length} segments (total: ${updatedSegments.length})`);

      // Save to file
      await saveLiveSegmentsToFile(updatedSegments);

    } catch (error) {
      console.error('Segmentation error:', error);
      set({
        isProcessing: false,
        lastError: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  },

  addSegments: (segments) => {
    const existing = get().liveSegments;
    const updated = [...existing, ...segments];
    set({
      liveSegments: updated,
      totalSegmentCount: updated.length,
    });
  },

  setLiveSegments: (segments) => {
    set({
      liveSegments: segments,
      totalSegmentCount: segments.length,
    });
  },

  clearAllSegments: () => {
    set({
      liveSegments: [],
      totalSegmentCount: 0,
      drawnBoxes: [],
      currentBox: null,
      lastError: null,
      lastProcessingTime: null,
    });
    // Clear the file
    saveLiveSegmentsToFile([]);
  },

  clearError: () => set({ lastError: null }),
}));

// Helper function to save live segments to file
async function saveLiveSegmentsToFile(segments: ParcelFeature[]): Promise<void> {
  const geojson = {
    type: 'FeatureCollection',
    name: 'live_segments',
    features: segments,
  };

  try {
    // In development, we'll use localStorage as a fallback since we can't write files directly
    // In production, this would be an API call to save the file
    localStorage.setItem('live_segments', JSON.stringify(geojson));
    console.log('Live segments saved to localStorage');
  } catch (error) {
    console.error('Failed to save live segments:', error);
  }
}

// Helper function to load live segments from storage
export async function loadLiveSegmentsFromStorage(): Promise<ParcelFeature[]> {
  try {
    // Try localStorage first
    const stored = localStorage.getItem('live_segments');
    if (stored) {
      const geojson = JSON.parse(stored);
      return geojson.features || [];
    }

    // Try fetching from file (in case it exists)
    try {
      const response = await fetch('/data/live_segments.geojson');
      if (response.ok) {
        const geojson = await response.json();
        return geojson.features || [];
      }
    } catch {
      // File doesn't exist yet, that's fine
    }

    return [];
  } catch (error) {
    console.error('Failed to load live segments:', error);
    return [];
  }
}
