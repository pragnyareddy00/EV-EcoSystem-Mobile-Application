// app/screens/HomeScreen.tsx
import React from 'react';
// Make sure StyleSheet is included in this import from 'react-native'
import { signOut } from 'firebase/auth';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';
import { auth } from '../config/firebaseConfig'; // Import our configured auth instance

const HomeScreen = () => {
  const user = auth.currentUser;

  const handleSignOut = () => {
    signOut(auth)
      .then(() => {
        console.log('User signed out successfully');
      })
      .catch((error) => {
        Alert.alert('Error', error.message);
      });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to EVOS!</Text>
      <Text style={styles.subtitle}>
        This is the main screen of your application.
      </Text>
      {user ? (
        <Text style={styles.userInfo}>
          Signed in as: {user.phoneNumber}
        </Text>
      ) : (
        <Text style={styles.userInfo}>
          Not signed in
        </Text>
      )}
      <View style={styles.buttonContainer}>
        <Button title="Sign Out" onPress={handleSignOut} color="#d9534f" />
      </View>
    </View>
  );
};

// This line requires the StyleSheet import to work
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  userInfo: {
    fontSize: 14,
    color: '#333',
    marginBottom: 30,
    fontStyle: 'italic',
  },
  buttonContainer: {
    width: '60%',
  }
});

export default HomeScreen;