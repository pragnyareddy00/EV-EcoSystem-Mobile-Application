import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, DocumentData, getDoc, onSnapshot } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../services/firebase';

// This UserProfile type is now the single source of truth for what a user's data looks like.
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
}

// The AuthState will now tell the app if the user is logged out, needs to verify, or is fully authenticated.
type AuthState = {
  user: User | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean; // True only if logged in AND verified
  isLoading: boolean;
};

// The ContextType now includes the AuthState and the functions
interface AuthContextType extends AuthState {
  onLogout: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  isAuthenticated: false,
  isLoading: true,
  onLogout: async () => {},
  refreshUserProfile: async () => {},
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  // All auth state is now managed in a single object
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // --- This is the new, smarter logic ---
  useEffect(() => {
    // onAuthStateChanged is the core Firebase listener for authentication status.
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        // 1. Always get the latest user data from Firebase.
        await currentUser.reload();

        // 2. Check if the user's email has been verified.
        if (currentUser.emailVerified) {
          // 3. If verified, listen for real-time profile updates from Firestore.
          const userDocRef = doc(db, 'users', currentUser.uid);
          // onSnapshot provides real-time updates (e.g., if a role changes).
          const unsubscribeSnapshot = onSnapshot(userDocRef, (userDoc) => {
            if (userDoc.exists()) {
              const profileData = { uid: currentUser.uid, ...userDoc.data() } as UserProfile;
              // User is fully authenticated and has a profile.
              setAuthState({
                user: currentUser,
                userProfile: profileData,
                isAuthenticated: true, // They are fully authenticated
                isLoading: false,
              });
            } else {
              // This is a rare case where the auth user exists but has no profile document.
              // Treat them as unauthenticated and force a logout.
              setAuthState({ user: null, userProfile: null, isAuthenticated: false, isLoading: false });
              signOut(auth);
            }
          });
          return () => unsubscribeSnapshot(); // Clean up the profile listener
        } else {
          // 4. If not verified, the user is logged in but not fully authenticated.
          // The app will use this state to show the 'verify-email' screen.
          setAuthState({
            user: currentUser,
            userProfile: null,
            isAuthenticated: false, // They are NOT fully authenticated yet
            isLoading: false,
          });
        }
      } else {
        // 5. If there is no user, they are logged out.
        setAuthState({
          user: null,
          userProfile: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    });

    return () => unsubscribe(); // Clean up the auth listener
  }, []);

  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // This function allows screens like 'Edit Profile' to force a data refresh
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

  // Provide the state and functions to the app
  const value = {
    ...authState,
    onLogout,
    refreshUserProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

