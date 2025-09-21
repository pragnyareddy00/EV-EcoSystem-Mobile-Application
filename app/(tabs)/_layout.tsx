// In app/(tabs)/_layout.tsx
import { Ionicons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { auth } from '../../config/firebaseConfig'; // Adjust path if needed

export default function TabsLayout() {
  const handleSignOut = () => {
    auth.signOut();
  };

  return (
    <Stack>
      <Stack.Screen
        name="home"
        options={{
          title: 'EVOS Home',
          headerRight: () => (
            <TouchableOpacity onPress={handleSignOut} style={{ marginRight: 15 }}>
              <Ionicons name="log-out-outline" size={24} color="black" />
            </TouchableOpacity>
          ),
        }}
      />
      {/* You can add more screens for your main app here */}
    </Stack>
  );
}