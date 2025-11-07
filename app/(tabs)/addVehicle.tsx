import { useRouter } from 'expo-router';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
// --- We now import useState and useEffect ---
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StyledButton } from '../../components/StyledComponents';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
// --- We no longer import vehicleData, but we keep Vehicle type ---
import { Vehicle } from '../../constants/vehicles';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

export default function AddVehicleScreen() {
  const router = useRouter();
  const { user, userProfile, refreshUserProfile } = useAuth(); // Get refreshUserProfile
  
  // --- NEW: State for loading vehicles from Firestore ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false); // For saving
  const [isFetching, setIsFetching] = useState(true); // For fetching vehicles

  // --- NEW: Fetch vehicles from Firestore on component mount ---
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setIsFetching(true);
        const vehiclesCollectionRef = collection(db, 'vehicles');
        const querySnapshot = await getDocs(vehiclesCollectionRef);
        
        const fetchedVehicles: Vehicle[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Note: We use the doc.id as the vehicle ID
          return {
            id: doc.id,
            make: data.make,
            model: data.model,
            batteryCapacityKWh: data.batteryCapacityKWh,
            realWorldRangeKm: data.realWorldRangeKm,
          } as Vehicle;
        });

        // Sort by make then model
        fetchedVehicles.sort((a, b) => {
          if (a.make < b.make) return -1;
          if (a.make > b.make) return 1;
          if (a.model < b.model) return -1;
          if (a.model > b.model) return 1;
          return 0;
        });

        setVehicles(fetchedVehicles);
      } catch (error) {
        console.error("Error fetching vehicles: ", error);
        Alert.alert('Error', 'Failed to load vehicle list. Please check your connection.');
      } finally {
        setIsFetching(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleSaveVehicle = async () => {
    if (!selectedVehicle || !user) {
      Alert.alert('Error', 'Please select a vehicle.');
      return;
    }

    setIsLoading(true);
    try {
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        vehicle: {
          id: selectedVehicle.id, // --- NEW: Save the vehicle's Firestore ID
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          batteryCapacityKWh: selectedVehicle.batteryCapacityKWh,
          realWorldRangeKm: selectedVehicle.realWorldRangeKm,
        },
      });

      // --- NEW: Refresh the auth context to get the new vehicle data ---
      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      // Navigate back to the home screen after saving
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error("Error saving vehicle: ", error);
      Alert.alert('Error', 'Failed to save your vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- NEW: Loading state ---
  if (isFetching) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading vehicle models...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Vehicle</Text>
      <Text style={styles.subtitle}>This helps us provide personalized range and charging estimates.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleList}>
          {/* --- MODIFIED: Map over 'vehicles' state instead of 'vehicleData' --- */}
          {vehicles.map((vehicle) => (
            <TouchableOpacity
              key={vehicle.id}
              style={[
                styles.vehicleItem,
                selectedVehicle?.id === vehicle.id && styles.selectedVehicleItem,
              ]}
              onPress={() => setSelectedVehicle(vehicle)}
            >
              <Text style={styles.vehicleMake}>{vehicle.make}</Text>
              <Text style={styles.vehicleModel}>{vehicle.model}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      <StyledButton
        title="Save and Continue"
        onPress={handleSaveVehicle}
        disabled={!selectedVehicle || isLoading}
        loading={isLoading}
        style={styles.saveButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.backgroundLight,
  },
  // --- NEW: Loading container styles ---
  loadingContainer: {
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
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  vehicleList: {
    gap: SPACING.md,
    paddingBottom: 20, // Add padding to the bottom for scroll
  },
  vehicleItem: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderRadius: SPACING.sm,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  selectedVehicleItem: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`,
  },
  vehicleMake: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  vehicleModel: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  saveButton: {
    marginTop: SPACING.md,
  },
});