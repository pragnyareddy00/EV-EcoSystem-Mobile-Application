// app/_layout.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Slot, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged, User } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { auth } from '../config/firebaseConfig'; // Correct path based on your structure

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const checkOnboardingAndAuth = async () => {
      const onboarded = await AsyncStorage.getItem('hasOnboarded');
      setHasOnboarded(onboarded === 'true');

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return unsubscribe;
    };
    checkOnboardingAndAuth();
  }, []);

  useEffect(() => {
    if (loading || hasOnboarded === null) return;


    if (!hasOnboarded) {
      router.replace('./onboarding');
    } else if (!user) {
      router.replace('./login');
    } else {
      router.replace('./home');
    }
  }, [loading, user, hasOnboarded]);

  if (loading || hasOnboarded === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' }}>
        <ActivityIndicator size="large" color="#00C6FF" />
      </View>
    );
  }

  return <Slot />; // Renders the current child route
}