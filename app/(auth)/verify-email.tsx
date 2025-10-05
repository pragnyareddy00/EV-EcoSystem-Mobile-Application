import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { sendEmailVerification } from 'firebase/auth';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../services/firebase'; // Import the 'auth' instance directly

export default function VerifyEmailScreen() {
  const { onLogout } = useAuth();
  const router = useRouter();
  
  // Separate loading states for clarity
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const handleResendEmail = async () => {
    // Use auth.currentUser for the most reliable user object
    if (!auth.currentUser) {
      Alert.alert('Error', 'No user is currently logged in.');
      return;
    }
    setIsResending(true);
    try {
      await sendEmailVerification(auth.currentUser);
      Alert.alert('Email Sent', 'A new verification link has been sent to your email address.');
    } catch (error: any) {
      console.error('Resend email error:', error);
      Alert.alert('Error', 'Failed to resend verification email. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    // Use auth.currentUser, as it's the source of truth
    if (!auth.currentUser) return;

    setIsChecking(true);
    await auth.currentUser.reload(); // This reloads the user data from Firebase

    // After reload, auth.currentUser is updated with the latest info
    if (auth.currentUser.emailVerified) {
      // The onAuthStateChanged listener in your AuthContext should now
      // detect the change and navigate the user automatically.
      // We can add a success message.
      Alert.alert("Success!", "Your email has been verified. You will be redirected shortly.");
    } else {
      Alert.alert("Not Yet Verified", "Please check your inbox and click the verification link. It may take a moment to update.");
    }
    setIsChecking(false);
  };

  // A safe way to handle logout, in case the context function isn't ready
  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      Alert.alert("Error", "Could not log out. Please restart the app.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="mail-unread-outline" size={80} color={COLORS.primary} />
        </View>
        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to{' '}
          <Text style={styles.emailText}>{auth.currentUser?.email || 'your email'}</Text>.
          Please check your inbox to continue.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleCheckVerification} disabled={isChecking}>
          {isChecking ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.buttonText}>I've Verified My Email</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Didn't receive the email?</Text>
          <TouchableOpacity onPress={handleResendEmail} disabled={isResending}>
            {isResending ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text style={styles.linkText}>Resend Link</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
  },
  content: {
    padding: SPACING.xl,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.md,
    lineHeight: 24,
    marginBottom: SPACING.xl,
  },
  emailText: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  button: {
    backgroundColor: COLORS.primary,
    padding: SPACING.md,
    borderRadius: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 50,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.md,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
  },
  linkText: {
    fontSize: FONTS.sizes.base,
    color: COLORS.primary,
    fontWeight: 'bold',
    marginLeft: SPACING.xs,
  },
  logoutButton: {
      marginTop: SPACING.xxl,
  },
  logoutText: {
      fontSize: FONTS.sizes.sm,
      color: COLORS.textSecondary,
      textDecorationLine: 'underline',
  }
});

