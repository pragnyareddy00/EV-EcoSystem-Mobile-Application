// This interface defines the structure of a station in our application
export interface Station {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  connectorType: string;
  isAvailable: boolean;
  type: string;
  power: number;
  status: 'available' | 'busy' | 'offline';
  services?: string[];
  city: string;
  state: string;
  createdAt?: string;
  distance?: number; // For dynamic distance calculation
}

