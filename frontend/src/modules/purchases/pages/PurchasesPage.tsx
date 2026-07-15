import {
  Badge,
  Box,
  Button,
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
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
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
  CircleDollarSign,
  Eye,
  MoreHorizontal,
  Package,
  PackagePlus,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Ticket,
  Trash2,
  Truck,
  XCircle,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { useAuth } from '../../../shared/auth/AuthContext';
import { QuickProductModal } from '../components/QuickProductModal';
import { purchaseService } from '../services/purchaseService';
import {
  PURCHASE_PAYMENT_METHODS,
  PURCHASE_STATUS,
  type ProductOption,
  type PurchaseDetail,
  type PurchaseListData,
  type PurchasePayment,
  type PurchaseRow,
} from '../types/purchaseTypes';

type CartLine = {
  idproduto: number;
  nome: string;
  unidade: string;
  estoque: number;
  quantidade: number;
  valor_unitario: number;
};

function StatusBadge({ status }: { status: number }) {
  const meta = PURCHASE_STATUS[status] ?? { label: 'Outro', scheme: 'gray' };
  return (
    <Badge colorScheme={meta.scheme} textTransform="none">
      {meta.label}
    </Badge>
  );
}

export default function PurchasesPage() {
  const toast = useToast();
  const client = useQueryClient();
  const detailDrawer = useDisclosure();
  const purchaseDrawer = useDisclosure();
  const quickProduct = useDisclosure();
  const { can } = useAuth();
  const canCreateProduct = can('produto:criar');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [range, setRange] = useState<DateRange>({
    start: isoDaysAgo(30),
    end: isoToday(),
  });
  const [filters, setFilters] = useState({ q: '', branch: '', status: '' });

  const [branchId, setBranchId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [paymentMethod, setPaymentMethod] =
    useState<PurchasePayment>('dinheiro');
  const [onCredit, setOnCredit] = useState(false);
  const [installments, setInstallments] = useState(1);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);

  const list = useQuery({
    queryKey: ['purchases', range, filters],
    queryFn: () =>
      purchaseService.list({ ...filters, start: range.start, end: range.end }),
  });
  const detail = useQuery({
    queryKey: ['purchase', selectedId],
    queryFn: () => purchaseService.detail(selectedId as number),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data: PurchaseListData | undefined = list.data;
  const options = data?.options;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['purchases'] });
    await client.invalidateQueries({ queryKey: ['inventory'] });
    if (selectedId)
      await client.invalidateQueries({ queryKey: ['purchase', selectedId] });
  };

  const total = cart.reduce(
    (sum, line) => sum + line.quantidade * line.valor_unitario,
    0
  );

  const create = useMutation({
    mutationFn: () =>
      purchaseService.create({
        idfilial: Number(branchId),
        idfornecedor: supplierId ? Number(supplierId) : null,
        forma_pagamento: paymentMethod,
        a_prazo: onCredit,
        parcelas: onCredit ? installments : 1,
        items: cart.map(line => ({
          idproduto: line.idproduto,
          quantidade: line.quantidade,
          valor_unitario: line.valor_unitario,
        })),
      }),
    onSuccess: async () => {
      await refresh();
      purchaseDrawer.onClose();
      resetPurchase();
      toast({ title: 'Compra registrada com sucesso', status: 'success' });
    },
    onError: notifyError,
  });
  const cancel = useMutation({
    mutationFn: (id: number) => purchaseService.setStatus(id, 4),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Compra cancelada', status: 'success' });
    },
    onError: notifyError,
  });

  const resetPurchase = () => {
    setCart([]);
    setSupplierId('');
    setPaymentMethod('dinheiro');
    setOnCredit(false);
    setInstallments(1);
    setProductSearch('');
  };
  const openPurchase = () => {
    resetPurchase();
    setBranchId(String(options?.branches[0]?.id ?? ''));
    purchaseDrawer.onOpen();
  };
  const openDetail = (purchase: PurchaseRow) => {
    setSelectedId(purchase.idcompra);
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
          valor_unitario: product.preco_custo,
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
        icon={ShoppingBag}
        title="Compras"
        description="Registre entradas de mercadoria, custos e reposicao de estoque por fornecedor."
        breadcrumbs={[{ label: 'Operacao' }, { label: 'Compras' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openPurchase}>
            Nova compra
          </Button>
        }
      />

      <StatGroup
        mb={5}
        columns={{ base: 1, sm: 2, xl: 3, '2xl': 6 }}
        items={[
          {
            label: 'Compras',
            count: Number(data?.metrics.purchases),
            format: formatNumber,
            detail: 'Concluidas no periodo',
            icon: ShoppingBag,
            tone: 'brand',
          },
          {
            label: 'Total comprado',
            count: Number(data?.metrics.total),
            format: value => formatCurrency(value, { compact: true }),
            detail: 'Custo das entradas',
            icon: CircleDollarSign,
            tone: 'info',
          },
          {
            label: 'Ticket medio',
            count: Number(data?.metrics.average_ticket),
            format: formatCurrency,
            detail: 'Por compra',
            icon: Ticket,
            tone: 'brand',
          },
          {
            label: 'Itens comprados',
            count: Number(data?.metrics.items_bought),
            format: formatNumber,
            detail: 'Unidades no periodo',
            icon: Package,
            tone: 'brand',
          },
          {
            label: 'Fornecedores',
            count: Number(data?.metrics.suppliers),
            format: formatNumber,
            detail: 'Com compras no periodo',
            icon: Truck,
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
              placeholder="Buscar por fornecedor ou numero da compra..."
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
      ) : data?.purchases.length ? (
        <Surface overflow="hidden">
          <SectionHeader
            icon={Receipt}
            eyebrow="Historico de compras"
            title="Compras registradas"
            description={`${formatNumber(data.purchases.length)} ${
              data.purchases.length === 1
                ? 'compra listada'
                : 'compras listadas'
            }`}
          />
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Compra</Th>
                  <Th>Fornecedor</Th>
                  <Th>Filial</Th>
                  <Th isNumeric>Itens</Th>
                  <Th isNumeric>Total</Th>
                  <Th>Pagamento</Th>
                  <Th>Situacao</Th>
                  <Th>Data</Th>
                  <Th w="48px" />
                </Tr>
              </Thead>
              <Tbody>
                {data.purchases.map(purchase => (
                  <Tr
                    key={purchase.idcompra}
                    cursor="pointer"
                    onClick={() => openDetail(purchase)}
                  >
                    <Td fontWeight="700">#{purchase.idcompra}</Td>
                    <Td>{purchase.fornecedor}</Td>
                    <Td>{purchase.filial}</Td>
                    <Td isNumeric>{formatNumber(purchase.itens)}</Td>
                    <Td isNumeric fontWeight="700">
                      {formatCurrency(purchase.valor_total)}
                    </Td>
                    <Td whiteSpace="nowrap">
                      <Text fontSize="12px">
                        {formatPaymentMethod(purchase.forma_pagamento)}
                      </Text>
                      <Text fontSize="10px" color="erp.textMuted">
                        {purchase.a_prazo
                          ? `A prazo · ${purchase.parcelas}x`
                          : 'A vista'}
                      </Text>
                    </Td>
                    <Td>
                      <StatusBadge status={purchase.situacao} />
                    </Td>
                    <Td whiteSpace="nowrap">
                      {formatDateTime(purchase.data_compra)}
                    </Td>
                    <Td onClick={event => event.stopPropagation()}>
                      <Menu>
                        <Tooltip label="Acoes">
                          <MenuButton
                            as={IconButton}
                            aria-label="Acoes da compra"
                            icon={<MoreHorizontal size={17} />}
                            variant="ghost"
                            size="sm"
                          />
                        </Tooltip>
                        <MenuList>
                          <MenuItem
                            icon={<Eye size={15} />}
                            onClick={() => openDetail(purchase)}
                          >
                            Visualizar
                          </MenuItem>
                          {purchase.situacao === 1 && (
                            <>
                              <MenuDivider />
                              <MenuItem
                                icon={<Ban size={15} />}
                                color="erp.danger"
                                onClick={() => cancel.mutate(purchase.idcompra)}
                              >
                                Cancelar compra
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
                ? 'Nenhuma compra encontrada'
                : 'Nenhuma compra registrada'
            }
            description="Ajuste os filtros ou registre a primeira entrada de mercadoria."
            icon={ShoppingBag}
            action={openPurchase}
            actionLabel="Nova compra"
          />
        </Surface>
      )}

      <PurchaseDetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
        onCancel={id => cancel.mutate(id)}
        cancelling={cancel.isPending}
      />

      <Drawer
        isOpen={purchaseDrawer.isOpen}
        placement="right"
        size="xl"
        onClose={purchaseDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            Nova compra
            <Text
              mt={1}
              fontSize="12px"
              fontWeight="400"
              color="erp.textSecondary"
            >
              Selecione a filial e o fornecedor e adicione os produtos.
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Filial (entrada)</FormLabel>
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
                <FormLabel>Fornecedor</FormLabel>
                <ComboSelect
                  value={supplierId}
                  onChange={setSupplierId}
                  placeholder="Sem fornecedor"
                  options={[
                    { value: '', label: 'Sem fornecedor' },
                    ...(options?.suppliers.map(supplier => ({
                      value: String(supplier.id),
                      label: supplier.nome,
                    })) ?? []),
                  ]}
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
              {productSearch.trim().length > 0 &&
                productResults.length === 0 && (
                  <Surface position="absolute" zIndex={2} mt={1} w="full" p={1}>
                    {canCreateProduct ? (
                      <Flex
                        align="center"
                        gap={3}
                        px={3}
                        py={2.5}
                        borderRadius="8px"
                        cursor="pointer"
                        _hover={{ bg: 'erp.hover' }}
                        onClick={quickProduct.onOpen}
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
                          <PackagePlus size={14} />
                        </Flex>
                        <Box>
                          <Text
                            fontSize="13px"
                            fontWeight="600"
                            color="erp.brandText"
                          >
                            + Cadastrar produto rapidamente
                          </Text>
                          <Text fontSize="11px" color="erp.textSecondary">
                            Nenhum produto encontrado para "
                            {productSearch.trim()}"
                          </Text>
                        </Box>
                      </Flex>
                    ) : (
                      <Text px={3} py={3} fontSize="12px" color="erp.textMuted">
                        Nenhum produto encontrado para "{productSearch.trim()}".
                      </Text>
                    )}
                  </Surface>
                )}
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
                          {formatCurrency(product.preco_custo)}
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
                        <Th w="150px">Custo unit.</Th>
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
                              Estoque atual {formatNumber(line.estoque)}{' '}
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
                  <ShoppingBag size={22} />
                  <Text fontSize="13px">
                    Busque e adicione produtos a compra.
                  </Text>
                </Flex>
              )}
            </Box>

            {cart.length > 0 && (
              <Box mt={5}>
                <Text textStyle="overline" color="erp.textMuted" mb={2}>
                  Pagamento ao fornecedor
                </Text>
                <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={2}>
                  {PURCHASE_PAYMENT_METHODS.map(method => {
                    const active = paymentMethod === method.value;
                    return (
                      <Button
                        key={method.value}
                        size="sm"
                        variant="outline"
                        h="42px"
                        onClick={() => setPaymentMethod(method.value)}
                        bg={active ? 'erp.brandSoft' : undefined}
                        color={active ? 'erp.brandText' : undefined}
                        borderColor={active ? 'brand.400' : 'erp.border'}
                        fontWeight={active ? '700' : '500'}
                      >
                        {method.label}
                      </Button>
                    );
                  })}
                </SimpleGrid>

                <Flex mt={3} gap={2} align="center" wrap="wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setOnCredit(false)}
                    bg={!onCredit ? 'erp.brandSoft' : undefined}
                    color={!onCredit ? 'erp.brandText' : undefined}
                    borderColor={!onCredit ? 'brand.400' : 'erp.border'}
                    fontWeight={!onCredit ? '700' : '500'}
                  >
                    A vista
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setOnCredit(true);
                      setInstallments(current => Math.max(2, current));
                    }}
                    bg={onCredit ? 'erp.brandSoft' : undefined}
                    color={onCredit ? 'erp.brandText' : undefined}
                    borderColor={onCredit ? 'brand.400' : 'erp.border'}
                    fontWeight={onCredit ? '700' : '500'}
                  >
                    A prazo
                  </Button>
                  {onCredit && (
                    <Flex align="center" gap={2}>
                      <Text fontSize="12px" color="erp.textSecondary">
                        Parcelas
                      </Text>
                      <NumberInput
                        size="sm"
                        w="90px"
                        min={2}
                        max={24}
                        value={installments}
                        onChange={(_, value) =>
                          setInstallments(Number.isNaN(value) ? 2 : value)
                        }
                      >
                        <NumberInputField />
                        <NumberInputStepper>
                          <NumberIncrementStepper />
                          <NumberDecrementStepper />
                        </NumberInputStepper>
                      </NumberInput>
                    </Flex>
                  )}
                </Flex>

                <Text mt={2} fontSize="11px" color="erp.textMuted">
                  {onCredit
                    ? `Gera ${installments} parcela(s) em aberto no Financeiro, com vencimentos mensais.`
                    : 'Gera uma conta a pagar ja quitada no Financeiro, na data de hoje.'}
                </Text>
              </Box>
            )}
          </DrawerBody>
          <DrawerFooter borderTop="1px solid" borderColor="erp.border">
            <Flex justify="space-between" align="center" w="full" gap={4}>
              <Box>
                <Text fontSize="12px" color="erp.textSecondary">
                  Total da compra
                </Text>
                <Text
                  fontSize="22px"
                  fontWeight="800"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCurrency(total)}
                </Text>
              </Box>
              <Flex gap={2}>
                <Button variant="ghost" onClick={purchaseDrawer.onClose}>
                  Cancelar
                </Button>
                <Button
                  leftIcon={<ShoppingBag size={16} />}
                  isDisabled={!branchId || cart.length === 0}
                  isLoading={create.isPending}
                  onClick={() => create.mutate()}
                >
                  Registrar compra
                </Button>
              </Flex>
            </Flex>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <QuickProductModal
        isOpen={quickProduct.isOpen}
        onClose={quickProduct.onClose}
        initialName={productSearch.trim()}
        categories={options?.categories ?? []}
        onCreated={addProduct}
      />
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

function PurchaseDetailDrawer({
  disclosure,
  detail,
  loading,
  onCancel,
  cancelling,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: PurchaseDetail;
  loading: boolean;
  onCancel: (id: number) => void;
  cancelling: boolean;
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
          {detail ? `Compra #${detail.idcompra}` : 'Detalhes da compra'}
          {detail && (
            <Flex align="center" gap={2} mt={1}>
              <StatusBadge status={detail.situacao} />
              <Text fontSize="12px" color="erp.textSecondary">
                {formatDateTime(detail.data_compra)}
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
              <DetailRow label="Fornecedor" value={detail.fornecedor} />
              <DetailRow label="Filial" value={detail.filial} />
              <DetailRow label="Operador" value={detail.usuario} />
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
                      <Th isNumeric>Custo</Th>
                      <Th isNumeric>Total</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {detail.items.map(item => (
                      <Tr key={item.idcompra_item}>
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
              <Flex
                justify="space-between"
                align="baseline"
                pt={3}
                mt={2}
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
              onClick={() => onCancel(detail.idcompra)}
            >
              Cancelar compra
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
