// --- Step 1: We import the raw data directly from your new JSON file ---
import rawStationData from './stations.json';

// This part defines the "shape" of our station data.
// It tells the app what each station object should look like.
export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  // We'll add default values for these properties for now
  connectorType: 'CCS-2' | 'CHAdeMO' | 'Type 2 AC' | 'Unknown';
  isAvailable: boolean;
  type: 'fast' | 'slow' | 'swap';
  power: number;
  status: 'available' | 'occupied' | 'maintenance';
  services?: string[];
  distance?: number; // Added for dynamic distance calculation
}

// --- Step 2: This function processes the raw data from your JSON ---
// It cleans up the data and prepares it for the map.
function processRawData(rawData: any[]): Station[] {
  // We filter out any stations that are missing location data
  const validStations = rawData.filter(station => station.lattitude && station.longitude);

  return validStations.map((station, index) => ({
    id: String(index + 1), // Create a simple, unique ID
    name: station.name || 'Unknown Station',
    address: station.address || 'Address not available',
    // The map needs latitude and longitude to be numbers, not text.
    // parseFloat() converts the text from your file into a number.
    latitude: parseFloat(station.lattitude),
    longitude: parseFloat(station.longitude),
    // We add default values for these properties
    connectorType: 'Unknown',
    isAvailable: true,
    type: 'fast', // default type
    power: 50, // default power in kW
    status: 'available', // default status
    services: [], // default services
  }));
}

// --- Step 3: We process the raw data and export the final, clean list ---
// The rest of your app will use this 'mockStations' list.
export const mockStations: Station[] = processRawData(rawStationData);

