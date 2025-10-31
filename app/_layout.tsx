import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../constants/colors';
import { AuthProvider, useAuth } from '../context/AuthContext';

// This is the "smarter" navigation logic that fixes the redirect bug
function RootLayoutNav() {
  // --- THIS IS THE FIX ---
  // We destructure the properties directly from useAuth(), not from a nested 'authState' object.
  const { user, userProfile, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments(); // Gets the current path, e.g., ['(tabs)', 'home']

  useEffect(() => {
    if (isLoading) return; // Wait until auth state is known

    const inAuthGroup = segments[0] === '(auth)';
    const inAppGroup = segments[0] === '(tabs)' || segments[0] === 'profile';

    // --- UPDATED LOGIC ---
    // Check if user is fully logged in and verified
    if (isAuthenticated && userProfile) {
      // If they are authenticated but still on an auth screen, send them to home.
      if (inAuthGroup) {
        router.replace('/(tabs)/home');
      }
    } 
    // Check if user is logged in but needs to verify email
    else if (user && !user.emailVerified) {
      // If they are not on the verification screen, send them there.
      if (segments[1] !== 'verify-email') {
        router.replace('/(auth)/verify-email');
      }
    } 
    // User is not logged in at all
    else if (!user) {
      // If they are anywhere inside the app, send them to login.
      if (inAppGroup) {
        router.replace('/(auth)/login');
      }
    }
  }, [isAuthenticated, user, userProfile, isLoading, segments]); // Re-run when any of these change

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // This <Stack> navigator is the correct setup for your app
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen 
        name="profile" 
        options={{ 
          presentation: 'modal', 
        }} 
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}

