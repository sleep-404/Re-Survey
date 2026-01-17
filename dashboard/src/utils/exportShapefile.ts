import shpwrite from '@mapbox/shp-write';
import proj4 from 'proj4';
import type { ParcelFeature } from '../types';

// Define EPSG:32644 (UTM zone 44N) projection
// Used for Andhra Pradesh survey data
proj4.defs(
  'EPSG:32644',
  '+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs +type=crs'
);

/**
 * Transforms a coordinate from WGS84 (EPSG:4326) to UTM zone 44N (EPSG:32644)
 */
function transformToUTM(coord: number[]): number[] {
  return proj4('EPSG:4326', 'EPSG:32644', coord);
}

/**
 * Transforms all coordinates in a polygon from WGS84 to UTM
 */
function transformPolygon(coordinates: number[][][]): number[][][] {
  return coordinates.map((ring) =>
    ring.map((coord) => transformToUTM(coord))
  );
}

/**
 * Exports parcels as a shapefile (ZIP archive containing .shp, .dbf, .shx, .prj files)
 *
 * @param parcels Array of parcel features to export
 * @param filename Base filename for the export (without extension)
 */
export async function exportShapefile(
  parcels: ParcelFeature[],
  filename: string = 'parcels_export'
): Promise<void> {
  if (parcels.length === 0) {
    throw new Error('No parcels to export');
  }

  // Transform features to UTM coordinates and prepare properties
  const transformedFeatures = parcels.map((parcel) => {
    if (parcel.geometry.type !== 'Polygon') {
      console.warn(`Skipping non-polygon feature: ${parcel.properties.id}`);
      return null;
    }

    return {
      type: 'Feature' as const,
      geometry: {
        type: 'Polygon' as const,
        coordinates: transformPolygon(parcel.geometry.coordinates),
      },
      properties: {
        id: parcel.properties.id,
        parcelType: parcel.properties.parcelType,
        area: parcel.properties.area || 0,
        originalId: parcel.properties.originalId || '',
      },
    };
  }).filter(Boolean);

  // Create GeoJSON FeatureCollection
  const geojson = {
    type: 'FeatureCollection' as const,
    features: transformedFeatures,
  };

  // Generate shapefile options
  const options = {
    folder: filename,
    filename: filename,
    outputType: 'blob' as const,
    compression: 'DEFLATE' as const,
    // Include projection file for EPSG:32644
    prj: `PROJCS["WGS 84 / UTM zone 44N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",81],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","32644"]]`,
  };

  try {
    // Generate the shapefile
    const content = await shpwrite.zip(geojson, options);

    // Create download link
    const blob = content as Blob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    console.log(`Exported ${parcels.length} parcels to ${filename}.zip`);
  } catch (error) {
    console.error('Failed to export shapefile:', error);
    throw new Error('Failed to generate shapefile. Please try again.');
  }
}

/**
 * Exports only selected parcels as a shapefile
 */
export async function exportSelectedParcels(
  parcels: ParcelFeature[],
  selectedIds: string[],
  filename: string = 'selected_parcels'
): Promise<void> {
  const selectedParcels = parcels.filter((p) =>
    selectedIds.includes(p.properties.id)
  );

  if (selectedParcels.length === 0) {
    throw new Error('No parcels selected for export');
  }

  return exportShapefile(selectedParcels, filename);
}
