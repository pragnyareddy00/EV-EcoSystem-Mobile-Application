import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { mockStations, Station } from '../../constants/stations';
import { useAuth } from '../../context/AuthContext';

// Using Station interface from stations.ts

export default function AdminScreen() {
  const [stations, setStations] = useState<Station[]>([]);
  const { userProfile } = useAuth();

  // Check if user is admin, if not redirect to home
  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      router.replace('/');
    }
  }, [userProfile]);

  // Load stations from local data
  useEffect(() => {
    setStations(mockStations);
  }, []);

  const handleDelete = async (stationId: string) => {
    Alert.alert(
      'Delete Station',
      'Are you sure you want to delete this station?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setStations(stations.filter(station => station.id !== stationId));
          },
        },
      ]
    );
  };

  if (userProfile?.role !== 'admin') {
    return null; // Or a loading state if needed
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Charging Stations</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/addStation' as any)}
        >
          <Ionicons name="add" size={24} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.stationsList}>
        {stations.map((station) => (
          <View key={station.id} style={styles.stationCard}>
            <View style={styles.stationInfo}>
              <Text style={styles.stationName}>{station.name}</Text>
              <Text style={styles.stationAddress}>{station.address}</Text>
              <Text style={styles.stationDetails}>
                Power: {station.power}kW | Type: {station.type} | Status: {station.status}
              </Text>
            </View>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => {
                  // TODO: Navigate to edit station screen
                  Alert.alert('Coming Soon', 'Edit station functionality will be implemented soon');
                }}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(station.id)}
              >
                <Ionicons name="trash-outline" size={20} color={COLORS.error} />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stationsList: {
    padding: 16,
  },
  stationCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stationInfo: {
    flex: 1,
    marginRight: 12,
  },
  stationName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  stationAddress: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  stationDetails: {
    fontSize: 12,
    color: COLORS.primary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    borderWidth: 1,
  },
  editButton: {
    borderColor: COLORS.primary,
  },
  deleteButton: {
    borderColor: COLORS.error,
  },
});