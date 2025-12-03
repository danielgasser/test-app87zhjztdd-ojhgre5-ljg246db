import React from "react";
import Svg, {
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";

interface NavigationArrowProps {
  size?: number;
  color?: string;
}

const NavigationArrow: React.FC<NavigationArrowProps> = ({
  size = 40,
  color = "#2A5C99",
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id="arrowGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor={color} stopOpacity={1} />
          <Stop offset="100%" stopColor={color} stopOpacity={0.7} />
        </LinearGradient>
      </Defs>
      {/* Outer circle for visibility */}
      <Circle cx="20" cy="20" r="18" fill="white" opacity={0.9} />
      {/* Arrow pointing UP (0 degrees = north) */}
      <Path d="M20 6 L32 30 L20 24 L8 30 Z" fill="url(#arrowGradient)" />
    </Svg>
  );
};

export default NavigationArrow;
