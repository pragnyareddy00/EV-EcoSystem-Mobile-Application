import { useRouter } from 'expo-router';
import {
  Car,
  ChevronRight,
  Edit,
  LogOut,
  MapPin,
  MapPinPlus,
  Settings,
  User,
} from 'lucide-react-native';
// --- NEW IMPORTS ---
import {
  addDoc,
  collection,
  getDocs,
  query
} from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { vehicleData } from '../../constants/vehicles';
import { db } from '../../services/firebase';
// --- END NEW IMPORTS ---
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../../components/Card';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile, onLogout } = useAuth();
  
  // --- NEW: ONE-TIME UPLOAD LOGIC ---
  const [hasUploaded, setHasUploaded] = useState(false);
  useEffect(() => {
    const uploadVehiclesOnce = async () => {
      if (hasUploaded) return; // Don't run more than once
      setHasUploaded(true); // Set flag immediately

      try {
        // 1. Check if vehicles are already in the database
        const vehiclesCollectionRef = collection(db, 'vehicles');
        const existingVehicles = await getDocs(query(vehiclesCollectionRef));
        
        if (existingVehicles.size > 0) {
          console.log('[Vehicle Uploader]: Vehicles collection already exists. Skipping upload.');
          return; // Don't upload if data is already there
        }

        // 2. If no vehicles, start the upload
        console.log('[Vehicle Uploader]: Starting vehicle data upload to Firestore...');
        let successCount = 0;

        for (const vehicle of vehicleData) {
          // Use the 'vehicle' object directly
          await addDoc(vehiclesCollectionRef, vehicle);
          console.log(`[Vehicle Uploader]: Added: ${vehicle.make} ${vehicle.model}`);
          successCount++;
        }

        console.log(`[Vehicle Uploader]: --- Upload Complete ---`);
        console.log(`[Vehicle Uploader]: Successfully uploaded ${successCount} vehicles.`);
        Alert.alert('Database Updated', `Successfully uploaded ${successCount} vehicles to Firestore.`);

      } catch (error) {
        console.error('[Vehicle Uploader]: Error:', error);
        Alert.alert('Upload Error', 'Failed to upload vehicle list.');
      }
    };

    // Run the upload logic when the profile screen is loaded
    uploadVehiclesOnce();
  }, [hasUploaded]); // The 'hasUploaded' dependency ensures it only runs once per component mount
  // --- END NEW: ONE-TIME UPLOAD LOGIC ---

  const handleMenuPress = (item: string) => {
    // Navigate to the correct screen based on the title
    if (item === 'My Vehicle') {
      router.push('/profile/my-vehicle');
    } else if (item === 'App Settings') {
      router.push('/profile/app-settings');
    } else if (item === 'Contribute a Station') {
      router.push('/profile/contribute-station');
    } else {
      Alert.alert('Coming Soon', `${item} feature will be available soon!`);
    }
  };

  // --- UPDATED MENU ---
  // "Favorite Stations" is now handled by the 'handleMenuPress' Alert.
  const menuItems = [
    { name: 'my-vehicle', icon: Car, title: 'My Vehicle', subtitle: 'Manage your EV details' },
    { name: 'favorites', icon: MapPin, title: 'Favorite Stations', subtitle: 'Your saved charging locations' },
    { name: 'app-settings', icon: Settings, title: 'App Settings', subtitle: 'Theme and notifications' },
    { name: 'contribute', icon: MapPinPlus, title: 'Contribute a Station', subtitle: 'Help grow the network' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        {/* User Info Card */}
        <Card style={styles.card}>
          <View style={styles.userHeader}>
            <View style={styles.avatar}>
              <User size={32} color={COLORS.primary} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{userProfile?.username || 'EVOS User'}</Text>
              <Text style={styles.userEmail}>{userProfile?.email}</Text>
              <Text style={styles.userPhone}>{userProfile?.phoneNumber}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => router.push('/profile/edit-profile')}
            >
              <Edit size={16} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        </Card>

        {/* Vehicle Info Card */}
        {userProfile?.vehicle && (
            <Card style={styles.card}>
                <Text style={styles.cardTitle}>Current Vehicle</Text>
                <View style={styles.vehicleHeader}>
                    <Car size={24} color={COLORS.primary} />
                    <View style={styles.vehicleInfo}>
                        <Text style={styles.vehicleName}>
                            {userProfile.vehicle.make} {userProfile.vehicle.model}
                        </Text>
                    </View>
                </View>
                <View style={styles.vehicleStats}>
                    <View style={styles.vehicleStat}>
                        <Text style={styles.statValue}>{userProfile.vehicle.batteryCapacityKWh}</Text>
                        <Text style={styles.statLabel}>kWh Capacity</Text>
                    </View>
                    <View style={styles.vehicleStat}>
                        <Text style={styles.statValue}>{userProfile.vehicle.realWorldRangeKm}</Text>
                        <Text style={styles.statLabel}>km Range</Text>
                    </View>
                </View>
            </Card>
        )}

        {/* Menu Items */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Settings & Preferences</Text>
          <View style={styles.menu}>
            {menuItems.map((item) => (
              <TouchableOpacity key={item.name} style={styles.menuItem} onPress={() => handleMenuPress(item.title)}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <item.icon size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            ))}
            {/* Logout Button */}
            <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: COLORS.errorLight }]}>
                    <LogOut size={20} color={COLORS.error} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuTitle, { color: COLORS.error }]}>Log Out</Text>
                    <Text style={styles.menuSubtitle}>Sign out of your account</Text>
                  </View>
                </View>
                <ChevronRight size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
          </View>
        </Card>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>EVOS v1.0.0</Text>
          <Text style={styles.footerText}>Made for a Greener India 🇮🇳</Text>
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
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  card: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  userPhone: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  vehicleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  vehicleName: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  vehicleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.neutral100,
  },
  vehicleStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  menu: {
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.neutral100,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.neutral100,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 4,
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
  },
});