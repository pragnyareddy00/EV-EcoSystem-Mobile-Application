import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { mockStations, Station } from '../../constants/stations';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, isLoading } = useAuth();
  
  const [region, setRegion] = useState<Region | null>(null);
  const [visibleStations, setVisibleStations] = useState<Station[]>([]);
  const [permissionError, setPermissionError] = useState(false);

  useEffect(() => {
    // This effect checks if a user has selected their vehicle.
    // If not, it redirects them to the 'addVehicle' screen.
    if (!isLoading && userProfile && !userProfile.vehicle) {
      router.replace('/(tabs)/addVehicle');
    }
  }, [userProfile, isLoading]);

  const requestLocation = async () => {
    setPermissionError(false);
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermissionError(true);
      return;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    const initialRegion = {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
    setRegion(initialRegion);
    // On first load, calculate the stations visible in the initial view.
    updateVisibleStations(initialRegion);
  };

  useEffect(() => {
    // This effect runs once to get the user's location.
    requestLocation();
  }, []);

  // This function calculates which station markers should be visible
  // based on the current map view, which is a key performance optimization.
  const updateVisibleStations = (currentRegion: Region) => {
    const visible = mockStations.filter(station => 
      station.latitude > currentRegion.latitude - currentRegion.latitudeDelta / 2 &&
      station.latitude < currentRegion.latitude + currentRegion.latitudeDelta / 2 &&
      station.longitude > currentRegion.longitude - currentRegion.longitudeDelta / 2 &&
      station.longitude < currentRegion.longitude + currentRegion.longitudeDelta / 2
    );
    setVisibleStations(visible);
  };

  // This function is called every time the user stops panning or zooming the map.
  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    updateVisibleStations(newRegion);
  };

  // Display error if location permission is denied.
  if (permissionError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>Location permission is required to display the map.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocation}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Display a loading indicator while fetching the user's profile and location.
  if (isLoading || !userProfile || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // Display a brief message while the app redirects to the 'addVehicle' screen.
  if (!userProfile.vehicle) {
     return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Setting up your profile...</Text>
      </View>
    );
  }

  // Once everything is loaded, display the full map dashboard.
  return (
    <SafeAreaView style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={region}
        onRegionChangeComplete={handleRegionChangeComplete}
        showsUserLocation
      >
        {/* Only map over the 'visibleStations' array for performance. */}
        {visibleStations.map(station => (
          <Marker
            key={station.id}
            coordinate={{ latitude: station.latitude, longitude: station.longitude }}
            title={station.name}
            identifier={station.id.toString()}
          >
             <View style={styles.markerContainer}>
              <Ionicons name="flash" size={20} color={COLORS.white} />
            </View>
          </Marker>
        ))}
      </MapView>

      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome, {userProfile.username}!</Text>
        <Text style={styles.carText}>Your Car: {userProfile.vehicle.make} {userProfile.vehicle.model}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  header: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: SPACING.lg,
    borderRadius: SPACING.sm,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeText: {
    fontSize: FONTS.sizes.xl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  carText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  markerContainer: {
    backgroundColor: COLORS.primary,
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  errorText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: SPACING.sm,
  },
  retryText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: 'bold',
  },
});

