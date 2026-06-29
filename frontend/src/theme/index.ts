import { extendTheme, type StyleFunctionProps } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';
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
    platform: '0 1px 2px rgba(16, 24, 40, 0.04)',
    platformFloating: '0 16px 40px rgba(16, 24, 40, 0.14)',
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
        fontWeight: '650',
        transition:
          'background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
        _focusVisible: { boxShadow: '0 0 0 3px rgba(37,99,255,.18)' },
      },
      variants: {
        solid: (props: StyleFunctionProps) => ({
          bg: 'brand.500',
          color: 'white',
          _hover: {
            bg: 'brand.600',
            transform: 'translateY(-1px)',
            _disabled: { transform: 'none' },
          },
          _active: { bg: 'brand.700', transform: 'translateY(0)' },
          _disabled: { opacity: 0.48, cursor: 'not-allowed' },
          ...(props.colorScheme !== 'brand' ? {} : {}),
        }),
        outline: (props: StyleFunctionProps) => ({
          bg: mode('white', 'transparent')(props),
          borderColor: mode('#D3D9E4', brand.colors.border)(props),
          color: mode('#344054', brand.colors.textPrimary)(props),
          _hover: {
            bg: mode('#F3F6FA', brand.colors.hover)(props),
            borderColor: mode('#BFC7D4', brand.colors.borderStrong)(props),
          },
          _active: { bg: mode('#E9EDF3', brand.colors.hover)(props) },
        }),
        ghost: (props: StyleFunctionProps) => ({
          color: mode('#475467', brand.colors.textSecondary)(props),
          _hover: {
            bg: mode('#F3F6FA', brand.colors.hover)(props),
            color: mode('#172033', brand.colors.textPrimary)(props),
          },
          _active: { bg: mode('#E9EDF3', brand.colors.hover)(props) },
        }),
      },
    },
    Heading: {
      baseStyle: {
        fontWeight: '800',
        letterSpacing: '0',
      },
    },
    FormLabel: {
      baseStyle: (props: StyleFunctionProps) => ({
        color: mode('#344054', brand.colors.textSecondary)(props),
        fontSize: 'sm',
        fontWeight: '650',
        mb: 1.5,
      }),
    },
    Input: {
      defaultProps: {
        focusBorderColor: 'brand.500',
      },
      variants: {
        outline: (props: StyleFunctionProps) => ({
          field: {
            h: '40px',
            borderRadius: 'md',
            bg: mode('white', brand.colors.bgSecondary)(props),
            borderColor: mode('#D3D9E4', brand.colors.border)(props),
            color: mode('#172033', brand.colors.textPrimary)(props),
            _placeholder: {
              color: mode('#98A2B3', brand.colors.textMuted)(props),
            },
            _hover: {
              borderColor: mode('#AEB8C7', brand.colors.borderStrong)(props),
            },
            _focusVisible: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 3px rgba(37,99,255,.14)',
            },
            _invalid: {
              borderColor: '#D64550',
              boxShadow: '0 0 0 3px rgba(214,69,80,.1)',
            },
            _disabled: {
              bg: mode('#F1F3F6', brand.colors.surface)(props),
              opacity: 0.68,
              cursor: 'not-allowed',
            },
          },
        }),
      },
    },
    Select: {
      variants: {
        outline: (props: StyleFunctionProps) => ({
          field: {
            h: '40px',
            borderRadius: 'md',
            bg: mode('white', brand.colors.bgSecondary)(props),
            borderColor: mode('#D3D9E4', brand.colors.border)(props),
            _hover: {
              borderColor: mode('#AEB8C7', brand.colors.borderStrong)(props),
            },
            _focusVisible: {
              borderColor: 'brand.500',
              boxShadow: '0 0 0 3px rgba(37,99,255,.14)',
            },
          },
          icon: { color: mode('#667085', brand.colors.textSecondary)(props) },
        }),
      },
    },
    Textarea: {
      variants: {
        outline: (props: StyleFunctionProps) => ({
          borderRadius: 'md',
          bg: mode('white', brand.colors.bgSecondary)(props),
          borderColor: mode('#D3D9E4', brand.colors.border)(props),
          _hover: {
            borderColor: mode('#AEB8C7', brand.colors.borderStrong)(props),
          },
          _focusVisible: {
            borderColor: 'brand.500',
            boxShadow: '0 0 0 3px rgba(37,99,255,.14)',
          },
        }),
      },
    },
    Modal: {
      baseStyle: (props: StyleFunctionProps) => ({
        overlay: { bg: 'rgba(15,23,42,.42)', backdropFilter: 'blur(3px)' },
        dialog: {
          bg: mode('white', brand.colors.surfaceElevated)(props),
          color: mode('#172033', brand.colors.textPrimary)(props),
          borderRadius: 'lg',
          boxShadow: 'platformFloating',
          border: '1px solid',
          borderColor: mode('#E4E8F0', brand.colors.border)(props),
        },
        header: { fontSize: 'lg', fontWeight: '750', px: 6, pt: 6, pb: 4 },
        body: { px: 6, py: 2 },
        footer: { px: 6, py: 5 },
        closeButton: { top: 4, right: 4 },
      }),
    },
    Drawer: {
      baseStyle: (props: StyleFunctionProps) => ({
        overlay: { bg: 'rgba(15,23,42,.38)', backdropFilter: 'blur(2px)' },
        dialog: {
          bg: mode('white', brand.colors.surfaceElevated)(props),
          color: mode('#172033', brand.colors.textPrimary)(props),
        },
        header: {
          borderBottom: '1px solid',
          borderColor: mode('#E4E8F0', brand.colors.border)(props),
          px: 6,
          py: 5,
        },
        body: { px: 6, py: 5 },
        footer: {
          borderTop: '1px solid',
          borderColor: mode('#E4E8F0', brand.colors.border)(props),
          px: 6,
          py: 4,
        },
      }),
    },
    Menu: {
      baseStyle: (props: StyleFunctionProps) => ({
        list: {
          bg: mode('white', brand.colors.surfaceElevated)(props),
          borderColor: mode('#E4E8F0', brand.colors.border)(props),
          borderRadius: 'md',
          boxShadow: 'platformFloating',
          p: 1.5,
          minW: '210px',
        },
        item: {
          borderRadius: 'sm',
          fontSize: 'sm',
          py: 2,
          px: 3,
          bg: 'transparent',
          _hover: { bg: mode('#F3F6FA', brand.colors.hover)(props) },
          _focus: { bg: mode('#F3F6FA', brand.colors.hover)(props) },
        },
      }),
    },
    Table: {
      variants: {
        simple: (props: StyleFunctionProps) => ({
          th: {
            bg: mode('#F9FAFC', brand.colors.bgSecondary)(props),
            color: mode('#667085', brand.colors.textSecondary)(props),
            borderColor: mode('#E4E8F0', brand.colors.border)(props),
            fontSize: '10px',
            letterSpacing: '0',
            textTransform: 'uppercase',
            fontWeight: '700',
            py: 3.5,
          },
          td: {
            borderColor: mode('#EAEDF2', brand.colors.border)(props),
            py: 3.5,
            fontSize: 'sm',
          },
          tr: {
            transition: 'background-color 140ms ease',
            _hover: { bg: mode('#F9FAFC', brand.colors.hover)(props) },
          },
        }),
      },
    },
    Tabs: {
      variants: {
        line: (props: StyleFunctionProps) => ({
          tablist: {
            borderColor: mode('#E4E8F0', brand.colors.border)(props),
            gap: 1,
          },
          tab: {
            color: mode('#667085', brand.colors.textSecondary)(props),
            fontSize: 'sm',
            fontWeight: '600',
            px: 3,
            py: 3.5,
            _selected: { color: 'brand.600', borderColor: 'brand.500' },
            _hover: {
              color: mode('#172033', brand.colors.textPrimary)(props),
              bg: mode('#F9FAFC', brand.colors.hover)(props),
            },
          },
        }),
      },
    },
    Alert: {
      baseStyle: (props: StyleFunctionProps) => ({
        container: {
          borderRadius: 'md',
          boxShadow: mode(
            '0 8px 24px rgba(16,24,40,.12)',
            brand.shadows.level1
          )(props),
          border: '1px solid',
          borderColor: mode('#E4E8F0', brand.colors.border)(props),
        },
        title: { fontWeight: '700' },
        description: { fontSize: 'sm' },
      }),
    },
  },
});

export default theme;
