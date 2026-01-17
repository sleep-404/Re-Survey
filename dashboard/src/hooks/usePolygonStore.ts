import { create } from 'zustand';
import type { ParcelFeature, ParcelType } from '../types';

interface PolygonState {
  // Data
  parcels: ParcelFeature[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setParcels: (parcels: ParcelFeature[]) => void;
  addParcel: (parcel: ParcelFeature) => void;
  updateParcel: (id: string, updates: Partial<ParcelFeature['properties']>) => void;
  deleteParcel: (id: string) => void;
  deleteParcels: (ids: string[]) => void;
  setParcelType: (id: string, parcelType: ParcelType) => void;
  setParcelsType: (ids: string[], parcelType: ParcelType) => void;
  mergeParcels: (ids: string[], mergedParcel: ParcelFeature) => void;
  splitParcel: (id: string, newParcels: ParcelFeature[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors
  getParcelById: (id: string) => ParcelFeature | undefined;
  getParcelsByIds: (ids: string[]) => ParcelFeature[];
  getParcelsByType: (type: ParcelType) => ParcelFeature[];
}

export const usePolygonStore = create<PolygonState>((set, get) => ({
  // Initial state
  parcels: [],
  isLoading: false,
  error: null,

  // Actions
  setParcels: (parcels) => set({ parcels, isLoading: false, error: null }),

  addParcel: (parcel) =>
    set((state) => ({
      parcels: [...state.parcels, parcel],
    })),

  updateParcel: (id, updates) =>
    set((state) => ({
      parcels: state.parcels.map((p) =>
        p.properties.id === id
          ? { ...p, properties: { ...p.properties, ...updates } }
          : p
      ),
    })),

  deleteParcel: (id) =>
    set((state) => ({
      parcels: state.parcels.filter((p) => p.properties.id !== id),
    })),

  deleteParcels: (ids) =>
    set((state) => ({
      parcels: state.parcels.filter((p) => !ids.includes(p.properties.id)),
    })),

  setParcelType: (id, parcelType) =>
    set((state) => ({
      parcels: state.parcels.map((p) =>
        p.properties.id === id
          ? { ...p, properties: { ...p.properties, parcelType } }
          : p
      ),
    })),

  setParcelsType: (ids, parcelType) =>
    set((state) => ({
      parcels: state.parcels.map((p) =>
        ids.includes(p.properties.id)
          ? { ...p, properties: { ...p.properties, parcelType } }
          : p
      ),
    })),

  mergeParcels: (ids, mergedParcel) =>
    set((state) => ({
      parcels: [
        ...state.parcels.filter((p) => !ids.includes(p.properties.id)),
        mergedParcel,
      ],
    })),

  splitParcel: (id, newParcels) =>
    set((state) => ({
      parcels: [
        ...state.parcels.filter((p) => p.properties.id !== id),
        ...newParcels,
      ],
    })),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error, isLoading: false }),

  // Selectors
  getParcelById: (id) => get().parcels.find((p) => p.properties.id === id),

  getParcelsByIds: (ids) =>
    get().parcels.filter((p) => ids.includes(p.properties.id)),

  getParcelsByType: (type) =>
    get().parcels.filter((p) => p.properties.parcelType === type),
}));
