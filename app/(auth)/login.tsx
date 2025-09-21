// app/(auth)/login.tsx
import { Ionicons } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { useRouter } from 'expo-router';
import { PhoneAuthProvider } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Card, StyledButton, StyledTextInput } from '../../components/StyledComponents';
import { auth } from '../../config/firebaseConfig';
import { COLORS, FONTS, SPACING } from '../../constants/colors';

export default function LoginScreen() {
  const router = useRouter();
  const recaptchaVerifier = useRef(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePhoneNumber = (phone: string): boolean => {
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    // Check if it's a valid Indian number (with or without country code)
    if (cleanPhone.length === 10) {
      return /^[6-9]\d{9}$/.test(cleanPhone); // Indian mobile numbers start with 6-9
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      return /^91[6-9]\d{9}$/.test(cleanPhone);
    }
    return false;
  };

  const formatPhoneNumber = (phone: string): string => {
    const cleanPhone = phone.replace(/[^0-9]/g, '');
    
    if (cleanPhone.length === 10) {
      return `+91${cleanPhone}`;
    } else if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
      return `+${cleanPhone}`;
    }
    return phone;
  };

  const sendVerification = async () => {
    setError('');
    
    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid Indian mobile number');
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const phoneProvider = new PhoneAuthProvider(auth);
      const id = await phoneProvider.verifyPhoneNumber(
        formattedPhone,
        recaptchaVerifier.current!
      );
      
      // Navigate to OTP screen
      router.push({
        pathname: '/(auth)/otp',
        params: { 
          verificationId: id, 
          phoneNumber: formattedPhone.replace('+91', '').replace(/(\d{5})(\d{5})/, '$1 $2')
        },
      });
    } catch (error: any) {
      console.error('Verification error:', error);
      setError(error.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={auth.app.options}
        title="Prove you are not a robot"
        cancelLabel="Close"
      />
      
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Section */}
          <View style={styles.header}>
            {/* You can replace this with your actual logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="car" size={40} color={COLORS.primary} />
              </View>
            </View>
            
            <Text style={styles.brandName}>EVOS</Text>
            <Text style={styles.tagline}>Electric Vehicle EcoSystem for Navigation</Text>
          </View>

          {/* Login Card */}
          <Card style={styles.loginCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Welcome Back!</Text>
              <Text style={styles.subtitle}>
                Enter your phone number to continue your EV journey
              </Text>
            </View>

            <View style={styles.form}>
              <StyledTextInput
                label="Phone Number"
                placeholder="98765 43210"
                value={phoneNumber}
                onChangeText={(text) => {
                  setPhoneNumber(text);
                  if (error) setError(''); // Clear error when user types
                }}
                keyboardType="phone-pad"
                textContentType="telephoneNumber"
                autoFocus
                error={error}
                leftIcon={
                  <View style={styles.countryCode}>
                    <Text style={styles.countryCodeText}>🇮🇳 +91</Text>
                  </View>
                }
              />

              <StyledButton
                title="Send Verification Code"
                onPress={sendVerification}
                loading={isLoading}
                disabled={!phoneNumber.trim() || isLoading}
                icon={!isLoading && <Ionicons name="arrow-forward" size={18} color={COLORS.textWhite} />}
                style={styles.loginButton}
              />
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
  },
  logoContainer: {
    marginBottom: SPACING.md,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: FONTS.sizes.display,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    letterSpacing: 2,
  },
  tagline: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    maxWidth: 250,
  },
  loginCard: {
    marginBottom: SPACING.xl,
  },
  cardHeader: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: SPACING.md,
  },
  countryCode: {
    paddingRight: SPACING.sm,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  countryCodeText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  loginButton: {
    marginTop: SPACING.sm,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginTop: 'auto',
  },
  footerText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});