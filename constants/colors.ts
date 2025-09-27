// constants/colors.ts
export const COLORS = {
  // Primary brand colors for EVOS
  primary: '#00D4AA',        // Electric green-teal for EV theme
  primaryDark: '#00B896',    // Darker shade for pressed states
  secondary: '#1A202C',      // Dark charcoal for text
  accent: '#3B82F6',         // Blue accent for links/highlights
  
  // Background colors
  background: '#FFFFFF',      // Clean white background
  backgroundLight: '#F8FAFC', // Very light gray for subtle sections
  backgroundDark: '#0F172A',  // Dark background (for future dark mode)
  
  // Text colors
  textPrimary: '#1E293B',    // Main text color
  textSecondary: '#64748B',  // Secondary text (subtitles)
  textMuted: '#94A3B8',      // Muted text (placeholders)
  textWhite: '#FFFFFF',      // White text for dark backgrounds
  
  // Utility colors
  border: '#E2E8F0',         // Light borders
  borderFocus: '#00D4AA',    // Focused input borders
  success: '#10B981',        // Success messages
  warning: '#F59E0B',        // Warning messages  
  error: '#EF4444',          // Error messages
  white: '#FFFFFF',          // General white color token
  
  // Transparency overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadowColor: 'rgba(0, 0, 0, 0.1)',
};

export const FONTS = {
  regular: 'System',
  medium: 'System',
  bold: 'System',
  sizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
  }
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};
