import { onAuthStateChanged, signOut, User } from 'firebase/auth';
// --- MODIFICATION: Added updateDoc ---
import { doc, DocumentData, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';

// --- NEW INTERFACE ---
export interface VehicleState {
  currentSOC: number; // Stored as 0-100
  lastUpdated: string; // ISO 8601 string
}

export interface UserProfile extends DocumentData {
  uid: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: 'user' | 'admin';
  vehicle?: {
    make: string;
    model: string;
    batteryCapacityKWh: number;
    realWorldRangeKm: number;
  };
  // --- NEW FIELD ---
  vehicleState?: VehicleState;
}

type AuthState = {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
};

interface AuthContextType extends AuthState {
  onLogout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  // --- NEW FUNCTION ---
  updateVehicleState: (newState: Partial<VehicleState>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: true,
  onLogout: async () => {},
  refreshUserProfile: async () => {},
  // --- NEW FUNCTION DEFAULT ---
  updateVehicleState: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        await currentUser.reload();

        if (currentUser.emailVerified) {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
              const profileData = { uid: currentUser.uid, ...userDoc.data() } as UserProfile;
              
              // --- MODIFICATION: Ensure vehicleState is initialized if it's missing ---
              // This is a safety net in case vehicle creation failed to set it.
              let finalProfileData = profileData;
              if (profileData.vehicle && !profileData.vehicleState) {
                console.warn("AuthContext: User has vehicle but no vehicleState. Initializing.");
                finalProfileData = {
                  ...profileData,
                  vehicleState: {
                    currentSOC: 100,
                    lastUpdated: new Date().toISOString(),
                  },
                };
                // Asynchronously update this in Firestore so it's fixed for next time
                updateDoc(userDocRef, {
                  vehicleState: finalProfileData.vehicleState
                }).catch(err => console.error("Failed to auto-init vehicleState:", err));
              }

              setAuthState({
                user: currentUser,
                userProfile: finalProfileData, // Use the potentially modified data
                isAuthenticated: true,
                isLoading: false,
              });
            } else {
              setAuthState({ user: null, userProfile: null, isAuthenticated: false, isLoading: false });
              signOut(auth);
            }
          });
          return () => unsubscribeSnapshot();
        } else {
          setAuthState({
            user: currentUser,
            userProfile: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } else {
        setAuthState({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const refreshUserProfile = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await currentUser.reload();
      if (currentUser.emailVerified) {
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const profileData = { uid: currentUser.uid, ...userDoc.data() } as UserProfile;
          setAuthState(prevState => ({ 
            ...prevState, 
            user: currentUser, 
            userProfile: profileData, 
            isAuthenticated: true 
          }));
        }
      }
    }
  };

  // --- NEW FUNCTION IMPLEMENTATION ---
  /**
   * Updates the vehicle's state in both React context and Firestore.
   */
  const updateVehicleState = async (newState: Partial<VehicleState>) => {
    const currentUser = auth.currentUser;
    if (!currentUser || !authState.userProfile) {
      console.error("Cannot update vehicle state: no user found.");
      return;
    }

    // 1. Optimistically update local React state for instant UI response
    const newVehicleState: VehicleState = {
      ...authState.userProfile.vehicleState!,
      ...newState,
      lastUpdated: new Date().toISOString(), // Always update timestamp
    };

    setAuthState(prevState => ({
      ...prevState,
      userProfile: {
        ...prevState.userProfile!,
        vehicleState: newVehicleState,
      },
    }));

    // 2. Asynchronously update Firestore
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userDocRef, {
        vehicleState: newVehicleState
      });
    } catch (error) {
      console.error("Failed to update vehicle state in Firestore:", error);
      // Optional: Add logic to revert local state or show an error
    }
  };


  const value = {
    ...authState,
    onLogout,
    refreshUserProfile,
    // --- NEW FUNCTION EXPORT ---
    updateVehicleState,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};