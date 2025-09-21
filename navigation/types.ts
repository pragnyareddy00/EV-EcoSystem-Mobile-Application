// navigation/types.ts
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Onboarding: undefined; // undefined means the route doesn't have params
  Login: undefined;
  OTP: { verificationId: string }; // OTP screen requires verificationId
  Home: undefined;
};

export type OnboardingScreenProps = NativeStackScreenProps<RootStackParamList, 'Onboarding'>;
export type LoginScreenProps = NativeStackScreenProps<RootStackParamList, 'Login'>;
export type OTPScreenProps = NativeStackScreenProps<RootStackParamList, 'OTP'>;