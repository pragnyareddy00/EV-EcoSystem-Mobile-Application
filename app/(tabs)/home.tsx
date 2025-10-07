import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { COLORS } from '../../constants/colors';
import { mockStations, Station } from '../../constants/stations';
import { useAuth } from '../../context/AuthContext';

export default function HomeScreen() {
  const router = useRouter();
  const { userProfile, isLoading } = useAuth();
  const mapRef = useRef<MapView>(null);
  
  const [region, setRegion] = useState<Region | null>(null);
  const [visibleStations, setVisibleStations] = useState<Station[]>([]);
  const [filteredStations, setFilteredStations] = useState<Station[]>([]);
  const [permissionError, setPermissionError] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [mapHeight] = useState(new Animated.Value(0.60)); // 60% initially
  const [isMapExpanded, setIsMapExpanded] = useState(true);
  const [socModalVisible, setSocModalVisible] = useState(false);
  const [currentSoC, setCurrentSoC] = useState(85);
  const [tempSoC, setTempSoC] = useState('85');
  const [nearestStations, setNearestStations] = useState<Station[]>([]);

  useEffect(() => {
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
    updateVisibleStations(initialRegion);
    findNearestStations(currentLocation.coords);
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const findNearestStations = (coords: { latitude: number, longitude: number }) => {
    const stationsWithDistance = mockStations.map(station => ({
      ...station,
      distance: calculateDistance(coords.latitude, coords.longitude, station.latitude, station.longitude)
    }));
    
    const nearest = stationsWithDistance
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 5);
    
    setNearestStations(nearest);
  };

  const updateVisibleStations = (currentRegion: Region) => {
    if (!currentRegion) return;
    const visible = mockStations.filter(station =>
      station.latitude > currentRegion.latitude - currentRegion.latitudeDelta / 2 &&
      station.latitude < currentRegion.latitude + currentRegion.latitudeDelta / 2 &&
      station.longitude > currentRegion.longitude - currentRegion.longitudeDelta / 2 &&
      station.longitude < currentRegion.longitude + currentRegion.longitudeDelta / 2
    );
    setVisibleStations(visible);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredStations([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const filtered = mockStations.filter(station =>
      station.name.toLowerCase().includes(query.toLowerCase()) ||
      station.address?.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredStations(filtered);
  };

  const navigateToStation = (station: Station) => {
    if (mapRef.current) {
      const newRegion = {
        latitude: station.latitude,
        longitude: station.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      };
      mapRef.current.animateToRegion(newRegion, 1000);
      setSearchQuery('');
      setFilteredStations([]);
      setIsSearching(false);
    }
  };

  const toggleMapSize = () => {
    const newHeight = isMapExpanded ? 0.35 : 0.60;
    Animated.timing(mapHeight, {
      toValue: newHeight,
      duration: 300,
      useNativeDriver: false,
    }).start();
    setIsMapExpanded(!isMapExpanded);
  };

  const updateSoC = () => {
    const newSoC = parseInt(tempSoC);
    if (!isNaN(newSoC) && newSoC >= 0 && newSoC <= 100) {
      setCurrentSoC(newSoC);
      setSocModalVisible(false);
    } else {
      Alert.alert('Invalid SoC', 'Please enter a value between 0 and 100');
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'findCharger':
        if (nearestStations.length > 0) {
          navigateToStation(nearestStations[0]);
        }
        break;
      case 'routePlan':
        router.push('/(tabs)/routing');
        break;
      case 'emergency':
        Alert.alert(
          'Emergency SOS',
          'This will contact emergency services and nearby assistance. Continue?',
          [{ text: 'Cancel', style: 'cancel' }, { text: 'Call SOS', onPress: () => { Alert.alert('SOS Activated', 'Emergency services have been notified.'); }}]
        );
        break;
      case 'batterySwap':
        const swapStations = mockStations.filter(station => station.type === 'swap' || station.services?.includes('battery_swap'));
        if (swapStations.length > 0) {
          navigateToStation(swapStations[0]);
        } else {
          Alert.alert('No Swap Stations', 'No battery swap stations found nearby');
        }
        break;
    }
  };

  const handleRegionChangeComplete = (newRegion: Region) => {
    setRegion(newRegion);
    updateVisibleStations(newRegion);
  };

  const getSoCColor = () => {
    if (currentSoC > 50) return '#10b981';
    if (currentSoC > 20) return '#f59e0b';
    return '#ef4444';
  };

  const getSoCStatus = () => {
    if (currentSoC > 80) return 'Excellent';
    if (currentSoC > 50) return 'Good';
    if (currentSoC > 20) return 'Low';
    return 'Critical';
  };

  const getStationIconName = (type: string) => {
    if (type === 'fast') return 'flash';
    if (type === 'swap') return 'repeat';
    return 'battery-charging';
  };

  if (permissionError) {
    return (
      <View style={styles.centered}>
        <View style={styles.errorIconContainer}>
          <Ionicons name="location-outline" size={56} color="#94a3b8" />
        </View>
        <Text style={styles.errorTitle}>Location Access Required</Text>
        <Text style={styles.errorText}>We need your location to show nearby charging stations and provide the best EV experience.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={requestLocation}>
          <Ionicons name="location" size={18} color="#fff" style={styles.buttonIcon} />
          <Text style={styles.retryText}>Enable Location</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isLoading || !userProfile || !region) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your EV dashboard...</Text>
      </View>
    );
  }

  if (!userProfile.vehicle) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Setting up your profile...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Section */}
      <Animated.View style={[styles.mapContainer, { flex: mapHeight }]}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={region}
          onRegionChangeComplete={handleRegionChangeComplete}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {visibleStations.map(station => (
            <Marker
              key={station.id}
              coordinate={{ latitude: station.latitude, longitude: station.longitude }}
              title={station.name}
              description={`${station.type} • ${station.power}kW`}
              identifier={station.id.toString()}
              onPress={() => {
                Alert.alert(
                  station.name,
                  `Type: ${station.type}\nPower: ${station.power}kW\nStatus: ${station.status}`,
                  [{ text: 'Cancel', style: 'cancel' }, { text: 'Navigate', onPress: () => navigateToStation(station) }]
                );
              }}
            >
              <View style={[
                styles.markerContainer,
                { backgroundColor: station.status === 'available' ? '#10b981' : '#ef4444' }
              ]}>
                <Ionicons
                  name={getStationIconName(station.type) as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color="#ffffff"
                />
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Compact Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color="#64748b" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search stations..."
              value={searchQuery}
              onChangeText={handleSearch}
              placeholderTextColor="#94a3b8"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={18} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
          
          {isSearching && (
            <View style={styles.searchResults}>
               {filteredStations.length > 0 ? (
                 filteredStations.slice(0, 4).map(station => (
                  <TouchableOpacity
                    key={station.id}
                    style={styles.searchResultItem}
                    onPress={() => navigateToStation(station)}
                  >
                    <View style={styles.searchResultLeft}>
                      <View style={[styles.searchResultIcon, { backgroundColor: station.status === 'available' ? '#dcfce7' : '#fee2e2' }]}>
                        <Ionicons name="location" size={14} color={station.status === 'available' ? '#10b981' : '#ef4444'} />
                      </View>
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultName}>{station.name}</Text>
                        <Text style={styles.searchResultAddress} numberOfLines={1}>
                          {station.address || `${station.power}kW • ${station.type}`}
                        </Text>
                      </View>
                    </View>
                    <Ionicons name="arrow-forward" size={16} color="#64748b" />
                  </TouchableOpacity>
                ))
               ) : (
                <View style={styles.noResults}>
                  <Ionicons name="search-outline" size={28} color="#cbd5e1" />
                  <Text style={styles.noResultsText}>No stations found</Text>
                </View>
               )}
            </View>
          )}
        </View>

        {/* Compact SoC Indicator */}
        <TouchableOpacity
          style={styles.socContainer}
          onPress={() => setSocModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={[styles.socCard, { borderLeftColor: getSoCColor() }]}>
            <View style={styles.socTop}>
              <Ionicons name="battery-charging" size={16} color={getSoCColor()} />
              <Text style={[styles.socValue, { color: getSoCColor() }]}>{currentSoC}%</Text>
            </View>
            <Text style={styles.socRange}>{Math.round(currentSoC * 4.2)}km</Text>
          </View>
        </TouchableOpacity>

        {/* Compact Map Toggle */}
        <TouchableOpacity style={styles.mapToggle} onPress={toggleMapSize} activeOpacity={0.8}>
          <Ionicons
            name={isMapExpanded ? 'chevron-down' : 'chevron-up'}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
      </Animated.View>

      {/* Bottom Content Section */}
      <Animated.View style={[styles.bottomContainer, {
          flex: mapHeight.interpolate({
            inputRange: [0.35, 0.60],
            outputRange: [0.65, 0.40]
          })
      }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Compact Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcomeText}>Hello, {userProfile.username}!</Text>
              <View style={styles.carInfo}>
                <Ionicons name="car-sport" size={12} color="#64748b" />
                <Text style={styles.carText}>
                  {userProfile.vehicle.make} {userProfile.vehicle.model}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <View style={styles.profileAvatar}>
                <Ionicons name="person" size={18} color={COLORS.primary} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Compact Quick Actions */}
          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('findCharger')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, styles.actionPrimary]}>
                  <Ionicons name="flash" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Find Charger</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('routePlan')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, styles.actionBlue]}>
                  <Ionicons name="navigate" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Route Plan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('batterySwap')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, styles.actionGreen]}>
                  <Ionicons name="repeat" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Battery Swap</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleQuickAction('emergency')}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconContainer, styles.actionRed]}>
                  <Ionicons name="warning" size={20} color="#fff" />
                </View>
                <Text style={styles.actionLabel}>Emergency</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Compact Stations List */}
          <View style={styles.nearestStations}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Nearby Stations</Text>
              <Text style={styles.sectionSubtitle}>Updated now</Text>
            </View>
            {nearestStations.slice(0, 3).map((station) => (
              <TouchableOpacity
                key={station.id}
                style={[
                  styles.stationCard,
                  { borderLeftColor: station.status === 'available' ? '#10b981' : '#ef4444' }
                ]}
                onPress={() => navigateToStation(station)}
                activeOpacity={0.7}
              >
                <View style={styles.stationLeft}>
                  <View style={[
                    styles.stationIconContainer,
                    { backgroundColor: station.status === 'available' ? '#dcfce7' : '#fee2e2' }
                  ]}>
                    <Ionicons 
                      name={getStationIconName(station.type) as keyof typeof Ionicons.glyphMap}
                      size={20} 
                      color={station.status === 'available' ? '#10b981' : '#ef4444'} 
                    />
                  </View>
                  <View style={styles.stationInfo}>
                    <Text style={styles.stationName}>{station.name}</Text>
                    <Text style={styles.stationMetaText} numberOfLines={1}>
                      {station.address || 'EV Charging Station'}
                    </Text>
                  </View>
                </View>
                
                <View style={styles.stationMeta}>
                  <View style={styles.stationMetaItem}>
                    <Ionicons name="navigate" size={13} color="#64748b" />
                    <Text style={styles.stationMetaText}>{station.distance?.toFixed(1)} km</Text>
                  </View>
                  
                  <View style={styles.metaDivider} />
                  
                  <View style={styles.stationMetaItem}>
                    <Ionicons name="flash" size={13} color="#64748b" />
                    <Text style={styles.stationMetaText}>{station.power} kW</Text>
                  </View>
                  
                  <View style={styles.metaDivider} />
                  
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: station.status === 'available' ? '#dcfce7' : '#fee2e2' }
                  ]}>
                    <View style={[
                      styles.statusDot,
                      { backgroundColor: station.status === 'available' ? '#10b981' : '#ef4444' }
                    ]} />
                    <Text style={[
                      styles.statusText,
                      { color: station.status === 'available' ? '#059669' : '#dc2626' }
                    ]}>
                      {station.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.stationArrow}>
                  <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 16 }} />
        </ScrollView>
      </Animated.View>

      {/* Compact SoC Modal */}
      <Modal
        visible={socModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSocModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Update Battery</Text>
                <Text style={styles.modalSubtitle}>Current: {currentSoC}%</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setSocModalVisible(false)}
                style={styles.modalClose}
              >
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.socInputWrapper}>
              <View style={styles.socInputContainer}>
                <TextInput
                  style={styles.socInput}
                  value={tempSoC}
                  onChangeText={setTempSoC}
                  keyboardType="numeric"
                  placeholder="85"
                  maxLength={3}
                  placeholderTextColor="#cbd5e1"
                />
                <Text style={styles.socUnit}>%</Text>
              </View>
              <Text style={styles.socInputHint}>Enter value between 0-100</Text>
            </View>

            <View style={styles.quickSocButtons}>
              {[25, 50, 75, 100].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={styles.quickSocButton}
                  onPress={() => setTempSoC(value.toString())}
                >
                  <Text style={styles.quickSocText}>{value}%</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setSocModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.updateButton]}
                onPress={updateSoC}
              >
                <Ionicons name="checkmark" size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapContainer: {
    position: 'relative',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomContainer: {
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  
  // Error States
  errorIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 6,
  },
  
  // Compact Search
  searchContainer: {
    position: 'absolute',
    top: 50,
    left: 12,
    right: 12,
    zIndex: 1000,
  },
  searchBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  searchResults: {
    backgroundColor: '#fff',
    marginTop: 6,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    maxHeight: 220,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  searchResultLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  searchResultIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResultText: {
    marginLeft: 10,
    flex: 1,
  },
  searchResultName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 2,
  },
  searchResultAddress: {
    fontSize: 11,
    color: '#64748b',
  },
  noResults: {
    padding: 24,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 6,
  },

  // Compact SoC
  socContainer: {
    position: 'absolute',
    top: 120,
    right: 12,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  socCard: {
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
    borderLeftWidth: 3,
  },
  socTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  socValue: {
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 18,
  },
  socRange: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },

  // Map Toggle
  mapToggle: {
    position: 'absolute',
    bottom: 20,
    right: 12,
    backgroundColor: COLORS.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },

  // Compact Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#fff',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  headerLeft: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  carInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  carText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  profileButton: {
    padding: 2,
  },
  profileAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },

  // Compact Quick Actions
  quickActions: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48.5%',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    borderRadius: 14,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionPrimary: {
    backgroundColor: COLORS.primary,
  },
  actionBlue: {
    backgroundColor: '#3b82f6',
  },
  actionGreen: {
    backgroundColor: '#10b981',
  },
  actionRed: {
    backgroundColor: '#ef4444',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0f172a',
    textAlign: 'center',
  },

  // Compact Stations
  nearestStations: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  stationCard: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  stationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginBottom: 10,
  },
  stationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stationInfo: {
    flex: 1,
  },
  stationName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 5,
  },
  stationMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  stationMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  stationMetaText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  stationMetaIcon: {
    marginRight: 4,
  },
  metaDivider: {
    width: 1,
    height: 16,
    backgroundColor: '#e2e8f0',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  stationArrow: {
    position: 'absolute',
    right: 14,
    top: 14,
    backgroundColor: '#f8fafc',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Marker Styles
  markerContainer: {
    padding: 7,
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#fff',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },

  // Compact Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 3,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  modalClose: {
    padding: 2,
  },
  socInputWrapper: {
    marginBottom: 16,
  },
  socInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
  },
  socInput: {
    fontSize: 38,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
    minWidth: 100,
  },
  socUnit: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94a3b8',
    marginLeft: 6,
  },
  socInputHint: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  quickSocButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 6,
  },
  quickSocButton: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  quickSocText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  updateButton: {
    backgroundColor: COLORS.primary,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});