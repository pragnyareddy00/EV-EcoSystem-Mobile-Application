// constants/colors.ts
export const COLORS = {
  // Primary brand colors for EVOS - Electric Vehicle Theme
  primary: '#00D4AA',        // Signature electric teal
  primary50: '#ECFDF6',      // Ultra light primary
  primary100: '#D1FAE5',     // Very light primary
  primary200: '#A7F3D0',     // Light primary
  primary300: '#6EE7B7',     // Medium light primary
  primary400: '#34D399',     // Medium primary
  primary500: '#00D4AA',     // Base primary
  primary600: '#00B896',     // Dark primary
  primary700: '#009B82',     // Darker primary
  primary800: '#007E6E',     // Very dark primary
  primary900: '#005A5A',     // Darkest primary
  
  // Secondary brand colors
  secondary: '#1A202C',      // Dark charcoal for text
  secondaryLight: '#2D3748', // Lighter charcoal
  secondaryDark: '#0F1419',  // Darker charcoal
  
  // Accent colors for different UI elements
  accent: '#3B82F6',         // Primary blue accent
  accentTeal: '#06B6D4',     // Teal accent for charging indicators
  accentPurple: '#8B5CF6',   // Purple accent for premium features
  accentOrange: '#F97316',   // Orange accent for warnings/energy
  
  // Background colors - Light theme
  background: '#FFFFFF',      // Pure white
  backgroundSoft: '#FAFBFC',  // Softer white
  backgroundLight: '#F8FAFC', // Very light gray
  backgroundMuted: '#F1F5F9', // Muted background
  backgroundCard: '#FFFFFF',  // Card backgrounds
  backgroundOverlay: '#F8FAFC', // Overlay backgrounds
  
  // Background colors - Dark theme support
  backgroundDark: '#0F172A',     // Main dark background
  backgroundDarkCard: '#1E293B', // Dark card background
  backgroundDarkSoft: '#334155', // Soft dark background
  backgroundDarkMuted: '#475569', // Muted dark background
  
  // Text colors - Hierarchical system
  textPrimary: '#0F172A',       // Primary text (headlines)
  textSecondary: '#334155',     // Secondary text (body)
  textTertiary: '#64748B',      // Tertiary text (captions)
  textMuted: '#94A3B8',         // Muted text (placeholders)
  textDisabled: '#CBD5E1',      // Disabled text
  textWhite: '#FFFFFF',         // White text
  textInverse: '#F8FAFC',       // Inverse text for dark backgrounds
  
  // Interactive colors
  interactive: '#00D4AA',       // Interactive elements
  interactiveHover: '#00B896',  // Hover states
  interactivePressed: '#009B82', // Pressed states
  interactiveDisabled: '#E2E8F0', // Disabled interactive elements
  
  // Border colors
  border: '#E2E8F0',           // Default borders
  borderLight: '#F1F5F9',      // Light borders
  borderMedium: '#CBD5E1',     // Medium borders
  borderStrong: '#94A3B8',     // Strong borders
  borderFocus: '#00D4AA',      // Focused borders
  borderError: '#F87171',      // Error borders
  borderSuccess: '#4ADE80',    // Success borders
  borderWarning: '#FBBF24',    // Warning borders
  
  // Status colors - EV specific
  statusAvailable: '#10B981',   // Charging station available
  statusBusy: '#F59E0B',        // Charging station busy
  statusOffline: '#EF4444',     // Charging station offline
  statusCharging: '#3B82F6',    // Currently charging
  statusLowBattery: '#F97316',  // Low battery warning
  statusFullBattery: '#10B981', // Full battery
  statusMaintenance: '#8B5CF6', // Under maintenance
  
  // Semantic colors
  success: '#10B981',          // Success states
  successLight: '#D1FAE5',     // Light success background
  successDark: '#065F46',      // Dark success text
  
  warning: '#F59E0B',          // Warning states
  warningLight: '#FEF3C7',     // Light warning background
  warningDark: '#92400E',      // Dark warning text
  
  error: '#EF4444',            // Error states
  errorLight: '#FEE2E2',       // Light error background
  errorDark: '#991B1B',        // Dark error text
  
  info: '#3B82F6',             // Info states
  infoLight: '#DBEAFE',        // Light info background
  infoDark: '#1E3A8A',         // Dark info text
  
  // Utility colors
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  
  // Gradient colors for modern effects
  gradientPrimary: ['#00D4AA', '#06B6D4'], // Primary gradient
  gradientSecondary: ['#3B82F6', '#8B5CF6'], // Secondary gradient
  gradientSuccess: ['#10B981', '#34D399'], // Success gradient
  gradientWarning: ['#F59E0B', '#FBBF24'], // Warning gradient
  
  // Shadow and overlay colors
  shadow: 'rgba(15, 23, 42, 0.08)',      // Light shadow
  shadowMedium: 'rgba(15, 23, 42, 0.12)', // Medium shadow
  shadowStrong: 'rgba(15, 23, 42, 0.16)', // Strong shadow
  shadowPrimary: 'rgba(0, 212, 170, 0.15)', // Primary colored shadow
  
  overlay: 'rgba(15, 23, 42, 0.6)',      // Dark overlay
  overlayLight: 'rgba(248, 250, 252, 0.8)', // Light overlay
  overlayBlur: 'rgba(255, 255, 255, 0.75)', // Blur overlay
  
  // Surface colors for depth
  surface0: '#FFFFFF',         // Lowest surface
  surface1: '#F8FAFC',         // Level 1 surface
  surface2: '#F1F5F9',         // Level 2 surface  
  surface3: '#E2E8F0',         // Level 3 surface
  surface4: '#CBD5E1',         // Highest surface
};

export const FONTS = {
  // Font families
  regular: 'System',           // Default system font
  medium: 'System',            // Medium weight
  semibold: 'System',          // Semi-bold weight
  bold: 'System',              // Bold weight
  
  // Font weights (for when custom fonts are used)
  weights: {
    light: '300',
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
  },
  
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

// EV-specific constants
export const EV_CONSTANTS = {
  batteryColors: {
    critical: COLORS.error,      // 0-15%
    low: COLORS.warning,         // 16-30%
    medium: COLORS.accent,       // 31-60%
    good: COLORS.success,        // 61-85%
    full: COLORS.primary,        // 86-100%
  },
  chargingColors: {
    slow: COLORS.warning,        // Slow charging
    fast: COLORS.primary,        // Fast charging
    rapid: COLORS.accent,        // Rapid charging
    ultra: COLORS.accentPurple,  // Ultra-fast charging
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
  ev: EV_CONSTANTS,
};