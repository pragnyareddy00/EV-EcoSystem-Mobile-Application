// app/(tabs)/sos.tsx
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ExpoLocation from 'expo-location';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
// --- NEW IMPORT ---
import { ProviderDetailSheet } from '../../components/ProviderDetailSheet';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

// Simple logger function
const logger = {
  info: (message: string, metadata: any) => {
    console.info(`[SOS] ${message}`, {
      ...metadata,
      timestamp: new Date().toISOString(),
      userId: metadata.userId || 'unknown',
    });
  },
};

// --- Type Definitions ---
type SosStage = 'assessment' | 'options' | 'tracking' | 'confirmation';
type ProblemType = 'battery_drained' | 'battery_low' | 'breakdown' | 'accident' | 'other';
type ServiceType = 'charging' | 'towing' | 'repair';

// --- MODIFIED: Added distance and pricing ---
interface Provider {
  id: string;
  name: string;
  type: ServiceType;
  rating: number;
  etaMinutes: number;
  phone: string;
  location: { latitude: number; longitude: number };
  pricing?: string; // NEW
  distance?: number; // NEW
}

// --- NEW: Copied from plan-route.tsx ---
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

export default function SosScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();

  // --- State Management ---
  const [stage, setStage] = useState<SosStage>('assessment');
  const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(
    null
  );
  const [address, setAddress] = useState<string>('Fetching location...');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [problemType, setProblemType] = useState<ProblemType | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  
  // --- MODIFIED: Renamed states for clarity ---
  const [confirmingProvider, setConfirmingProvider] = useState<Provider | null>(null);
  const [selectedProviderOnMap, setSelectedProviderOnMap] = useState<Provider | null>(null);

  // --- NEW STATE: For the detail sheet ---
  const [selectedProviderDetails, setSelectedProviderDetails] = useState<Provider | null>(null);
  const [isDetailSheetVisible, setIsDetailSheetVisible] = useState(false);
  
  // --- Core Functions ---

  const fetchLocation = async (showRetry = false) => {
    try {
      if (showRetry) setIsRefreshing(true);
      
      setLocationError(null);
      let { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Location permission denied. Please enable location services in settings.');
        setAddress('Location unavailable');
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      let currentLocation = await ExpoLocation.getCurrentPositionAsync({
        accuracy: ExpoLocation.Accuracy.High,
      });
      setLocation(currentLocation);

      let reverseGeocode = await ExpoLocation.reverseGeocodeAsync(currentLocation.coords);
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.name || ''}${addr.street ? `, ${addr.street}` : ''}${addr.city ? `, ${addr.city}` : ''}`;
        setAddress(formattedAddress || 'Address not available');
      } else {
        setAddress('Address not available');
      }
    } catch (error) {
      console.error("Location error: ", error);
      setLocationError('Failed to get location. Please check your connection and try again.');
      setAddress('Location unavailable');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      logger.info('SOS screen loaded', { action: 'screenLoad', method: 'GET', path: '/sos', userId: userProfile?.id });
      fetchLocation();
    }, [])
  );

  const handleAssessmentComplete = async (problem: ProblemType) => {
    setProblemType(problem);
    setIsLoading(true);
    
    // --- MODIFIED: Ensure location is available ---
    if (!location) {
      Alert.alert("Location Error", "Cannot find providers without your location. Please try again.");
      setIsLoading(false);
      return;
    }

    try {
      const serviceTypeMap: Record<ProblemType, ServiceType[]> = {
        battery_drained: ['charging', 'towing'],
        battery_low: ['charging'],
        breakdown: ['repair', 'towing'],
        accident: ['towing', 'repair'],
        other: ['towing', 'repair']
      };

      const requiredServiceTypes = serviceTypeMap[problem];
      const providersQuery = query(
        collection(db, 'serviceProviders'), 
        where("type", "in", requiredServiceTypes),
        where("isAvailable", "==", true)
      );
      
      const providersSnapshot = await getDocs(providersQuery);
      
      // --- MODIFIED: Calculate distance and add pricing ---
      const providersData = providersSnapshot.docs.map(doc => {
        const data = doc.data();
        
        // --- *** FIX *** ---
        // Read the location as a map { latitude: ..., longitude: ... }
        // Add a check in case the data is bad
        const providerLocation = data.location;
        let distance = Infinity;
        
        if (location && providerLocation && typeof providerLocation.latitude === 'number' && typeof providerLocation.longitude === 'number') {
          distance = calculateDistance(
            location.coords.latitude,
            location.coords.longitude,
            providerLocation.latitude, // Read from the map
            providerLocation.longitude // Read from the map
          );
        } else {
          console.warn(`Invalid location data for provider: ${data.name}`);
        }
        // --- *** END FIX *** ---

        return {
          id: doc.id,
          ...data,
          distance: distance, // Add the calculated distance
          pricing: data.pricing || 'Pricing N/A' // Get the new pricing field
        } as Provider;
      });

      // Sort by distance (new) OR eta
      const sortedProviders = providersData
        .sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity) || a.etaMinutes - b.etaMinutes)
        .slice(0, 4); 
      
      setProviders(sortedProviders);
      setStage('options');
    } catch (error) {
      console.error("Error fetching providers: ", error);
      Alert.alert(
        "Connection Error", 
        "Could not fetch service providers. Please check your connection and try again.",
        [{ text: "Try Again", onPress: () => handleAssessmentComplete(problem) }]
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  // --- MODIFIED: This function now opens the detail sheet ---
  const handleProviderSelect = (provider: Provider) => {
    setSelectedProviderDetails(provider);
    setIsDetailSheetVisible(true);
  };

  // --- NEW: This function is called FROM the detail sheet ---
  const handleConfirmFromSheet = (provider: Provider) => {
    setIsDetailSheetVisible(false); // Close the sheet
    setConfirmingProvider(provider); // Set the provider for the confirmation screen
    setStage('confirmation');      // Move to the next stage
  };

  const confirmProviderSelection = () => {
    if (confirmingProvider) {
      setSelectedProviderOnMap(confirmingProvider);
      setStage('tracking');
      setConfirmingProvider(null);
    }
  };

  const handleCall = async (phoneNumber: string) => {
    if (!phoneNumber) {
      Alert.alert("No Number", "This provider has not listed a phone number.");
      return;
    }
    
    try {
      const supported = await Linking.canOpenURL(`tel:${phoneNumber}`);
      if (supported) {
        await Linking.openURL(`tel:${phoneNumber}`);
      } else {
        Alert.alert('Error', 'Your device cannot make phone calls.');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open the phone dialer.');
    }
  };

  const handleCancelRequest = () => {
    Alert.alert(
      "Cancel Request",
      "Are you sure you want to cancel your service request?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive", 
          onPress: () => {
            setSelectedProviderOnMap(null);
            setConfirmingProvider(null);
            setSelectedProviderDetails(null); // Clear detail sheet state
            setStage('assessment');
          }
        }
      ]
    );
  };

  const navigateBack = () => {
    if (stage === 'options') {
      setStage('assessment');
    } else if (stage === 'confirmation') {
      setStage('options');
      setConfirmingProvider(null);
    }
  };

  const getEmergencyNumber = () => {
    return '112'; // European emergency number
  };

  // --- Enhanced Render Functions ---

  const renderHeader = () => (
    <View style={styles.header}>
      {stage !== 'assessment' && (
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={navigateBack}
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      )}
      <View style={styles.headerBanner}>
        <Ionicons name="warning" size={24} color={COLORS.white} />
        <Text style={styles.headerText}>EMERGENCY ASSISTANCE</Text>
      </View>
    </View>
  );

  const renderLocationCard = () => (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Ionicons name="location" size={20} color={COLORS.primary} />
        <Text style={styles.cardTitle}>Your Current Location</Text>
        <TouchableOpacity 
          onPress={() => fetchLocation(true)}
          style={styles.refreshButton}
          disabled={isRefreshing}
        >
          <Ionicons 
            name="refresh" 
            size={20} 
            color={COLORS.primary} 
            style={isRefreshing ? styles.refreshing : null} 
          />
        </TouchableOpacity>
      </View>
      <Text style={styles.addressText} numberOfLines={2}>
        {address}
      </Text>
      {locationError && (
        <Text style={styles.errorText}>{locationError}</Text>
      )}
    </View>
  );

  const renderAssessmentScreen = () => (
    <View style={styles.stageContainer}>
      <Text style={styles.sectionTitle}>What's your situation?</Text>
      <Text style={styles.sectionSubtitle}>Select the issue you're experiencing</Text>
      
      {[
        { key: 'battery_low', icon: 'battery-half', text: 'Battery is Low' },
        { key: 'battery_drained', icon: 'battery-dead', text: 'Battery is Drained' },
        { key: 'breakdown', icon: 'build', text: 'Mechanical Breakdown' },
        { key: 'accident', icon: 'car-crash', text: "I've been in an Accident" },
        { key: 'other', icon: 'help-circle', text: 'Other Emergency' },
      ].map((item) => (
        <TouchableOpacity 
          key={item.key}
          style={styles.assessmentButton}
          onPress={() => handleAssessmentComplete(item.key as ProblemType)}
          accessibilityLabel={item.text}
        >
          <Ionicons name={item.icon as any} size={24} color={COLORS.primary} style={styles.assessmentIcon} />
          <Text style={styles.assessmentText}>{item.text}</Text>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderOptionsScreen = () => (
    <View style={styles.stageContainer}>
      <Text style={styles.sectionTitle}>Available Assistance</Text>
      <Text style={styles.sectionSubtitle}>Choose a service provider</Text>
      
      {providers.length > 0 ? providers.map(provider => (
        <TouchableOpacity 
          key={provider.id} 
          style={styles.providerCard}
          // --- MODIFIED: This now opens the detail sheet ---
          onPress={() => handleProviderSelect(provider)}
          accessibilityLabel={`Select ${provider.name}, ETA ${provider.etaMinutes} minutes, rating ${provider.rating} stars`}
        >
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.name}</Text>
            <View style={styles.etaContainer}>
              {/* --- NEW: Show distance in the list --- */}
              <Ionicons name="map-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.etaText}>
                {provider.distance ? `${provider.distance.toFixed(1)} km` : '...'}
              </Text>
              <Text style={styles.dotSeparator}>•</Text>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.etaText}>ETA: {provider.etaMinutes} min</Text>
            </View>
            {/* --- NEW: Show pricing in the list --- */}
            <View style={styles.priceContainer}>
              <Text style={styles.priceText}>{provider.pricing}</Text>
            </View>
          </View>
          <View style={styles.providerRight}>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.ratingText}>{provider.rating}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} style={{ marginTop: 8 }} />
          </View>
        </TouchableOpacity>
      )) : (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyStateTitle}>No providers available</Text>
          <Text style={styles.emptyStateText}>No service providers are currently available in your area for this issue.</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={() => problemType && handleAssessmentComplete(problemType)}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderConfirmationScreen = () => (
    <View style={styles.stageContainer}>
      <View style={styles.confirmationIcon}>
        <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
      </View>
      <Text style={styles.confirmationTitle}>Confirm Service Request</Text>
      <Text style={styles.confirmationText}>
        You're about to request {confirmingProvider?.type} service from {confirmingProvider?.name}. 
        They have an estimated arrival time of {confirmingProvider?.etaMinutes} minutes.
      </Text>
      
      <View style={styles.confirmationButtons}>
        <TouchableOpacity 
          style={[styles.confirmationButton, styles.confirmButton]}
          onPress={confirmProviderSelection}
        >
          <Ionicons name="checkmark" size={20} color={COLORS.white} />
          <Text style={styles.confirmButtonText}>Confirm & Request</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.confirmationButton, styles.cancelConfirmButton]}
          onPress={navigateBack}
        >
          <Text style={styles.cancelConfirmText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  const renderTrackingScreen = () => (
    <View style={styles.stageContainer}>
      <View style={styles.trackingHeader}>
        <View style={styles.successBadge}>
          <Ionicons name="checkmark" size={16} color={COLORS.white} />
          <Text style={styles.successText}>Service Requested</Text>
        </View>
        <Text style={styles.sectionTitle}>Help is on the way!</Text>
        <Text style={styles.etaHighlight}>ETA: {selectedProviderOnMap?.etaMinutes} minutes</Text>
      </View>
      
      {/* --- *** FIX *** --- */}
      {/* Add a check for location AND selectedProviderOnMap.location */}
      {/* This prevents the map from crashing if data is null */}
      {location && selectedProviderOnMap && selectedProviderOnMap.location ? (
        <View style={styles.trackingMapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            }}
            showsUserLocation={true}
          >
            <Marker
              coordinate={selectedProviderOnMap.location} // This is now a valid {lat, lng} object
              title={selectedProviderOnMap.name}
              description={`ETA: ${selectedProviderOnMap.etaMinutes} min`}
            >
              <View style={styles.providerMarker}>
                <Ionicons name="car" size={20} color={COLORS.white} />
              </View>
            </Marker>
          </MapView>
        </View>
      ) : (
        // Show a loading/error state if location is missing
        <View style={styles.trackingMapContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading map...</Text>
        </View>
      )}
      {/* --- *** END FIX *** --- */}


      <View style={styles.providerInfoCard}>
        <View style={styles.providerCardHeader}>
          <View>
            <Text style={styles.providerName}>{selectedProviderOnMap?.name}</Text>
            <View style={styles.providerStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color={COLORS.warning} />
                <Text style={styles.statText}>{selectedProviderOnMap?.rating}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{selectedProviderOnMap?.etaMinutes} min</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="hammer" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{selectedProviderOnMap?.type}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.trackingButtons}>
          <TouchableOpacity 
            style={styles.callProviderButton} 
            onPress={() => handleCall(selectedProviderOnMap?.phone || '')}
            accessibilityLabel="Call service provider"
          >
            <Ionicons name="call" size={20} color={COLORS.white} />
            <Text style={styles.callProviderText}>Call Provider</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.cancelButton} 
            onPress={handleCancelRequest}
            accessibilityLabel="Cancel service request"
          >
            <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            <Text style={styles.cancelText}>Cancel Request</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => fetchLocation(true)}
            colors={[COLORS.primary]}
          />
        }
      >
        {renderLocationCard()}
        
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Finding help...</Text>
          </View>
        ) : (
          <>
            {stage === 'assessment' && renderAssessmentScreen()}
            {stage === 'options' && renderOptionsScreen()}
            {stage === 'confirmation' && renderConfirmationScreen()}
            {stage === 'tracking' && renderTrackingScreen()}
          </>
        )}
      </ScrollView>

      {/* --- NEW: Render the detail sheet --- */}
      <ProviderDetailSheet
        provider={selectedProviderDetails}
        isVisible={isDetailSheetVisible}
        onClose={() => setIsDetailSheetVisible(false)}
        onConfirm={handleConfirmFromSheet}
      />

      {/* Emergency Call Button */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.callEmergencyButton} 
          onPress={() => handleCall(getEmergencyNumber())}
          accessibilityLabel="Call local emergency services"
        >
          <Ionicons name="alert-circle" size={24} color={COLORS.white} />
          <Text style={styles.callEmergencyText}>Emergency Services ({getEmergencyNumber()})</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  backButton: { padding: SPACING.sm, marginRight: SPACING.sm },
  headerBanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.sm,
  },
  headerText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    marginLeft: SPACING.sm,
  },
  scrollContainer: { padding: SPACING.lg, paddingBottom: 100 },
  
  // Location Card
  locationCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.md,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    flex: 1,
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  refreshButton: { padding: SPACING.xs },
  refreshing: { transform: [{ rotate: '180deg' }] },
  addressText: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginTop: SPACING.xs,
  },
  
  // Stage Container
  stageContainer: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  sectionSubtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  
  // Assessment Screen
  assessmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  assessmentIcon: { marginRight: SPACING.md },
  assessmentText: {
    flex: 1,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  
  // Options Screen
  providerCard: {
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  providerInfo: { flex: 1 },
  providerName: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  etaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  etaText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontWeight: FONTS.weights.medium,
  },
  dotSeparator: {
    color: COLORS.textSecondary,
    paddingHorizontal: SPACING.xs,
  },
  priceContainer: {
    marginTop: SPACING.sm,
  },
  priceText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  providerRight: {
    alignItems: 'flex-end',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
    marginLeft: 4,
  },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyStateTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptyStateText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  retryButtonText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  
  // Confirmation Screen
  confirmationIcon: { alignItems: 'center', marginBottom: SPACING.lg },
  confirmationTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  confirmationText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    lineHeight: 22,
  },
  confirmationButtons: { gap: SPACING.md },
  confirmationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  confirmButton: { backgroundColor: COLORS.success, gap: SPACING.sm },
  confirmButtonText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.md,
  },
  cancelConfirmButton: { backgroundColor: COLORS.neutral100 },
  cancelConfirmText: {
    color: COLORS.textPrimary,
    fontWeight: FONTS.weights.semibold,
  },
  
  // Tracking Screen
  trackingHeader: { alignItems: 'center', marginBottom: SPACING.lg },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  successText: {
    color: COLORS.white,
    fontWeight: FONTS.weights.bold,
    fontSize: FONTS.sizes.sm,
    marginLeft: SPACING.xs,
  },
  etaHighlight: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
    marginTop: SPACING.xs,
  },
  
  trackingMapContainer: {
    height: 250,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  map: { ...StyleSheet.absoluteFillObject },
  providerMarker: {
    backgroundColor: COLORS.primary,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    ...SHADOWS.md,
  },
  
  providerInfoCard: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.md,
  },
  providerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  providerStats: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  
  trackingButtons: { flexDirection: 'row', gap: SPACING.md },
  callProviderButton: {
    flex: 2,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callProviderText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral100,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: COLORS.textPrimary, fontWeight: FONTS.weights.semibold },
  
  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xl },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    ...SHADOWS.md,
  },
  callEmergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.error,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  callEmergencyText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.bold,
    marginLeft: SPACING.sm,
  },
}) as any;