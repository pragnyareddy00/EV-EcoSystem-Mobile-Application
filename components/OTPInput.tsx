// components/OTPInput.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    TextInput,
    View
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

interface OTPInputProps {
  length?: number;
  onComplete: (otp: string) => void;
  value?: string;
  autoFocus?: boolean;
  editable?: boolean;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  length = 6,
  onComplete,
  value = '',
  autoFocus = true,
  editable = true,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Initialize refs array
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Handle external value changes
  useEffect(() => {
    if (value) {
      const otpArray = value.split('').slice(0, length);
      const paddedArray = [...otpArray, ...new Array(length - otpArray.length).fill('')];
      setOtp(paddedArray);
    }
  }, [value, length]);

  // Auto-focus first input
  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const sanitizedText = text.replace(/[^0-9]/g, '');
    
    if (sanitizedText.length > 1) {
      // Handle paste scenario
      handlePaste(sanitizedText, index);
      return;
    }

    const newOtp = [...otp];
    newOtp[index] = sanitizedText;
    setOtp(newOtp);

    // Move to next input if current is filled
    if (sanitizedText && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setActiveIndex(index + 1);
    }

    // Call onComplete when all inputs are filled
    const otpString = newOtp.join('');
    if (otpString.length === length) {
      onComplete(otpString);
    }
  };

  const handlePaste = (pastedText: string, startIndex: number) => {
    const numbers = pastedText.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    
    for (let i = 0; i < numbers.length && startIndex + i < length; i++) {
      newOtp[startIndex + i] = numbers[i];
    }
    
    setOtp(newOtp);
    
    // Focus appropriate input
    const nextIndex = Math.min(startIndex + numbers.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
    setActiveIndex(nextIndex);
    
    // Call onComplete if filled
    const otpString = newOtp.join('');
    if (otpString.length === length) {
      onComplete(otpString);
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace') {
      if (otp[index]) {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous input and clear it
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
        setActiveIndex(index - 1);
      }
    }
  };

  const handleFocus = (index: number) => {
    setActiveIndex(index);
  };

  const getInputStyle = (index: number) => {
    const isFilled = otp[index] !== '';
    const isActive = activeIndex === index;
    
    return [
      styles.input,
      isFilled && styles.inputFilled,
      isActive && styles.inputActive,
      !editable && styles.inputDisabled,
    ];
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        {Array.from({ length }, (_, index) => (
          <TextInput
            key={index}
            ref={(ref) => (inputRefs.current[index] = ref)}
            style={getInputStyle(index)}
            value={otp[index]}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
            onFocus={() => handleFocus(index)}
            keyboardType="number-pad"
            maxLength={1}
            editable={editable}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            selectTextOnFocus
          />
        ))}
      </View>
    </View>
  );
};

const { width } = Dimensions.get('window');
const inputSize = Math.min((width - 80) / 6 - 8, 50); // Responsive size

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: SPACING.md,
  },
  input: {
    width: inputSize,
    height: inputSize,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'center',
    backgroundColor: COLORS.background,
    marginHorizontal: 4,
  },
  inputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}10`, // 10% opacity
  },
  inputActive: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inputDisabled: {
    backgroundColor: COLORS.backgroundLight,
    borderColor: COLORS.border,
    opacity: 0.6,
  },
});