// app/components/svg/Onboarding2Bg.tsx
import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export const Onboarding2Bg = () => {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="grad" x1="0%" y1="100%" x2="0%" y2="0%">
          <Stop offset="0%" stopColor="#1A202C" />
          <Stop offset="100%" stopColor="#2D3748" />
        </LinearGradient>
      </Defs>
      <Path fill="url(#grad)" d={`M0,0 H${width} V${height} H0 Z`} />
      <Path
        d={`M0,${height * 0.5} C${width * 0.2},${height * 0.3} ${width * 0.4},${height * 0.8} ${width * 0.7},${height * 0.6} S${width * 0.9},${height * 0.2} ${width},${height * 0.4}`}
        stroke="#48BB78"
        strokeWidth="3"
        fill="none"
      />
      <Circle cx={width * 0.7} cy={height * 0.6} r="5" fill="#48BB78" />
      <Circle cx={width * 0.2} cy={height * 0.4} r="3" fill="#00C6FF" />
    </Svg>
  );
};