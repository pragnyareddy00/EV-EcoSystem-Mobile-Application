// app/(auth)/_layout.tsx
import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    // This Stack navigator manages the screens in the (auth) group.
    <Stack>
      {/* The login screen is the initial screen in this stack. */}
      <Stack.Screen name="login" options={{ headerShown: false }} />
      
      {/* This is the new signup screen. */}
      <Stack.Screen name="signup" options={{ headerShown: false }} />

      {/* The old "otp" screen is now removed. */}
    </Stack>
  );
}
