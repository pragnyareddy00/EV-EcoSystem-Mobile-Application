import { useRouter } from 'expo-router';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
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

export default function ContributeStationScreen() {
  const { userProfile } = useAuth();
  const router = useRouter();
  
  const [stationName, setStationName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!userProfile) {
      setError('You must be logged in to contribute.');
      return;
    }
    if (!stationName.trim() || !address.trim()) {
      setError('Station Name and Address are required.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // --- This is the core logic ---
      // We add the user's submission to a new 'userContributions' collection
      // for an admin to review and approve later.
      await addDoc(collection(db, 'userContributions'), {
        stationName: stationName.trim(),
        address: address.trim(),
        notes: notes.trim(),
        status: 'pending', // for admin review
        submittedBy: userProfile.uid,
        submittedAt: serverTimestamp(),
      });

      setIsLoading(false);
      Alert.alert(
        'Thank You!',
        'Your contribution has been submitted for review. You are helping build a better EV network!',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (err) {
      setIsLoading(false);
      setError('Failed to submit. Please try again.');
      console.error(err);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.form}>
        <Text style={styles.title}>Contribute a Station</Text>
        <Text style={styles.subtitle}>
          Found a new or unlisted station? Let us know!
        </Text>

        <Card style={styles.card}>
          <Text style={styles.label}>Station Name</Text>
          <TextInput
            style={styles.input}
            value={stationName}
            onChangeText={setStationName}
            placeholder="e.g., Hotel Green Park Charging"
            placeholderTextColor={COLORS.textMuted}
          />
          
          <Text style={styles.label}>Station Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Full address of the station"
            placeholderTextColor={COLORS.textMuted}
          />
          
          <Text style={styles.label}>Notes (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g., Located in basement parking, 2 chargers"
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
        </Card>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitButtonText}>Submit for Review</Text>
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
  title: {
    fontSize: FONTS.sizes.xl,
    fontWeight: FONTS.weights.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONTS.sizes.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    marginTop: SPACING.lg,
  },
  submitButtonText: {
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
