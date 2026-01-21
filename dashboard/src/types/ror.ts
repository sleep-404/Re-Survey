/**
 * ROR (Record of Rights) data types
 * Based on Nibhanupudi-annonymized ROR.xlsx structure
 */

export interface RORRecord {
  lpNumber: number;           // LP Number (official parcel ID)
  extentAcres: number;        // LP Extent in acres
  extentHectares: number;     // Calculated from acres
  extentSqm: number;          // Calculated from acres
  ulpin?: string;             // Unique Land Parcel Identification Number
  oldSurveyNumber?: string;   // Old Survey Number
  landType?: string;          // Land classification
  ownerName?: string;         // Owner name (anonymized)
  village?: string;           // Village name
}

export interface RORState {
  records: RORRecord[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedLpNumber: number | null;
}
