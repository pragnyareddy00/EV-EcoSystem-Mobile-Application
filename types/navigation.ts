// types/navigation.ts

export interface Coordinate {
    latitude: number;
    longitude: number;
}

export interface LatLng {
    lat: number;
    lng: number;
}

export interface Distance {
    text: string;
    value: number;
}

export interface Duration {
    text: string;
    value: number;
}

export interface Polyline {
    points: string;
}

export interface RouteStep {
    distance: Distance;
    duration: Duration;
    end_location: LatLng;
    start_location: LatLng;
    html_instructions: string;
    maneuver?: string;
    polyline: Polyline;
    travel_mode: string;
}

export interface RouteLeg {
    distance: Distance;
    duration: Duration;
    end_address: string;
    end_location: LatLng;
    start_address: string;
    start_location: LatLng;
    steps: RouteStep[];
    traffic_speed_entry: any[];
    via_waypoint: any[];
}

export interface Route {
    bounds: {
        northeast: LatLng;
        southwest: LatLng;
    };
    copyrights: string;
    legs: RouteLeg[];
    overview_polyline: Polyline;
    summary: string;
    warnings: string[];
    waypoint_order: number[];
}

export interface NavigationState {
    currentStep: number;
    isNavigating: boolean;
    isPaused: boolean;
    currentLocation: Coordinate;
    heading?: number;
}

export interface Station {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    type: string;
    power: string;
    status: string;
}