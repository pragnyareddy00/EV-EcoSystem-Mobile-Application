import { useRouter } from 'expo-router';
import {
  Car,
  ChevronRight,
  CreditCard,
  History,
  Leaf,
  LogOut,
  MapPin,
  Settings,
  User,
  Zap
} from 'lucide-react-native';
import React from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../../components/Card'; // Use our new Card component
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { userProfile, onLogout } = useAuth();

  const handleMenuPress = (item: string) => {
    Alert.alert('Coming Soon', `${item} feature will be available soon!`);
  };

  const menuItems = [
    { icon: Car, title: 'My Vehicle', subtitle: 'Manage your EV details' },
    { icon: MapPin, title: 'Favorite Stations', subtitle: 'Your saved charging locations' },
    { icon: History, title: 'Trip History', subtitle: 'View all your journeys' },
    { icon: CreditCard, title: 'Payment Methods', subtitle: 'Cards and billing info' },
    { icon: Settings, title: 'App Settings', subtitle: 'Notifications and preferences' },
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

        {/* Driving Stats */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Driving Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <MapPin size={20} color={COLORS.primary} />
              <Text style={styles.statBoxValue}>0</Text>
              <Text style={styles.statBoxLabel}>km Driven</Text>
            </View>
            <View style={styles.statBox}>
              <Zap size={20} color="#f59e0b" />
              <Text style={styles.statBoxValue}>0</Text>
              <Text style={styles.statBoxLabel}>kWh Used</Text>
            </View>
            <View style={styles.statBox}>
              <CreditCard size={20} color="#10b981" />
              <Text style={styles.statBoxValue}>₹0</Text>
              <Text style={styles.statBoxLabel}>Total Cost</Text>
            </View>
            <View style={styles.statBox}>
              <Leaf size={20} color="#10b981" />
              <Text style={styles.statBoxValue}>N/A</Text>
              <Text style={styles.statBoxLabel}>Eco Score</Text>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Settings & Preferences</Text>
          <View style={styles.menu}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={styles.menuItem} onPress={() => handleMenuPress(item.title)}>
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIcon}>
                    <item.icon size={20} color={COLORS.primary} />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={styles.menuTitle}>{item.title}</Text>
                    <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#94a3b8" />
              </TouchableOpacity>
            ))}
            {/* Logout Button */}
            <TouchableOpacity style={styles.menuItem} onPress={onLogout}>
                <View style={styles.menuItemLeft}>
                  <View style={[styles.menuIcon, { backgroundColor: '#fee2e2'}]}>
                    <LogOut size={20} color="#ef4444" />
                  </View>
                  <View style={styles.menuContent}>
                    <Text style={[styles.menuTitle, { color: '#ef4444'}]}>Log Out</Text>
                    <Text style={styles.menuSubtitle}>Sign out of your account</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="#94a3b8" />
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
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  userEmail: {
    fontSize: FONTS.sizes.sm,
    color: '#64748b',
    marginTop: 2,
  },
  userPhone: {
    fontSize: FONTS.sizes.sm,
    color: '#64748b',
    marginTop: 2,
  },
  cardTitle: {
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
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
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  vehicleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  vehicleStat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: FONTS.sizes.xs,
    color: '#64748b',
    marginTop: 2,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statBoxValue: {
    fontSize: FONTS.sizes.lg,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: 8,
  },
  statBoxLabel: {
    fontSize: FONTS.sizes.xs,
    color: '#64748b',
    marginTop: 4,
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
    borderBottomColor: '#f1f5f9',
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
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  menuSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: '#64748b',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: 4,
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
    color: '#94a3b8',
  },
});
