// In context/AuthContext.tsx
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebaseConfig'; // Adjust the path if necessary

// Define the shape of the context data
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

/**
 * Custom hook to use the AuthContext.
 * This makes it easier to access the user and loading state from any component.
 * e.g., const { user, isLoading } = useAuth();
 */
export const useAuth = () => {
  return useContext(AuthContext);
};

/**
 * The AuthProvider component that will wrap your entire application.
 * It listens to Firebase's authentication state changes and provides the user
 * data to its children.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      // When the auth state changes (login/logout), update our state
      setUser(currentUser);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const value = {
    user,
    isLoading,
  };

  // Provide the user and loading state to the rest of the app
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};