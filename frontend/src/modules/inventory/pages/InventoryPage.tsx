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
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  Select,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
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
  AlertTriangle,
  ArrowLeftRight,
  Boxes,
  CircleDollarSign,
  Eye,
  MoreHorizontal,
  Package,
  Search,
  Store,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatQuantity,
} from '../../../shared/utils/formatters';
import { inventoryService } from '../services/inventoryService';
import {
  INVENTORY_STATUS,
  MOVEMENT_TYPES,
  type InventoryData,
  type InventoryItem,
  type ProductStockDetail,
} from '../types/inventoryTypes';

type MovementForm = {
  productId: string;
  branchId: string;
  tipo: string;
  quantidade: number;
  observacao: string;
  productLabel?: string;
  branchLocked?: boolean;
};

const emptyMovement: MovementForm = {
  productId: '',
  branchId: '',
  tipo: '1',
  quantidade: 1,
  observacao: '',
};

function StatusBadge({ status }: { status: InventoryItem['status'] }) {
  const meta = INVENTORY_STATUS[status];
  return (
    <Badge colorScheme={meta.scheme} textTransform="none">
      {meta.label}
    </Badge>
  );
}

export default function InventoryPage() {
  const toast = useToast();
  const client = useQueryClient();
  const movementModal = useDisclosure();
  const detailDrawer = useDisclosure();
  const [filters, setFilters] = useState({
    q: '',
    branch: '',
    status: '',
    category: '',
  });
  const [movement, setMovement] = useState<MovementForm>(emptyMovement);
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  const list = useQuery({
    queryKey: ['inventory', filters],
    queryFn: () => inventoryService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['inventory-product', selectedProduct],
    queryFn: () => inventoryService.productDetail(selectedProduct as number),
    enabled: selectedProduct !== null && detailDrawer.isOpen,
  });
  const data: InventoryData | undefined = list.data;
  const options = data?.options;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });

  const move = useMutation({
    mutationFn: () =>
      inventoryService.movement(Number(movement.productId), {
        idfilial: Number(movement.branchId),
        tipo: Number(movement.tipo),
        quantidade: movement.quantidade,
        observacao: movement.observacao || undefined,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['inventory'] });
      if (selectedProduct)
        await client.invalidateQueries({
          queryKey: ['inventory-product', selectedProduct],
        });
      movementModal.onClose();
      toast({ title: 'Estoque movimentado', status: 'success' });
    },
    onError: notifyError,
  });

  const openNewMovement = () => {
    setMovement({
      ...emptyMovement,
      branchId: String(options?.branches[0]?.id ?? ''),
    });
    movementModal.onOpen();
  };
  const openRowMovement = (item: InventoryItem) => {
    setMovement({
      productId: String(item.idproduto),
      productLabel: item.produto,
      branchId: String(item.idfilial),
      branchLocked: true,
      tipo: '1',
      quantidade: 1,
      observacao: '',
    });
    movementModal.onOpen();
  };
  const openDetail = (item: InventoryItem) => {
    setSelectedProduct(item.idproduto);
    detailDrawer.onOpen();
  };

  return (
    <Box>
      <PageHeader
        icon={Boxes}
        title="Estoque"
        description="Acompanhe saldos por filial, alertas de estoque critico e movimentacoes."
        breadcrumbs={[{ label: 'Operacao' }, { label: 'Estoque' }]}
        actions={
          <Button
            leftIcon={<ArrowLeftRight size={16} />}
            onClick={openNewMovement}
          >
            Nova movimentacao
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 6 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="SKUs em estoque"
          count={Number(data?.metrics.skus)}
          format={formatNumber}
          detail="Produtos com saldo"
          icon={Package}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Valor em estoque"
          count={Number(data?.metrics.value)}
          format={value => formatCurrency(value, { compact: true })}
          detail="Pelo custo atual"
          icon={CircleDollarSign}
        />
        <KpiCard
          index={2}
          tone="info"
          label="Itens em estoque"
          count={Number(data?.metrics.items)}
          format={formatNumber}
          detail="Unidades totais"
          icon={Boxes}
        />
        <KpiCard
          index={3}
          tone="warning"
          label="Estoque critico"
          count={Number(data?.metrics.critical)}
          format={formatNumber}
          detail="Abaixo do minimo"
          icon={AlertTriangle}
        />
        <KpiCard
          index={4}
          tone="danger"
          label="Rupturas"
          count={Number(data?.metrics.ruptures)}
          format={formatNumber}
          detail="Sem saldo"
          icon={XCircle}
        />
        <KpiCard
          index={5}
          tone="brand"
          label="Filiais"
          count={Number(data?.metrics.branches)}
          format={formatNumber}
          detail="Com estoque"
          icon={Store}
        />
      </SimpleGrid>

      <BrandSurface mb={4} p={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(240px,1fr) repeat(3,minmax(150px,.5fr)) auto',
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
              placeholder="Buscar por produto, SKU ou codigo de barras..."
            />
          </InputGroup>
          <Select
            aria-label="Filial"
            value={filters.branch}
            onChange={event =>
              setFilters(v => ({ ...v, branch: event.target.value }))
            }
          >
            <option value="">Todas as filiais</option>
            {options?.branches.map(branch => (
              <option key={branch.id} value={branch.id}>
                {branch.nome}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Categoria"
            value={filters.category}
            onChange={event =>
              setFilters(v => ({ ...v, category: event.target.value }))
            }
          >
            <option value="">Categorias</option>
            {options?.categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.nome}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Situacao"
            value={filters.status}
            onChange={event =>
              setFilters(v => ({ ...v, status: event.target.value }))
            }
          >
            <option value="">Situacoes</option>
            <option value="ok">Disponivel</option>
            <option value="critical">Critico</option>
            <option value="zero">Ruptura</option>
          </Select>
          <Button
            variant="ghost"
            onClick={() =>
              setFilters({ q: '', branch: '', status: '', category: '' })
            }
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
      ) : data?.items.length ? (
        <Surface overflow="hidden">
          <SectionHeader
            icon={Boxes}
            eyebrow="Saldos por filial"
            title="Posicao de estoque"
            description={`${formatNumber(data.items.length)} ${
              data.items.length === 1 ? 'registro' : 'registros'
            }`}
          />
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Produto</Th>
                  <Th>Filial</Th>
                  <Th isNumeric>Saldo</Th>
                  <Th isNumeric>Reservado</Th>
                  <Th isNumeric>Disponivel</Th>
                  <Th isNumeric>Minimo</Th>
                  <Th isNumeric>Valor</Th>
                  <Th>Situacao</Th>
                  <Th w="48px" />
                </Tr>
              </Thead>
              <Tbody>
                {data.items.map(item => (
                  <Tr
                    key={item.idestoque}
                    cursor="pointer"
                    onClick={() => openDetail(item)}
                  >
                    <Td>
                      <Text fontWeight="600">{item.produto}</Text>
                      <Text fontSize="10px" color="erp.textMuted">
                        {item.sku || 'Sem SKU'}
                      </Text>
                    </Td>
                    <Td>{item.filial}</Td>
                    <Td isNumeric fontWeight="700">
                      {formatQuantity(item.quantidade)} {item.unidade}
                    </Td>
                    <Td isNumeric>{formatQuantity(item.reservado)}</Td>
                    <Td isNumeric>{formatQuantity(item.disponivel)}</Td>
                    <Td isNumeric>{formatQuantity(item.minimo)}</Td>
                    <Td isNumeric>{formatCurrency(item.valor)}</Td>
                    <Td>
                      <StatusBadge status={item.status} />
                    </Td>
                    <Td onClick={event => event.stopPropagation()}>
                      <Menu>
                        <Tooltip label="Acoes">
                          <MenuButton
                            as={IconButton}
                            aria-label="Acoes do estoque"
                            icon={<MoreHorizontal size={17} />}
                            variant="ghost"
                            size="sm"
                          />
                        </Tooltip>
                        <MenuList>
                          <MenuItem
                            icon={<Eye size={15} />}
                            onClick={() => openDetail(item)}
                          >
                            Ver produto
                          </MenuItem>
                          <MenuItem
                            icon={<ArrowLeftRight size={15} />}
                            onClick={() => openRowMovement(item)}
                          >
                            Movimentar
                          </MenuItem>
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
                ? 'Nenhum registro encontrado'
                : 'Nenhum saldo de estoque'
            }
            description="Cadastre produtos com estoque ou registre uma movimentacao."
            icon={Boxes}
            action={openNewMovement}
            actionLabel="Nova movimentacao"
          />
        </Surface>
      )}

      <ProductStockDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
        onMove={product =>
          setMovement({
            productId: String(product.idproduto),
            productLabel: product.nome,
            branchId: String(options?.branches[0]?.id ?? ''),
            tipo: '1',
            quantidade: 1,
            observacao: '',
          })
        }
        openMovement={movementModal.onOpen}
      />

      <Modal isOpen={movementModal.isOpen} onClose={movementModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Movimentar estoque</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Produto</FormLabel>
                {movement.productLabel ? (
                  <Input value={movement.productLabel} isReadOnly />
                ) : (
                  <Select
                    value={movement.productId}
                    onChange={event =>
                      setMovement(v => ({
                        ...v,
                        productId: event.target.value,
                      }))
                    }
                  >
                    <option value="">Selecione o produto</option>
                    {options?.products.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.nome}
                        {product.sku ? ` (${product.sku})` : ''}
                      </option>
                    ))}
                  </Select>
                )}
              </FormControl>
              <SimpleGrid columns={2} spacing={4}>
                <FormControl isRequired>
                  <FormLabel>Filial</FormLabel>
                  <Select
                    value={movement.branchId}
                    isDisabled={movement.branchLocked}
                    onChange={event =>
                      setMovement(v => ({ ...v, branchId: event.target.value }))
                    }
                  >
                    <option value="">Selecione</option>
                    {options?.branches.map(branch => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nome}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Tipo</FormLabel>
                  <Select
                    value={movement.tipo}
                    onChange={event =>
                      setMovement(v => ({ ...v, tipo: event.target.value }))
                    }
                  >
                    {Object.entries(MOVEMENT_TYPES).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
              </SimpleGrid>
              <FormControl isRequired>
                <FormLabel>
                  {movement.tipo === '3' ? 'Novo saldo' : 'Quantidade'}
                </FormLabel>
                <NumberInput
                  min={movement.tipo === '3' ? 0 : 0.001}
                  value={movement.quantidade}
                  onChange={(_, value) =>
                    setMovement(v => ({
                      ...v,
                      quantidade: Number.isFinite(value) ? value : 0,
                    }))
                  }
                >
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <Text mt={1} fontSize="10px" color="erp.textMuted">
                  {movement.tipo === '1'
                    ? 'Entrada soma ao saldo atual.'
                    : movement.tipo === '2'
                      ? 'Saida subtrai do saldo atual.'
                      : 'Ajuste define o saldo exato da filial.'}
                </Text>
              </FormControl>
              <FormControl>
                <FormLabel>Observacao</FormLabel>
                <Textarea
                  rows={2}
                  value={movement.observacao}
                  onChange={event =>
                    setMovement(v => ({ ...v, observacao: event.target.value }))
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={movementModal.onClose}>
              Cancelar
            </Button>
            <Button
              isDisabled={
                !movement.productId ||
                !movement.branchId ||
                movement.quantidade < 0
              }
              isLoading={move.isPending}
              onClick={() => move.mutate()}
            >
              Confirmar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function ProductStockDrawer({
  disclosure,
  detail,
  loading,
  onMove,
  openMovement,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: ProductStockDetail;
  loading: boolean;
  onMove: (product: ProductStockDetail) => void;
  openMovement: () => void;
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
          {detail?.nome || 'Detalhes do estoque'}
          {detail && (
            <Text
              mt={1}
              fontSize="12px"
              fontWeight="400"
              color="erp.textSecondary"
            >
              {detail.sku || 'Sem SKU'} · Minimo{' '}
              {formatQuantity(detail.estoque_minimo)} {detail.unidade}
            </Text>
          )}
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack spacing={4}>
              {Array.from({ length: 5 }).map((_, index) => (
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
              <Text
                fontSize="10px"
                fontWeight="700"
                color="erp.textMuted"
                textTransform="uppercase"
                mb={2}
              >
                Saldo por filial
              </Text>
              {detail.stock.length ? (
                <Box
                  border="1px solid"
                  borderColor="erp.border"
                  borderRadius="10px"
                  overflow="hidden"
                >
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Filial</Th>
                        <Th isNumeric>Saldo</Th>
                        <Th isNumeric>Reservado</Th>
                        <Th isNumeric>Disponivel</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {detail.stock.map(row => (
                        <Tr key={row.idfilial}>
                          <Td>{row.filial}</Td>
                          <Td isNumeric fontWeight="700">
                            {formatQuantity(row.quantidade)}
                          </Td>
                          <Td isNumeric>
                            {formatQuantity(row.quantidade_reservada)}
                          </Td>
                          <Td isNumeric>{formatQuantity(row.disponivel)}</Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <Text fontSize="12px" color="erp.textMuted">
                  Sem saldo cadastrado.
                </Text>
              )}

              <Text
                fontSize="10px"
                fontWeight="700"
                color="erp.textMuted"
                textTransform="uppercase"
                mt={6}
                mb={2}
              >
                Movimentacoes recentes
              </Text>
              {detail.movements.length ? (
                <VStack align="stretch" spacing={0}>
                  {detail.movements.map(item => (
                    <Flex
                      key={item.idmovimentacao_estoque}
                      justify="space-between"
                      align="center"
                      py={2.5}
                      borderBottom="1px solid"
                      borderColor="erp.border"
                    >
                      <Box minW={0}>
                        <Flex align="center" gap={2}>
                          <Badge
                            colorScheme={
                              item.tipo === 1
                                ? 'green'
                                : item.tipo === 2
                                  ? 'red'
                                  : 'blue'
                            }
                            textTransform="none"
                          >
                            {MOVEMENT_TYPES[item.tipo] ?? 'Mov.'}
                          </Badge>
                          <Text fontSize="12px" fontWeight="600">
                            {formatQuantity(item.quantidade)}
                          </Text>
                          <Text fontSize="11px" color="erp.textMuted">
                            {item.filial}
                          </Text>
                        </Flex>
                        {item.observacao && (
                          <Text fontSize="10px" color="erp.textMuted" mt={0.5}>
                            {item.observacao}
                          </Text>
                        )}
                      </Box>
                      <Text
                        fontSize="10px"
                        color="erp.textMuted"
                        whiteSpace="nowrap"
                      >
                        {formatDateTime(item.criado_em)}
                      </Text>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="12px" color="erp.textMuted">
                  Nenhuma movimentacao registrada.
                </Text>
              )}
            </>
          )}
        </DrawerBody>
        <DrawerFooter borderTop="1px solid" borderColor="erp.border" gap={3}>
          {detail && (
            <Button
              leftIcon={<ArrowLeftRight size={15} />}
              onClick={() => {
                onMove(detail);
                openMovement();
              }}
            >
              Movimentar
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
