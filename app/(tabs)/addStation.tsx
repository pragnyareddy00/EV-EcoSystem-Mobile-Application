import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { addDoc, collection } from 'firebase/firestore';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';


interface StationForm {
  name: string;
  address: string;
  latitude: string;
  longitude: string;
  connectorType: string;
  power: string;
  type: string;
  status: string;
  city: string;
  state: string;
}

export default function AddStationScreen() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [form, setForm] = useState<StationForm>({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    connectorType: 'Type 2 AC',
    power: '',
    type: 'fast',
    status: 'available',
    city: '',
    state: '',
  });

  // Check if user is admin
  if (userProfile?.role !== 'admin') {
    router.replace('/');
    return null;
  }

  const handleSubmit = async () => {
    try {
      // Basic validation
      if (!form.name || !form.address || !form.latitude || !form.longitude) {
        Alert.alert('Error', 'Please fill in all required fields');
        return;
      }

      // Parse numeric values
      const latitude = parseFloat(form.latitude);
      const longitude = parseFloat(form.longitude);
      const power = parseFloat(form.power);

      // Validate numeric values
      if (isNaN(latitude) || isNaN(longitude) || isNaN(power)) {
        Alert.alert('Error', 'Please enter valid numeric values');
        return;
      }

      // Prepare station data
      const newStation = {
        name: form.name,
        address: form.address,
        latitude,
        longitude,
        connectorType: form.connectorType || 'Unknown',
        power,
        type: form.type,
        status: 'available',
        isAvailable: true,
        city: form.city,
        state: form.state,
        services: [],
        createdAt: new Date().toISOString(),
      };

      // Add station to Firestore
      const stationsCollectionRef = collection(db, 'stations');
      await addDoc(stationsCollectionRef, newStation);

      Alert.alert('Success', 'Station added successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error adding station:', error);
      Alert.alert('Error', 'Failed to add station');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.form}>
          <Text style={styles.title}>Add New Charging Station</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Station Name*</Text>
          <TextInput
            style={styles.input}
            value={form.name}
            onChangeText={(text) => setForm({ ...form, name: text })}
            placeholder="Enter station name"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address*</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={form.address}
            onChangeText={(text) => setForm({ ...form, address: text })}
            placeholder="Enter full address"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Latitude*</Text>
            <TextInput
              style={styles.input}
              value={form.latitude}
              onChangeText={(text) => setForm({ ...form, latitude: text })}
              placeholder="e.g. 19.0760"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Longitude*</Text>
            <TextInput
              style={styles.input}
              value={form.longitude}
              onChangeText={(text) => setForm({ ...form, longitude: text })}
              placeholder="e.g. 72.8777"
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Connector Type</Text>
          <TextInput
            style={styles.input}
            value={form.connectorType}
            onChangeText={(text) => setForm({ ...form, connectorType: text })}
            placeholder="e.g. Type 2 AC, CCS-2, CHAdeMO"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>State</Text>
          <TextInput
            style={styles.input}
            value={form.state}
            onChangeText={(text) => setForm({ ...form, state: text })}
            placeholder="e.g. Maharashtra"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={form.city}
            onChangeText={(text) => setForm({ ...form, city: text })}
            placeholder="e.g. Mumbai"
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Power (kW)</Text>
            <TextInput
              style={styles.input}
              value={form.power}
              onChangeText={(text) => setForm({ ...form, power: text })}
              placeholder="e.g. 50"
              keyboardType="decimal-pad"
            />
          </View>

          <View style={[styles.inputGroup, styles.halfWidth]}>
            <Text style={styles.label}>Type</Text>
            <TextInput
              style={styles.input}
              value={form.type}
              onChangeText={(text) => setForm({ ...form, type: text })}
              placeholder="fast, slow, or swap"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>Add Station</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
    color: COLORS.textPrimary,
    marginLeft: 6,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
