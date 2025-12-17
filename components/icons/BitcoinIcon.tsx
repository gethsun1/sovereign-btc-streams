import { Box } from "@chakra-ui/react";

interface BitcoinIconProps {
  size?: number | string;
  animate?: boolean;
  glow?: boolean;
}

export const BitcoinIcon = ({ size = 40, animate = false, glow = false }: BitcoinIconProps) => {
  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${animate ? 'bitcoin-float' : ''} ${glow ? 'bitcoin-glow' : ''}`}
      sx={{
        '@keyframes bitcoin-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-10px) rotate(5deg)' },
        },
        '&.bitcoin-float': {
          animation: 'bitcoin-float 3s ease-in-out infinite',
        },
      }}
    >
      <circle cx="50" cy="50" r="48" fill="url(#bitcoinGradient)" stroke="url(#bitcoinStroke)" strokeWidth="2"/>
      <path
        d="M35 30V70M45 30V70M35 30H55C58.866 30 62 33.134 62 37C62 40.866 58.866 44 55 44H35M35 44H57C60.866 44 64 47.134 64 51C64 54.866 60.866 58 57 58H35M35 44V58"
        stroke="#0a0a0a"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="bitcoinGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="50%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#f7931a"/>
        </linearGradient>
        <linearGradient id="bitcoinStroke" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24"/>
          <stop offset="100%" stopColor="#f7931a"/>
        </linearGradient>
      </defs>
    </Box>
  );
};

export const BitcoinSymbol = ({ size = 24 }: { size?: number | string }) => {
  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M11.5 2V4M11.5 20V22M8.5 4V2M8.5 22V20M8 6H13C14.657 6 16 7.343 16 9C16 10.657 14.657 12 13 12H8M8 12H14C15.657 12 17 13.343 17 15C17 16.657 15.657 18 14 18H8M8 6V18"
        stroke="url(#btcSymbolGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="btcSymbolGradient" x1="8" y1="2" x2="17" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};
