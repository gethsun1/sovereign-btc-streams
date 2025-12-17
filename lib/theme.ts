import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "'Space Grotesk', 'Inter', system-ui, -apple-system, sans-serif",
    body: "'Inter', system-ui, -apple-system, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: "linear-gradient(135deg, #0a0a0a 0%, #1a1410 50%, #0a0a0a 100%)",
        color: "gray.50",
        minHeight: "100vh",
      },
      "*::selection": {
        bg: "bitcoin.400",
        color: "gray.900",
      },
    },
  },
  colors: {
    bitcoin: {
      50: "#fff9e6",
      100: "#ffecb3",
      200: "#ffe080",
      300: "#ffd34d",
      400: "#f7931a",
      500: "#e88b0c",
      600: "#d47a00",
      700: "#b86900",
      800: "#9c5700",
      900: "#7a4400",
    },
    gold: {
      50: "#fffbeb",
      100: "#fef3c7",
      200: "#fde68a",
      300: "#fcd34d",
      400: "#fbbf24",
      500: "#f59e0b",
      600: "#d97706",
      700: "#b45309",
      800: "#92400e",
      900: "#78350f",
    },
    dark: {
      50: "#f7f7f7",
      100: "#e3e3e3",
      200: "#c8c8c8",
      300: "#a4a4a4",
      400: "#818181",
      500: "#666666",
      600: "#515151",
      700: "#434343",
      800: "#1a1410",
      900: "#0a0a0a",
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "xl",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        _hover: {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 25px -5px rgba(247, 147, 26, 0.3)",
        },
        _active: {
          transform: "translateY(0)",
        },
      },
      variants: {
        solid: {
          bg: "linear-gradient(135deg, #f7931a 0%, #fbbf24 100%)",
          color: "gray.900",
          boxShadow: "0 4px 15px -3px rgba(247, 147, 26, 0.4)",
          _hover: {
            bg: "linear-gradient(135deg, #fbbf24 0%, #f7931a 100%)",
            boxShadow: "0 10px 25px -5px rgba(247, 147, 26, 0.5)",
          },
        },
        outline: {
          borderColor: "bitcoin.400",
          color: "bitcoin.400",
          borderWidth: "2px",
          _hover: {
            bg: "rgba(247, 147, 26, 0.1)",
            borderColor: "gold.400",
            color: "gold.400",
          },
        },
        ghost: {
          color: "bitcoin.400",
          _hover: {
            bg: "rgba(247, 147, 26, 0.1)",
            color: "gold.300",
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "rgba(26, 20, 16, 0.6)",
          backdropFilter: "blur(20px)",
          borderRadius: "2xl",
          border: "1px solid",
          borderColor: "rgba(247, 147, 26, 0.1)",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          _hover: {
            borderColor: "rgba(247, 147, 26, 0.3)",
            boxShadow: "0 12px 40px rgba(247, 147, 26, 0.2)",
            transform: "translateY(-4px)",
          },
        },
      },
    },
    Input: {
      variants: {
        filled: {
          field: {
            bg: "rgba(26, 20, 16, 0.8)",
            borderRadius: "xl",
            border: "1px solid",
            borderColor: "rgba(247, 147, 26, 0.2)",
            _hover: {
              bg: "rgba(26, 20, 16, 0.9)",
              borderColor: "rgba(247, 147, 26, 0.3)",
            },
            _focus: {
              bg: "rgba(26, 20, 16, 1)",
              borderColor: "bitcoin.400",
              boxShadow: "0 0 0 1px rgba(247, 147, 26, 0.4)",
            },
          },
        },
      },
      defaultProps: {
        variant: "filled",
      },
    },
    Stat: {
      baseStyle: {
        container: {
          bg: "rgba(26, 20, 16, 0.6)",
          backdropFilter: "blur(20px)",
          borderRadius: "xl",
          border: "1px solid",
          borderColor: "rgba(247, 147, 26, 0.1)",
          p: 6,
          transition: "all 0.3s ease",
          _hover: {
            borderColor: "rgba(247, 147, 26, 0.3)",
            transform: "translateY(-2px)",
          },
        },
        label: {
          color: "gray.400",
          fontSize: "sm",
          fontWeight: "500",
          textTransform: "uppercase",
          letterSpacing: "wide",
        },
        number: {
          color: "bitcoin.400",
          fontSize: "3xl",
          fontWeight: "700",
        },
      },
    },
  },
  shadows: {
    bitcoin: "0 0 20px rgba(247, 147, 26, 0.3)",
    bitcoinLg: "0 0 40px rgba(247, 147, 26, 0.4)",
    gold: "0 0 20px rgba(251, 191, 36, 0.3)",
    goldLg: "0 0 40px rgba(251, 191, 36, 0.4)",
  },
});

export default theme;
