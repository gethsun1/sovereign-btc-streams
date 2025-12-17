import { Box } from "@chakra-ui/react";

export const StreamFlowIcon = ({ size = 24 }: { size?: number | string }) => {
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
        d="M3 12H21M21 12L17 8M21 12L17 16M7 6L3 12L7 18"
        stroke="url(#streamGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2" fill="url(#streamGradient)">
        <animate attributeName="r" values="2;3;2" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite"/>
      </circle>
      <defs>
        <linearGradient id="streamGradient" x1="3" y1="12" x2="21" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};

export const VaultIcon = ({ size = 24 }: { size?: number | string }) => {
  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="3" y="4" width="18" height="16" rx="2" stroke="url(#vaultGradient)" strokeWidth="2"/>
      <circle cx="16" cy="12" r="3" stroke="url(#vaultGradient)" strokeWidth="2"/>
      <circle cx="16" cy="12" r="1" fill="url(#vaultGradient)"/>
      <path d="M7 8H10M7 12H10M7 16H10" stroke="url(#vaultGradient)" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="vaultGradient" x1="3" y1="4" x2="21" y2="20" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};

export const ClockIcon = ({ size = 24 }: { size?: number | string }) => {
  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="url(#clockGradient)" strokeWidth="2"/>
      <path d="M12 7V12L15 15" stroke="url(#clockGradient)" strokeWidth="2" strokeLinecap="round"/>
      <defs>
        <linearGradient id="clockGradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};

export const ChartIcon = ({ size = 24 }: { size?: number | string }) => {
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
        d="M3 17L9 11L13 15L21 7M21 7H15M21 7V13"
        stroke="url(#chartGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="chartGradient" x1="3" y1="17" x2="21" y2="7" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};

export const CheckCircleIcon = ({ size = 24 }: { size?: number | string }) => {
  return (
    <Box
      as="svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9" stroke="url(#checkGradient)" strokeWidth="2"/>
      <path d="M8 12L11 15L16 9" stroke="url(#checkGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <defs>
        <linearGradient id="checkGradient" x1="3" y1="3" x2="21" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};

export const LightningIcon = ({ size = 24 }: { size?: number | string }) => {
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
        d="M13 2L3 14H12L11 22L21 10H12L13 2Z"
        fill="url(#lightningGradient)"
        stroke="url(#lightningStroke)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient id="lightningGradient" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a" stopOpacity="0.8"/>
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="lightningStroke" x1="3" y1="2" x2="21" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f7931a"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
      </defs>
    </Box>
  );
};
