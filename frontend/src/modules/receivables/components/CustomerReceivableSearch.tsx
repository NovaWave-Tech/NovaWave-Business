import {
  Badge,
  Box,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Spinner,
  Text,
} from '@chakra-ui/react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Surface } from '../../../shared/ui/ErpUI';
import {
  formatCurrency,
  formatDocument,
} from '../../../shared/utils/formatters';
import { receivableService } from '../services/receivableService';
import type { ReceivableCustomerOption } from '../types/receivableTypes';

/**
 * Busca assincrona de clientes para os recebimentos, priorizando quem tem
 * titulos em aberto. Selecionar carrega os titulos daquele cliente.
 */
export function CustomerReceivableSearch({
  onSelect,
}: {
  onSelect: (customer: ReceivableCustomerOption) => void;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const search = useQuery({
    queryKey: ['receivable-customer-search', debounced],
    queryFn: () => receivableService.searchCustomers(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const hasTerm = debounced.length >= 2;
  const results = hasTerm ? (search.data ?? []) : [];
  const searching = hasTerm && search.isFetching;
  const dropdownOpen = focused && hasTerm;

  return (
    <Box position="relative">
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none" h="full">
          <Search size={18} />
        </InputLeftElement>
        <Input
          value={term}
          onChange={event => setTerm(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="CPF, CNPJ ou nome do cliente"
          aria-label="Buscar cliente"
          fontSize="15px"
        />
        {searching && (
          <InputRightElement h="full">
            <Spinner size="sm" color="erp.textMuted" />
          </InputRightElement>
        )}
      </InputGroup>

      {dropdownOpen && (
        <Surface
          position="absolute"
          zIndex={20}
          mt={1}
          w="full"
          maxH="360px"
          overflowY="auto"
          p={1}
          boxShadow="platformFloating"
          onMouseDown={event => event.preventDefault()}
        >
          {results.map(customer => (
            <Flex
              key={customer.idcliente}
              px={3}
              py={2.5}
              gap={3}
              align="center"
              borderRadius="8px"
              cursor="pointer"
              transition="background 120ms ease"
              _hover={{ bg: 'erp.hover' }}
              onClick={() => {
                onSelect(customer);
                setTerm('');
                setFocused(false);
              }}
            >
              <Box flex="1" minW={0}>
                <Text fontSize="13px" fontWeight="600" noOfLines={1}>
                  {customer.nome}
                </Text>
                <Text fontSize="11px" color="erp.textSecondary" noOfLines={1}>
                  {customer.documento
                    ? formatDocument(customer.documento)
                    : 'Sem documento'}
                </Text>
              </Box>
              {customer.titulos_abertos > 0 ? (
                <Box textAlign="right" flexShrink={0}>
                  <Text textStyle="numeric" fontSize="12px" fontWeight="700">
                    {formatCurrency(customer.total_aberto)}
                  </Text>
                  <Badge colorScheme="orange" fontSize="10px">
                    {customer.titulos_abertos} em aberto
                  </Badge>
                </Box>
              ) : (
                <Badge flexShrink={0} colorScheme="gray" fontSize="10px">
                  Sem titulos
                </Badge>
              )}
            </Flex>
          ))}
          {!searching && results.length === 0 && (
            <Text px={3} py={3} fontSize="12px" color="erp.textMuted">
              Nenhum cliente encontrado para "{debounced}".
            </Text>
          )}
        </Surface>
      )}
    </Box>
  );
}
