// app/screens/OTPScreen.tsx
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth'; // Import signInWithCredential
import React, { useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { auth } from '../config/firebaseConfig'; // <-- IMPORT our auth instance
import { OTPScreenProps } from '../navigation/types';

const OTPScreen = ({ route }: OTPScreenProps) => {
  const [otp, setOtp] = useState<string>('');
  const { verificationId } = route.params;

  const confirmCode = async () => {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, otp);
      await signInWithCredential(auth, credential); // <-- USE the imported auth instance here
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Enter the OTP sent to your number:</Text>
      <TextInput
        style={styles.input}
        placeholder="123456"
        keyboardType="number-pad"
        onChangeText={setOtp}
        value={otp}
      />
      <Button title="Verify OTP" onPress={confirmCode} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginVertical: 10, padding: 10 },
});

export default OTPScreen;