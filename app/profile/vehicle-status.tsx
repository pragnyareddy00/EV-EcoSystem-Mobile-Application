import { useRouter } from 'expo-router';
import { BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { StyledButton } from '../../components/StyledComponents';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

// Helper to get battery icon and color based on SOC
const getBatteryInfo = (soc: number) => {
  if (soc > 85) {
    return { Icon: BatteryFull, color: COLORS.success, status: 'Full' };
  }
  if (soc > 60) {
    return { Icon: BatteryCharging, color: COLORS.primary, status: 'Good' };
  }
  if (soc > 30) {
    return { Icon: BatteryMedium, color: COLORS.warning, status: 'Moderate' };
  }
  return { Icon: BatteryLow, color: COLORS.error, status: 'Low' };
};

export default function VehicleStatusScreen() {
  const router = useRouter();
  const { userProfile, updateVehicleState } = useAuth();
  
  const [currentSOC, setCurrentSOC] = useState(
    userProfile?.vehicleState?.currentSOC || 85
  );
  const [tempSOC, setTempSOC] = useState(
    (userProfile?.vehicleState?.currentSOC || 85).toString()
  );
  const [isLoading, setIsLoading] = useState(false);

  // Update local state if the context changes
  useEffect(() => {
    const socFromContext = userProfile?.vehicleState?.currentSOC || 85;
    setCurrentSOC(socFromContext);
    setTempSOC(socFromContext.toString());
  }, [userProfile?.vehicleState?.currentSOC]);

  const { Icon, color, status } = getBatteryInfo(currentSOC);
  const realWorldRangeKm = userProfile?.vehicle?.realWorldRangeKm || 0;
  const estimatedRange = Math.round((currentSOC / 100) * realWorldRangeKm);

  const handleSave = async () => {
    Keyboard.dismiss();
    const newSOC = parseInt(tempSOC, 10);

    if (isNaN(newSOC) || newSOC < 0 || newSOC > 100) {
      Alert.alert(
        'Invalid Input',
        'Please enter a valid battery percentage between 0 and 100.'
      );
      return;
    }

    setIsLoading(true);
    try {
      await updateVehicleState({ currentSOC: newSOC });
      setIsLoading(false);
      Alert.alert('Success', `Battery level updated to ${newSOC}%`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error('Failed to update SOC:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to update battery level. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Vehicle Status</Text>
            <Text style={styles.subtitle}>
              {userProfile?.vehicle?.make} {userProfile?.vehicle?.model}
            </Text>
          </View>

          {/* Battery Visual */}
          <View style={styles.batteryContainer}>
            <View style={[styles.batteryVisual, { borderColor: color }]}>
              <View
                style={[
                  styles.batteryFill,
                  { height: `${currentSOC}%`, backgroundColor: color },
                ]}
              />
              <Icon
                size={80}
                color={color}
                style={styles.batteryIcon}
              />
            </View>
            <View style={styles.batteryCap} />
          </View>

          {/* Stats Display */}
          <View style={styles.statsContainer}>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: color }]}>
                {currentSOC}%
              </Text>
              <Text style={styles.statLabel}>Current SOC</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: COLORS.textPrimary }]}>
                ~{estimatedRange} km
              </Text>
              <Text style={styles.statLabel}>Estimated Range</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: color }]}>
                {status}
              </Text>
              <Text style={styles.statLabel}>Status</Text>
            </View>
          </View>

          {/* SOC Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Set Current Battery Level</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.socInput}
                value={tempSOC}
                onChangeText={setTempSOC}
                keyboardType={Platform.OS === 'ios' ? 'number-pad' : 'numeric'}
                placeholder="85"
                maxLength={3}
                placeholderTextColor={COLORS.neutral300}
                selectionColor={COLORS.primary}
                onFocus={() => setTempSOC('')}
              />
              <Text style={styles.socUnit}>%</Text>
            </View>
            
            <View style={styles.quickSocButtons}>
              {[25, 50, 75, 100].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.quickSocButton,
                    tempSOC === value.toString() && styles.quickSocButtonActive
                  ]}
                  onPress={() => setTempSOC(value.toString())}
                >
                  <Text style={[
                    styles.quickSocText,
                    tempSOC === value.toString() && styles.quickSocTextActive
                  ]}>
                    {value}%
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Save Button */}
          <StyledButton
            title="Save Changes"
            onPress={handleSave}
            loading={isLoading}
            disabled={isLoading}
            style={styles.saveButton}
            icon={isLoading ? <ActivityIndicator color={COLORS.white} /> : <Zap size={18} color={COLORS.white} />}
          />
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxxl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  batteryContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  batteryCap: {
    width: 60,
    height: 10,
    backgroundColor: COLORS.neutral200,
    borderTopLeftRadius: RADIUS.sm,
    borderTopRightRadius: RADIUS.sm,
    marginBottom: -2,
  },
  batteryVisual: {
    width: 200,
    height: 300,
    borderWidth: 8,
    borderRadius: RADIUS.xxl,
    backgroundColor: COLORS.background,
    borderColor: COLORS.neutral200,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    ...SHADOWS.md,
  },
  batteryFill: {
    width: '100%',
    backgroundColor: COLORS.primary,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  batteryIcon: {
    alignSelf: 'center',
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -40 }],
    opacity: 0.1,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignSelf: 'stretch',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xxxl,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  inputSection: {
    width: '100%',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  inputLabel: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socInput: {
    fontSize: FONTS.sizes.hero,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    textAlign: 'center',
    minWidth: 120,
    padding: 0,
  },
  socUnit: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
    paddingTop: 10,
  },
  quickSocButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
    width: '100%',
  },
  quickSocButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  quickSocButtonActive: {
    backgroundColor: COLORS.primary10,
    borderColor: COLORS.primary,
  },
  quickSocText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textSecondary,
  },
  quickSocTextActive: {
    color: COLORS.primary,
  },
  saveButton: {
    width: '100%',
    marginTop: 'auto',
  },
});