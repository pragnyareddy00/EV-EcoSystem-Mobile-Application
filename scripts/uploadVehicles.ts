// This is a one-time use script to upload your local vehicle data to Firestore.
// You can run this from your terminal using ts-node:
// npx ts-node ./scripts/uploadVehicles.ts

import { addDoc, collection } from 'firebase/firestore';
import { vehicleData } from '../constants/vehicles'; // Your local vehicle data
import { db } from '../services/firebase'; // Adjust this path if your firebase.ts is elsewhere

async function uploadVehicles() {
  console.log('Starting vehicle data upload to Firestore...');
  
  const vehiclesCollectionRef = collection(db, 'vehicles');
  let successCount = 0;
  let errorCount = 0;

  for (const vehicle of vehicleData) {
    try {
      // We don't need to spread, as the object is already in the correct format
      await addDoc(vehiclesCollectionRef, vehicle);
      console.log(`Successfully added: ${vehicle.make} ${vehicle.model}`);
      successCount++;
    } catch (error) {
      console.error(`Error adding ${vehicle.make} ${vehicle.model}:`, error);
      errorCount++;
    }
  }

  console.log('--- Upload Complete ---');
  console.log(`Successfully uploaded ${successCount} vehicles.`);
  console.log(`Failed to upload ${errorCount} vehicles.`);
  console.log('You can now remove or comment out the call to this script.');
}

// Run the upload function
uploadVehicles().then(() => {
  console.log('Script finished.');
}).catch(console.error);