// In context/AuthContext.tsx
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { createContext, useContext, useEffect, useState } from 'react';
// This import path must be correct
import { auth } from '../services/firebase';

// --- START DIAGNOSTIC LOGS ---
console.log("--- AuthContext File Loaded ---");
console.log("Is 'auth' object imported successfully?", auth ? "Yes, it exists." : "No, it is UNDEFINED!");
if (auth) {
  console.log("Does auth object have onAuthStateChanged function?", typeof auth.onAuthStateChanged === 'function' ? "Yes" : "No, it's missing!");
}
// --- END DIAGNOSTIC LOGS ---

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This try/catch will give us a more specific error if the function call itself fails
    try {
      console.log("Attempting to call onAuthStateChanged...");
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        console.log("Auth state has changed. Current user:", currentUser ? currentUser.uid : null);
        setUser(currentUser);
        setIsLoading(false);
      });
      return () => unsubscribe();
    } catch (e) {
      console.error("!!! CRITICAL ERROR calling onAuthStateChanged:", e);
    }
  }, []);

  const value = {
    user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

