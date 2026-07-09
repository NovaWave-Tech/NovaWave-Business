import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { Search, UserRound, UserRoundPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { Surface } from '../../../shared/ui/ErpUI';
import FormattedInput from '../../../shared/ui/FormattedInput';
import {
  digitsOnly,
  formatCurrency,
  formatDate,
  formatDocument,
  formatPhone,
  isValidCpf,
} from '../../../shared/utils/formatters';
import {
  customerService,
  type CustomerSearchResult,
} from '../../customers/services/customerService';

export type SelectedCustomer = {
  /** null = Consumidor Final (o backend vincula ao cliente padrao da empresa). */
  id: number | null;
  nome: string;
  documento?: string | null;
};

const quickCustomerSchema = z.object({
  nome: z.string().trim().min(3, 'Informe o nome do cliente.'),
  documento: z
    .string()
    .refine(value => !value || isValidCpf(value), 'CPF invalido.'),
  telefone: z
    .string()
    .refine(
      value => !value || [10, 11].includes(digitsOnly(value).length),
      'Informe um telefone valido.'
    ),
  email: z.union([
    z.literal(''),
    z.string().email('Informe um e-mail valido.'),
  ]),
});

type QuickCustomerForm = z.infer<typeof quickCustomerSchema>;

const quickDefaults: QuickCustomerForm = {
  nome: '',
  documento: '',
  telefone: '',
  email: '',
};

function CustomerResultRow({
  customer,
  onSelect,
}: {
  customer: CustomerSearchResult;
  onSelect: () => void;
}) {
  const contact = [
    customer.documento ? formatDocument(customer.documento) : null,
    customer.telefone ? formatPhone(customer.telefone) : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Flex
      px={3}
      py={2.5}
      gap={3}
      align="center"
      borderRadius="8px"
      cursor="pointer"
      transition="background 120ms ease"
      _hover={{ bg: 'erp.hover' }}
      onClick={onSelect}
    >
      <Box flex="1" minW={0}>
        <Flex align="center" gap={2}>
          <Text fontSize="13px" fontWeight="600" noOfLines={1}>
            {customer.nome}
          </Text>
          <Badge
            colorScheme={customer.situacao === 1 ? 'green' : 'red'}
            variant="subtle"
            textTransform="none"
            fontSize="10px"
            flexShrink={0}
          >
            {customer.situacao === 1 ? 'Ativo' : 'Inativo'}
          </Badge>
        </Flex>
        <Text mt={0.5} fontSize="11px" color="erp.textSecondary" noOfLines={1}>
          {contact || 'Sem documento cadastrado'}
        </Text>
      </Box>
      <Box textAlign="right" flexShrink={0}>
        <Text textStyle="numeric" fontSize="12px" fontWeight="600">
          {formatCurrency(Number(customer.total_bought))}
        </Text>
        <Text fontSize="10px" color="erp.textMuted">
          {customer.last_purchase
            ? `Ultima compra ${formatDate(customer.last_purchase)}`
            : 'Sem compras'}
        </Text>
      </Box>
    </Flex>
  );
}

function QuickCreateModal({
  isOpen,
  onClose,
  initialName,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  onCreated: (customer: SelectedCustomer) => void;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const form = useForm<QuickCustomerForm>({
    resolver: zodResolver(quickCustomerSchema) as Resolver<QuickCustomerForm>,
    defaultValues: quickDefaults,
  });

  useEffect(() => {
    if (isOpen) form.reset({ ...quickDefaults, nome: initialName });
  }, [isOpen, initialName, form]);

  const create = useMutation({
    mutationFn: (values: QuickCustomerForm) =>
      customerService.create({
        tipo_pessoa: 1,
        nome: values.nome.trim(),
        documento: values.documento,
        telefone: values.telefone || undefined,
        email: values.email || undefined,
        limite_credito: 0,
        situacao: true,
        recorrente: false,
        permite_venda_prazo: false,
      }),
    onSuccess: async (result, values) => {
      await client.invalidateQueries({ queryKey: ['customers'] });
      await client.invalidateQueries({ queryKey: ['customer-search'] });
      onCreated({
        id: Number(result.data.idcliente),
        nome: values.nome.trim(),
        documento: values.documento || null,
      });
      toast({
        title: 'Cliente cadastrado',
        description: 'O cliente ja foi selecionado nesta venda.',
        status: 'success',
        position: 'top-right',
      });
      onClose();
    },
    onError: error =>
      toast({
        title: 'Nao foi possivel cadastrar o cliente',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        status: 'error',
        position: 'top-right',
      }),
  });

  const errors = form.formState.errors;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalOverlay />
      <ModalContent
        as="form"
        onSubmit={form.handleSubmit(values => create.mutate(values))}
      >
        <ModalHeader>
          Cadastro rapido de cliente
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            So o nome e obrigatorio. Complete o cadastro depois, na tela de
            clientes.
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl isRequired isInvalid={!!errors.nome}>
            <FormLabel>Nome</FormLabel>
            <Input
              autoFocus
              placeholder="Nome completo do cliente"
              {...form.register('nome')}
            />
            <FormErrorMessage>{errors.nome?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.documento}>
            <FormLabel>CPF</FormLabel>
            <Controller
              control={form.control}
              name="documento"
              render={({ field }) => (
                <FormattedInput
                  mask="cpf"
                  placeholder="000.000.000-00"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <FormErrorMessage>{errors.documento?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.telefone}>
            <FormLabel>Telefone</FormLabel>
            <Controller
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormattedInput
                  mask="phone"
                  placeholder="(00) 00000-0000"
                  value={field.value}
                  onValueChange={field.onChange}
                />
              )}
            />
            <FormErrorMessage>{errors.telefone?.message}</FormErrorMessage>
          </FormControl>
          <FormControl mt={4} isInvalid={!!errors.email}>
            <FormLabel>E-mail</FormLabel>
            <Input
              type="email"
              placeholder="cliente@email.com"
              {...form.register('email')}
            />
            <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
          </FormControl>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={create.isPending}>
            Cadastrar e usar na venda
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

/**
 * Busca assincrona de clientes para a venda: pesquisa incremental por nome,
 * CPF, CNPJ, telefone ou e-mail, com opcao de Consumidor Final e cadastro
 * rapido quando o cliente nao existe.
 */
export function CustomerSearchSelect({
  value,
  onChange,
}: {
  value: SelectedCustomer | null;
  onChange: (customer: SelectedCustomer | null) => void;
}) {
  const [term, setTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [focused, setFocused] = useState(false);
  const quickModal = useDisclosure();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 300);
    return () => clearTimeout(timer);
  }, [term]);

  const search = useQuery({
    queryKey: ['customer-search', debounced],
    queryFn: () => customerService.search(debounced),
    enabled: debounced.length >= 2,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  const hasTerm = debounced.length >= 2;
  const results = hasTerm ? (search.data ?? []) : [];
  const searching = hasTerm && search.isFetching;
  const dropdownOpen = focused && !value;

  const selectCustomer = (customer: CustomerSearchResult) => {
    onChange({
      id: customer.idcliente,
      nome: customer.nome,
      documento: customer.documento,
    });
    setTerm('');
  };
  const selectFinalConsumer = () => {
    onChange({ id: null, nome: 'Consumidor Final' });
    setTerm('');
  };

  if (value) {
    const isFinal = value.id === null;
    return (
      <Flex
        align="center"
        gap={3}
        px={3}
        h="40px"
        border="1px solid"
        borderColor="erp.borderStrong"
        borderRadius="md"
        bg="erp.surfaceSubtle"
      >
        <Flex
          w="26px"
          h="26px"
          align="center"
          justify="center"
          borderRadius="7px"
          bg="erp.brandSoft"
          border="1px solid"
          borderColor="erp.brandBorder"
          color="brand.500"
          flexShrink={0}
        >
          <Icon as={UserRound} boxSize="14px" />
        </Flex>
        <Box flex="1" minW={0}>
          <Text fontSize="13px" fontWeight="600" lineHeight="1.2" noOfLines={1}>
            {value.nome}
          </Text>
          <Text fontSize="10px" color="erp.textMuted" lineHeight="1.2">
            {isFinal
              ? 'Venda sem identificacao do cliente'
              : value.documento
                ? formatDocument(value.documento)
                : 'Sem documento cadastrado'}
          </Text>
        </Box>
        <IconButton
          aria-label="Remover cliente selecionado"
          icon={<X size={14} />}
          size="xs"
          variant="ghost"
          onClick={() => onChange(null)}
        />
      </Flex>
    );
  }

  return (
    <Box position="relative">
      <InputGroup>
        <InputLeftElement pointerEvents="none">
          <Search size={16} />
        </InputLeftElement>
        <Input
          value={term}
          onChange={event => setTerm(event.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Buscar por nome, CPF, CNPJ, telefone ou e-mail..."
          aria-label="Buscar cliente"
        />
        {searching && (
          <InputRightElement>
            <Spinner size="sm" color="erp.textMuted" />
          </InputRightElement>
        )}
      </InputGroup>

      {dropdownOpen && (
        <Surface
          position="absolute"
          zIndex={5}
          mt={1}
          w="full"
          maxH="340px"
          overflowY="auto"
          p={1}
          boxShadow="platformFloating"
          onMouseDown={event => event.preventDefault()}
        >
          <Flex
            px={3}
            py={2.5}
            gap={3}
            align="center"
            borderRadius="8px"
            cursor="pointer"
            transition="background 120ms ease"
            _hover={{ bg: 'erp.hover' }}
            onClick={selectFinalConsumer}
          >
            <Flex
              w="28px"
              h="28px"
              align="center"
              justify="center"
              borderRadius="7px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
              color="brand.500"
              flexShrink={0}
            >
              <Icon as={UserRound} boxSize="14px" />
            </Flex>
            <Box>
              <Text fontSize="13px" fontWeight="600">
                Consumidor Final
              </Text>
              <Text fontSize="11px" color="erp.textSecondary">
                Venda rapida sem identificacao do cliente
              </Text>
            </Box>
          </Flex>

          {!hasTerm ? (
            <Text px={3} py={2} fontSize="11px" color="erp.textMuted">
              Digite ao menos 2 caracteres para buscar clientes.
            </Text>
          ) : (
            <>
              {results.map(customer => (
                <CustomerResultRow
                  key={customer.idcliente}
                  customer={customer}
                  onSelect={() => selectCustomer(customer)}
                />
              ))}
              {!searching && results.length === 0 && (
                <Flex
                  px={3}
                  py={2.5}
                  gap={3}
                  align="center"
                  borderRadius="8px"
                  cursor="pointer"
                  transition="background 120ms ease"
                  _hover={{ bg: 'erp.hover' }}
                  onClick={quickModal.onOpen}
                >
                  <Flex
                    w="28px"
                    h="28px"
                    align="center"
                    justify="center"
                    borderRadius="7px"
                    bg="erp.brandSoft"
                    border="1px solid"
                    borderColor="erp.brandBorder"
                    color="brand.500"
                    flexShrink={0}
                  >
                    <Icon as={UserRoundPlus} boxSize="14px" />
                  </Flex>
                  <Box>
                    <Text
                      fontSize="13px"
                      fontWeight="600"
                      color="erp.brandText"
                    >
                      + Cadastrar cliente rapidamente
                    </Text>
                    <Text fontSize="11px" color="erp.textSecondary">
                      Nenhum cliente encontrado para "{debounced}"
                    </Text>
                  </Box>
                </Flex>
              )}
            </>
          )}
        </Surface>
      )}

      <QuickCreateModal
        isOpen={quickModal.isOpen}
        onClose={quickModal.onClose}
        initialName={debounced}
        onCreated={customer => {
          onChange(customer);
          setTerm('');
        }}
      />
    </Box>
  );
}
