import { create } from 'zustand';

export interface Village {
  id: string;
  name: string;
  mandal: string;
  parcelCount: number;
  progress: number; // 0-100
  hasRealData: boolean;
}

interface VillageState {
  // State
  villages: Village[];
  selectedVillage: Village | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  sortBy: 'name' | 'progress' | 'parcels';
  sortDirection: 'asc' | 'desc';

  // Actions
  loadVillages: () => Promise<void>;
  selectVillage: (id: string) => void;
  clearSelectedVillage: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (field: 'name' | 'progress' | 'parcels') => void;
  toggleSortDirection: () => void;
}

// Base village data (parcel counts for villages with real data will be fetched)
const BASE_VILLAGES: Omit<Village, 'parcelCount'>[] = [
  {
    id: 'nibhanupudi',
    name: 'Nibhanupudi',
    mandal: 'Pedakurapadu',
    progress: 0,
    hasRealData: true
  },
  {
    id: 'kondaveedu',
    name: 'Kondaveedu',
    mandal: 'Pedakurapadu',
    progress: 100,
    hasRealData: false
  },
  {
    id: 'manchala',
    name: 'Manchala',
    mandal: 'Sattenapalli',
    progress: 45,
    hasRealData: false
  },
  {
    id: 'vemuru',
    name: 'Vemuru',
    mandal: 'Vemuru',
    progress: 0,
    hasRealData: false
  }
];

// Placeholder counts for demo villages without real data
const DEMO_PARCEL_COUNTS: Record<string, number> = {
  kondaveedu: 8456,
  manchala: 5234,
  vemuru: 6789
};

export const useVillageStore = create<VillageState>((set, get) => ({
  // Initial state
  villages: [],
  selectedVillage: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  sortBy: 'name',
  sortDirection: 'asc',

  // Actions
  loadVillages: async () => {
    set({ isLoading: true, error: null });

    try {
      // Fetch actual parcel count for Nibhanupudi from SAM segments
      let nibhanupudiCount = 0;
      try {
        const response = await fetch('/data/sam_segments.geojson');
        if (response.ok) {
          const geojson = await response.json();
          nibhanupudiCount = geojson.features?.length || 0;
        }
      } catch (err) {
        console.warn('Could not fetch SAM segments count:', err);
      }

      // Build villages with real or placeholder counts
      const villages: Village[] = BASE_VILLAGES.map((v) => ({
        ...v,
        parcelCount: v.hasRealData
          ? nibhanupudiCount
          : DEMO_PARCEL_COUNTS[v.id] || 0
      }));

      set({
        villages,
        isLoading: false
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load villages',
        isLoading: false
      });
    }
  },

  selectVillage: (id: string) => {
    const village = get().villages.find((v) => v.id === id);
    if (village) {
      set({ selectedVillage: village });
    }
  },

  clearSelectedVillage: () => {
    set({ selectedVillage: null });
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
  },

  setSortBy: (field: 'name' | 'progress' | 'parcels') => {
    set({ sortBy: field });
  },

  toggleSortDirection: () => {
    set((state) => ({
      sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc'
    }));
  }
}));
