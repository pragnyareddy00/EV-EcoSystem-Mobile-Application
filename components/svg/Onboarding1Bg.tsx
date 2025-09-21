// app/components/svg/Onboarding1Bg.tsx
import React from 'react';
import { useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

export const Onboarding1Bg = () => {
  const { width, height } = useWindowDimensions();
  return (
    <Svg width={width} height={height} style={{ position: 'absolute' }}>
      <Defs>
        <LinearGradient id="grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#1A202C" />
          <Stop offset="100%" stopColor="#2D3748" />
        </LinearGradient>
      </Defs>
      <Path fill="url(#grad)" d={`M0,0 H${width} V${height} H0 Z`} />
      <Path
        d={`M-10,${height * 0.7} Q${width * 0.2},${height * 0.6} ${width * 0.5},${height * 0.75} T${width + 10},${height * 0.6}`}
        stroke="#00C6FF"
        strokeWidth="2"
        fill="none"
        strokeDasharray="5, 10"
      />
      <Path
        d={`M-10,${height * 0.9} Q${width * 0.3},${height * 0.95} ${width * 0.6},${height * 0.8} T${width + 10},${height * 0.9}`}
        stroke="#48BB78"
        strokeWidth="1"
        fill="none"
      />
    </Svg>
  );
};