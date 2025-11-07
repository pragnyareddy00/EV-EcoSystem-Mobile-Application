import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { Station } from '../constants/stations';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// --- Utility Functions (Moved from home.tsx) ---

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return '#10b981';
    case 'busy': return '#f59e0b';
    default: return '#ef4444';
  }
};

const getStatusBackgroundColor = (status: string) => {
  switch (status) {
    case 'available': return '#dcfce7';
    case 'busy': return '#fef3c7';
    default: return '#fee2e2';
  }
};

const getStationIconName = (type: string) => {
  const typeLower = type?.toLowerCase() || '';
  if (typeLower.includes('fast') || typeLower.includes('dc')) return 'flash';
  if (typeLower.includes('swap')) return 'repeat';
  if (typeLower.includes('tesla')) return 'car-sport';
  return 'battery-charging';
};

// --- Component ---

export interface StationDetailSheetProps {
  station: Station | null;
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (station: Station) => void;
}

export const StationDetailSheet = React.memo(({ station, isVisible, onClose, onNavigate }: StationDetailSheetProps) => {
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isVisible && station) {
      Animated.spring(slideAnimation, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    } else {
      Animated.spring(slideAnimation, {
        toValue: SCREEN_HEIGHT,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }).start();
    }
  }, [isVisible, station]);

  if (!station) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.sheetOverlay}>
        <TouchableOpacity
          style={styles.sheetBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <Animated.View
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnimation }] }
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />

          {/* Station Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={[
                styles.sheetStationIcon,
                { backgroundColor: getStatusBackgroundColor(station.status) }
              ]}>
                <Ionicons
                  name={getStationIconName(station.type) as any}
                  size={24}
                  color={getStatusColor(station.status)}
                />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetStationName} numberOfLines={1}>
                  {station.name}
                </Text>
                <View style={[
                  styles.sheetStatusBadge,
                  { backgroundColor: getStatusBackgroundColor(station.status) }
                ]}>
                  <View style={[
                    styles.sheetStatusDot,
                    { backgroundColor: getStatusColor(station.status) }
                  ]} />
                  <Text style={[
                    styles.sheetStatusText,
                    { color: getStatusColor(station.status) }
                  ]}>
                    {station.status}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseButton}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Station Details */}
          <ScrollView style={styles.sheetContent} showsVerticalScrollIndicator={false}>
            {/* Address */}
            <View style={styles.sheetDetailItem}>
              <Ionicons name="location-outline" size={18} color="#64748b" />
              <Text style={styles.sheetDetailText}>{station.address}</Text>
            </View>

            {/* Power & Type */}
            <View style={styles.sheetDetailRow}>
              <View style={styles.sheetDetailItem}>
                <Ionicons name="flash-outline" size={18} color="#64748b" />
                <Text style={styles.sheetDetailText}>{station.power}kW</Text>
              </View>
              <View style={styles.sheetDetailItem}>
                <Ionicons name="hardware-chip-outline" size={18} color="#64748b" />
                <Text style={styles.sheetDetailText}>{station.type}</Text>
              </View>
            </View>

            {/* Distance */}
            {station.distance !== undefined && (
              <View style={styles.sheetDetailItem}>
                <Ionicons name="navigate-outline" size={18} color="#64748b" />
                <Text style={styles.sheetDetailText}>
                  {station.distance.toFixed(1)} km away
                </Text>
              </View>
            )}

            {/* Services */}
            {station.services && station.services.length > 0 && (
              <View style={styles.sheetServicesContainer}>
                <Text style={styles.sheetServicesTitle}>Available Services</Text>
                <View style={styles.sheetServices}>
                  {station.services.map((service, index) => (
                    <View key={index} style={styles.sheetServiceTag}>
                      <Text style={styles.sheetServiceText}>{service}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Navigation Button */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[
                styles.sheetNavigateButton,
                station.status !== 'available' && styles.sheetNavigateButtonDisabled
              ]}
              onPress={() => {
                onNavigate(station);
                onClose();
              }}
              disabled={station.status === 'offline'}
            >
              <Ionicons name="navigate" size={20} color="#fff" />
              <Text style={styles.sheetNavigateText}>
                {station.status === 'offline' ? 'Station Offline' : 'Start Navigation'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

// --- Styles (Moved from home.tsx) ---

const styles = StyleSheet.create({
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    flex: 1,
  },
  sheetContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.75,
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sheetStationIcon: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  sheetHeaderText: {
    flex: 1,
  },
  sheetStationName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  sheetStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  sheetStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sheetStatusText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sheetContent: {
    flex: 1,
  },
  sheetDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sheetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sheetDetailText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  sheetServicesContainer: {
    paddingVertical: 16,
  },
  sheetServicesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 10,
  },
  sheetServices: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetServiceTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sheetServiceText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  sheetFooter: {
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  sheetNavigateButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    gap: 8,
  },
  sheetNavigateButtonDisabled: {
    backgroundColor: '#94a3b8',
    elevation: 0,
    shadowOpacity: 0,
  },
  sheetNavigateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});