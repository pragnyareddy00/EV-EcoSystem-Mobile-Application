// app/(auth)/otp.tsx
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { OTPInput } from '../../components/OTPInput';
import { Card, StyledButton } from '../../components/StyledComponents';
import { auth } from '../../config/firebaseConfig';
import { COLORS, FONTS, SPACING } from '../../constants/colors';

export default function OTPScreen() {
  const router = useRouter();
  const { verificationId, phoneNumber } = useLocalSearchParams<{ 
    verificationId: string; 
    phoneNumber: string; 
  }>();
  
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  // Timer for resend functionality
  useEffect(() => {
    let interval: any;
    
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer, canResend]);

  const confirmCode = async (otp?: string) => {
    const codeToVerify = otp || otpCode;
    
    if (!verificationId) {
      setError('Verification ID is missing. Please try again.');
      return;
    }

    if (codeToVerify.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const credential = PhoneAuthProvider.credential(verificationId, codeToVerify);
      await signInWithCredential(auth, credential);
      
      // Success! The AuthContext will automatically redirect to the home screen.
      // You could also show a success message here
      
    } catch (error: any) {
      console.error('OTP verification error:', error);
      
      // Handle different error types
      if (error.code === 'auth/invalid-verification-code') {
        setError('Invalid verification code. Please check and try again.');
      } else if (error.code === 'auth/code-expired') {
        setError('Verification code has expired. Please request a new one.');
      } else {
        setError('Verification failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOTPComplete = (otp: string) => {
    setOtpCode(otp);
    if (error) setError(''); // Clear any previous errors
    confirmCode(otp); // Auto-verify when OTP is complete
  };

  const handleResendCode = async () => {
    // In a real app, you'd implement resend functionality here
    // For now, we'll just reset the timer and show a message
    setCanResend(false);
    setResendTimer(30);
    setError('');
    
    Alert.alert(
      'Code Sent', 
      'A new verification code has been sent to your phone.',
      [{ text: 'OK' }]
    );
    
    // TODO: Implement actual resend logic with Firebase
    // This would involve calling the phone verification again
  };

  const handleGoBack = () => {
    router.back();
  };

  const formatPhoneNumber = (phone: string) => {
    // Format phone number for display (e.g., "98765 43210" -> "+91 98765 43210")
    return `+91 ${phone}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />
      
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
          {/* Header with Back Button */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleGoBack}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Icon Section */}
          <View style={styles.iconSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="shield-checkmark" size={60} color={COLORS.primary} />
            </View>
          </View>

          {/* OTP Card */}
          <Card style={styles.otpCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>Verify Your Phone</Text>
              <Text style={styles.subtitle}>
                We've sent a 6-digit code to{'\n'}
                <Text style={styles.phoneNumber}>
                  {formatPhoneNumber(phoneNumber || '')}
                </Text>
              </Text>
            </View>

            {/* OTP Input */}
            <View style={styles.otpSection}>
              <OTPInput
                length={6}
                onComplete={handleOTPComplete}
                value={otpCode}
                autoFocus
                editable={!isLoading}
              />
              
              {error && (
                <View style={styles.errorContainer}>
                  <Ionicons name="alert-circle" size={16} color={COLORS.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* Verify Button */}
            <StyledButton
              title="Verify Code"
              onPress={() => confirmCode()}
              loading={isLoading}
              disabled={otpCode.length !== 6 || isLoading}
              style={styles.verifyButton}
            />

            {/* Resend Section */}
            <View style={styles.resendSection}>
              <Text style={styles.resendText}>Didn't receive the code?</Text>
              
              {canResend ? (
                <TouchableOpacity onPress={handleResendCode} style={styles.resendButton}>
                  <Text style={styles.resendButtonText}>Resend Code</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.timerText}>
                  Resend in {resendTimer}s
                </Text>
              )}
            </View>
          </Card>

          {/* Help Section */}
          <View style={styles.helpSection}>
            <TouchableOpacity style={styles.helpButton}>
              <Ionicons name="help-circle-outline" size={20} color={COLORS.textSecondary} />
              <Text style={styles.helpText}>Having trouble? Get help</Text>
            </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.md,
    marginBottom: SPACING.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCard: {
    marginBottom: SPACING.xl,
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  phoneNumber: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  otpSection: {
    marginBottom: SPACING.xl,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  errorText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.error,
    marginLeft: SPACING.xs,
    textAlign: 'center',
  },
  verifyButton: {
    marginBottom: SPACING.lg,
  },
  resendSection: {
    alignItems: 'center',
  },
  resendText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  resendButton: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  resendButtonText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
  },
  timerText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  helpSection: {
    alignItems: 'center',
    marginTop: 'auto',
    paddingVertical: SPACING.lg,
  },
  helpButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
  },
  helpText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
});