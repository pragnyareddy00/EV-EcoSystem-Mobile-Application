// components/StyledComponents.tsx
import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    TouchableOpacityProps,
    View,
    ViewProps,
} from 'react-native';
import { COLORS, FONTS, RADIUS, SPACING } from '../constants/colors';

// Styled Button Component
interface StyledButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  style,
  disabled,
  ...props
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.buttonDisabled,
    style,
  ];

  const textStyles = [
    styles.buttonText,
    styles[`buttonText_${variant}`],
    styles[`buttonText_${size}`],
    disabled && styles.buttonTextDisabled,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.textWhite : COLORS.primary}
          size="small"
        />
      ) : (
        <View style={styles.buttonContent}>
          {icon && <View style={styles.buttonIcon}>{icon}</View>}
          <Text style={textStyles}>{title}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Styled TextInput Component
interface StyledTextInputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const StyledTextInput: React.FC<StyledTextInputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  style,
  ...props
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[styles.inputWrapper, error && styles.inputWrapperError]}>
        {leftIcon && <View style={styles.inputIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined
          ]}
          placeholderTextColor={COLORS.textMuted}
          {...props}
        />
        {rightIcon && <View style={styles.inputIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
    </View>
  );
};

// Card Component
interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: keyof typeof SPACING;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'lg',
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        { padding: SPACING[padding] },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  // Button Styles
  button: {
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  button_primary: {
    backgroundColor: COLORS.primary,
  },
  button_secondary: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  button_small: {
    height: 40,
    paddingHorizontal: SPACING.md,
  },
  button_medium: {
    height: 50,
    paddingHorizontal: SPACING.lg,
  },
  button_large: {
    height: 56,
    paddingHorizontal: SPACING.xl,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  buttonText: {
    fontFamily: FONTS.medium,
    fontWeight: '600',
  },
  buttonText_primary: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.base,
  },
  buttonText_secondary: {
    color: COLORS.textPrimary,
    fontSize: FONTS.sizes.base,
  },
  buttonText_outline: {
    color: COLORS.primary,
    fontSize: FONTS.sizes.base,
  },
  buttonText_small: {
    fontSize: FONTS.sizes.sm,
  },
  buttonText_medium: {
    fontSize: FONTS.sizes.base,
  },
  buttonText_large: {
    fontSize: FONTS.sizes.lg,
  },
  buttonTextDisabled: {
    opacity: 0.7,
  },

  // Input Styles
  inputContainer: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.background,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
  },
  input: {
    flex: 1,
    height: 50,
    paddingHorizontal: SPACING.md,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
  },
  inputWithLeftIcon: {
    paddingLeft: SPACING.sm,
  },
  inputWithRightIcon: {
    paddingRight: SPACING.sm,
  },
  inputIcon: {
    paddingHorizontal: SPACING.sm,
  },
  inputError: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.sm,
  },

  // Card Styles
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    shadowColor: COLORS.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
});