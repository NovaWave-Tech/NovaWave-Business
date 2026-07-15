import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CheckCircle2,
  CircleDollarSign,
  CreditCard,
  Eye,
  MoreHorizontal,
  Package,
  Plus,
  Printer,
  Receipt,
  Search,
  ShoppingCart,
  Ticket,
  TicketPercent,
  Trash2,
  TrendingUp,
  X,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
  StatGroup,
  Surface,
} from '../../../shared/ui/ErpUI';
import {
  DateRangeField,
  type DateRange,
} from '../../../shared/ui/DateRangeField';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import { FilterSelect } from '../../../shared/ui/FilterSelect';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPaymentMethod,
  isoDaysAgo,
  isoToday,
} from '../../../shared/utils/formatters';
import {
  CustomerSearchSelect,
  type SelectedCustomer,
} from '../components/CustomerSearchSelect';
import { saleService } from '../services/saleService';
import {
  PAYMENT_METHODS,
  SALE_STATUS,
  type PaymentMethod,
  type ProductOption,
  type SaleDetail,
  type SaleListData,
  type SaleRow,
} from '../types/saleTypes';

type CartLine = {
  idproduto: number;
  nome: string;
  unidade: string;
  estoque: number;
  quantidade: number;
  valor_unitario: number;
};

function StatusBadge({ status }: { status: number }) {
  const meta = SALE_STATUS[status] ?? { label: 'Outro', scheme: 'gray' };
  return (
    <Badge colorScheme={meta.scheme} textTransform="none">
      {meta.label}
    </Badge>
  );
}

export default function SalesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const detailDrawer = useDisclosure();
  const saleDrawer = useDisclosure();
  const successModal = useDisclosure();
  const [lastSaleId, setLastSaleId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [range, setRange] = useState<DateRange>({
    start: isoDaysAgo(30),
    end: isoToday(),
  });
  const [filters, setFilters] = useState({ q: '', branch: '', status: '' });

  const [branchId, setBranchId] = useState('');
  const [customer, setCustomer] = useState<SelectedCustomer | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [onCredit, setOnCredit] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [lateFee, setLateFee] = useState(0);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [discountMode, setDiscountMode] = useState<'currency' | 'percent'>(
    'currency'
  );
  const [discountValue, setDiscountValue] = useState(0);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const list = useQuery({
    queryKey: ['sales', range, filters],
    queryFn: () =>
      saleService.list({ ...filters, start: range.start, end: range.end }),
  });
  const detail = useQuery({
    queryKey: ['sale', selectedId],
    queryFn: () => saleService.detail(selectedId as number),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data: SaleListData | undefined = list.data;
  const options = data?.options;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['sales'] });
    await client.invalidateQueries({ queryKey: ['inventory'] });
    await client.invalidateQueries({ queryKey: ['products'] });
    if (selectedId)
      await client.invalidateQueries({ queryKey: ['sale', selectedId] });
  };

  const subtotal = cart.reduce(
    (sum, line) => sum + line.quantidade * line.valor_unitario,
    0
  );
  const totalItems = cart.reduce((sum, line) => sum + line.quantidade, 0);
  const discount = discountOpen
    ? Number(
        Math.min(
          subtotal,
          discountMode === 'percent'
            ? (subtotal * Math.min(discountValue, 100)) / 100
            : discountValue
        ).toFixed(2)
      )
    : 0;
  const total = Math.max(0, subtotal - discount);

  // Venda em dinheiro so entra no caixa fisico; se a filial exige caixa e nao
  // ha nenhum aberto, o backend recusa. Avisamos antes de montar a venda.
  const selectedBranch = options?.branches.find(
    branch => String(branch.id) === branchId
  );
  const cashBlocked =
    !onCredit &&
    paymentMethod === 'dinheiro' &&
    !!selectedBranch?.caixa_obrigatorio &&
    !selectedBranch?.caixa_aberto;

  const create = useMutation({
    mutationFn: () =>
      saleService.create({
        idfilial: Number(branchId),
        idcliente: customer?.id ?? null,
        valor_desconto: discount,
        forma_pagamento: paymentMethod,
        a_prazo: onCredit,
        parcelas:
          onCredit || paymentMethod === 'cartao_credito' ? installments : 1,
        juros_atraso: onCredit ? lateFee : 0,
        items: cart.map(line => ({
          idproduto: line.idproduto,
          quantidade: line.quantidade,
          valor_unitario: line.valor_unitario,
        })),
      }),
    onSuccess: async result => {
      await refresh();
      saleDrawer.onClose();
      resetSale();
      setLastSaleId(result.data.idvenda);
      successModal.onOpen();
    },
    onError: notifyError,
  });
  const cancel = useMutation({
    mutationFn: (id: number) => saleService.setStatus(id, 4),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Venda cancelada', status: 'success' });
    },
    onError: notifyError,
  });

  const resetSale = () => {
    setCart([]);
    setDiscountOpen(false);
    setDiscountMode('currency');
    setDiscountValue(0);
    setCustomer(null);
    setPaymentMethod('dinheiro');
    setOnCredit(false);
    setInstallments(1);
    setLateFee(0);
    setProductSearch('');
  };
  // Venda a prazo exige cliente identificado; consumidor final volta a vista.
  const selectCustomer = (selected: SelectedCustomer | null) => {
    setCustomer(selected);
    if (!selected || selected.id === null) setOnCredit(false);
  };
  const creditAllowed = customer !== null && customer.id !== null;
  // Cartao nao se aplica a prazo; debito nunca parcela; credito parcela 1x-12x.
  const pickPaymentMethod = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'cartao_credito' || method === 'cartao_debito') {
      setOnCredit(false);
      setInstallments(1);
    }
  };
  const enableCredit = () => {
    setOnCredit(true);
    setInstallments(current => Math.max(2, current));
  };
  const paymentHint = onCredit
    ? 'Gera parcelas em Contas a receber'
    : paymentMethod === 'dinheiro'
      ? 'Entra no caixa da filial'
      : 'Nao passa pelo caixa; entra no relatorio do dia';
  const openSale = () => {
    resetSale();
    setBranchId(String(options?.branches[0]?.id ?? ''));
    saleDrawer.onOpen();
  };
  const openDetail = (sale: SaleRow) => {
    setSelectedId(sale.idvenda);
    detailDrawer.onOpen();
  };
  const addProduct = (product: ProductOption) => {
    setCart(current => {
      const existing = current.find(line => line.idproduto === product.id);
      if (existing) {
        return current.map(line =>
          line.idproduto === product.id
            ? { ...line, quantidade: line.quantidade + 1 }
            : line
        );
      }
      return [
        ...current,
        {
          idproduto: product.id,
          nome: product.nome,
          unidade: product.unidade,
          estoque: product.estoque,
          quantidade: 1,
          valor_unitario: product.preco_venda,
        },
      ];
    });
    setProductSearch('');
  };
  const updateLine = (idproduto: number, patch: Partial<CartLine>) =>
    setCart(current =>
      current.map(line =>
        line.idproduto === idproduto ? { ...line, ...patch } : line
      )
    );
  const removeLine = (idproduto: number) =>
    setCart(current => current.filter(line => line.idproduto !== idproduto));

  const productResults = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    if (!query) return [];
    return (options?.products ?? [])
      .filter(product =>
        `${product.nome} ${product.sku ?? ''} ${product.codigo_barras ?? ''}`
          .toLowerCase()
          .includes(query)
      )
      .slice(0, 8);
  }, [options?.products, productSearch]);

  return (
    <Box>
      <PageHeader
        icon={ShoppingCart}
        title="Vendas"
        description="Registre vendas, acompanhe o faturamento e gerencie o historico comercial."
        breadcrumbs={[{ label: 'Operacao' }, { label: 'Vendas' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openSale}>
            Nova venda
          </Button>
        }
      />

      <StatGroup
        mb={5}
        columns={{ base: 1, sm: 2, xl: 3, '2xl': 6 }}
        items={[
          {
            label: 'Vendas',
            count: Number(data?.metrics.sales),
            format: formatNumber,
            detail: 'Concluidas no periodo',
            icon: ShoppingCart,
            tone: 'brand',
          },
          {
            label: 'Faturamento',
            count: Number(data?.metrics.revenue),
            format: value => formatCurrency(value, { compact: true }),
            detail: 'Receita das vendas',
            icon: CircleDollarSign,
            tone: 'success',
          },
          {
            label: 'Ticket medio',
            count: Number(data?.metrics.average_ticket),
            format: formatCurrency,
            detail: 'Por venda',
            icon: Ticket,
            tone: 'info',
          },
          {
            label: 'Itens vendidos',
            count: Number(data?.metrics.items_sold),
            format: formatNumber,
            detail: 'Unidades no periodo',
            icon: Package,
            tone: 'brand',
          },
          {
            label: 'Descontos',
            count: Number(data?.metrics.discount),
            format: value => formatCurrency(value, { compact: true }),
            detail: 'Concedidos no periodo',
            icon: TrendingUp,
            tone: 'neutral',
          },
          {
            label: 'Canceladas',
            count: Number(data?.metrics.cancelled),
            format: formatNumber,
            detail: 'No periodo',
            icon: XCircle,
            tone: 'danger',
          },
        ]}
      />

      <BrandSurface mb={4} p={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(240px,1fr) minmax(300px,auto) minmax(150px,.5fr) minmax(150px,.5fr) auto',
          }}
          gap={3}
          alignItems="center"
        >
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Search size={16} />
            </InputLeftElement>
            <Input
              value={filters.q}
              onChange={event =>
                setFilters(v => ({ ...v, q: event.target.value }))
              }
              placeholder="Buscar por cliente ou numero da venda..."
            />
          </InputGroup>
          <DateRangeField value={range} onChange={setRange} />
          <FilterSelect
            label="Filial"
            value={filters.branch}
            onChange={v => setFilters(x => ({ ...x, branch: v }))}
            options={[
              { value: '', label: 'Todas as filiais' },
              ...(options?.branches.map(branch => ({
                value: String(branch.id),
                label: branch.nome,
              })) ?? []),
            ]}
          />
          <FilterSelect
            label="Situacao"
            value={filters.status}
            onChange={v => setFilters(x => ({ ...x, status: v }))}
            options={[
              { value: '', label: 'Situacoes' },
              { value: '1', label: 'Concluidas' },
              { value: '4', label: 'Canceladas' },
            ]}
          />
          <Button
            variant="ghost"
            onClick={() => setFilters({ q: '', branch: '', status: '' })}
          >
            Limpar
          </Button>
        </Grid>
      </BrandSurface>

      {list.isError ? (
        <Surface>
          <ErrorState retry={() => void list.refetch()} />
        </Surface>
      ) : list.isLoading ? (
        <Surface p={6}>
          <VStack spacing={4}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Box
                key={index}
                h="52px"
                w="full"
                bg="erp.surfaceSubtle"
                borderRadius="8px"
              />
            ))}
          </VStack>
        </Surface>
      ) : data?.sales.length ? (
        <Surface overflow="hidden">
          <SectionHeader
            icon={Receipt}
            eyebrow="Historico comercial"
            title="Vendas registradas"
            description={`${formatNumber(data.sales.length)} ${
              data.sales.length === 1 ? 'venda listada' : 'vendas listadas'
            }`}
          />
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Venda</Th>
                  <Th>Cliente</Th>
                  <Th>Filial</Th>
                  <Th isNumeric>Itens</Th>
                  <Th isNumeric>Desconto</Th>
                  <Th isNumeric>Total</Th>
                  <Th>Situacao</Th>
                  <Th>Data</Th>
                  <Th w="48px" />
                </Tr>
              </Thead>
              <Tbody>
                {data.sales.map(sale => (
                  <Tr
                    key={sale.idvenda}
                    cursor="pointer"
                    onClick={() => openDetail(sale)}
                  >
                    <Td fontWeight="700">#{sale.idvenda}</Td>
                    <Td>{sale.cliente}</Td>
                    <Td>{sale.filial}</Td>
                    <Td isNumeric>{formatNumber(sale.itens)}</Td>
                    <Td isNumeric>{formatCurrency(sale.valor_desconto)}</Td>
                    <Td isNumeric fontWeight="700">
                      {formatCurrency(sale.valor_total)}
                    </Td>
                    <Td>
                      <StatusBadge status={sale.situacao} />
                    </Td>
                    <Td whiteSpace="nowrap">
                      {formatDateTime(sale.data_venda)}
                    </Td>
                    <Td onClick={event => event.stopPropagation()}>
                      <Menu>
                        <Tooltip label="Acoes">
                          <MenuButton
                            as={IconButton}
                            aria-label="Acoes da venda"
                            icon={<MoreHorizontal size={17} />}
                            variant="ghost"
                            size="sm"
                          />
                        </Tooltip>
                        <MenuList>
                          <MenuItem
                            icon={<Eye size={15} />}
                            onClick={() => openDetail(sale)}
                          >
                            Visualizar
                          </MenuItem>
                          <MenuItem
                            icon={<Printer size={15} />}
                            onClick={() =>
                              navigate(`/sales/${sale.idvenda}/receipt`)
                            }
                          >
                            Comprovante
                          </MenuItem>
                          {sale.situacao === 1 && (
                            <>
                              <MenuDivider />
                              <MenuItem
                                icon={<Ban size={15} />}
                                color="erp.danger"
                                onClick={() => cancel.mutate(sale.idvenda)}
                              >
                                Cancelar venda
                              </MenuItem>
                            </>
                          )}
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Surface>
      ) : (
        <Surface>
          <EmptyState
            title={
              Object.values(filters).some(Boolean)
                ? 'Nenhuma venda encontrada'
                : 'Nenhuma venda registrada'
            }
            description="Ajuste os filtros ou registre a primeira venda da empresa."
            icon={ShoppingCart}
            action={openSale}
            actionLabel="Nova venda"
          />
        </Surface>
      )}

      <SaleDetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
        onCancel={id => cancel.mutate(id)}
        cancelling={cancel.isPending}
        onReceipt={id => navigate(`/sales/${id}/receipt`)}
      />

      <Drawer
        isOpen={saleDrawer.isOpen}
        placement="right"
        size="xl"
        onClose={saleDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            Nova venda
            <Text
              mt={1}
              fontSize="12px"
              fontWeight="400"
              color="erp.textSecondary"
            >
              Selecione a filial, o cliente e adicione os produtos.
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Filial</FormLabel>
                <ComboSelect
                  value={branchId}
                  onChange={setBranchId}
                  placeholder="Selecione a filial"
                  options={
                    options?.branches.map(branch => ({
                      value: String(branch.id),
                      label: branch.nome,
                    })) ?? []
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Cliente</FormLabel>
                <CustomerSearchSelect
                  value={customer}
                  onChange={selectCustomer}
                />
              </FormControl>
            </SimpleGrid>

            <Box mt={5} position="relative">
              <FormLabel>Adicionar produtos</FormLabel>
              <InputGroup>
                <InputLeftElement pointerEvents="none">
                  <Search size={16} />
                </InputLeftElement>
                <Input
                  value={productSearch}
                  onChange={event => setProductSearch(event.target.value)}
                  placeholder="Buscar produto por nome, SKU ou codigo de barras..."
                />
              </InputGroup>
              {productResults.length > 0 && (
                <Surface
                  position="absolute"
                  zIndex={2}
                  mt={1}
                  w="full"
                  maxH="260px"
                  overflowY="auto"
                  p={1}
                >
                  {productResults.map(product => (
                    <Flex
                      key={product.id}
                      align="center"
                      justify="space-between"
                      px={3}
                      py={2}
                      borderRadius="8px"
                      cursor="pointer"
                      _hover={{ bg: 'erp.hover' }}
                      onClick={() => addProduct(product)}
                    >
                      <Box minW={0}>
                        <Text fontSize="13px" fontWeight="600" noOfLines={1}>
                          {product.nome}
                        </Text>
                        <Text fontSize="10px" color="erp.textMuted">
                          {product.sku || 'Sem SKU'} · Estoque{' '}
                          {formatNumber(product.estoque)} {product.unidade}
                        </Text>
                      </Box>
                      <Flex align="center" gap={3} flexShrink={0}>
                        <Text fontSize="13px" fontWeight="700">
                          {formatCurrency(product.preco_venda)}
                        </Text>
                        <Icon as={Plus} boxSize="15px" color="brand.500" />
                      </Flex>
                    </Flex>
                  ))}
                </Surface>
              )}
            </Box>

            <Box mt={5}>
              {cart.length ? (
                <Box
                  border="1px solid"
                  borderColor="erp.border"
                  borderRadius="10px"
                  overflow="hidden"
                >
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Produto</Th>
                        <Th w="120px">Qtd</Th>
                        <Th w="150px">Preco</Th>
                        <Th isNumeric>Subtotal</Th>
                        <Th w="44px" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {cart.map(line => (
                        <Tr key={line.idproduto}>
                          <Td>
                            <Text
                              fontSize="12px"
                              fontWeight="600"
                              noOfLines={1}
                            >
                              {line.nome}
                            </Text>
                            <Text fontSize="10px" color="erp.textMuted">
                              Estoque {formatNumber(line.estoque)}{' '}
                              {line.unidade}
                            </Text>
                          </Td>
                          <Td>
                            <NumberInput
                              size="sm"
                              min={0.001}
                              value={line.quantidade}
                              onChange={(_, value) =>
                                updateLine(line.idproduto, {
                                  quantidade: Number.isFinite(value)
                                    ? value
                                    : 0,
                                })
                              }
                            >
                              <NumberInputField />
                              <NumberInputStepper>
                                <NumberIncrementStepper />
                                <NumberDecrementStepper />
                              </NumberInputStepper>
                            </NumberInput>
                          </Td>
                          <Td>
                            <CurrencyInput
                              size="sm"
                              value={String(line.valor_unitario || '')}
                              onValueChange={value =>
                                updateLine(line.idproduto, {
                                  valor_unitario: Number(value) || 0,
                                })
                              }
                            />
                          </Td>
                          <Td isNumeric fontWeight="700">
                            {formatCurrency(
                              line.quantidade * line.valor_unitario
                            )}
                          </Td>
                          <Td>
                            <IconButton
                              aria-label="Remover"
                              icon={<Trash2 size={15} />}
                              size="sm"
                              variant="ghost"
                              color="erp.danger"
                              onClick={() => removeLine(line.idproduto)}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <Flex
                  align="center"
                  justify="center"
                  direction="column"
                  gap={2}
                  py={10}
                  border="1px dashed"
                  borderColor="erp.border"
                  borderRadius="10px"
                  color="erp.textMuted"
                >
                  <ShoppingCart size={22} />
                  <Text fontSize="13px">
                    Busque e adicione produtos a venda.
                  </Text>
                </Flex>
              )}
            </Box>

            {cart.length > 0 && (
              <Box
                mt={5}
                border="1px solid"
                borderColor="erp.border"
                borderRadius="12px"
                overflow="hidden"
              >
                <Flex
                  px={4}
                  py={2.5}
                  align="center"
                  justify="space-between"
                  bg="erp.surfaceSubtle"
                  borderBottom="1px solid"
                  borderColor="erp.border"
                >
                  <Text
                    textStyle="overline"
                    fontSize="10px"
                    color="erp.textMuted"
                  >
                    Pagamento
                  </Text>
                  <Text fontSize="11px" color="erp.textSecondary">
                    {paymentHint}
                  </Text>
                </Flex>
                <Box px={4} py={3.5}>
                  <Flex gap={1.5} wrap="wrap">
                    {PAYMENT_METHODS.map(method => (
                      <Button
                        key={method.value}
                        size="sm"
                        variant="outline"
                        fontWeight="600"
                        fontSize="12px"
                        px={3}
                        bg={
                          paymentMethod === method.value
                            ? 'erp.brandSoft'
                            : undefined
                        }
                        borderColor={
                          paymentMethod === method.value
                            ? 'erp.brandBorder'
                            : undefined
                        }
                        color={
                          paymentMethod === method.value
                            ? 'erp.brandText'
                            : 'erp.textSecondary'
                        }
                        onClick={() => pickPaymentMethod(method.value)}
                      >
                        {method.label}
                      </Button>
                    ))}
                  </Flex>

                  {paymentMethod === 'cartao_credito' && (
                    <Flex mt={3.5} align="center" gap={2.5} wrap="wrap">
                      <Text fontSize="13px" color="erp.textSecondary">
                        Parcelamento no cartao
                      </Text>
                      <Box w="86px">
                        <ComboSelect
                          size="sm"
                          value={String(installments)}
                          onChange={value =>
                            setInstallments(
                              Math.max(1, Math.min(12, Number(value) || 1))
                            )
                          }
                          options={Array.from({ length: 12 }).map(
                            (_, index) => ({
                              value: String(index + 1),
                              label: `${index + 1}x`,
                            })
                          )}
                        />
                      </Box>
                      {installments > 1 && total > 0 && (
                        <Text fontSize="11px" color="erp.textSecondary">
                          {installments}x de{' '}
                          {formatCurrency(total / installments)} · recebimento
                          pela operadora
                        </Text>
                      )}
                    </Flex>
                  )}

                  {!paymentMethod.startsWith('cartao') && (
                    <Flex mt={3.5} align="center" gap={2.5} wrap="wrap">
                      <Text fontSize="13px" color="erp.textSecondary">
                        Condicao
                      </Text>
                      <ButtonGroup size="xs" isAttached variant="outline">
                        <Button
                          fontWeight="600"
                          bg={!onCredit ? 'erp.brandSoft' : undefined}
                          color={
                            !onCredit ? 'erp.brandText' : 'erp.textSecondary'
                          }
                          onClick={() => setOnCredit(false)}
                        >
                          A vista
                        </Button>
                        <Tooltip
                          label="Identifique o cliente para vender a prazo"
                          isDisabled={creditAllowed}
                        >
                          <Button
                            fontWeight="600"
                            bg={onCredit ? 'erp.brandSoft' : undefined}
                            color={
                              onCredit ? 'erp.brandText' : 'erp.textSecondary'
                            }
                            isDisabled={!creditAllowed}
                            onClick={() => enableCredit()}
                          >
                            A prazo
                          </Button>
                        </Tooltip>
                      </ButtonGroup>
                      {onCredit && (
                        <>
                          <Box w="86px">
                            <ComboSelect
                              size="sm"
                              value={String(installments)}
                              onChange={value =>
                                setInstallments(
                                  Math.max(1, Math.min(24, Number(value) || 1))
                                )
                              }
                              options={Array.from({ length: 24 }).map(
                                (_, index) => ({
                                  value: String(index + 1),
                                  label: `${index + 1}x`,
                                })
                              )}
                            />
                          </Box>
                          {total > 0 && (
                            <Text fontSize="11px" color="erp.textSecondary">
                              {installments}x de{' '}
                              {formatCurrency(total / installments)} · 1ª em 30
                              dias
                            </Text>
                          )}
                        </>
                      )}
                    </Flex>
                  )}

                  {onCredit && (
                    <Flex mt={3} align="center" gap={2.5} wrap="wrap">
                      <Text fontSize="13px" color="erp.textSecondary">
                        Juros por atraso
                      </Text>
                      <InputGroup size="sm" w="120px">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.1"
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                          value={lateFee || ''}
                          placeholder="0"
                          onChange={event =>
                            setLateFee(
                              Math.max(
                                0,
                                Math.min(100, Number(event.target.value) || 0)
                              )
                            )
                          }
                        />
                        <InputRightElement
                          pointerEvents="none"
                          color="erp.textMuted"
                          fontSize="11px"
                          w="3.2rem"
                        >
                          % a.m.
                        </InputRightElement>
                      </InputGroup>
                      <Text fontSize="11px" color="erp.textMuted">
                        aplicado as parcelas vencidas
                      </Text>
                    </Flex>
                  )}
                </Box>
              </Box>
            )}

            {cart.length > 0 && (
              <Box
                mt={4}
                border="1px solid"
                borderColor="erp.border"
                borderRadius="12px"
                overflow="hidden"
              >
                <Flex
                  px={4}
                  py={2.5}
                  align="center"
                  justify="space-between"
                  bg="erp.surfaceSubtle"
                  borderBottom="1px solid"
                  borderColor="erp.border"
                >
                  <Text
                    textStyle="overline"
                    fontSize="10px"
                    color="erp.textMuted"
                  >
                    Resumo da venda
                  </Text>
                  <Text
                    fontSize="11px"
                    color="erp.textSecondary"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {cart.length} {cart.length === 1 ? 'produto' : 'produtos'} ·{' '}
                    {formatNumber(totalItems)}{' '}
                    {totalItems === 1 ? 'item' : 'itens'}
                  </Text>
                </Flex>
                <Box px={4} py={3}>
                  <Flex justify="space-between" align="center" py={1}>
                    <Text fontSize="13px" color="erp.textSecondary">
                      Subtotal
                    </Text>
                    <Text textStyle="numeric" fontSize="13px" fontWeight="600">
                      {formatCurrency(subtotal)}
                    </Text>
                  </Flex>

                  {discountOpen ? (
                    <>
                      <Flex
                        justify="space-between"
                        align="center"
                        gap={3}
                        py={1.5}
                        wrap="wrap"
                      >
                        <Flex align="center" gap={2.5}>
                          <Text fontSize="13px" color="erp.textSecondary">
                            Desconto
                          </Text>
                          <ButtonGroup size="xs" isAttached variant="outline">
                            <Button
                              fontWeight="600"
                              bg={
                                discountMode === 'currency'
                                  ? 'erp.brandSoft'
                                  : undefined
                              }
                              color={
                                discountMode === 'currency'
                                  ? 'erp.brandText'
                                  : 'erp.textSecondary'
                              }
                              onClick={() => setDiscountMode('currency')}
                            >
                              R$
                            </Button>
                            <Button
                              fontWeight="600"
                              bg={
                                discountMode === 'percent'
                                  ? 'erp.brandSoft'
                                  : undefined
                              }
                              color={
                                discountMode === 'percent'
                                  ? 'erp.brandText'
                                  : 'erp.textSecondary'
                              }
                              onClick={() => setDiscountMode('percent')}
                            >
                              %
                            </Button>
                          </ButtonGroup>
                        </Flex>
                        <Flex align="center" gap={1.5}>
                          <Box w="140px">
                            {discountMode === 'currency' ? (
                              <CurrencyInput
                                size="sm"
                                autoFocus
                                value={String(discountValue || '')}
                                onValueChange={value =>
                                  setDiscountValue(Number(value) || 0)
                                }
                              />
                            ) : (
                              <InputGroup size="sm">
                                <Input
                                  type="number"
                                  min={0}
                                  max={100}
                                  autoFocus
                                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                                  value={discountValue || ''}
                                  onChange={event =>
                                    setDiscountValue(
                                      Math.min(
                                        100,
                                        Number(event.target.value) || 0
                                      )
                                    )
                                  }
                                />
                                <InputRightElement
                                  pointerEvents="none"
                                  color="erp.textMuted"
                                  fontSize="12px"
                                >
                                  %
                                </InputRightElement>
                              </InputGroup>
                            )}
                          </Box>
                          <Tooltip label="Remover desconto">
                            <IconButton
                              aria-label="Remover desconto"
                              icon={<X size={13} />}
                              size="xs"
                              variant="ghost"
                              onClick={() => {
                                setDiscountOpen(false);
                                setDiscountValue(0);
                              }}
                            />
                          </Tooltip>
                        </Flex>
                      </Flex>
                      {discountMode === 'percent' && discount > 0 && (
                        <Flex justify="space-between" align="center" py={1}>
                          <Text fontSize="13px" color="erp.textSecondary">
                            Desconto aplicado ({discountValue}%)
                          </Text>
                          <Text
                            textStyle="numeric"
                            fontSize="13px"
                            fontWeight="600"
                            color="erp.danger"
                          >
                            -{formatCurrency(discount)}
                          </Text>
                        </Flex>
                      )}
                    </>
                  ) : (
                    <Flex py={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        color="erp.brandText"
                        leftIcon={<TicketPercent size={13} />}
                        px={1.5}
                        h="24px"
                        onClick={() => setDiscountOpen(true)}
                      >
                        Aplicar desconto
                      </Button>
                    </Flex>
                  )}
                </Box>
              </Box>
            )}
          </DrawerBody>
          <DrawerFooter
            borderTop="1px solid"
            borderColor="erp.border"
            py={4}
            display="block"
          >
            {cashBlocked && (
              <Alert
                status="warning"
                variant="left-accent"
                borderRadius="8px"
                mb={3}
                py={2.5}
              >
                <AlertIcon />
                <Box flex="1">
                  <Text fontSize="13px" fontWeight="600">
                    Caixa fechado nesta filial
                  </Text>
                  <Text fontSize="12px" color="erp.textSecondary">
                    Vendas em dinheiro exigem um caixa aberto. Abra o caixa ou
                    escolha outra forma de pagamento.
                  </Text>
                </Box>
                <Button
                  size="sm"
                  variant="outline"
                  flexShrink={0}
                  leftIcon={<CreditCard size={14} />}
                  onClick={() => navigate('/cashier')}
                >
                  Abrir caixa
                </Button>
              </Alert>
            )}
            <Flex w="full" align="center" justify="space-between" gap={4}>
              <Box>
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                >
                  Total a pagar
                </Text>
                <Text
                  textStyle="numeric"
                  fontSize="24px"
                  fontWeight="600"
                  lineHeight="1.15"
                >
                  {formatCurrency(total)}
                </Text>
                <Text fontSize="11px" color="erp.textMuted">
                  {onCredit
                    ? `A prazo em ${installments}x · ${formatPaymentMethod(paymentMethod)}`
                    : `${formatPaymentMethod(paymentMethod)}${
                        paymentMethod === 'cartao_credito' && installments > 1
                          ? ` · ${installments}x`
                          : ' · a vista'
                      }`}
                  {discount > 0 && ` · desconto de ${formatCurrency(discount)}`}
                </Text>
              </Box>
              <Flex gap={2}>
                <Button variant="ghost" onClick={saleDrawer.onClose}>
                  Cancelar
                </Button>
                <Button
                  px={6}
                  leftIcon={<CheckCircle2 size={16} />}
                  isDisabled={!branchId || cart.length === 0 || cashBlocked}
                  isLoading={create.isPending}
                  onClick={() => create.mutate()}
                >
                  Finalizar venda
                </Button>
              </Flex>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal
        isOpen={successModal.isOpen}
        onClose={successModal.onClose}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalCloseButton />
          <ModalBody pt={10} pb={4} textAlign="center">
            <Flex
              w="56px"
              h="56px"
              mx="auto"
              align="center"
              justify="center"
              borderRadius="full"
              bg="erp.brandSoft"
              color="erp.success"
            >
              <CheckCircle2 size={30} />
            </Flex>
            <Text mt={4} fontSize="18px" fontWeight="800">
              Venda #{lastSaleId} registrada!
            </Text>
            <Text mt={1} fontSize="13px" color="erp.textSecondary">
              Deseja imprimir ou encaminhar o comprovante para o cliente?
            </Text>
          </ModalBody>
          <ModalFooter justifyContent="center" gap={3} pb={8}>
            <Button variant="ghost" onClick={successModal.onClose}>
              Agora nao
            </Button>
            <Button
              leftIcon={<Printer size={16} />}
              onClick={() => {
                successModal.onClose();
                navigate(`/sales/${lastSaleId}/receipt`);
              }}
            >
              Ver comprovante
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <Flex
      py={2.5}
      justify="space-between"
      gap={4}
      borderBottom="1px solid"
      borderColor="erp.border"
    >
      <Text fontSize="12px" color="erp.textMuted">
        {label}
      </Text>
      <Text fontSize="12px" fontWeight="600" textAlign="right">
        {value ?? '-'}
      </Text>
    </Flex>
  );
}

function SaleDetailDrawer({
  disclosure,
  detail,
  loading,
  onCancel,
  cancelling,
  onReceipt,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: SaleDetail;
  loading: boolean;
  onCancel: (id: number) => void;
  cancelling: boolean;
  onReceipt: (id: number) => void;
}) {
  return (
    <Drawer
      isOpen={disclosure.isOpen}
      placement="right"
      size="lg"
      onClose={disclosure.onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {detail ? `Venda #${detail.idvenda}` : 'Detalhes da venda'}
          {detail && (
            <Flex align="center" gap={2} mt={1}>
              <StatusBadge status={detail.situacao} />
              <Text fontSize="12px" color="erp.textSecondary">
                {formatDateTime(detail.data_venda)}
              </Text>
            </Flex>
          )}
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack spacing={4}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Box
                  key={index}
                  h="48px"
                  w="full"
                  bg="erp.surfaceSubtle"
                  borderRadius="8px"
                />
              ))}
            </VStack>
          ) : (
            <>
              <DetailRow label="Cliente" value={detail.cliente} />
              <DetailRow label="Filial" value={detail.filial} />
              <DetailRow label="Operador" value={detail.usuario} />
              <DetailRow
                label="Pagamento"
                value={
                  detail.forma_pagamento
                    ? `${formatPaymentMethod(detail.forma_pagamento)}${
                        detail.a_prazo
                          ? ` · a prazo em ${detail.parcelas}x${
                              detail.juros_atraso > 0
                                ? ` (juros de ${detail.juros_atraso}% a.m. por atraso)`
                                : ''
                            }`
                          : detail.parcelas > 1
                            ? ` · ${detail.parcelas}x`
                            : ' · a vista'
                      }`
                    : 'Nao informado'
                }
              />
              <DetailRow
                label="Itens"
                value={`${formatNumber(detail.items.length)} (${formatNumber(detail.quantidade)} un)`}
              />
              <Box
                mt={5}
                border="1px solid"
                borderColor="erp.border"
                borderRadius="10px"
                overflow="hidden"
              >
                <Table size="sm" variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Produto</Th>
                      <Th isNumeric>Qtd</Th>
                      <Th isNumeric>Preco</Th>
                      <Th isNumeric>Total</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {detail.items.map(item => (
                      <Tr key={item.idvenda_item}>
                        <Td>
                          <Text fontSize="12px" fontWeight="600">
                            {item.produto}
                          </Text>
                          <Text fontSize="10px" color="erp.textMuted">
                            {item.sku || 'Sem SKU'}
                          </Text>
                        </Td>
                        <Td isNumeric>
                          {formatNumber(item.quantidade)} {item.unidade}
                        </Td>
                        <Td isNumeric>{formatCurrency(item.valor_unitario)}</Td>
                        <Td isNumeric fontWeight="700">
                          {formatCurrency(item.valor_total)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
              <VStack align="stretch" spacing={0} mt={4}>
                <Flex justify="space-between" py={1}>
                  <Text fontSize="12px" color="erp.textSecondary">
                    Subtotal
                  </Text>
                  <Text fontSize="12px" fontWeight="600">
                    {formatCurrency(detail.valor_bruto)}
                  </Text>
                </Flex>
                <Flex justify="space-between" py={1}>
                  <Text fontSize="12px" color="erp.textSecondary">
                    Desconto
                  </Text>
                  <Text fontSize="12px" fontWeight="600">
                    {formatCurrency(detail.valor_desconto)}
                  </Text>
                </Flex>
                <Flex
                  justify="space-between"
                  align="baseline"
                  pt={2}
                  mt={1}
                  borderTop="1px solid"
                  borderColor="erp.border"
                >
                  <Text fontSize="14px" fontWeight="700">
                    Total
                  </Text>
                  <Text
                    fontSize="20px"
                    fontWeight="800"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(detail.valor_total)}
                  </Text>
                </Flex>
              </VStack>
              {detail.history.length > 0 && (
                <Box mt={6}>
                  <Text
                    fontSize="10px"
                    fontWeight="700"
                    color="erp.textMuted"
                    textTransform="uppercase"
                    mb={2}
                  >
                    Historico
                  </Text>
                  {detail.history.map(item => (
                    <Flex key={item.idauditoria} justify="space-between" py={1}>
                      <Text
                        fontSize="11px"
                        textTransform="capitalize"
                        color="erp.textSecondary"
                      >
                        {item.acao.replaceAll('_', ' ')} · {item.usuario}
                      </Text>
                      <Text fontSize="11px" color="erp.textMuted">
                        {formatDate(item.criado_em)}
                      </Text>
                    </Flex>
                  ))}
                </Box>
              )}
            </>
          )}
        </DrawerBody>
        <DrawerFooter borderTop="1px solid" borderColor="erp.border" gap={3}>
          {detail?.situacao === 1 && (
            <Button
              variant="outline"
              colorScheme="red"
              leftIcon={<Ban size={15} />}
              isLoading={cancelling}
              onClick={() => onCancel(detail.idvenda)}
            >
              Cancelar venda
            </Button>
          )}
          {detail && (
            <Button
              leftIcon={<Printer size={15} />}
              onClick={() => onReceipt(detail.idvenda)}
            >
              Comprovante
            </Button>
          )}
          <Button variant="ghost" onClick={disclosure.onClose}>
            Fechar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
