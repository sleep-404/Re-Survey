import { create } from 'zustand';

/**
 * Data source types for the main polygon layer
 * - 'sam': SAM-generated segments
 * - 'ground_truth': Official annotations
 * - 'working': User's edited working layer
 */
export type DataSource = 'working' | 'sam' | 'ground_truth';

interface DataSourceCounts {
  sam: number | null;
  ground_truth: number | null;
  working: number | null;
}

interface LayerState {
  // Base tile layer visibility
  showOriTiles: boolean;
  showSatellite: boolean;

  // Data source selection (radio - only one active at a time)
  activeDataSource: DataSource;

  // Counts for each data source (null = not yet loaded)
  dataSourceCounts: DataSourceCounts;

  // Overlay toggle (can show GT overlay on top of any data source)
  showGroundTruthOverlay: boolean;

  // Polygon layer visibility
  showPolygons: boolean;

  // Conflict highlighting toggle (color by area mismatch)
  showConflictHighlighting: boolean;

  // Minimum area filter (in square meters, 0 = show all)
  minAreaThreshold: number;

  // Parcel type filter (which types are visible)
  visibleParcelTypes: Set<string>;

  // Actions
  setShowOriTiles: (show: boolean) => void;
  setShowSatellite: (show: boolean) => void;
  setActiveDataSource: (source: DataSource) => void;
  setDataSourceCount: (source: DataSource, count: number) => void;
  setShowGroundTruthOverlay: (show: boolean) => void;
  setShowPolygons: (show: boolean) => void;
  setShowConflictHighlighting: (show: boolean) => void;
  setMinAreaThreshold: (area: number) => void;
  setVisibleParcelTypes: (types: Set<string>) => void;
  toggleParcelType: (type: string) => void;
}

export const useLayerStore = create<LayerState>((set) => ({
  // Initial state - ORI tiles on, satellite off
  showOriTiles: true,
  showSatellite: true,

  // Start with SAM data loaded (matches current App.tsx behavior)
  activeDataSource: 'sam',

  // Counts initialized as null (will be populated when data loads)
  dataSourceCounts: {
    sam: null,
    ground_truth: null,
    working: null,
  },

  // Ground truth overlay off by default
  showGroundTruthOverlay: false,

  // Polygons visible by default
  showPolygons: true,

  // Conflict highlighting off by default
  showConflictHighlighting: false,

  // No area filter by default
  minAreaThreshold: 0,

  // All parcel types visible by default
  visibleParcelTypes: new Set([
    'agricultural',
    'gramakantam',
    'building',
    'road',
    'water_body',
    'open_space',
    'compound',
    'government_land',
    'unclassified',
  ]),

  // Actions
  setShowOriTiles: (show) => set({ showOriTiles: show }),
  setShowSatellite: (show) => set({ showSatellite: show }),
  setActiveDataSource: (source) => set({ activeDataSource: source }),
  setDataSourceCount: (source, count) =>
    set((state) => ({
      dataSourceCounts: { ...state.dataSourceCounts, [source]: count },
    })),
  setShowGroundTruthOverlay: (show) => set({ showGroundTruthOverlay: show }),
  setShowPolygons: (show) => set({ showPolygons: show }),
  setShowConflictHighlighting: (show) => set({ showConflictHighlighting: show }),
  setMinAreaThreshold: (area) => set({ minAreaThreshold: area }),
  setVisibleParcelTypes: (types) => set({ visibleParcelTypes: types }),
  toggleParcelType: (type) =>
    set((state) => {
      const newTypes = new Set(state.visibleParcelTypes);
      if (newTypes.has(type)) {
        newTypes.delete(type);
      } else {
        newTypes.add(type);
      }
      return { visibleParcelTypes: newTypes };
    }),
}));
