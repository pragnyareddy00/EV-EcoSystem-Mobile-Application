import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, DocumentData, getDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';

export interface UserProfile extends DocumentData {
  uid: string;
  username: string;
  email: string;
  phoneNumber: string;
  role?: 'user' | 'admin';  // Added role field
  vehicle?: {
    make: string;
    model: string;
    batteryCapacityKWh: number;
    realWorldRangeKm: number;
  };
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  refreshUserProfile: () => Promise<void>;
  onLogout: () => Promise<void>;
}

// --- THIS LINE HAS BEEN FIXED ---
// The type is now correctly spelled as "AuthContextType"
const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isLoading: true,
  refreshUserProfile: async () => {}, // Provide a default empty function
  onLogout: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (currentUser: User | null) => {
    if (currentUser) {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setUserProfile({ uid: currentUser.uid, ...userDoc.data() } as UserProfile);
      }
    } else {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      await fetchUserProfile(currentUser);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const refreshUserProfile = async () => {
    if (user) {
      await fetchUserProfile(user);
    }
  };

  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const value = {
    user,
    userProfile,
    isLoading,
    refreshUserProfile,
    onLogout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

