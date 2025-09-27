export interface Vehicle {
  id: string;
  make: string;
  model: string;
  batteryCapacityKWh: number; // in kilowatt-hours
  realWorldRangeKm: number; // conservative real-world range
}

// Your new, expanded list of popular EVs in India
export const vehicleData: Vehicle[] = [
  { id: '1', make: 'Tata', model: 'Nexon EV (Prime)', batteryCapacityKWh: 30.2, realWorldRangeKm: 250 },
  { id: '2', make: 'Tata', model: 'Nexon EV (Max)', batteryCapacityKWh: 40.5, realWorldRangeKm: 350 },
  { id: '3', make: 'Tata', model: 'Tiago EV', batteryCapacityKWh: 24, realWorldRangeKm: 260 },
  { id: '4', make: 'MG', model: 'ZS EV', batteryCapacityKWh: 50.3, realWorldRangeKm: 400 },
  { id: '5', make: 'Hyundai', model: 'Kona Electric', batteryCapacityKWh: 39.2, realWorldRangeKm: 340 },
  { id: '6', make: 'Mahindra', model: 'XUV400', batteryCapacityKWh: 39.4, realWorldRangeKm: 360 },
  { id: '7', make: 'Tata', model: 'Punch EV', batteryCapacityKWh: 25, realWorldRangeKm: 315 },
  { id: '8', make: 'Tata', model: 'Harrier EV', batteryCapacityKWh: 60, realWorldRangeKm: 500 },
  { id: '9', make: 'Tata', model: 'Tigor EV', batteryCapacityKWh: 26, realWorldRangeKm: 306 },
  { id: '10', make: 'MG', model: 'Comet EV', batteryCapacityKWh: 17.3, realWorldRangeKm: 200 },
  { id: '11', make: 'BYD', model: 'Atto 3', batteryCapacityKWh: 60.5, realWorldRangeKm: 420 },
  { id: '12', make: 'BYD', model: 'e6', batteryCapacityKWh: 71.7, realWorldRangeKm: 500 },
  { id: '13', make: 'Kia', model: 'EV6', batteryCapacityKWh: 77.4, realWorldRangeKm: 500 },
  { id: '14', make: 'Citroen', model: 'eC3', batteryCapacityKWh: 29.2, realWorldRangeKm: 320 },
  { id: '15', make: 'Volvo', model: 'EX30', batteryCapacityKWh: 64, realWorldRangeKm: 480 },
  { id: '16', make: 'Mahindra', model: 'BE 6', batteryCapacityKWh: 59, realWorldRangeKm: 535 },
  { id: '17', make: 'Mahindra', model: 'XEV 9e', batteryCapacityKWh: 59, realWorldRangeKm: 542 },
  { id: '18', make: 'Hyundai', model: 'Ioniq 5', batteryCapacityKWh: 72.6, realWorldRangeKm: 480 },
  { id: '19', make: 'MG', model: 'M9 EV', batteryCapacityKWh: 90, realWorldRangeKm: 650 },
  { id: '20', make: 'BMW', model: 'iX1', batteryCapacityKWh: 66.4, realWorldRangeKm: 440 },
  { id: '21', make: 'Hyundai', model: 'Creta EV', batteryCapacityKWh: 45, realWorldRangeKm: 400 },
  { id: '22', make: 'Tata', model: 'Curvv EV', batteryCapacityKWh: 60, realWorldRangeKm: 500 },
  { id: '23', make: 'Maruti Suzuki', model: 'e-Vitara', batteryCapacityKWh: 49, realWorldRangeKm: 500 },
  { id: '24', make: 'Mahindra', model: 'XUV.e9', batteryCapacityKWh: 80, realWorldRangeKm: 600 },
  { id: '25', make: 'Mercedes-Benz', model: 'EQS 580', batteryCapacityKWh: 107.8, realWorldRangeKm: 600 }
];

