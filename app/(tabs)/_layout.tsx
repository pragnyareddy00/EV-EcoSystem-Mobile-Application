import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

export default function TabsLayout() {
  const { userProfile, isLoading } = useAuth();
  
  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }
  
  const isAdmin = userProfile?.role === 'admin';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarStyle: {
          backgroundColor: COLORS.white,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          height: 60,
          paddingBottom: 5,
        },
        headerStyle: {
          backgroundColor: COLORS.white,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="routing"
        options={{
          title: 'Routing',
          tabBarIcon: ({ color, size }) => <Ionicons name="map-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: 'SOS',
          tabBarIcon: ({ color, size }) => <Ionicons name="warning-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
      
      {/* These screens will be hidden from the tab bar but we can navigate to them */}
      <Tabs.Screen
        name="addVehicle"
        options={{
          href: null,
          title: 'Add Your Vehicle',
        }}
      />
      <Tabs.Screen
        name="addStation"
        options={{
          href: null,
          title: 'Add Station',
        }}
      />
      
      {/* --- ADD THIS NEW SCREEN --- */}
      <Tabs.Screen
        name="plan-route"
        options={{
          href: null, // This hides it from the tab bar
          title: 'Plan a Route',
        }}
      />
      {/* --- END OF NEW SCREEN --- */}

      <Tabs.Screen
        name="trip-preview"
        options={{
          href: null, // This hides it from the tab bar
          title: 'Trip Preview',
          headerShown: false, // Optional: hide the header if you have a custom one
        }}
      />
      
      {/* Admin tab - conditionally hidden using href: null for non-admin users */}
      <Tabs.Screen
        name="admin"
        options={{
          title: 'Admin',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
          // This is the key change - use href: null to hide the tab
          href: isAdmin ? undefined : null,
        }}
      />
    </Tabs>
  );
}