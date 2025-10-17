// constants/colors.ts

// Utility function to add opacity to hex colors
export const withOpacity = (color: string, opacity: number): string => {
  // Ensure opacity is between 0 and 1
  const clampedOpacity = Math.max(0, Math.min(1, opacity));

  // Convert opacity to hex (0-255)
  const alpha = Math.round(clampedOpacity * 255).toString(16).padStart(2, '0');

  // If color already has alpha, replace it; otherwise, append it
  if (color.length === 9) { // #RRGGBBAA
    return color.slice(0, 7) + alpha;
  } else if (color.length === 7) { // #RRGGBB
    return color + alpha;
  } else {
    // Fallback: assume it's a valid color and append alpha
    return color + alpha;
  }
};

export const COLORS = {
  // Primary brand colors - Updated theme
  primary: '#2E86AB',        // Electric blue as primary
  primary50: '#E8F4F8',      // Ultra light primary
  primary100: '#C5E3F0',     // Very light primary
  primary200: '#9DD0E7',     // Light primary
  primary300: '#6ABADD',     // Medium light primary
  primary400: '#4CA3CD',     // Medium primary
  primary500: '#2E86AB',     // Base primary (electric)
  primary600: '#267199',     // Dark primary
  primary700: '#1E5C87',     // Darker primary
  primary800: '#164775',     // Very dark primary
  primary900: '#0E3263',     // Darkest primary
  
  // Secondary brand colors - Forest green
  secondary: '#1B4332',      // Forest green
  secondaryLight: '#2D5F4A', // Lighter forest
  secondaryDark: '#0F2519',  // Darker forest
  
  // Accent colors for different UI elements
  accent: '#F77F00',         // Orange accent
  accentSuccess: '#28A745',  // Green success
  accentWarning: '#FFC107',  // Yellow warning
  accentDanger: '#DC3545',   // Red danger
  accentElectric: '#2E86AB', // Electric blue
  
  // Background colors - Light theme
  background: '#FFFFFF',      // Pure white
  backgroundSoft: '#F8F9FA',  // Softer white/secondary
  backgroundLight: '#F8F9FA', // Very light gray
  backgroundMuted: '#E9ECEF', // Muted background (light gray)
  backgroundCard: '#FFFFFF',  // Card backgrounds
  backgroundOverlay: '#F8F9FA', // Overlay backgrounds
  
  // Background colors - Dark theme support
  backgroundDark: '#0F2519',     // Main dark background (dark forest)
  backgroundDarkCard: '#1B4332', // Dark card background (forest)
  backgroundDarkSoft: '#2D5F4A', // Soft dark background
  backgroundDarkMuted: '#6C757D', // Muted dark background (gray)
  
  // Text colors - Hierarchical system
  textPrimary: '#212529',       // Primary text (headlines)
  textSecondary: '#6C757D',     // Secondary text (body/gray)
  textTertiary: '#ADB5BD',      // Tertiary text (light gray)
  textMuted: '#ADB5BD',         // Muted text (placeholders)
  textDisabled: '#DEE2E6',      // Disabled text
  textWhite: '#FFFFFF',         // White text
  textInverse: '#F8F9FA',       // Inverse text for dark backgrounds
  
  // Interactive colors
  interactive: '#2E86AB',       // Interactive elements (electric blue)
  interactiveHover: '#267199',  // Hover states
  interactivePressed: '#1E5C87', // Pressed states
  interactiveDisabled: '#E9ECEF', // Disabled interactive elements
  
  // Border colors
  border: '#E9ECEF',           // Default borders (light)
  borderLight: '#E9ECEF',      // Light borders
  borderMedium: '#DEE2E6',     // Medium borders
  borderStrong: '#6C757D',     // Strong borders
  borderFocus: '#2E86AB',      // Focused borders (electric blue)
  borderError: '#DC3545',      // Error borders (danger)
  borderSuccess: '#28A745',    // Success borders
  borderWarning: '#FFC107',    // Warning borders
  
  // Status colors - EV specific
  statusAvailable: '#28A745',   // Charging station available (success)
  statusBusy: '#FFC107',        // Charging station busy (warning)
  statusOffline: '#DC3545',     // Charging station offline (danger)
  statusCharging: '#2E86AB',    // Currently charging (electric)
  statusLowBattery: '#F77F00',  // Low battery warning (orange)
  statusFullBattery: '#28A745', // Full battery (success)
  statusMaintenance: '#6C757D', // Under maintenance (gray)
  
  // Semantic colors
  success: '#28A745',          // Success states
  successLight: '#D4EDDA',     // Light success background
  successDark: '#155724',      // Dark success text
  
  warning: '#FFC107',          // Warning states
  warningLight: '#FFF3CD',     // Light warning background
  warningDark: '#856404',      // Dark warning text
  
  error: '#DC3545',            // Error states
  errorLight: '#F8D7DA',       // Light error background
  errorDark: '#721C24',        // Dark error text
  
  info: '#2E86AB',             // Info states (electric blue)
  infoLight: '#D1ECF1',        // Light info background
  infoDark: '#164775',         // Dark info text
  
  // Utility colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  gray: '#6C757D',             // Standard gray
  lightGray: '#E9ECEF',        // Light gray

  // Neutral colors for backgrounds and subtle elements
  neutral50: '#F8F9FA',        // Very light neutral
  neutral100: '#E9ECEF',       // Light neutral (for buttons, etc.)
  neutral200: '#DEE2E6',       // Medium light neutral
  neutral300: '#ADB5BD',       // Medium neutral
  neutral400: '#6C757D',       // Dark neutral
  neutral500: '#495057',       // Darker neutral
  neutral600: '#343A40',       // Very dark neutral
  neutral700: '#212529',       // Almost black neutral
  neutral800: '#000000',       // Black neutral
  
  // Gradient colors for modern effects
  gradientPrimary: ['#2E86AB', '#1B4332'], // Electric to forest
  gradientSecondary: ['#1B4332', '#2D5F4A'], // Forest gradient
  gradientSuccess: ['#28A745', '#20C997'], // Success gradient
  gradientWarning: ['#F77F00', '#FFC107'], // Orange to yellow
  
  // Shadow and overlay colors
  shadow: 'rgba(33, 37, 41, 0.1)',      // Light shadow
  shadowMedium: 'rgba(33, 37, 41, 0.12)', // Medium shadow
  shadowStrong: 'rgba(33, 37, 41, 0.15)', // Strong shadow
  shadowPrimary: 'rgba(46, 134, 171, 0.15)', // Primary colored shadow
  
  overlay: 'rgba(27, 67, 50, 0.6)',      // Dark overlay (forest)
  overlayLight: 'rgba(248, 249, 250, 0.8)', // Light overlay
  overlayBlur: 'rgba(255, 255, 255, 0.75)', // Blur overlay
  
  // Surface colors for depth
  surface0: '#FFFFFF',         // Lowest surface
  surface1: '#F8F9FA',         // Level 1 surface
  surface2: '#E9ECEF',         // Level 2 surface  
  surface3: '#DEE2E6',         // Level 3 surface
  surface4: '#ADB5BD',         // Highest surface
};

export const FONTS = {
  // Font families
  regular: 'System',           // Default system font
  medium: 'System',            // Medium weight
  semibold: 'System',          // Semi-bold weight
  bold: 'System',              // Bold weight
  
  // Font weights (for when custom fonts are used)
  weights: {
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  } as const,
  
  // Font sizes with consistent scale
  sizes: {
    xs: 12,      // Captions, labels
    sm: 14,      // Small text, secondary info
    base: 16,    // Body text, default
    md: 18,      // Slightly larger body
    lg: 20,      // Subheadings
    xl: 24,      // Headings
    xxl: 28,     // Large headings
    xxxl: 32,    // Hero text
    display: 36, // Display text
    hero: 48,    // Hero/landing text
  },
  
  // Line heights for better typography
  lineHeights: {
    tight: 1.1,    // Tight line height for headings
    snug: 1.2,     // Snug line height
    normal: 1.4,   // Normal line height for body
    relaxed: 1.6,  // Relaxed line height for long text
    loose: 1.8,    // Loose line height
  },
  
  // Letter spacing for premium feel
  letterSpacing: {
    tight: -0.5,   // Tight letter spacing
    normal: 0,     // Normal letter spacing
    wide: 0.5,     // Wide letter spacing
    wider: 1,      // Wider letter spacing
  },
};

export const SPACING = {
  // Base spacing scale (4px base unit)
  xs: 4,     // 4px
  sm: 8,     // 8px
  md: 12,    // 12px (added for more granular control)
  lg: 16,    // 16px
  xl: 20,    // 20px (added)
  xxl: 24,   // 24px
  xxxl: 32,  // 32px
  xxxxl: 40, // 40px (added)
  huge: 48,  // 48px
  massive: 64, // 64px (added for large sections)
  
  // Component specific spacing
  component: {
    buttonPaddingH: 20,    // Horizontal button padding
    buttonPaddingV: 12,    // Vertical button padding
    inputPaddingH: 16,     // Input horizontal padding
    inputPaddingV: 12,     // Input vertical padding
    cardPadding: 20,       // Card padding
    sectionPadding: 24,    // Section padding
    screenPadding: 16,     // Screen edge padding
  }
};

export const RADIUS = {
  // Border radius scale
  none: 0,      // No radius
  xs: 4,        // Extra small
  sm: 6,        // Small
  md: 8,        // Medium
  lg: 12,       // Large
  xl: 16,       // Extra large
  xxl: 20,      // Double extra large
  xxxl: 24,     // Triple extra large
  full: 999,    // Fully rounded
  
  // Component specific radius
  component: {
    button: 12,      // Button radius
    input: 12,       // Input radius
    card: 16,        // Card radius
    modal: 20,       // Modal radius
    badge: 999,      // Badge radius (fully rounded)
  }
};

// Animation and timing constants
export const TIMING = {
  fast: 150,        // Fast animations
  normal: 250,      // Normal animations
  slow: 350,        // Slow animations
  slower: 500,      // Slower animations
};

// Z-index scale for layering
export const Z_INDEX = {
  base: 1,          // Base layer
  dropdown: 10,     // Dropdown menus
  modal: 100,       // Modal dialogs
  overlay: 1000,    // Overlays
  tooltip: 1100,    // Tooltips
  toast: 1200,      // Toast notifications
};

// Breakpoints for responsive design
export const BREAKPOINTS = {
  sm: 320,   // Small phones
  md: 768,   // Tablets
  lg: 1024,  // Small laptops
  xl: 1280,  // Desktop
};

// Shadow configurations
const _SHADOWS = {
  small: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
};

// Export shadows with shorthand aliases included in the type
export const SHADOWS = {
  ..._SHADOWS,
  sm: _SHADOWS.small,
  md: _SHADOWS.medium,
  lg: _SHADOWS.large,
} as const;

// EV-specific constants
export const EV_CONSTANTS = {
  batteryColors: {
    critical: COLORS.error,      // 0-15% (danger red)
    low: COLORS.warning,         // 16-30% (warning yellow)
    medium: COLORS.accent,       // 31-60% (orange)
    good: COLORS.success,        // 61-85% (success green)
    full: COLORS.primary,        // 86-100% (electric blue)
  },
  chargingColors: {
    slow: COLORS.warning,        // Slow charging (warning)
    fast: COLORS.primary,        // Fast charging (electric blue)
    rapid: COLORS.accent,        // Rapid charging (orange)
    ultra: COLORS.secondary,     // Ultra-fast charging (forest green)
  },
  stationStatus: {
    available: COLORS.statusAvailable,
    busy: COLORS.statusBusy,
    offline: COLORS.statusOffline,
    maintenance: COLORS.statusMaintenance,
  }
};

// Export default theme object
export const THEME = {
  colors: COLORS,
  fonts: FONTS,
  spacing: SPACING,
  radius: RADIUS,
  timing: TIMING,
  zIndex: Z_INDEX,
  breakpoints: BREAKPOINTS,
  shadows: SHADOWS,
  ev: EV_CONSTANTS,
};

// Legacy export for backward compatibility with your sample format
export const Colors = {
  primary: {
    forest: '#1B4332',
    electric: '#2E86AB',
  },
  secondary: {
    white: '#F8F9FA',
    gray: '#6C757D',
    lightGray: '#E9ECEF',
  },
  accent: {
    orange: '#F77F00',
    success: '#28A745',
    warning: '#FFC107',
    danger: '#DC3545',
  },
  text: {
    primary: '#212529',
    secondary: '#6C757D',
    light: '#ADB5BD',
    white: '#FFFFFF',
  },
  background: {
    primary: '#FFFFFF',
    secondary: '#F8F9FA',
    card: '#FFFFFF',
  },
  border: {
    light: '#E9ECEF',
    medium: '#DEE2E6',
  },
};