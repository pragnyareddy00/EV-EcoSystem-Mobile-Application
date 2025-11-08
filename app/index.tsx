// app/screens/OnboardingScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  GestureResponderEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Onboarding from 'react-native-onboarding-swiper';
import { useAuth } from '../context/AuthContext';

// Get screen dimensions
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// --- Type Definitions ---
interface DotProps {
  selected: boolean;
}

interface DoneButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
  disabled?: boolean;
}

interface SkipButtonProps {
  onPress?: (event: GestureResponderEvent) => void;
}

// --- Custom Components ---
const CustomDot: React.FC<DotProps> = ({ selected }) => (
  <View
    style={[
      styles.dot,
      {
        backgroundColor: selected ? '#007BFF' : '#D1D5DB',
        transform: [{ scale: selected ? 1.2 : 1 }],
      },
    ]}
  />
);

const CustomDoneButton: React.FC<DoneButtonProps> = ({
  onPress,
  disabled = false,
}) => (
  <View style={styles.buttonWrapper}>
    <TouchableOpacity
      style={[styles.buttonContainer, disabled && styles.buttonDisabled]}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Get Started"
      accessibilityHint="Complete onboarding and go to login"
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={['#007BFF', '#0056CC']}
        style={styles.buttonGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.buttonText}>Get Started</Text>
        <Ionicons
          name="arrow-forward"
          size={20}
          color="#FFFFFF"
          style={styles.buttonIcon}
        />
      </LinearGradient>
    </TouchableOpacity>
  </View>
);

const CustomSkipButton: React.FC<SkipButtonProps> = ({ onPress }) => (
  <TouchableOpacity
    style={styles.skipButton}
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel="Skip"
    accessibilityHint="Skip onboarding and go to login"
    activeOpacity={0.7}
  >
    <Text style={styles.skipText}>Skip</Text>
  </TouchableOpacity>
);

// --- Main Onboarding Screen ---
const OnboardingScreen: React.FC = () => {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Index: User:', user, 'Loading:', authLoading);
    if (authLoading) return;

    if (user) {
      // If user is logged in, redirect to home screen
      router.replace('/(tabs)/home');
    }
  }, [user, authLoading, router]);

  const handleComplete = async () => {
    if (isLoading) return;

    setIsLoading(true);
    try {
      await AsyncStorage.setItem('hasOnboarded', 'true');
      await AsyncStorage.setItem(
        'onboardingCompletedAt',
        new Date().toISOString()
      );

      // Small delay for better UX
      setTimeout(() => {
        router.replace('/(auth)/login'); // Corrected path to login
      }, 500);
    } catch (error) {
      console.error('Failed to save onboarding status:', error);
      Alert.alert(
        'Error',
        'Failed to complete onboarding. Please try again.',
        [{ text: 'OK', onPress: () => setIsLoading(false) }]
      );
    }
  };

  const handleSkip = async () => {
    Alert.alert(
      'Skip Onboarding?',
      'You can always view this information later in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Skip', onPress: handleComplete },
      ]
    );
  };

  const onboardingPages = [
    {
      backgroundColor: '#F8F9FA',
      image: (
        <View style={styles.imageContainer}>
          {/* TEMPORARY PLACEHOLDER FOR TESTING */}
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="map-outline" size={80} color="#999" />
            <Text style={styles.placeholderText}>Image 1 Placeholder</Text>
          </View>
        </View>
      ),
      title: 'Intelligent Station Discovery',
      subtitle:
        "Find verified stations with our real-time 'Station Confidence Index' for reliable charging",
    },
    {
      backgroundColor: '#F8F9FA',
      image: (
        <View style={styles.imageContainer}>
          {/* TEMPORARY PLACEHOLDER FOR TESTING */}
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="battery-charging-outline" size={80} color="#999" />
            <Text style={styles.placeholderText}>Image 2 Placeholder</Text>
          </View>
        </View>
      ),
      title: 'Personal Battery DNA',
      subtitle:
        'Our AI learns your car and driving style for hyper-accurate range predictions and optimal charging',
    },
    {
      backgroundColor: '#F8F9FA',
      image: (
        <View style={styles.imageContainer}>
          {/* TEMPORARY PLACEHOLDER FOR TESTING */}
          <View style={[styles.image, styles.placeholderImage]}>
            <Ionicons name="people-outline" size={80} color="#999" />
            <Text style={styles.placeholderText}>Image 3 Placeholder</Text>
          </View>
        </View>
      ),
      title: 'Powering the EV Community',
      subtitle:
        'Join fellow drivers to verify stations, report wait times, and find the perfect charging bay together',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

      <Onboarding
        pages={onboardingPages}
        onDone={handleComplete}
        onSkip={handleSkip}
        showSkip={true}
        showNext={true}
        showDone={true}
        bottomBarHighlight={false}
        controlStatusBar={false}
        // Custom components with proper positioning
        DoneButtonComponent={(props) => <CustomDoneButton {...props} />}
        SkipButtonComponent={CustomSkipButton}
        DotComponent={CustomDot}
        // Custom styles
        containerStyles={styles.onboardingContainer}
        imageContainerStyles={styles.onboardingImageContainer}
        titleStyles={styles.title}
        subTitleStyles={styles.subtitle}
        // Add bottom bar height to fix button positioning
        bottomBarHeight={80}
      />
    </View>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  onboardingContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  onboardingImageContainer: {
    paddingBottom: 40,
  },
  imageContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: screenHeight * 0.4,
    marginBottom: 20,
  },
  image: {
    width: Math.min(screenWidth * 0.8, 300),
    height: Math.min(screenWidth * 0.8, 300),
    maxWidth: 300,
    maxHeight: 300,
  },
  // Added styles for the placeholder
  placeholderImage: {
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
    marginTop: 10,
  },
  title: {
    fontSize: screenWidth > 375 ? 28 : 24,
    fontWeight: 'bold',
    color: '#1A202C',
    textAlign: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
    lineHeight: screenWidth > 375 ? 34 : 30,
  },
  subtitle: {
    fontSize: screenWidth > 375 ? 17 : 15,
    color: '#4A5568',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: screenWidth > 375 ? 26 : 22,
    marginBottom: 20,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 6,
  },
  buttonWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginBottom: 30, // Added margin to ensure proper spacing from bottom
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 30,
    elevation: 3,
    shadowColor: '#007BFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: '#007BFF', // Fallback background
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    width: '100%',
    minHeight: 54,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  buttonIcon: {
    marginLeft: 4,
  },
  skipButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginRight: 10,
  },
  skipText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default OnboardingScreen;