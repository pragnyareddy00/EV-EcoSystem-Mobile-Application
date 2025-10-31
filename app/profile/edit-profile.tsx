import { useRouter } from 'expo-router';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity
} from 'react-native';
import { Card } from '../../components/Card';
import { COLORS, FONTS, RADIUS, SPACING } from '../../constants/colors';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';

export default function EditProfileScreen() {
  // --- We are now using refreshUserProfile ---
  const { userProfile, refreshUserProfile } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState(userProfile?.username || '');
  const [phoneNumber, setPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!userProfile) {
      setError('Could not find user profile.');
      return;
    }
    if (!username.trim() || !phoneNumber.trim()) {
      setError('Username and phone number cannot be empty.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const userDocRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userDocRef, {
        username: username,
        phoneNumber: phoneNumber,
      });

      setIsLoading(false);
      
      // --- This is a great addition by you ---
      // It will re-fetch the user's data so the profile screen is updated
      if (refreshUserProfile) {
        await refreshUserProfile();
      }

      Alert.alert('Success', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() }, // router.back() will now work
      ]);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      setError('Failed to update profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* --- The manual header is REMOVED --- */}
      {/* The _layout.tsx file now provides the header and back button */}
      
      <ScrollView style={styles.form}>
        <Card style={styles.card}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your full name"
            placeholderTextColor={COLORS.textMuted}
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phoneNumber}
            onChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="phone-pad"
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  form: {
    padding: SPACING.lg,
  },
  card: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: FONTS.weights.medium,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  input: {
    backgroundColor: COLORS.neutral50,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginTop: SPACING.lg,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: FONTS.sizes.base,
    fontWeight: FONTS.weights.bold,
  },
  errorText: {
    color: COLORS.error,
    fontSize: FONTS.sizes.sm,
    textAlign: 'center',
    marginTop: SPACING.md,
  },
});

