import {
  Box,
  Button,
  Icon,
  Menu,
  MenuButton,
  MenuItemOption,
  MenuList,
  MenuOptionGroup,
  Portal,
  type SystemProps,
} from '@chakra-ui/react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

export type FilterOption = { value: string; label: string };

/**
 * Select de filtro no padrao visual do ERP (mesmo estilo do seletor de
 * filial da Dashboard): botao outline com icone opcional + menu com radio.
 * Para campos de formulario continue usando o Select nativo do Chakra.
 */
export function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon,
  size = 'md',
  w = 'full',
  maxW,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  icon?: LucideIcon;
  size?: 'sm' | 'md';
  w?: SystemProps['width'];
  maxW?: SystemProps['maxWidth'];
}) {
  const selected = options.find(option => option.value === value);
  return (
    <Menu matchWidth isLazy>
      <MenuButton
        as={Button}
        variant="outline"
        w={w}
        maxW={maxW}
        h={size === 'sm' ? '32px' : '40px'}
        px={3}
        fontWeight="500"
        fontSize={size === 'sm' ? '12px' : '13px'}
        textAlign="left"
        aria-label={label}
        leftIcon={
          icon ? <Icon as={icon} boxSize="15px" color="brand.500" /> : undefined
        }
        rightIcon={
          <Icon as={ChevronDown} boxSize="14px" color="erp.textMuted" />
        }
      >
        <Box as="span" display="block" isTruncated>
          {selected?.label ?? label}
        </Box>
      </MenuButton>
      {/* Portal: as barras de filtro (BrandSurface) tem overflow hidden e
          cortariam o menu renderizado in-place. */}
      <Portal>
        <MenuList maxH="320px" overflowY="auto" zIndex={1500}>
          <MenuOptionGroup
            type="radio"
            value={value}
            onChange={next => onChange(String(next))}
          >
            {options.map(option => (
              <MenuItemOption key={option.value} value={option.value}>
                {option.label}
              </MenuItemOption>
            ))}
          </MenuOptionGroup>
        </MenuList>
      </Portal>
    </Menu>
  );
}
