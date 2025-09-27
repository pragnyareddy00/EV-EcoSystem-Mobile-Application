import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
// --- THIS IS THE FIX ---
// We must import 'useState' from the 'react' library before using it.
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { StyledButton } from '../../components/StyledComponents';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { Vehicle, vehicleData } from '../../constants/vehicles';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

export default function AddVehicleScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
          make: selectedVehicle.make,
          model: selectedVehicle.model,
          batteryCapacityKWh: selectedVehicle.batteryCapacityKWh,
          realWorldRangeKm: selectedVehicle.realWorldRangeKm,
        },
      });
      // Navigate back to the home screen after saving
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error("Error saving vehicle: ", error);
      Alert.alert('Error', 'Failed to save your vehicle. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Your Vehicle</Text>
      <Text style={styles.subtitle}>This helps us provide personalized range and charging estimates.</Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.vehicleList}>
          {vehicleData.map((vehicle) => (
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

