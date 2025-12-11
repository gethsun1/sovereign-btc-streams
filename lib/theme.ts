import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "dark",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: "Inter, system-ui, -apple-system, sans-serif",
    body: "Inter, system-ui, -apple-system, sans-serif",
  },
  styles: {
    global: {
      body: {
        bg: "gray.900",
        color: "gray.50",
      },
    },
  },
  colors: {
    brand: {
      50: "#f5f9ff",
      100: "#dce8ff",
      200: "#b8d1ff",
      300: "#92b8ff",
      400: "#6d9eff",
      500: "#4b86ff",
      600: "#3669db",
      700: "#254eaa",
      800: "#18367a",
      900: "#0c1e4c",
    },
  },
});

export default theme;
