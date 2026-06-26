import { extendTheme } from '@chakra-ui/react';
import { brand } from '../shared/brand/brand';

const theme = extendTheme({
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#EAF2FF',
      100: '#CFE1FF',
      200: '#A8C9FF',
      300: '#84B8FF',
      400: '#5C9AFF',
      500: brand.colors.primary,
      600: brand.colors.primaryHover,
      700: brand.colors.secondary,
      800: '#3730A3',
      900: '#27206F',
    },
    indigo: {
      400: brand.colors.secondary,
    },
    violet: {
      400: brand.colors.accent,
    },
    success: brand.colors.success,
    warning: brand.colors.warning,
    danger: brand.colors.error,
    surface: {
      base: brand.colors.surface,
      elevated: brand.colors.surfaceElevated,
      hover: brand.colors.hover,
    },
  },
  fonts: {
    heading:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    body: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  radii: brand.radii,
  shadows: {
    outline: brand.shadows.focus,
    level1: brand.shadows.level1,
    level2: brand.shadows.level2,
  },
  styles: {
    global: {
      body: {
        bg: brand.colors.bgMain,
        color: brand.colors.textPrimary,
      },
      '::selection': {
        bg: 'brand.500',
        color: 'white',
      },
    },
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
      baseStyle: {
        borderRadius: 'md',
        fontWeight: '700',
      },
      variants: {
        solid: {
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
          },
        },
        outline: {
          borderColor: brand.colors.border,
          color: brand.colors.textPrimary,
          _hover: {
            bg: brand.colors.hover,
          },
        },
        ghost: {
          color: brand.colors.textSecondary,
          _hover: {
            bg: brand.colors.hover,
            color: brand.colors.textPrimary,
          },
        },
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: '800',
        letterSpacing: '0',
      },
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
    },
  },
});

export default theme;
