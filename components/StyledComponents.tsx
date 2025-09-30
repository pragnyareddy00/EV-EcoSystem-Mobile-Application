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
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'success';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const StyledButton: React.FC<StyledButtonProps> = ({
  title,
  variant = 'primary',
  size = 'medium',
  loading = false,
  icon,
  fullWidth = false,
  style,
  disabled,
  ...props
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    fullWidth && styles.buttonFullWidth,
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
      activeOpacity={0.8}
      {...props}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'danger' || variant === 'success'
            ? COLORS.textWhite
            : COLORS.primary}
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
  variant?: 'default' | 'search' | 'filled';
  helper?: string;
}

export const StyledTextInput: React.FC<StyledTextInputProps> = ({
  label,
  error,
  helper,
  leftIcon,
  rightIcon,
  variant = 'default',
  style,
  ...props
}) => {
  return (
    <View style={styles.inputContainer}>
      {label && <Text style={styles.inputLabel}>{label}</Text>}
      <View style={[
        styles.inputWrapper, 
        styles[`inputWrapper_${variant}`],
        error && styles.inputWrapperError
      ]}>
        {leftIcon && <View style={styles.inputIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon ? styles.inputWithLeftIcon : undefined,
            rightIcon ? styles.inputWithRightIcon : undefined,
            styles[`input_${variant}`]
          ]}
          placeholderTextColor={COLORS.textMuted}
          selectionColor={COLORS.primary}
          {...props}
        />
        {rightIcon && <View style={styles.inputIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.inputError}>{error}</Text>}
      {helper && !error && <Text style={styles.inputHelper}>{helper}</Text>}
    </View>
  );
};

// Enhanced Card Component
interface CardProps extends ViewProps {
  children: React.ReactNode;
  padding?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | 'xxxl' | 'huge' | 'massive';
  variant?: 'default' | 'elevated' | 'outlined' | 'flat';
  header?: string;
  subheader?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  padding = 'lg',
  variant = 'default',
  header,
  subheader,
  ...props
}) => {
  return (
    <View
      style={[
        styles.card,
        styles[`card_${variant}`],
        { padding: SPACING[padding] },
        style,
      ]}
      {...props}
    >
      {(header || subheader) && (
        <View style={styles.cardHeader}>
          {header && <Text style={styles.cardTitle}>{header}</Text>}
          {subheader && <Text style={styles.cardSubtitle}>{subheader}</Text>}
        </View>
      )}
      {children}
    </View>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: 'available' | 'busy' | 'offline' | 'charging' | 'low_battery';
  text?: string;
  size?: 'small' | 'medium';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  text,
  size = 'medium'
}) => {
  return (
    <View style={[styles.badge, styles[`badge_${status}`], styles[`badge_${size}`]]}>
      <View style={[styles.badgeDot, styles[`badgeDot_${status}`]]} />
      {text && <Text style={[styles.badgeText, styles[`badgeText_${size}`]]}>{text}</Text>}
    </View>
  );
};

// Info Card Component for charging stations
interface InfoCardProps extends ViewProps {
  title: string;
  subtitle?: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  status?: 'available' | 'busy' | 'offline';
}

export const InfoCard: React.FC<InfoCardProps> = ({
  title,
  subtitle,
  value,
  unit,
  icon,
  status,
  style,
  ...props
}) => {
  return (
    <View style={[styles.infoCard, style]} {...props}>
      <View style={styles.infoCardHeader}>
        <View style={styles.infoCardTitleContainer}>
          {icon && <View style={styles.infoCardIcon}>{icon}</View>}
          <View>
            <Text style={styles.infoCardTitle}>{title}</Text>
            {subtitle && <Text style={styles.infoCardSubtitle}>{subtitle}</Text>}
          </View>
        </View>
        {status && <StatusBadge status={status} size="small" />}
      </View>
      <View style={styles.infoCardValue}>
        <Text style={styles.infoCardValueText}>{value}</Text>
        {unit && <Text style={styles.infoCardUnit}>{unit}</Text>}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Enhanced Button Styles
  button: {
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
    position: 'relative',
    overflow: 'hidden',
  },
  button_primary: {
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.primary,
  },
  button_secondary: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  button_outline: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  button_danger: {
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
  },
  button_success: {
    backgroundColor: '#10B981', // Modern green
    shadowColor: '#10B981',
  },
  button_small: {
    height: 42,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  button_medium: {
    height: 52,
    paddingHorizontal: SPACING.xl,
  },
  button_large: {
    height: 60,
    paddingHorizontal: SPACING.xxl || SPACING.xl,
    borderRadius: RADIUS.xxl || RADIUS.xl,
  },
  buttonFullWidth: {
    alignSelf: 'stretch',
  },
  buttonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonIcon: {
    marginRight: SPACING.sm,
  },
  buttonText: {
    fontFamily: FONTS.semibold || FONTS.medium,
    fontWeight: '600',
    letterSpacing: 0.5,
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
  buttonText_danger: {
    color: COLORS.textWhite,
    fontSize: FONTS.sizes.base,
  },
  buttonText_success: {
    color: COLORS.textWhite,
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

  // Enhanced Input Styles
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    fontFamily: FONTS.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.background,
    minHeight: 54,
  },
  inputWrapper_default: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  inputWrapper_search: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundLight,
  },
  inputWrapper_filled: {
    borderWidth: 0,
    backgroundColor: COLORS.backgroundLight,
  },
  inputWrapperError: {
    borderColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  input: {
    flex: 1,
    fontSize: FONTS.sizes.base,
    color: COLORS.textPrimary,
    fontFamily: FONTS.regular,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  input_default: {
    // Default styles already applied above
  },
  input_search: {
    fontSize: FONTS.sizes.base,
  },
  input_filled: {
    // Filled specific styles
  },
  inputWithLeftIcon: {
    paddingLeft: SPACING.sm,
  },
  inputWithRightIcon: {
    paddingRight: SPACING.sm,
  },
  inputIcon: {
    paddingHorizontal: SPACING.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputError: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: SPACING.xs,
    marginLeft: SPACING.md,
    fontFamily: FONTS.medium,
  },
  inputHelper: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginLeft: SPACING.md,
    fontFamily: FONTS.regular,
  },

  // Enhanced Card Styles
  card: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xxl || RADIUS.xl,
    marginBottom: SPACING.md,
  },
  card_default: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  card_elevated: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  card_outlined: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  card_flat: {
    shadowOpacity: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  cardHeader: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cardTitle: {
    fontSize: FONTS.sizes.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontFamily: FONTS.bold || FONTS.medium,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
  },

  // Status Badge Styles
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.full || RADIUS.xl,
    paddingHorizontal: SPACING.sm,
  },
  badge_small: {
    paddingVertical: SPACING.xs,
  },
  badge_medium: {
    paddingVertical: SPACING.sm,
  },
  badge_available: {
    backgroundColor: '#ECFDF5', // Light green
  },
  badge_busy: {
    backgroundColor: '#FEF3C7', // Light yellow
  },
  badge_offline: {
    backgroundColor: '#FEE2E2', // Light red
  },
  badge_charging: {
    backgroundColor: '#EBF8FF', // Light blue
  },
  badge_low_battery: {
    backgroundColor: '#FED7AA', // Light orange
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: SPACING.xs,
  },
  badgeDot_available: {
    backgroundColor: '#10B981', // Green
  },
  badgeDot_busy: {
    backgroundColor: '#F59E0B', // Yellow
  },
  badgeDot_offline: {
    backgroundColor: '#EF4444', // Red
  },
  badgeDot_charging: {
    backgroundColor: '#3B82F6', // Blue
  },
  badgeDot_low_battery: {
    backgroundColor: '#F97316', // Orange
  },
  badgeText: {
    fontWeight: '500',
    fontFamily: FONTS.medium,
  },
  badgeText_small: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.textSecondary,
  },
  badgeText_medium: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textPrimary,
  },

  // Info Card Styles
  infoCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.xl,
    padding: SPACING.lg,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  infoCardTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoCardIcon: {
    marginRight: SPACING.sm,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCardTitle: {
    fontSize: FONTS.sizes.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
    fontFamily: FONTS.medium,
  },
  infoCardSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    marginTop: 2,
  },
  infoCardValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  infoCardValueText: {
    fontSize: FONTS.sizes.xxl || FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: FONTS.bold || FONTS.medium,
  },
  infoCardUnit: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
    marginLeft: SPACING.xs,
    fontFamily: FONTS.regular,
  },
});