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
import { useEffect, useRef, useState } from 'react';
import { Surface } from '../../../shared/ui/ErpUI';
import {
  digitsOnly,
  formatCurrency,
  formatDocument,
} from '../../../shared/utils/formatters';
import { receivableService } from '../services/receivableService';
import type { ReceivableCustomerOption } from '../types/receivableTypes';

/**
 * Busca de clientes para os recebimentos. Digitou nome -> busca incremental
 * com debounce; digitou um CPF/CNPJ completo -> carrega automaticamente os
 * titulos daquele cliente, sem clique extra.
 */
export function CustomerReceivableSearch({
  onSelect,
}: {
  onSelect: (customer: ReceivableCustomerOption) => void;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);
  const autoPicked = useRef('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const digits = digitsOnly(debounced);
  const isFullDocument = digits.length === 11 || digits.length === 14;

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
  const dropdownOpen = focused && hasTerm && !isFullDocument;

  const choose = (customer: ReceivableCustomerOption) => {
    onSelect(customer);
    setTerm('');
    setDebounced('');
    setFocused(false);
  };

  // Auto-carrega ao digitar um documento completo com correspondencia exata.
  useEffect(() => {
    if (!isFullDocument || searching || autoPicked.current === digits) return;
    const exact = results.find(
      customer => digitsOnly(customer.documento) === digits
    );
    if (exact) {
      autoPicked.current = digits;
      choose(exact);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits, isFullDocument, searching, results]);

  return (
    <Box position="relative">
      <InputGroup size="lg">
        <InputLeftElement pointerEvents="none" h="full" pl={2}>
          <Search size={20} color="var(--chakra-colors-brand-500)" />
        </InputLeftElement>
        <Input
          value={term}
          onChange={event => setTerm(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          placeholder="Buscar por CPF, CNPJ ou nome do cliente..."
          aria-label="Buscar cliente"
          fontSize="16px"
          h="56px"
          pl="52px"
          borderRadius="14px"
          bg="erp.surface"
          borderColor="erp.border"
          _hover={{ borderColor: 'erp.borderStrong' }}
          _focusVisible={{
            borderColor: 'brand.400',
            boxShadow: '0 0 0 3px var(--chakra-colors-erp-brandSoft)',
          }}
        />
        {searching && (
          <InputRightElement h="full" pr={3}>
            <Spinner size="sm" color="brand.500" />
          </InputRightElement>
        )}
      </InputGroup>

      {isFullDocument && (
        <Text mt={2} fontSize="12px" color="erp.brandText" fontWeight="500">
          Documento completo. Os dados sao carregados automaticamente.
        </Text>
      )}

      {dropdownOpen && (
        <Surface
          position="absolute"
          zIndex={20}
          mt={2}
          w="full"
          maxH="380px"
          overflowY="auto"
          p={1.5}
          borderRadius="14px"
          boxShadow="platformFloating"
          onMouseDown={event => event.preventDefault()}
        >
          {results.map(customer => (
            <Flex
              key={customer.idcliente}
              px={3}
              py={3}
              gap={3}
              align="center"
              borderRadius="10px"
              cursor="pointer"
              transition="background 120ms ease"
              _hover={{ bg: 'erp.hover' }}
              onClick={() => choose(customer)}
            >
              <Flex
                w="36px"
                h="36px"
                align="center"
                justify="center"
                borderRadius="10px"
                bg="erp.brandSoft"
                color="brand.500"
                border="1px solid"
                borderColor="erp.brandBorder"
                flexShrink={0}
                fontWeight="700"
                fontSize="14px"
              >
                {customer.nome.trim().charAt(0).toUpperCase()}
              </Flex>
              <Box flex="1" minW={0}>
                <Text fontSize="14px" fontWeight="600" noOfLines={1}>
                  {customer.nome}
                </Text>
                <Text fontSize="12px" color="erp.textSecondary" noOfLines={1}>
                  {customer.documento
                    ? formatDocument(customer.documento)
                    : 'Sem documento'}
                </Text>
              </Box>
              {customer.titulos_abertos > 0 ? (
                <Box textAlign="right" flexShrink={0}>
                  <Text textStyle="numeric" fontSize="13px" fontWeight="700">
                    {formatCurrency(customer.total_aberto)}
                  </Text>
                  <Badge colorScheme="orange" fontSize="10px" mt={0.5}>
                    {customer.titulos_abertos} em aberto
                  </Badge>
                </Box>
              ) : (
                <Badge flexShrink={0} colorScheme="gray" fontSize="10px">
                  Em dia
                </Badge>
              )}
            </Flex>
          ))}
          {!searching && results.length === 0 && (
            <Text px={3} py={4} fontSize="13px" color="erp.textMuted">
              Nenhum cliente encontrado para "{debounced}".
            </Text>
          )}
        </Surface>
      )}
    </Box>
  );
}
