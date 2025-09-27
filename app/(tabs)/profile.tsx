import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StyledButton } from '../../components/StyledComponents';
import { COLORS, SPACING } from '../../constants/colors';
import { auth } from '../../services/firebase';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      <StyledButton
        title="Sign Out"
        onPress={() => auth.signOut()}
        style={styles.signOutButton}
      />
      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>Version 1.0.0</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: SPACING.lg,
    backgroundColor: COLORS.backgroundLight,
  },
  signOutButton: {
    marginTop: 'auto',
    backgroundColor: COLORS.error,
  },
  versionContainer: {
    marginTop: SPACING.md,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
