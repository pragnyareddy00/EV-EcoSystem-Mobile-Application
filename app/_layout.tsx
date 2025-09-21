// In app/_layout.tsx
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
// Import AuthProvider and useAuth from their correct paths
import { AuthProvider, useAuth } from '../context/AuthContext';

const InitialLayout = () => {
  const { user, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // If loading, don't do anything yet
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // If the user is not signed in and the initial segment is not '(auth)',
      // redirect them to the login page.
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // If the user is signed in and is in the auth group (e.g., on the login page),
      // redirect them to the home page.
      router.replace('/(tabs)/home');
    }
  }, [user, isLoading, segments]);

  // While checking for user, show a loading screen
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Render the current screen
  return <Slot />;
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <InitialLayout />
    </AuthProvider>
  );
}