/**
 * Professional Admin Dashboard
 * 
 * This component implements the professional admin role for EV station owners.
 * Features:
 * - Station Management: Add, edit, view, and delete owned stations
 * - Station Analytics: View station statistics and status
 * - Role-based Access: Only accessible to users with 'admin' role
 * 
 * Note: User Management has been deprecated as per the new requirements
 * to focus on station-centric functionalities for professional admins.
 */

import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { COLORS } from '../../constants/colors';
import { Station } from '../../constants/stations';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

type SortBy = 'name' | 'status' | 'power';
type SortOrder = 'asc' | 'desc';

// User interface removed as User Management is deprecated

export default function AdminScreen() {
  const [stations, setStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'busy' | 'offline'>('all');
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [stationPage, setStationPage] = useState(1);
  const stationsPerPage = 4;
  
  const { userProfile } = useAuth();



  useEffect(() => {
    if (userProfile?.role !== 'admin') {
      router.replace('/');
    }
  }, [userProfile]);

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (!stations) {
      setFilteredStations([]);
      return;
    }

    let filtered = stations.filter(station => {
      if (!station || !station.name || !station.address) return false;
      
      const matchesSearch = 
        station.name.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        station.address.toLowerCase().includes((searchQuery || '').toLowerCase());
      const matchesStatus = statusFilter === 'all' || station.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let compareA = sortBy === 'power' ? Number(a[sortBy]) : String(a[sortBy]).toLowerCase();
      let compareB = sortBy === 'power' ? Number(b[sortBy]) : String(b[sortBy]).toLowerCase();
      
      if (compareA < compareB) return sortOrder === 'asc' ? -1 : 1;
      if (compareA > compareB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredStations(filtered);
    setStationPage(1);
  }, [searchQuery, stations, statusFilter, sortBy, sortOrder]);

  const loadStations = async () => {
    try {
      const stationsSnapshot = await getDocs(collection(db, 'stations'));
      const stationsData = stationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Station[];
      setStations(stationsData || []); // Ensure we always set an array
    } catch (error) {
      console.error('Error loading stations:', error);
      Alert.alert('Error', 'Failed to load stations. Please try again.');
      setStations([]); // Set empty array on error
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadStations().finally(() => setRefreshing(false));
  }, []);

  const handleDeleteStation = async (stationId: string) => {
    Alert.alert(
      'Delete Station',
      'Are you sure you want to delete this station?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the station from Firestore
              await deleteDoc(doc(db, 'stations', stationId));
              // Update local state
              setStations(stations.filter(station => station.id !== stationId));
              Alert.alert('Success', 'Station deleted successfully');
            } catch (error) {
              console.error('Error deleting station:', error);
              Alert.alert('Error', 'Failed to delete station. Please try again.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'available':
        return COLORS.statusAvailable;
      case 'busy':
        return COLORS.statusBusy;
      case 'offline':
        return COLORS.statusOffline;
      default:
        return COLORS.textMuted;
    }
  };

  const availableStations = stations.filter(s => s.status === 'available').length;
  const busyStations = stations.filter(s => s.status === 'busy').length;
  const offlineStations = stations.filter(s => s.status === 'offline').length;

  if (userProfile?.role !== 'admin') {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Station Owner Dashboard</Text>
            <Text style={styles.headerSubtitle}>Manage your EV charging stations</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="flash" size={24} color="#4CAF50" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{stations.length}</Text>
              <Text style={styles.statLabel}>Total Stations</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{availableStations}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="time" size={24} color="#FF9800" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{busyStations}</Text>
              <Text style={styles.statLabel}>Busy</Text>
            </View>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
              <Ionicons name="close-circle" size={24} color="#F44336" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{offlineStations}</Text>
              <Text style={styles.statLabel}>Offline</Text>
            </View>
          </View>
        </View>

        {/* Station Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>My Charging Stations</Text>
              <Text style={styles.sectionSubtitle}>{filteredStations.length} stations registered</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/addStation' as any)}
            >
              <Ionicons name="add" size={20} color={COLORS.white} />
              <Text style={styles.addButtonText}>Register Station</Text>
            </TouchableOpacity>
          </View>

          {/* Station Search & Filters */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search stations..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={COLORS.textMuted}
              />
            </View>
          </View>

          <View style={styles.filterRow}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                onPress={() => setStatusFilter('all')}
              >
                <Text style={[styles.filterChipText, statusFilter === 'all' && styles.filterChipTextActive]}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'available' && styles.filterChipActive]}
                onPress={() => setStatusFilter('available')}
              >
                <View style={[styles.filterDot, { backgroundColor: COLORS.statusAvailable }]} />
                <Text style={[styles.filterChipText, statusFilter === 'available' && styles.filterChipTextActive]}>Available</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'busy' && styles.filterChipActive]}
                onPress={() => setStatusFilter('busy')}
              >
                <View style={[styles.filterDot, { backgroundColor: COLORS.statusBusy }]} />
                <Text style={[styles.filterChipText, statusFilter === 'busy' && styles.filterChipTextActive]}>Busy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'offline' && styles.filterChipActive]}
                onPress={() => setStatusFilter('offline')}
              >
                <View style={[styles.filterDot, { backgroundColor: COLORS.statusOffline }]} />
                <Text style={[styles.filterChipText, statusFilter === 'offline' && styles.filterChipTextActive]}>Offline</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Station Cards */}
          <View style={styles.cardsContainer}>
            {filteredStations
              .slice((stationPage - 1) * stationsPerPage, stationPage * stationsPerPage)
              .map((station) => (
              <View key={station.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardTitleRow}>
                    <Text style={styles.cardTitle}>{station.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(station.status) + '20' }]}>
                      <View style={[styles.statusDot, { backgroundColor: getStatusColor(station.status) }]} />
                      <Text style={[styles.statusBadgeText, { color: getStatusColor(station.status) }]}>
                        {station.status.charAt(0).toUpperCase() + station.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.cardSubtitle}>{station.address}</Text>
                </View>
                
                <View style={styles.cardBody}>
                  <View style={styles.cardInfo}>
                    <Ionicons name="flash-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.cardInfoText}>{station.power}kW</Text>
                  </View>
                  <View style={styles.cardInfo}>
                    <Ionicons name="battery-charging-outline" size={16} color={COLORS.textMuted} />
                    <Text style={styles.cardInfoText}>{station.type}</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.cardActionButton}
                    onPress={() => Alert.alert('Coming Soon', 'Edit station functionality will be implemented soon')}
                  >
                    <Ionicons name="create-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.cardActionText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cardActionButton, styles.cardActionButtonDanger]}
                    onPress={() => handleDeleteStation(station.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                    <Text style={[styles.cardActionText, styles.cardActionTextDanger]}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>

          {/* Station Pagination */}
          {filteredStations.length > stationsPerPage && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.paginationButton, stationPage === 1 && styles.paginationButtonDisabled]}
                onPress={() => setStationPage(p => Math.max(1, p - 1))}
                disabled={stationPage === 1}
              >
                <Ionicons name="chevron-back" size={20} color={COLORS.white} />
              </TouchableOpacity>
              
              <Text style={styles.paginationText}>
                Page {stationPage} of {Math.ceil(filteredStations.length / stationsPerPage)}
              </Text>

              <TouchableOpacity
                style={[
                  styles.paginationButton,
                  stationPage >= Math.ceil(filteredStations.length / stationsPerPage) && 
                  styles.paginationButtonDisabled
                ]}
                onPress={() => setStationPage(p => 
                  Math.min(Math.ceil(filteredStations.length / stationsPerPage), p + 1)
                )}
                disabled={stationPage >= Math.ceil(filteredStations.length / stationsPerPage)}
              >
                <Ionicons name="chevron-forward" size={20} color={COLORS.white} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: COLORS.white,
    padding: 20,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  section: {
    marginTop: 8,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    marginLeft: 6,
    fontSize: 14,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  filterRow: {
    marginBottom: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F7FA',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  filterChipTextActive: {
    color: COLORS.white,
  },
  filterDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  cardsContainer: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FAFBFC',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    marginBottom: 12,
  },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardInfoText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cardActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '10',
    gap: 6,
  },
  cardActionButtonDanger: {
    backgroundColor: COLORS.error + '10',
  },
  cardActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  cardActionTextDanger: {
    color: COLORS.error,
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  adminBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
    gap: 4,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  paginationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.5,
  },
  paginationText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  actionButton: {
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});