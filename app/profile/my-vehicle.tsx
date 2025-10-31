import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { Card } from '../../components/Card';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

export default function MyVehicleScreen() {
  const { userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();
  
  // Pre-fill the form with existing vehicle data, or empty strings
  const [make, setMake] = useState(userProfile?.vehicle?.make || '');
  const [model, setModel] = useState(userProfile?.vehicle?.model || '');
  const [batteryCapacity, setBatteryCapacity] = useState(
    userProfile?.vehicle?.batteryCapacityKWh?.toString() || ''
  );
  const [realWorldRange, setRealWorldRange] = useState(
    userProfile?.vehicle?.realWorldRangeKm?.toString() || ''
  );
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSaveVehicle = async () => {
    if (!userProfile) {
      setError('Could not find user profile.');
      return;
    }
    
    // Convert string inputs to numbers
    const batteryCapacityKWh = parseFloat(batteryCapacity);
    const realWorldRangeKm = parseFloat(realWorldRange);

    if (!make.trim() || !model.trim() || isNaN(batteryCapacityKWh) || isNaN(realWorldRangeKm)) {
      setError('Please fill in all fields with valid data.');
      return;
    }

    setIsLoading(true);
    setError('');

    // Create the vehicle object to be saved
    const vehicleData = {
      make: make.trim(),
      model: model.trim(),
      batteryCapacityKWh: batteryCapacityKWh,
      realWorldRangeKm: realWorldRangeKm,
    };

    try {
      const userDocRef = doc(db, 'users', userProfile.uid);
      
      // Update the 'vehicle' field in the user's document
      await updateDoc(userDocRef, {
        vehicle: vehicleData,
      });

      setIsLoading(false);
      await refreshUserProfile(); // Refresh the user profile data
      Alert.alert('Success', 'Your vehicle has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);

    } catch (err) {
      setIsLoading(false);
      setError('Failed to update vehicle. Please try again.');
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.form}>
        <Card style={styles.card}>
          <Text style={styles.label}>Vehicle Make</Text>
          <TextInput
            style={styles.input}
            value={make}
            onChangeText={setMake}
            placeholder="e.g., Tata"
            placeholderTextColor={COLORS.textMuted}
          />
          
          <Text style={styles.label}>Vehicle Model</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g., Nexon EV"
            placeholderTextColor={COLORS.textMuted}
          />
          
          <Text style={styles.label}>Battery Capacity (kWh)</Text>
          <TextInput
            style={styles.input}
            value={batteryCapacity}
            onChangeText={setBatteryCapacity}
            placeholder="e.g., 30.2"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
          
          <Text style={styles.label}>Real-World Range (km)</Text>
          <TextInput
            style={styles.input}
            value={realWorldRange}
            onChangeText={setRealWorldRange}
            placeholder="e.g., 250"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveVehicle}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Vehicle</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  form: {
    padding: SPACING.lg,
  },
  card: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.neutral50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginTop: SPACING.lg,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.bold,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});
