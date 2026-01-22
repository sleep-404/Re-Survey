import type { Feature, Polygon, MultiPolygon, Position } from 'geojson';

// Parcel classification types (from orientation session requirements)
export type ParcelType =
  | 'agricultural'      // Farm land with bunds
  | 'gramakantam'       // Abadi/habitation area outer boundary
  | 'building'          // Building footprint
  | 'compound'          // Compound wall boundary
  | 'road'              // Road polygon (double-line)
  | 'open_space'        // Open space within Gramakantam
  | 'water_body'        // Tank, pond, canal
  | 'government_land'   // Government-owned parcel
  | 'unclassified';     // Default for new/untagged parcels

// Properties attached to each parcel polygon
export interface ParcelProperties {
  id: string;
  parcelType: ParcelType;
  area?: number;          // Area in square meters
  iouScore?: number;      // Accuracy score vs ground truth (0-1)
  isSelected?: boolean;   // UI state - currently selected
  isHovered?: boolean;    // UI state - currently hovered
  hasTopologyError?: boolean; // Has overlap or gap issue
  lp_no?: number;         // LP number from data source
  lpNumber?: number;      // Alternative LP number field
}

// A parcel is a GeoJSON Feature with our custom properties
export type ParcelFeature = Feature<Polygon | MultiPolygon, ParcelProperties>;

// Application modes
export type AppMode =
  | 'select'        // Default mode - click to select polygons
  | 'draw'          // Drawing new polygon
  | 'edit-vertices' // Editing vertices of selected polygon
  | 'split';        // Splitting a polygon with a line

// Undo/redo action types
export type HistoryAction =
  | { type: 'delete'; polygons: ParcelFeature[] }
  | { type: 'add'; polygon: ParcelFeature }
  | { type: 'merge'; original: ParcelFeature[]; merged: ParcelFeature }
  | { type: 'split'; original: ParcelFeature; result: ParcelFeature[] }
  | { type: 'edit-vertices'; polygonId: string; before: Position[]; after: Position[] }
  | { type: 'change-type'; polygonId: string; before: ParcelType; after: ParcelType };

// Topology error types
export interface TopologyError {
  type: 'overlap' | 'gap';
  geometry: Polygon | MultiPolygon;
  area: number;           // Area in square meters
  affectedIds: string[];  // IDs of parcels involved
  canAutoFix: boolean;    // Whether auto-fix is possible
}

// Accuracy metrics for ground truth comparison
export interface AccuracyMetrics {
  overallIoU: number;           // Average IoU across all matched polygons
  matchedCount: number;         // Polygons with ground truth match
  unmatchedCount: number;       // Polygons without ground truth match
  belowThresholdCount: number;  // Polygons with IoU < 85%
  parcelsNeedingReview: ParcelFeature[]; // Sorted by IoU ascending
}

// Session data for auto-save/restore
export interface SessionData {
  parcels: ParcelFeature[];
  selectedIds: string[];
  timestamp: number;
  editCount: number;
}

// Map viewport state
export interface ViewportState {
  center: [number, number]; // [lng, lat]
  zoom: number;
  bearing: number;
  pitch: number;
}
