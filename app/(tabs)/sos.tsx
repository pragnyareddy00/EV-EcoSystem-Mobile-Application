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
  View
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

// Simple logger function
const logger = {
  info: (message: string, metadata: any) => {
    console.info(`[SOS] ${message}`, {
      ...metadata,
      timestamp: new Date().toISOString(),
      userId: metadata.userId || 'unknown'
    });
  }
};

// --- Type Definitions ---
type SosStage = 'assessment' | 'options' | 'tracking' | 'confirmation';
type ProblemType = 'battery_drained' | 'battery_low' | 'breakdown' | 'accident' | 'other';
type ServiceType = 'charging' | 'towing' | 'repair';

interface Provider {
  id: string;
  name: string;
  type: ServiceType;
  rating: number;
  etaMinutes: number;
  phone: string;
  location: { latitude: number; longitude: number };
}

export default function SosScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  
  // --- State Management ---
  const [stage, setStage] = useState<SosStage>('assessment');
  const [location, setLocation] = useState<ExpoLocation.LocationObject | null>(null);
  const [address, setAddress] = useState<string>('Fetching location...');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  const [problemType, setProblemType] = useState<ProblemType | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [confirmingProvider, setConfirmingProvider] = useState<Provider | null>(null);

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
    
    try {
      // Enhanced service type mapping
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
      const providersData = providersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Provider[];

      // Sort by ETA and rating
      const sortedProviders = providersData
        .sort((a, b) => a.etaMinutes - b.etaMinutes || b.rating - a.rating)
        .slice(0, 4); // Show top 4 relevant providers
      
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
  
  const handleProviderSelect = (provider: Provider) => {
    setConfirmingProvider(provider);
    setStage('confirmation');
  };

  const confirmProviderSelection = () => {
    if (confirmingProvider) {
      setSelectedProvider(confirmingProvider);
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
            setSelectedProvider(null);
            setConfirmingProvider(null);
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
    // In a real app, you might want to detect the user's country
    // and show the appropriate emergency number
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
          onPress={() => handleProviderSelect(provider)}
          accessibilityLabel={`Select ${provider.name}, ETA ${provider.etaMinutes} minutes, rating ${provider.rating} stars`}
        >
          <View style={styles.providerHeader}>
            <View style={styles.providerBadge}>
              <Text style={styles.providerType}>{provider.type.toUpperCase()}</Text>
            </View>
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
              <Text style={styles.ratingText}>{provider.rating}</Text>
            </View>
          </View>
          <View style={styles.providerInfo}>
            <Text style={styles.providerName}>{provider.name}</Text>
            <View style={styles.etaContainer}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.etaText}>ETA: {provider.etaMinutes} min</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
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
        <Text style={styles.etaHighlight}>ETA: {selectedProvider?.etaMinutes} minutes</Text>
      </View>
      
      <View style={styles.trackingMapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: location?.coords.latitude || 0,
            longitude: location?.coords.longitude || 0,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }}
          showsUserLocation={true}
        >
          {selectedProvider && (
            <Marker 
              coordinate={selectedProvider.location} 
              title={selectedProvider.name}
              description={`ETA: ${selectedProvider.etaMinutes} min`}
            >
              <View style={styles.providerMarker}>
                <Ionicons name="car" size={20} color={COLORS.white} />
              </View>
            </Marker>
          )}
        </MapView>
      </View>

      <View style={styles.providerInfoCard}>
        <View style={styles.providerCardHeader}>
          <View>
            <Text style={styles.providerName}>{selectedProvider?.name}</Text>
            <View style={styles.providerStats}>
              <View style={styles.statItem}>
                <Ionicons name="star" size={16} color={COLORS.warning} />
                <Text style={styles.statText}>{selectedProvider?.rating}</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{selectedProvider?.etaMinutes} min</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="hammer" size={16} color={COLORS.textSecondary} />
                <Text style={styles.statText}>{selectedProvider?.type}</Text>
              </View>
            </View>
          </View>
        </View>
        
        <View style={styles.trackingButtons}>
          <TouchableOpacity 
            style={styles.callProviderButton} 
            onPress={() => handleCall(selectedProvider?.phone || '')}
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg },
  backButton: { padding: SPACING.sm, marginRight: SPACING.sm },
  headerBanner: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.error, 
    padding: SPACING.md, 
    borderRadius: RADIUS.md,
    ...SHADOWS.sm
  },
  headerText: { color: COLORS.white, fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, marginLeft: SPACING.sm },
  scrollContainer: { padding: SPACING.lg, paddingBottom: 100 },
  
  // Location Card
  locationCard: { backgroundColor: COLORS.backgroundCard, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl, ...SHADOWS.md },
  locationHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.xs },
  cardTitle: { flex: 1, fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textSecondary, marginLeft: SPACING.sm },
  refreshButton: { padding: SPACING.xs },
  refreshing: { transform: [{ rotate: '180deg' }] },
  addressText: { fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  errorText: { fontSize: FONTS.sizes.sm, color: COLORS.error, marginTop: SPACING.xs },
  
  // Stage Container
  stageContainer: { marginBottom: SPACING.xl },
  sectionTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  sectionSubtitle: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  
  // Assessment Screen
  assessmentButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.backgroundCard, 
    padding: SPACING.lg, 
    borderRadius: RADIUS.lg, 
    marginBottom: SPACING.md, 
    ...SHADOWS.sm 
  },
  assessmentIcon: { marginRight: SPACING.md },
  assessmentText: { flex: 1, fontSize: FONTS.sizes.base, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary },
  
  // Options Screen
  providerCard: { 
    backgroundColor: COLORS.backgroundCard, 
    padding: SPACING.lg, 
    borderRadius: RADIUS.lg, 
    marginBottom: SPACING.md, 
    ...SHADOWS.sm 
  },
  providerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  providerBadge: { backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: RADIUS.sm },
  providerType: { fontSize: FONTS.sizes.xs, fontWeight: FONTS.weights.bold, color: COLORS.primary },
  ratingContainer: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: FONTS.sizes.sm, fontWeight: FONTS.weights.semibold, color: COLORS.textPrimary, marginLeft: 4 },
  providerInfo: { flex: 1 },
  providerName: { fontSize: FONTS.sizes.md, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginBottom: SPACING.xs },
  etaContainer: { flexDirection: 'row', alignItems: 'center' },
  etaText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginLeft: SPACING.xs },
  
  // Empty State
  emptyState: { alignItems: 'center', paddingVertical: SPACING.xl },
  emptyStateTitle: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, marginTop: SPACING.md },
  emptyStateText: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.sm, marginBottom: SPACING.lg },
  retryButton: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  retryButtonText: { color: COLORS.white, fontWeight: FONTS.weights.bold },
  
  // Confirmation Screen
  confirmationIcon: { alignItems: 'center', marginBottom: SPACING.lg },
  confirmationTitle: { fontSize: FONTS.sizes.xl, fontWeight: FONTS.weights.bold, color: COLORS.textPrimary, textAlign: 'center', marginBottom: SPACING.md },
  confirmationText: { fontSize: FONTS.sizes.base, color: COLORS.textSecondary, textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  confirmationButtons: { gap: SPACING.md },
  confirmationButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, borderRadius: RADIUS.lg },
  confirmButton: { backgroundColor: COLORS.success, gap: SPACING.sm },
  confirmButtonText: { color: COLORS.white, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.md },
  cancelConfirmButton: { backgroundColor: COLORS.neutral100 },
  cancelConfirmText: { color: COLORS.textPrimary, fontWeight: FONTS.weights.semibold },
  
  // Tracking Screen
  trackingHeader: { alignItems: 'center', marginBottom: SPACING.lg },
  successBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: COLORS.success, 
    paddingHorizontal: SPACING.md, 
    paddingVertical: SPACING.xs, 
    borderRadius: RADIUS.md, 
    marginBottom: SPACING.md 
  },
  successText: { color: COLORS.white, fontWeight: FONTS.weights.bold, fontSize: FONTS.sizes.sm, marginLeft: SPACING.xs },
  etaHighlight: { fontSize: FONTS.sizes.lg, fontWeight: FONTS.weights.bold, color: COLORS.primary, marginTop: SPACING.xs },
  
  trackingMapContainer: { 
    height: 250, 
    borderRadius: RADIUS.lg, 
    overflow: 'hidden', 
    marginBottom: SPACING.lg, 
    ...SHADOWS.md 
  },
  map: { ...StyleSheet.absoluteFillObject },
  providerMarker: { 
    backgroundColor: COLORS.primary, 
    padding: SPACING.xs, 
    borderRadius: RADIUS.sm,
    ...SHADOWS.md 
  },
  
  providerInfoCard: { 
    backgroundColor: COLORS.backgroundCard, 
    borderRadius: RADIUS.lg, 
    padding: SPACING.lg, 
    ...SHADOWS.md 
  },
  providerCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
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
    justifyContent: 'center' 
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
    justifyContent: 'center' 
  },
  cancelText: { color: COLORS.textPrimary, fontWeight: FONTS.weights.semibold },
  
  // Loading
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xl },
  loadingText: { marginTop: SPACING.md, fontSize: FONTS.sizes.base, color: COLORS.textSecondary },
  
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
    ...SHADOWS.md
  },
  callEmergencyButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: COLORS.error, 
    padding: SPACING.lg, 
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm
  },
  callEmergencyText: { 
    color: COLORS.white, 
    fontSize: FONTS.sizes.base, 
    fontWeight: FONTS.weights.bold, 
    marginLeft: SPACING.sm 
  },
}) as any;