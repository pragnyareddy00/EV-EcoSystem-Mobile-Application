// app/(auth)/signup.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
// --- 1. Import new functions from firebase ---
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Card, StyledButton, StyledTextInput } from '../../components/StyledComponents';
import { COLORS, FONTS, SPACING } from '../../constants/colors';
import { auth, db } from '../../services/firebase';

export default function SignUpScreen() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!username.trim() || !phoneNumber.trim() || !email.trim() || !password.trim()) {
      setError('Please fill in all fields.');
      return;
    }
    // --- 2. Changed password length from 6 to 8 ---
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // --- 3. Send the verification email ---
      await sendEmailVerification(user);

      // --- 4. Add the 'role' field to the user's profile in Firestore ---
      await setDoc(doc(db, 'users', user.uid), {
        username: username,
        phoneNumber: phoneNumber,
        email: email,
        role: 'user', // Add this line for the Admin Panel feature
        createdAt: new Date(),
      });

      // --- 5. Navigate user to the new verification screen ---
      // The AuthContext will still see them as logged in, but the main layout
      // will eventually block them until they are verified.
      router.replace('/(auth)/verify-email');

    } catch (error: any) {
      console.error('Sign up error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email address is already in use.');
      } else if (error.code === 'auth/weak-password') {
        setError('The password is too weak.');
      } else {
        setError('Failed to create an account. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundLight} />
      
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
            <View style={styles.logoContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="person-add" size={40} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.brandName}>Create Account</Text>
            <Text style={styles.tagline}>Join the EVOS community today</Text>
          </View>

          {/* Sign Up Card */}
          <Card style={styles.signUpCard}>
            <View style={styles.form}>
              <StyledTextInput
                label="Username"
                placeholder="e.g., Abhinav Reddy"
                value={username}
                onChangeText={setUsername}
                error={error.includes('fields') ? error : ''}
              />
              <StyledTextInput
                label="Phone Number"
                placeholder="e.g., 9876543210"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <StyledTextInput
                label="Email Address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                error={error.includes('email') ? error : ''}
              />
              <StyledTextInput
                label="Password"
                // --- 6. Updated placeholder text ---
                placeholder="Min. 8 characters"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                error={error.includes('Password') || error.includes('password') ? error : ''}
              />

              <StyledButton
                title="Create Account"
                onPress={handleSignUp}
                loading={isLoading}
                disabled={isLoading}
                style={styles.signUpButton}
              />
            </View>
          </Card>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.footerText}>
                Already have an account?{' '}
                <Text style={styles.signInLink}>Sign In</Text>
              </Text>
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
    alignItems: 'center',
    paddingTop: SPACING.xl,
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
  },
  tagline: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  signUpCard: {
    marginBottom: SPACING.xl,
  },
  form: {
    gap: SPACING.md,
  },
  signUpButton: {
    marginTop: SPACING.md,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  footerText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  signInLink: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

