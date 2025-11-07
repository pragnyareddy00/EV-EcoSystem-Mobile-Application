import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, getDocs } from 'firebase/firestore';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/colors';
import { Station } from '../../constants/stations';
import { db } from '../../services/firebase';

// Helper function to calculate distance (can be moved to a utils file later)
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
    return Infinity;
  }
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function PlanRouteScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [allStations, setAllStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userLocation, setUserLocation] = useState<Location.LocationObjectCoords | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // 1. Get user's current location
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access location was denied.');
          Alert.alert('Permission Denied', 'Please enable location services to use this feature.');
          setIsLoading(false);
          return;
        }
        
        let location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const userCoords = location.coords;
        setUserLocation(userCoords);

        // 2. Fetch all stations from Firestore
        const stationsCollectionRef = collection(db, 'stations');
        const querySnapshot = await getDocs(stationsCollectionRef);

        // 3. Calculate distance and sort (as you requested)
        const stationsWithDistance = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          const station = {
            id: doc.id,
            ...data,
          } as Station;
          
          station.distance = calculateDistance(
            userCoords.latitude,
            userCoords.longitude,
            station.latitude,
            station.longitude
          );
          return station;
        });

        // 4. Sort by nearest first
        stationsWithDistance.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

        setAllStations(stationsWithDistance);
      } catch (err: any) {
        console.error('Failed to load route planner:', err);
        setError('Failed to load stations. Please try again.');
        Alert.alert('Error', 'Failed to load stations. Please check your connection and try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Filter stations based on search query
  const filteredStations = useMemo(() => {
    if (!searchQuery) {
      return allStations;
    }
    return allStations.filter(
      (station) =>
        station.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
        station.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allStations, searchQuery]);

  // Navigate to the routing screen with the selected station
  const handleSelectStation = (station: Station) => {
    router.push({
      pathname: '/(tabs)/routing',
      params: {
        id: station.id,
        name: station.name,
        latitude: station.latitude.toString(),
        longitude: station.longitude.toString(),
        address: station.address,
        type: station.type,
        power: station.power?.toString() || '0',
        status: station.status,
        distance: station.distance?.toFixed(1) || '0',
      },
    });
  };

  // Render the station item in the list
  const renderStationItem = ({ item }: { item: Station }) => (
    <TouchableOpacity
      style={styles.stationCard}
      onPress={() => handleSelectStation(item)}
    >
      <View style={styles.stationIcon}>
        <Ionicons name="flash" size={20} color={COLORS.primary} />
      </View>
      <View style={styles.stationInfo}>
        <Text style={styles.stationName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.stationAddress} numberOfLines={1}>{item.address}</Text>
      </View>
      <Text style={styles.stationDistance}>
        {item.distance ? `${item.distance.toFixed(1)} km` : ''}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* "From" Input (Disabled) */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>FROM</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="location" size={20} color={COLORS.primary} style={styles.inputIcon} />
          <Text style={styles.fromText}>Your Current Location</Text>
        </View>
      </View>

      {/* "To" Input (Search) */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>TO</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="search" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a charging station..."
            placeholderTextColor={COLORS.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
        </View>
      </View>

      {/* Results List */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.centeredView}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Finding nearby stations...</Text>
          </View>
        ) : error ? (
          <View style={styles.centeredView}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.linkText}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredStations}
            renderItem={renderStationItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <Text style={styles.listHeader}>Nearby Stations (Sorted by distance)</Text>
            }
            ListEmptyComponent={
              <View style={styles.centeredView}>
                <Text style={styles.errorText}>No stations found for "{searchQuery}"</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  inputContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  inputLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 52,
  },
  inputIcon: {
    marginHorizontal: SPACING.md,
  },
  fromText: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  searchInput: {
    flex: 1,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    height: '100%',
  },
  listContainer: {
    flex: 1,
    marginTop: SPACING.lg,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  listHeader: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  errorText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  linkText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.primary,
    fontWeight: '600',
  },
  stationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.sm,
  },
  stationIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  stationInfo: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  stationName: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  stationAddress: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  stationDistance: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
});