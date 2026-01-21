import { create } from 'zustand';
import * as XLSX from 'xlsx';
import type { RORRecord, RORState } from '../types/ror';

interface RORStoreActions {
  loadFromFile: (file: File) => Promise<void>;
  loadFromUrl: (url: string) => Promise<void>;
  setSearchQuery: (query: string) => void;
  selectLpNumber: (lpNumber: number | null) => void;
  getFilteredRecords: () => RORRecord[];
  getRecordByLpNumber: (lpNumber: number) => RORRecord | undefined;
  clearRecords: () => void;
}

type RORStore = RORState & RORStoreActions;

// Convert acres to other units
const acresToHectares = (acres: number) => acres * 0.404686;
const acresToSqm = (acres: number) => acres * 4046.86;

// Parse XLSX row to RORRecord
// The XLSX has mixed Telugu/English headers with newlines
function parseRow(row: any): RORRecord | null {
  // Try different column name variations - including newlines and mixed formats
  const lpNumber =
    row['LP Number'] ||
    row['LP\nNumber'] ||
    row['lp_no'] ||
    row['LP_Number'] ||
    row['lpNumber'];

  const extentAcres =
    row['LP Extent'] ||
    row['L.P Extent (Acres-Cents)'] ||
    row['extent_ac'] ||
    row['LP_Extent'] ||
    row['Extent (Acres)'];

  if (!lpNumber || !extentAcres) return null;

  // Skip header rows (non-numeric LP numbers)
  const lpNum = parseInt(lpNumber);
  if (isNaN(lpNum) || lpNum <= 0) return null;

  const acres = parseFloat(extentAcres) || 0;

  return {
    lpNumber: lpNum,
    extentAcres: acres,
    extentHectares: acresToHectares(acres),
    extentSqm: acresToSqm(acres),
    ulpin: row['ULPIN'] || row['ulpin'] || undefined,
    oldSurveyNumber: row['Old Survey Number'] || row['old_survey_no'] || undefined,
    landType: row['Land Type'] || row['land_type'] || undefined,
    ownerName: row['Owner'] || row['owner_name'] || undefined,
    village: row['Village'] || row['village'] || undefined,
  };
}

export const useRORStore = create<RORStore>((set, get) => ({
  // Initial state
  records: [],
  isLoading: false,
  error: null,
  searchQuery: '',
  selectedLpNumber: null,

  // Load from File object (for file input)
  loadFromFile: async (file: File) => {
    set({ isLoading: true, error: null });

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const records: RORRecord[] = [];
      for (const row of jsonData) {
        const record = parseRow(row);
        if (record) records.push(record);
      }

      set({ records, isLoading: false });
      console.log(`Loaded ${records.length} ROR records from file`);
    } catch (err) {
      console.error('Error loading ROR file:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to load ROR file', isLoading: false });
    }
  },

  // Load from URL (for pre-bundled data)
  loadFromUrl: async (url: string) => {
    set({ isLoading: true, error: null });
    console.log('[ROR] Starting load from URL:', url);

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

      const arrayBuffer = await response.arrayBuffer();
      console.log('[ROR] Fetched', arrayBuffer.byteLength, 'bytes');

      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Parse as raw arrays to handle the header structure
      const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      console.log('[ROR] Parsed', rawData.length, 'rows');

      // Find the header row (contains "LP" somewhere)
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, rawData.length); i++) {
        const row = rawData[i];
        if (row && row.some((cell: any) => String(cell).includes('LP') && String(cell).includes('Number'))) {
          headerRowIndex = i;
          break;
        }
      }

      if (headerRowIndex === -1) {
        throw new Error('Could not find header row with LP Number column');
      }

      const headers = rawData[headerRowIndex];
      console.log('[ROR] Found headers at row', headerRowIndex, ':', headers.slice(0, 5));

      // Find column indices
      const lpNumberCol = headers.findIndex((h: any) => String(h).includes('LP') && String(h).includes('Number'));
      const extentCol = headers.findIndex((h: any) => String(h).includes('Extent'));
      const ulpinCol = headers.findIndex((h: any) => String(h).toUpperCase().includes('ULPIN'));

      console.log('[ROR] Column indices - LP:', lpNumberCol, 'Extent:', extentCol, 'ULPIN:', ulpinCol);

      // Parse data rows (skip header and any sub-header rows)
      const records: RORRecord[] = [];
      for (let i = headerRowIndex + 2; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const lpNumber = parseInt(row[lpNumberCol]);
        const extentAcres = parseFloat(row[extentCol]);

        if (isNaN(lpNumber) || lpNumber <= 0 || isNaN(extentAcres)) continue;

        records.push({
          lpNumber,
          extentAcres,
          extentHectares: acresToHectares(extentAcres),
          extentSqm: acresToSqm(extentAcres),
          ulpin: ulpinCol >= 0 ? String(row[ulpinCol] || '') : undefined,
        });
      }

      console.log('[ROR] Parsed', records.length, 'valid records');
      set({ records, isLoading: false });
    } catch (err) {
      console.error('[ROR] Error loading from URL:', err);
      set({ error: err instanceof Error ? err.message : 'Failed to load ROR data', isLoading: false });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  selectLpNumber: (lpNumber: number | null) => set({ selectedLpNumber: lpNumber }),

  getFilteredRecords: () => {
    const { records, searchQuery } = get();
    if (!searchQuery.trim()) return records;

    const query = searchQuery.toLowerCase().trim();
    return records.filter((r) =>
      r.lpNumber.toString().includes(query) ||
      r.oldSurveyNumber?.toLowerCase().includes(query) ||
      r.landType?.toLowerCase().includes(query)
    );
  },

  getRecordByLpNumber: (lpNumber: number) => {
    return get().records.find((r) => r.lpNumber === lpNumber);
  },

  clearRecords: () => set({ records: [], searchQuery: '', selectedLpNumber: null }),
}));
