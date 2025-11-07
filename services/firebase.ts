// services/firebase.ts
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import {
  addDoc,
  collection,
  doc,
  getDocs,
  getFirestore,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
// --- ADD THIS IMPORT ---
// We need storage for the contribution image uploads
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

const db = getFirestore(app);
// --- ADD THIS LINE ---
const storage = getStorage(app);

// --- NEW FUNCTION: Get dashboard counts ---
export const getContributionCounts = async () => {
  const contributionsRef = collection(db, 'userContributions');
  
  // Get 'Today's' date at midnight
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const startOfTodayTimestamp = Timestamp.fromDate(startOfDay);

  // Create queries
  const pendingQuery = query(contributionsRef, where('status', '==', 'pending'));
  const approvedQuery = query(contributionsRef, where('status', '==', 'approved'));
  const rejectedQuery = query(contributionsRef, where('status', '==', 'rejected'));
  const todayQuery = query(contributionsRef, where('submittedAt', '>=', startOfTodayTimestamp));

  // Fetch all counts in parallel
  const [pendingSnapshot, approvedSnapshot, rejectedSnapshot, todaySnapshot] = await Promise.all([
    getDocs(pendingQuery),
    getDocs(approvedQuery),
    getDocs(rejectedQuery),
    getDocs(todayQuery),
  ]);

  return {
    pending: pendingSnapshot.size,
    approved: approvedSnapshot.size,
    rejected: rejectedSnapshot.size,
    today: todaySnapshot.size,
  };
};

// --- NEW FUNCTION: Approve a contribution ---
export const approveContribution = async (contribution: any) => {
  if (!contribution || !contribution.id) {
    throw new Error('Invalid contribution data');
  }

  // 1. Create a new public station document from the contribution
  const newStationData = {
    name: contribution.stationName,
    address: contribution.address,
    location: contribution.location, // GeoPoint
    latitude: contribution.latitude,
    longitude: contribution.longitude,
    photoURL: contribution.photoURL,
    status: 'available', // Default status for a new station
    isAvailable: true,
    type: 'pending', // Admin can edit this later
    power: '0', // Admin can edit this later
    connectorType: 'Unknown', // Admin can edit this later
    services: [],
    addedBy: contribution.submittedBy_uid,
    createdAt: serverTimestamp(),
  };

  await addDoc(collection(db, 'stations'), newStationData);

  // 2. Update the contribution document's status to 'approved'
  const contributionRef = doc(db, 'userContributions', contribution.id);
  await updateDoc(contributionRef, {
    status: 'approved',
    updatedAt: serverTimestamp(),
  });
};

// --- NEW FUNCTION: Reject a contribution ---
export const rejectContribution = async (contributionId: string) => {
  if (!contributionId) {
    throw new Error('Invalid contribution ID');
  }
  const contributionRef = doc(db, 'userContributions', contributionId);
  await updateDoc(contributionRef, {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  });
};

// --- UPDATE THE EXPORT ---
// We now export auth, db, AND storage
export { auth, db, storage };

