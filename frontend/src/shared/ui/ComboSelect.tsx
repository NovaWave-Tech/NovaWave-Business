import {
  Box,
  Flex,
  Icon,
  Input,
  InputGroup,
  InputRightElement,
  Popover,
  PopoverAnchor,
  PopoverContent,
  Portal,
  Text,
} from '@chakra-ui/react';
import { Check, ChevronDown } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';

export type ComboOption = {
  value: string;
  label: string;
  description?: string;
};

/**
 * Select de formulario com filtro por digitacao, no padrao visual do ERP.
 * Clique mostra todas as opcoes; digitar filtra. O dropdown e renderizado
 * em Portal, entao funciona dentro de modais e drawers sem cortes.
 * Para filtros de toolbar use FilterSelect; para clientes na venda use
 * CustomerSearchSelect (busca assincrona).
 */
export function ComboSelect({
  value,
  onChange,
  options,
  placeholder = 'Selecione',
  isDisabled,
  size = 'md',
  emptyMessage = 'Nenhuma opcao encontrada',
}: {
  value: string;
  onChange: (value: string) => void;
  options: ComboOption[];
  placeholder?: string;
  isDisabled?: boolean;
  size?: 'sm' | 'md';
  emptyMessage?: string;
}) {
  const [term, setTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = options.find(option => option.value === value);

  const filtered = useMemo(() => {
    const query = term.trim().toLowerCase();
    if (!query) return options;
    return options.filter(option =>
      `${option.label} ${option.description ?? ''}`
        .toLowerCase()
        .includes(query)
    );
  }, [options, term]);

  const open = () => {
    if (isDisabled || isOpen) return;
    setTerm('');
    setIsOpen(true);
  };
  const close = () => {
    setIsOpen(false);
    setTerm('');
  };
  const select = (option: ComboOption) => {
    onChange(option.value);
    close();
    inputRef.current?.blur();
  };

  return (
    <Popover
      isOpen={isOpen}
      onClose={close}
      placement="bottom-start"
      matchWidth
      autoFocus={false}
      isLazy
    >
      <PopoverAnchor>
        <InputGroup size={size}>
          <Input
            ref={inputRef}
            value={isOpen ? term : (selected?.label ?? '')}
            placeholder={selected?.label ?? placeholder}
            isDisabled={isDisabled}
            onFocus={open}
            onClick={open}
            onBlur={close}
            onChange={event => {
              setTerm(event.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (filtered[0]) select(filtered[0]);
              }
              if (event.key === 'Escape') close();
            }}
          />
          <InputRightElement pointerEvents="none" color="erp.textMuted">
            <ChevronDown size={14} />
          </InputRightElement>
        </InputGroup>
      </PopoverAnchor>
      <Portal>
        <PopoverContent
          zIndex={1500}
          maxH="260px"
          overflowY="auto"
          p={1}
          boxShadow="platformFloating"
          onMouseDown={event => event.preventDefault()}
        >
          {filtered.length ? (
            filtered.map(option => (
              <Flex
                key={option.value}
                align="center"
                justify="space-between"
                gap={2}
                px={3}
                py={2}
                borderRadius="8px"
                cursor="pointer"
                transition="background 120ms ease"
                _hover={{ bg: 'erp.hover' }}
                onClick={() => select(option)}
              >
                <Box minW={0}>
                  <Text
                    fontSize="13px"
                    fontWeight={option.value === value ? '600' : '400'}
                    noOfLines={1}
                  >
                    {option.label}
                  </Text>
                  {option.description && (
                    <Text fontSize="11px" color="erp.textMuted" noOfLines={1}>
                      {option.description}
                    </Text>
                  )}
                </Box>
                {option.value === value && (
                  <Icon as={Check} boxSize="14px" color="brand.500" />
                )}
              </Flex>
            ))
          ) : (
            <Text px={3} py={2} fontSize="12px" color="erp.textMuted">
              {emptyMessage}
            </Text>
          )}
        </PopoverContent>
      </Portal>
    </Popover>
  );
}
