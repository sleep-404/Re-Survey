import type { ParcelType } from '../types';

export interface ParcelTypeConfig {
  type: ParcelType;
  label: string;
  shortcut: string;        // Keyboard shortcut (1-8)
  borderColor: string;     // Hex color for polygon border
  fillColor: string;       // Hex color for polygon fill
  fillOpacity: number;     // Fill opacity (0-1)
  description: string;     // Help text
}

export const PARCEL_TYPES: Record<ParcelType, ParcelTypeConfig> = {
  agricultural: {
    type: 'agricultural',
    label: 'Agricultural',
    shortcut: '1',
    borderColor: '#f97316', // orange-500
    fillColor: '#f97316',
    fillOpacity: 0,
    description: 'Farm land with visible bunds',
  },
  gramakantam: {
    type: 'gramakantam',
    label: 'Gramakantam',
    shortcut: '2',
    borderColor: '#eab308', // yellow-500
    fillColor: '#eab308',
    fillOpacity: 0.1,
    description: 'Abadi/habitation area outer boundary',
  },
  building: {
    type: 'building',
    label: 'Building',
    shortcut: '3',
    borderColor: '#ef4444', // red-500
    fillColor: '#ef4444',
    fillOpacity: 0.2,
    description: 'Building footprint',
  },
  road: {
    type: 'road',
    label: 'Road',
    shortcut: '4',
    borderColor: '#6b7280', // gray-500
    fillColor: '#6b7280',
    fillOpacity: 0.3,
    description: 'Road polygon (double-line)',
  },
  water_body: {
    type: 'water_body',
    label: 'Water Body',
    shortcut: '5',
    borderColor: '#3b82f6', // blue-500
    fillColor: '#3b82f6',
    fillOpacity: 0.2,
    description: 'Tank, pond, or canal',
  },
  open_space: {
    type: 'open_space',
    label: 'Open Space',
    shortcut: '6',
    borderColor: '#22c55e', // green-500
    fillColor: '#22c55e',
    fillOpacity: 0.1,
    description: 'Open space within Gramakantam',
  },
  compound: {
    type: 'compound',
    label: 'Compound',
    shortcut: '7',
    borderColor: '#a855f7', // purple-500
    fillColor: '#a855f7',
    fillOpacity: 0.15,
    description: 'Compound wall boundary',
  },
  government_land: {
    type: 'government_land',
    label: 'Government Land',
    shortcut: '8',
    borderColor: '#14b8a6', // teal-500
    fillColor: '#14b8a6',
    fillOpacity: 0.15,
    description: 'Government-owned parcel',
  },
  unclassified: {
    type: 'unclassified',
    label: 'Unclassified',
    shortcut: '0',
    borderColor: '#9ca3af', // gray-400
    fillColor: '#9ca3af',
    fillOpacity: 0.05,
    description: 'Not yet classified',
  },
};

// Get config by shortcut key
export function getParcelTypeByShortcut(key: string): ParcelType | null {
  const entry = Object.values(PARCEL_TYPES).find((config) => config.shortcut === key);
  return entry?.type ?? null;
}

// Ordered list for UI display (excluding unclassified)
export const PARCEL_TYPE_ORDER: ParcelType[] = [
  'agricultural',
  'gramakantam',
  'building',
  'road',
  'water_body',
  'open_space',
  'compound',
  'government_land',
];

// Selection and hover colors
export const SELECTION_COLORS = {
  selected: {
    borderColor: '#06b6d4', // cyan-500
    fillColor: '#06b6d4',
    fillOpacity: 0.15,
  },
  multiSelected: {
    borderColor: '#06b6d4',
    borderDash: [4, 4], // Dashed border for multi-selection
    fillColor: '#06b6d4',
    fillOpacity: 0.1,
  },
  hovered: {
    borderWidth: 3,
    fillOpacity: 0.1,
  },
};

// Topology error visualization
export const ERROR_COLORS = {
  overlap: {
    fillColor: '#ef4444', // red-500
    fillOpacity: 0.4,
    pattern: 'crosshatch',
  },
  gap: {
    fillColor: '#3b82f6', // blue-500
    fillOpacity: 0.4,
    pattern: 'diagonal',
  },
};
