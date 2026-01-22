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

// Mock villages data
const MOCK_VILLAGES: Village[] = [
  {
    id: 'nibhanupudi',
    name: 'Nibhanupudi',
    mandal: 'Pedakurapadu',
    parcelCount: 12032,
    progress: 0,
    hasRealData: true
  },
  {
    id: 'kondaveedu',
    name: 'Kondaveedu',
    mandal: 'Pedakurapadu',
    parcelCount: 8456,
    progress: 100,
    hasRealData: false
  },
  {
    id: 'manchala',
    name: 'Manchala',
    mandal: 'Sattenapalli',
    parcelCount: 5234,
    progress: 45,
    hasRealData: false
  },
  {
    id: 'vemuru',
    name: 'Vemuru',
    mandal: 'Vemuru',
    parcelCount: 6789,
    progress: 0,
    hasRealData: false
  }
];

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

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    set({
      villages: MOCK_VILLAGES,
      isLoading: false
    });
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
