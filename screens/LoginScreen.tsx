// app/screens/LoginScreen.tsx
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { getAuth, PhoneAuthProvider } from 'firebase/auth';
import React, { useRef, useState } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import { app } from '../config/firebaseConfig';
import { LoginScreenProps } from '../navigation/types';

const auth = getAuth(app);

const LoginScreen = ({ navigation }: LoginScreenProps) => {
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal | null>(null);

  const sendVerification = async () => {
    try {
      const phoneProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneProvider.verifyPhoneNumber(
        `+91${phoneNumber}`,
        recaptchaVerifier.current!
      );
      navigation.navigate('OTP', { verificationId });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <View style={styles.container}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
      />
      <Text>Enter your mobile number:</Text>
      <TextInput
        style={styles.input}
        placeholder="9876543210"
        keyboardType="phone-pad"
        onChangeText={setPhoneNumber}
        value={phoneNumber}
      />
      <Button title="Send OTP" onPress={sendVerification} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  input: { height: 40, borderColor: 'gray', borderWidth: 1, marginVertical: 10, padding: 10 },
});

export default LoginScreen;