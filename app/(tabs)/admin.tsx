import { router } from 'expo-router';
import { collection, DocumentData, onSnapshot, query, Timestamp, where } from 'firebase/firestore';
import {
  Archive,
  CalendarDays,
  Check,
  CheckCheck,
  Clock,
  FileText,
  Mail,
  MapPin,
  Search,
  User,
  X,
  XCircle
} from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Card } from '../../components/Card';
import { COLORS, FONTS, RADIUS, SHADOWS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import {
  approveContribution,
  db,
  getContributionCounts,
  rejectContribution,
} from '../../services/firebase';

// Type for the active tab
type ActiveTab = 'pending' | 'approved' | 'rejected';

// Type for a contribution document
interface Contribution extends DocumentData {
  id: string;
  stationName: string;
  address: string;
  notes?: string;
  photoURL: string;
  status: 'pending' | 'approved' | 'rejected';
  contributorName: string;
  contributorEmail: string;
  submittedAt: Timestamp;
  location?: {
    latitude: number;
    longitude: number;
  };
}

// --- StatCard Component ---
const StatCard = ({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}) => (
  <Card style={styles.statCard}>
    <View style={[styles.statIconContainer, { backgroundColor: bgColor }]}>
      {icon}
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </Card>
);

// --- ContributionCard Component ---
const ContributionCard = ({
  item,
  onApprove,
  onReject,
}: {
  item: Contribution;
  onApprove: () => void;
  onReject: () => void;
}) => {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  
  // Convert Firebase Timestamp to a readable Date
  const submittedDate = item.submittedAt
    ? new Date(item.submittedAt.seconds * 1000).toLocaleDateString()
    : 'Unknown Date';

  const handleApprove = async () => {
    setIsApproving(true);
    await onApprove();
  };

  const handleReject = async () => {
    setIsRejecting(true);
    await onReject();
  };

  return (
    <Card style={styles.contributionCard}>
      <TouchableOpacity onPress={() => Linking.openURL(item.photoURL)}>
        <Image source={{ uri: item.photoURL }} style={styles.cardImage} />
      </TouchableOpacity>
      
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle}>{item.stationName}</Text>
        
        <View style={styles.cardInfoRow}>
          <MapPin size={14} color={COLORS.textSecondary} />
          <Text style={styles.cardInfoText} selectable>{item.address}</Text>
        </View>
        
        {!!item.notes && (
          <View style={styles.cardInfoRow}>
            <FileText size={14} color={COLORS.textSecondary} />
            <Text style={styles.cardInfoText}>{item.notes}</Text>
          </View>
        )}

        <View style={styles.divider} />
        
        <Text style={styles.cardSectionTitle}>Submitted By</Text>
        <View style={styles.cardInfoRow}>
          <User size={14} color={COLORS.textSecondary} />
          <Text style={styles.cardInfoText}>{item.contributorName}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <Mail size={14} color={COLORS.textSecondary} />
          <Text style={styles.cardInfoText} selectable>{item.contributorEmail}</Text>
        </View>
        <View style={styles.cardInfoRow}>
          <CalendarDays size={14} color={COLORS.textSecondary} />
          <Text style={styles.cardInfoText}>{submittedDate}</Text>
        </View>

        {item.status === 'pending' && (
          <View style={styles.cardActions}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.rejectButton]}
              onPress={handleReject}
              disabled={isApproving || isRejecting}
            >
              {isRejecting ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <>
                  <XCircle size={18} color={COLORS.error} />
                  <Text style={[styles.actionButtonText, styles.rejectButtonText]}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, styles.approveButton]}
              onPress={handleApprove}
              disabled={isApproving || isRejecting}
            >
              {isApproving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Check size={18} color={COLORS.white} />
                  <Text style={[styles.actionButtonText, styles.approveButtonText]}>Approve</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Card>
  );
};

// --- Main Admin Screen ---
export default function AdminScreen() {
  const { userProfile, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [counts, setCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
    today: 0,
  });

  const [contributions, setContributions] = useState<Contribution[]>([]);

  // Check user role and redirect if not admin
  useEffect(() => {
    if (!authLoading && userProfile && userProfile.role !== 'admin') {
      router.replace('/(tabs)/home');
    }
  }, [userProfile, authLoading]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If not admin, don't render anything (will be redirected by useEffect)
  if (!userProfile || userProfile.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Redirecting...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // --- Fetch Counts ---
  const fetchCounts = useCallback(async () => {
    try {
      const newCounts = await getContributionCounts();
      setCounts(newCounts);
    } catch (error) {
      console.error('Error fetching counts:', error);
      Alert.alert('Error', 'Could not fetch dashboard counts.');
    }
  }, []);

  // --- Fetch Lists (Real-time) ---
  useEffect(() => {
    setIsLoading(true);
    
    const q = query(
      collection(db, 'userContributions'), 
      where('status', '==', activeTab)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: Contribution[] = [];
      snapshot.forEach(doc => {
        items.push({ id: doc.id, ...doc.data() } as Contribution);
      });
      
      // Sort by newest first
      items.sort((a, b) => (b.submittedAt?.seconds || 0) - (a.submittedAt?.seconds || 0));
      
      setContributions(items);
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching contributions:', error);
      Alert.alert('Error', 'Could not fetch contributions list.');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [activeTab]);

  // --- Initial Load & Refresh ---
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchCounts();
    setRefreshing(false);
  }, [fetchCounts]);

  // Fetch counts on initial load
  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // --- Handle Approve/Reject Actions ---
  const handleApprove = async (item: Contribution) => {
    try {
      await approveContribution(item);
      Alert.alert('Success', `Station "${item.stationName}" has been approved and added to the map!`);
      fetchCounts();
    } catch (error: any) {
      console.error('Approve error:', error);
      Alert.alert('Error', `Failed to approve station: ${error.message}`);
    }
  };

  const handleReject = async (itemId: string) => {
    try {
      await rejectContribution(itemId);
      Alert.alert('Success', 'Submission has been rejected.');
      fetchCounts();
    } catch (error: any) {
      console.error('Reject error:', error);
      Alert.alert('Error', `Failed to reject submission: ${error.message}`);
    }
  };
  
  // --- Filter Logic ---
  const filteredContributions = contributions.filter(item => 
    item.stationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.contributorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.contributorEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- Render Functions ---
  const renderList = () => {
    let icon: React.ReactNode;
    let title: string;
    let subtitle: string;

    if (isLoading) {
      return (
        <View style={styles.emptyListContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }

    if (filteredContributions.length > 0) {
      return (
        <View style={styles.listContainer}>
          {filteredContributions.map(item => (
            <ContributionCard 
              key={item.id}
              item={item}
              onApprove={() => handleApprove(item)}
              onReject={() => handleReject(item.id)}
            />
          ))}
        </View>
      );
    }
    
    if (searchQuery) {
       icon = <Search size={48} color={COLORS.neutral300} />;
       title = 'No results found';
       subtitle = `No ${activeTab} items match your search.`;
    } else if (activeTab === 'pending') {
      icon = <Archive size={48} color={COLORS.neutral300} />;
      title = 'No pending items';
      subtitle = 'No new submissions to review right now.';
    } else if (activeTab === 'approved') {
      icon = <CheckCheck size={48} color={COLORS.neutral300} />;
      title = 'No approved items';
      subtitle = 'No submissions have been approved yet.';
    } else {
      icon = <XCircle size={48} color={COLORS.neutral300} />;
      title = 'No rejected items';
      subtitle = 'No submissions have been rejected.';
    }

    return (
      <View style={styles.emptyListContainer}>
        <View style={styles.emptyListIcon}>{icon}</View>
        <Text style={styles.emptyListTitle}>{title}</Text>
        <Text style={styles.emptyListSubtitle}>{subtitle}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Station Review Hub</Text>
          <Text style={styles.subtitle}>
            Review and approve community-submitted stations
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon={<Clock size={24} color={COLORS.warningDark || '#d97706'} />}
            label="Pending Review"
            value={counts.pending.toString()}
            color={COLORS.warningDark || '#d97706'}
            bgColor={COLORS.warningLight || '#fef3c7'}
          />
          <StatCard
            icon={<Check size={24} color={COLORS.successDark || '#059669'} />}
            label="Approved"
            value={counts.approved.toString()}
            color={COLORS.successDark || '#059669'}
            bgColor={COLORS.successLight || '#dcfce7'}
          />
          <StatCard
            icon={<X size={24} color={COLORS.errorDark || '#dc2626'} />}
            label="Rejected"
            value={counts.rejected.toString()}
            color={COLORS.errorDark || '#dc2626'}
            bgColor={COLORS.errorLight || '#fee2e2'}
          />
          <StatCard
            icon={<CalendarDays size={24} color={COLORS.infoDark || '#1E5C87'} />}
            label="Today"
            value={counts.today.toString()}
            color={COLORS.infoDark || '#1E5C87'}
            bgColor={COLORS.infoLight || '#d1ecf1'}
          />
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'pending' && styles.tabActive]}
            onPress={() => setActiveTab('pending')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'pending' && styles.tabTextActive,
              ]}
            >
              Pending ({counts.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'approved' && styles.tabActive]}
            onPress={() => setActiveTab('approved')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'approved' && styles.tabTextActive,
              ]}
            >
              Approved ({counts.approved})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'rejected' && styles.tabActive]}
            onPress={() => setActiveTab('rejected')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'rejected' && styles.tabTextActive,
              ]}
            >
              Rejected ({counts.rejected})
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          <View style={styles.searchContainer}>
            <Search size={20} color={COLORS.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.batchButton}>
            <FileText size={16} color={COLORS.primary} />
            <Text style={styles.batchButtonText}>Batch</Text>
          </TouchableOpacity>
        </View>

        {renderList()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
  },
  statCard: {
    width: '48%',
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  statValue: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginTop: SPACING.md,
    backgroundColor: COLORS.white
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: FONTS.weights.bold,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: SPACING.lg,
    gap: SPACING.md,
    backgroundColor: COLORS.backgroundSoft,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundCard,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
  },
  batchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundCard,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  batchButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.primary,
  },
  listContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
  },
  emptyListContainer: {
    alignItems: 'center',
    paddingTop: SPACING.xxxl,
    paddingHorizontal: SPACING.lg,
  },
  emptyListIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.neutral100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emptyListTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  emptyListSubtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  // Contribution Card Styles
  contributionCard: {
    padding: 0,
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  cardImage: {
    width: '100%',
    height: 180,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    backgroundColor: COLORS.neutral100,
  },
  cardContent: {
    padding: SPACING.md,
  },
  cardTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardInfoText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  cardSectionTitle: {
    fontSize: FONTS.sizes.xs,
    fontWeight: FONTS.weights.semibold,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: RADIUS.md,
    gap: SPACING.sm,
  },
  actionButtonText: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.bold,
  },
  rejectButton: {
    backgroundColor: COLORS.errorLight,
    borderWidth: 1,
    borderColor: COLORS.errorLight,
  },
  rejectButtonText: {
    color: COLORS.errorDark,
  },
  approveButton: {
    backgroundColor: COLORS.success,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  approveButtonText: {
    color: COLORS.white,
  },
});