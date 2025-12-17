import { Box } from "@chakra-ui/react";

export const FloatingBitcoinPattern = () => {
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100%"
      height="100%"
      pointerEvents="none"
      zIndex={0}
      overflow="hidden"
    >
      {[...Array(6)].map((_, i) => (
        <Box
          key={i}
          position="absolute"
          opacity={0.03}
          sx={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float ${15 + i * 3}s ease-in-out infinite`,
            animationDelay: `${i * 2}s`,
          }}
        >
          <svg width="100" height="100" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="50" r="45" stroke="#f7931a" strokeWidth="1" opacity="0.5"/>
            <path
              d="M35 30V70M45 30V70M35 30H55C58.866 30 62 33.134 62 37C62 40.866 58.866 44 55 44H35M35 44H57C60.866 44 64 47.134 64 51C64 54.866 60.866 58 57 58H35M35 44V58"
              stroke="#f7931a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.5"
            />
          </svg>
        </Box>
      ))}
    </Box>
  );
};

export const GlowOrb = ({ top, left, color = "#f7931a", size = "400px" }: {
  top?: string;
  left?: string;
  color?: string;
  size?: string;
}) => {
  return (
    <Box
      position="absolute"
      top={top}
      left={left}
      width={size}
      height={size}
      borderRadius="full"
      bg={color}
      filter="blur(100px)"
      opacity={0.1}
      pointerEvents="none"
      zIndex={0}
      sx={{
        animation: 'glow 8s ease-in-out infinite',
      }}
    />
  );
};

export const GridPattern = () => {
  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      width="100%"
      height="100%"
      pointerEvents="none"
      zIndex={0}
      opacity={0.02}
      sx={{
        backgroundImage: `
          linear-gradient(rgba(247, 147, 26, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(247, 147, 26, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
      }}
    />
  );
};

export const AnimatedGradientBorder = ({ children, ...props }: any) => {
  return (
    <Box
      position="relative"
      p="2px"
      borderRadius="2xl"
      overflow="hidden"
      {...props}
      _before={{
        content: '""',
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: 'conic-gradient(from 0deg, #f7931a, #fbbf24, #f7931a, #fbbf24, #f7931a)',
        animation: 'rotate 4s linear infinite',
      }}
      sx={{
        '@keyframes rotate': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      }}
    >
      <Box position="relative" zIndex={1} bg="dark.900" borderRadius="2xl">
        {children}
      </Box>
    </Box>
  );
};
