// app/login.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function LoginRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Login Screen</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' },
  text: { color: 'white', fontSize: 24 }
});