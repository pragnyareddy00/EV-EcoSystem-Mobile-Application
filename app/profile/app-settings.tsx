import { Cog, Moon, Sun } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';

type Theme = 'light' | 'dark' | 'system';

export default function AppSettingsScreen() {
  const [theme, setTheme] = useState<Theme>('system');
  const [stationAlerts, setStationAlerts] = useState(true);
  const [chargingReminders, setChargingReminders] = useState(false);

  const renderThemeOption = (value: Theme, title: string, IconComponent: React.ComponentType<any>) => (
    <TouchableOpacity
      style={[
        styles.themeButton,
        theme === value && styles.themeButtonActive,
      ]}
      onPress={() => setTheme(value)}
    >
      <IconComponent
        size={24}
        color={theme === value ? COLORS.primary : COLORS.textSecondary}
      />
      <Text
        style={[
          styles.themeButtonText,
          theme === value && styles.themeButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* --- Theme Settings Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.themeSelector}>
            {renderThemeOption('light', 'Light', Sun)}
            {renderThemeOption('dark', 'Dark', Moon)}
            {renderThemeOption('system', 'System', Cog)}
          </View>
        </View>

        {/* --- Notification Settings Section --- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>New Station Alerts</Text>
              <Text style={styles.toggleSubtitle}>
                Notify when a new station is added near you.
              </Text>
            </View>
            <Switch
              value={stationAlerts}
              onValueChange={setStationAlerts}
              // --- THIS IS THE FIX ---
              // Replaced primaryLight with primary200 from the new theme
              trackColor={{ false: COLORS.neutral200, true: COLORS.primary200 }}
              thumbColor={stationAlerts ? COLORS.primary : COLORS.neutral300}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleTextContainer}>
              <Text style={styles.toggleTitle}>Charging Reminders</Text>
              <Text style={styles.toggleSubtitle}>
                Remind you to plug in your EV at night.
              </Text>
            </View>
            <Switch
              value={chargingReminders}
              onValueChange={setChargingReminders}
              // --- THIS IS THE FIX ---
              // Replaced primaryLight with primary200 from the new theme
              trackColor={{ false: COLORS.neutral200, true: COLORS.primary200 }}
              thumbColor={chargingReminders ? COLORS.primary : COLORS.neutral300}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  section: {
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  themeSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.neutral100,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
  },
  themeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.sm,
    gap: SPACING.sm,
  },
  themeButtonActive: {
    backgroundColor: COLORS.backgroundCard,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  themeButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
  },
  themeButtonTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  toggleRow: {
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleTextContainer: {
    flex: 1,
    marginRight: SPACING.md,
  },
  toggleTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  toggleSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
});

