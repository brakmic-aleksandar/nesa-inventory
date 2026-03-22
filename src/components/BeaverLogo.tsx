import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

interface BeaverLogoProps {
  size?: number;
}

export function BeaverLogo({ size = 120 }: BeaverLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Tail */}
      <Path d="M20 90 Q10 85 15 75 L25 80 Z" fill="#8B4513" stroke="#654321" strokeWidth="2" />

      {/* Body */}
      <Ellipse cx="60" cy="70" rx="35" ry="30" fill="#A0522D" stroke="#654321" strokeWidth="2" />

      {/* Head */}
      <Circle cx="60" cy="45" r="25" fill="#CD853F" stroke="#654321" strokeWidth="2" />

      {/* Ears */}
      <Circle cx="45" cy="30" r="8" fill="#8B4513" stroke="#654321" strokeWidth="1.5" />
      <Circle cx="75" cy="30" r="8" fill="#8B4513" stroke="#654321" strokeWidth="1.5" />

      {/* Eyes */}
      <Circle cx="52" cy="42" r="4" fill="#000" />
      <Circle cx="68" cy="42" r="4" fill="#000" />
      <Circle cx="53" cy="41" r="1.5" fill="#FFF" />
      <Circle cx="69" cy="41" r="1.5" fill="#FFF" />

      {/* Nose */}
      <Ellipse cx="60" cy="52" rx="4" ry="3" fill="#654321" />

      {/* Mouth */}
      <Path
        d="M60 52 Q55 58 50 56 M60 52 Q65 58 70 56"
        stroke="#654321"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />

      {/* Teeth - centered together */}
      <Path d="M58 56 L58 62 M62 56 L62 62" stroke="#FFF" strokeWidth="3" strokeLinecap="round" />

      {/* Front paws */}
      <Ellipse cx="40" cy="85" rx="8" ry="12" fill="#A0522D" stroke="#654321" strokeWidth="2" />
      <Ellipse cx="80" cy="85" rx="8" ry="12" fill="#A0522D" stroke="#654321" strokeWidth="2" />
    </Svg>
  );
}
