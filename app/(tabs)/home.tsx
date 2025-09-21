// app/home.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeRoute() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home Screen</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1A202C' },
  text: { color: 'white', fontSize: 24 }
});