// app/components/svg/Onboarding3Bg.tsx
import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export const Onboarding3Bg = () => {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="grad" x1="100%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1A202C" />
          <Stop offset="100%" stopColor="#2D3748" />
        </LinearGradient>
      </Defs>
      <Path fill="url(#grad)" d={`M0,0 H${width} V${height} H0 Z`} />
      <Circle cx={width * 0.25} cy={height * 0.35} r="8" fill="#00C6FF" />
      <Circle cx={width * 0.75} cy={height * 0.65} r="12" fill="#00C6FF" />
      <Circle cx={width * 0.5} cy={height * 0.5} r="6" fill="#48BB78" />
      <Path d={`M${width * 0.25},${height * 0.35} L${width * 0.5},${height * 0.5} L${width * 0.75},${height * 0.65}`} stroke="#F7FAFC" strokeWidth="1" strokeOpacity="0.3" fill="none" />
    </Svg>
  );
};