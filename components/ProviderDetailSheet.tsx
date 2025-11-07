// components/ProviderDetailSheet.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Linking,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the Provider type, matching the one in sos.tsx
interface Provider {
  id: string;
  name: string;
  type: 'charging' | 'towing' | 'repair';
  rating: number;
  etaMinutes: number;
  phone: string;
  location: { latitude: number; longitude: number };
  pricing?: string;
  distance?: number;
}

export interface ProviderDetailSheetProps {
  provider: Provider | null;
  isVisible: boolean;
  onClose: () => void;
  onConfirm: (provider: Provider) => void;
}

// Helper to get provider icon and color
const getProviderInfo = (type: string) => {
  switch (type) {
    case 'towing':
      return { icon: 'car-sport', color: COLORS.error };
    case 'charging':
      return { icon: 'battery-charging', color: COLORS.success };
    case 'repair':
      return { icon: 'build', color: COLORS.warning };
    default:
      return { icon: 'help', color: COLORS.textSecondary };
  }
};

export const ProviderDetailSheet = React.memo(({
  provider,
  isVisible,
  onClose,
  onConfirm,
}: ProviderDetailSheetProps) => {
  const slideAnimation = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (isVisible && provider) {
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
  }, [isVisible, provider]);

  const handleCall = async () => {
    if (!provider?.phone) {
      Alert.alert('No Number', 'This provider has not listed a phone number.');
      return;
    }
    await Linking.openURL(`tel:${provider.phone}`);
  };

  if (!provider) return null;

  const { icon, color } = getProviderInfo(provider.type);

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
            { transform: [{ translateY: slideAnimation }] },
          ]}
        >
          {/* Sheet Handle */}
          <View style={styles.sheetHandle} />

          {/* Provider Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View
                style={[
                  styles.sheetIconContainer,
                  { backgroundColor: `${color}1A` },
                ]}
              >
                <Ionicons
                  name={icon as any}
                  size={24}
                  color={color}
                />
              </View>
              <View style={styles.sheetHeaderText}>
                <Text style={styles.sheetProviderName} numberOfLines={1}>
                  {provider.name}
                </Text>
                <View style={styles.sheetBadgeRow}>
                  <View style={styles.sheetBadge}>
                    <Text style={styles.sheetBadgeText}>
                      {provider.type.toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.sheetRating}>
                    <Ionicons name="star" size={14} color={COLORS.warning} />
                    <Text style={styles.sheetRatingText}>{provider.rating}</Text>
                  </View>
                </View>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseButton}>
              <Ionicons name="close" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Provider Details */}
          <ScrollView
            style={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.detailGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailValue}>
                  {provider.distance ? `${provider.distance.toFixed(1)} km` : 'N/A'}
                </Text>
                <Text style={styles.detailLabel}>Distance</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailValue}>{provider.etaMinutes} min</Text>
                <Text style={styles.detailLabel}>Est. Arrival</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailValue}>{provider.pricing || 'N/A'}</Text>
                <Text style={styles.detailLabel}>Est. Price</Text>
              </View>
            </View>

            {/* Other Info */}
            <View style={styles.sheetDetailItem}>
              <Ionicons name="call-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.sheetDetailText}>{provider.phone}</Text>
            </View>
            <View style={styles.sheetDetailItem}>
              <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.sheetDetailText}>
                24/7 Roadside Assistance
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={handleCall}
            >
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={styles.callButtonText}>Call Provider</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.confirmButton]}
              onPress={() => onConfirm(provider)}
            >
              <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
              <Text style={styles.confirmButtonText}>Confirm Request</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

// --- Styles (Adapted from StationDetailSheet and sos.tsx) ---
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
    backgroundColor: COLORS.backgroundCard,
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
    backgroundColor: COLORS.border,
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
  sheetIconContainer: {
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
  sheetProviderName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  sheetBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  sheetBadge: {
    backgroundColor: COLORS.primary10,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    alignSelf: 'flex-start',
  },
  sheetBadgeText: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  sheetRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  sheetRatingText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  sheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  sheetContent: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  detailGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    backgroundColor: COLORS.neutral50,
    borderRadius: RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  detailBox: {
    flex: 1,
    padding: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.md,
  },
  detailValue: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  detailLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  sheetDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  sheetDetailText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginLeft: 12,
    flex: 1,
  },
  sheetFooter: {
    flexDirection: 'row',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
    gap: 8,
  },
  callButton: {
    backgroundColor: COLORS.primary10,
    borderWidth: 1,
    borderColor: COLORS.primary20,
  },
  callButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});