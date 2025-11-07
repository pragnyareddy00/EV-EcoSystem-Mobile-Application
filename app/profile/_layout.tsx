import { Stack, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native'; // Using Lucide to match your profile screen
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { COLORS } from '../../constants/colors';

export default function ProfileStackLayout() {
  const router = useRouter();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: COLORS.backgroundCard,
        },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // This function creates your custom back button
        headerLeft: () => (
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ marginLeft: 10, padding: 4 }} // Added padding for easier tap
          >
            <ArrowLeft size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        ),
      }}
    >
      <Stack.Screen
        name="edit-profile"
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="my-vehicle"
        options={{ title: 'My Vehicle' }}
      />
      <Stack.Screen
        name="app-settings"
        options={{ title: 'App Settings' }}
      />
      <Stack.Screen
        name="contribute-station"
        options={{ title: 'Contribute Station' }}
      />
      
      {/* --- NEW SCREEN --- */}
      {/* This screen will open as a modal */}
      <Stack.Screen
        name="vehicle-status"
        options={{ 
          title: 'Vehicle Status',
          presentation: 'modal',
          headerShown: false, // We use a custom header in the file
        }} 
      />
    </Stack>
  );
}