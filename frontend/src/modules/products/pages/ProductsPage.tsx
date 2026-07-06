import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
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
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
  useBreakpointValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  Boxes,
  BoxIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Eye,
  FileImage,
  Flame,
  History,
  MoreHorizontal,
  Package,
  Pencil,
  Plus,
  Search,
  Store,
  Trash2,
  Truck,
} from 'lucide-react';
import {
  Controller,
  useForm,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { useState, type ReactNode } from 'react';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import {
  formatBarcode,
  formatCurrency,
  formatDateTime,
  formatDimensions,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatWeight,
} from '../../../shared/utils/formatters';
import { productSchema, type ProductForm } from '../schemas/productSchema';
import {
  productService,
  type Product,
  type ProductDetail,
  type ProductList,
} from '../services/productService';

const MotionBox = motion(Box);
const steps = [
  'Informacoes basicas',
  'Fornecedor',
  'Precos',
  'Estoque',
  'Caracteristicas',
  'Fiscal',
  'Resumo',
];
const defaults: ProductForm = {
  nome: '',
  descricao: '',
  sku: '',
  codigo_barras: '',
  idcategoria: 0,
  idmarca: undefined,
  unidade: 'UN',
  imagens_texto: '',
  idfornecedor_principal: undefined,
  idfornecedor_secundario: undefined,
  codigo_fornecedor: '',
  preco_custo: 0,
  preco_venda: 0,
  preco_promocional: undefined,
  estoque_inicial: 0,
  estoque_minimo: 0,
  estoque_maximo: 0,
  idfilial_inicial: undefined,
  permite_estoque_negativo: false,
  peso: undefined,
  altura: undefined,
  largura: undefined,
  comprimento: undefined,
  ncm: '',
  cest: '',
  cfop: '',
  origem: undefined,
  tributacao: '',
  garantia_meses: undefined,
  lancamento: false,
  destaque: false,
  situacao: true,
};

function ProductBadges({ product }: { product: Product }) {
  const critical = Number(product.estoque) <= Number(product.estoque_minimo);
  return (
    <Flex gap={1.5} wrap="wrap">
      <Badge colorScheme={product.situacao ? 'green' : 'red'}>
        {product.situacao ? 'Ativo' : 'Inativo'}
      </Badge>
      {Number(product.estoque) <= 0 && (
        <Badge colorScheme="gray">Sem estoque</Badge>
      )}
      {critical && Number(product.estoque) > 0 && (
        <Badge colorScheme="orange">Estoque critico</Badge>
      )}
      {product.preco_promocional && <Badge colorScheme="pink">Promocao</Badge>}
      {product.lancamento && <Badge colorScheme="cyan">Lancamento</Badge>}
      {product.destaque && <Badge colorScheme="blue">Destaque</Badge>}
    </Flex>
  );
}

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <Flex
      py={2.5}
      justify="space-between"
      gap={4}
      borderBottom="1px solid"
      borderColor="erp.border"
    >
      <Text fontSize="11px" color="erp.textMuted">
        {label}
      </Text>
      <Text fontSize="12px" fontWeight="600" textAlign="right">
        {value || '-'}
      </Text>
    </Flex>
  );
}

export default function ProductsPage() {
  const toast = useToast();
  const client = useQueryClient();
  const detailDrawer = useDisclosure();
  const formDrawer = useDisclosure();
  const movementModal = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [movingProduct, setMovingProduct] = useState<Product | null>(null);
  const [step, setStep] = useState(0);
  const [movement, setMovement] = useState({
    idfilial: 0,
    tipo: 1,
    quantidade: 0,
    observacao: '',
  });
  const [filters, setFilters] = useState({
    q: '',
    category: '',
    brand: '',
    supplier: '',
    status: '',
    branch: '',
    stock: '',
    price: '',
    best_sellers: '',
  });
  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema) as Resolver<ProductForm>,
    defaultValues: defaults,
  });
  const list = useQuery({
    queryKey: ['products', filters],
    queryFn: () => productService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['product', selectedId],
    queryFn: () => productService.detail(selectedId!),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data = list.data;
  const error = (e: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: e instanceof Error ? e.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = () => client.invalidateQueries({ queryKey: ['products'] });
  const payload = (values: ProductForm) => ({
    ...values,
    imagens: (values.imagens_texto || '')
      .split(/\r?\n/)
      .map(v => v.trim())
      .filter(Boolean),
  });
  const save = useMutation({
    mutationFn: (values: ProductForm) =>
      editingId
        ? productService.update(editingId, payload(values))
        : productService.create(payload(values)),
    onSuccess: async () => {
      await refresh();
      formDrawer.onClose();
      form.reset(defaults);
      setEditingId(null);
      setStep(0);
      toast({
        title: editingId ? 'Produto atualizado' : 'Produto criado',
        status: 'success',
      });
    },
    onError: error,
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) =>
      productService.status(id, value),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: error,
  });
  const duplicate = useMutation({
    mutationFn: productService.duplicate,
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Produto duplicado', status: 'success' });
    },
    onError: error,
  });
  const move = useMutation({
    mutationFn: () =>
      productService.movement(movingProduct!.idproduto, movement),
    onSuccess: async () => {
      await refresh();
      movementModal.onClose();
      toast({ title: 'Estoque movimentado', status: 'success' });
    },
    onError: error,
  });
  const openDetail = (p: Product) => {
    setSelectedId(p.idproduto);
    detailDrawer.onOpen();
  };
  const openCreate = () => {
    setEditingId(null);
    setStep(0);
    form.reset(defaults);
    formDrawer.onOpen();
  };
  const openEdit = async (p: Product) => {
    try {
      const x = await productService.detail(p.idproduto);
      setEditingId(p.idproduto);
      setStep(0);
      form.reset({
        ...defaults,
        ...x,
        situacao: Boolean(x.situacao),
        imagens_texto: x.images.map(i => i.url).join('\n'),
        idfornecedor_principal: x.suppliers.find(s => s.principal)
          ?.idfornecedor,
        idfornecedor_secundario: x.suppliers.find(s => !s.principal)
          ?.idfornecedor,
        codigo_fornecedor:
          x.suppliers.find(s => s.principal)?.codigo_fornecedor || '',
        estoque_inicial: 0,
        idfilial_inicial: undefined,
      });
      formDrawer.onOpen();
    } catch (e) {
      error(e);
    }
  };
  const openMove = (p: Product) => {
    setMovingProduct(p);
    setMovement({
      idfilial: data?.options.branches[0]?.id || 0,
      tipo: 1,
      quantidade: 0,
      observacao: '',
    });
    movementModal.onOpen();
  };
  const clear = () =>
    setFilters({
      q: '',
      category: '',
      brand: '',
      supplier: '',
      status: '',
      branch: '',
      stock: '',
      price: '',
      best_sellers: '',
    });
  return (
    <Box>
      <PageHeader
        icon={Package}
        title="Produtos"
        description="Gerencie produtos, estoque, precos, fornecedores e informacoes comerciais."
        breadcrumbs={[{ label: 'Estoque' }, { label: 'Produtos' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Novo produto
          </Button>
        }
      />
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 7 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Produtos"
          count={Number(data?.metrics.total)}
          format={formatNumber}
          detail="Itens no catalogo"
          icon={Package}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Ativos"
          count={Number(data?.metrics.active)}
          format={formatNumber}
          detail="Disponiveis"
          icon={Check}
        />
        <KpiCard
          index={2}
          tone="neutral"
          label="Inativos"
          count={Number(data?.metrics.inactive)}
          format={formatNumber}
          detail="Fora de operacao"
          icon={Ban}
        />
        <KpiCard
          index={3}
          tone="warning"
          label="Estoque critico"
          count={Number(data?.metrics.critical)}
          format={formatNumber}
          detail="Precisam de atencao"
          icon={AlertTriangle}
        />
        <KpiCard
          index={4}
          tone="info"
          label="Filiais com estoque"
          count={Number(data?.metrics.branches)}
          format={formatNumber}
          detail="Unidades abastecidas"
          icon={Store}
        />
        <KpiCard
          index={5}
          tone="brand"
          label="Valor em estoque"
          count={Number(data?.metrics.stock_value)}
          format={value => formatCurrency(value, { compact: true })}
          detail="Pelo custo atual"
          icon={CircleDollarSign}
        />
        <KpiCard
          index={6}
          tone="neutral"
          label="Mais vendido"
          value={data?.metrics.best_seller || '-'}
          detail="Lider historico"
          icon={Flame}
        />
      </SimpleGrid>
      <BrandSurface p={4} mb={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(250px,1fr) repeat(6,minmax(110px,.38fr)) auto',
          }}
          gap={3}
        >
          <InputGroup>
            <InputLeftElement>
              <Search size={16} />
            </InputLeftElement>
            <Input
              value={filters.q}
              onChange={e => setFilters(v => ({ ...v, q: e.target.value }))}
              placeholder="Buscar por nome, SKU, codigo de barras, marca ou categoria..."
            />
          </InputGroup>
          <Filter
            value={filters.category}
            label="Categoria"
            items={data?.options.categories}
            change={value => setFilters(v => ({ ...v, category: value }))}
          />
          <Filter
            value={filters.brand}
            label="Marca"
            items={data?.options.brands}
            change={value => setFilters(v => ({ ...v, brand: value }))}
          />
          <Filter
            value={filters.supplier}
            label="Fornecedor"
            items={data?.options.suppliers}
            change={value => setFilters(v => ({ ...v, supplier: value }))}
          />
          <Filter
            value={filters.branch}
            label="Filial"
            items={data?.options.branches}
            change={value => setFilters(v => ({ ...v, branch: value }))}
          />
          <Select
            aria-label="Estoque"
            value={filters.stock}
            onChange={e => setFilters(v => ({ ...v, stock: e.target.value }))}
          >
            <option value="">Estoque</option>
            <option value="with">Com estoque</option>
            <option value="without">Sem estoque</option>
            <option value="critical">Estoque critico</option>
          </Select>
          <Select
            aria-label="Situacao"
            value={filters.status}
            onChange={e => setFilters(v => ({ ...v, status: e.target.value }))}
          >
            <option value="">Situacao</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </Select>
          <Menu>
            <MenuButton as={Button} variant="outline">
              Mais
            </MenuButton>
            <MenuList>
              <MenuItem
                onClick={() => setFilters(v => ({ ...v, price: 'low' }))}
              >
                Preco abaixo de R$ 100
              </MenuItem>
              <MenuItem
                onClick={() => setFilters(v => ({ ...v, price: 'high' }))}
              >
                Preco acima de R$ 100
              </MenuItem>
              <MenuItem
                onClick={() => setFilters(v => ({ ...v, best_sellers: '1' }))}
              >
                Mais vendidos primeiro
              </MenuItem>
              <MenuDivider />
              <MenuItem onClick={clear}>Limpar filtros</MenuItem>
            </MenuList>
          </Menu>
        </Grid>
      </BrandSurface>
      {list.isError ? (
        <Surface>
          <ErrorState retry={() => void list.refetch()} />
        </Surface>
      ) : list.isLoading ? (
        <Surface p={5}>
          <VStack>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} h="58px" w="full" />
            ))}
          </VStack>
        </Surface>
      ) : data?.products.length ? (
        isMobile ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {data.products.map((p, i) => (
              <MotionBox
                key={p.idproduto}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
              >
                <ProductCard
                  product={p}
                  openDetail={openDetail}
                  openEdit={openEdit}
                  openMove={openMove}
                  setStatus={(id, value) => status.mutate({ id, value })}
                  duplicate={id => duplicate.mutate(id)}
                />
              </MotionBox>
            ))}
          </SimpleGrid>
        ) : (
          <Surface overflow="hidden">
            <Box overflowX="auto">
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Imagem</Th>
                    <Th>Produto</Th>
                    <Th>SKU</Th>
                    <Th>Categoria</Th>
                    <Th>Marca</Th>
                    <Th isNumeric>Estoque</Th>
                    <Th isNumeric>Preco</Th>
                    <Th isNumeric>Custo</Th>
                    <Th isNumeric>Margem</Th>
                    <Th>Status</Th>
                    <Th w="48px" />
                  </Tr>
                </Thead>
                <Tbody>
                  {data.products.map(p => (
                    <Tr
                      key={p.idproduto}
                      cursor="pointer"
                      onClick={() => openDetail(p)}
                    >
                      <Td>
                        <ProductImage product={p} />
                      </Td>
                      <Td>
                        <Text fontWeight="650">{p.nome}</Text>
                        <ProductBadges product={p} />
                      </Td>
                      <Td>{p.sku || '-'}</Td>
                      <Td>{p.categoria || '-'}</Td>
                      <Td>{p.marca || '-'}</Td>
                      <Td isNumeric>
                        {formatQuantity(p.estoque)} {p.unidade}
                      </Td>
                      <Td isNumeric>
                        {formatCurrency(p.preco_promocional || p.preco_venda)}
                      </Td>
                      <Td isNumeric>{formatCurrency(p.preco_custo)}</Td>
                      <Td isNumeric>{formatPercent(p.margem)}</Td>
                      <Td>
                        <Badge colorScheme={p.situacao ? 'green' : 'red'}>
                          {p.situacao ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </Td>
                      <Td onClick={e => e.stopPropagation()}>
                        <ProductMenu
                          product={p}
                          openDetail={openDetail}
                          openEdit={openEdit}
                          openMove={openMove}
                          setStatus={(id, value) =>
                            status.mutate({ id, value })
                          }
                          duplicate={id => duplicate.mutate(id)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </Surface>
        )
      ) : (
        <Surface>
          <EmptyState
            title={
              Object.values(filters).some(Boolean)
                ? 'Nenhum produto encontrado'
                : 'Nenhum produto cadastrado'
            }
            description="Ajuste os filtros ou cadastre o primeiro produto."
            icon={Package}
            action={openCreate}
            actionLabel="Novo produto"
          />
        </Surface>
      )}
      <DetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
      />
      <ProductFormDrawer
        disclosure={formDrawer}
        form={form}
        options={data?.options}
        step={step}
        setStep={setStep}
        editing={Boolean(editingId)}
        saving={save.isPending}
        submit={v => save.mutate(v)}
      />
      <Modal isOpen={movementModal.isOpen} onClose={movementModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Movimentar estoque</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="12px" color="erp.textSecondary">
              {movingProduct?.nome}
            </Text>
            <VStack align="stretch" spacing={4}>
              <FormControl>
                <FormLabel>Filial</FormLabel>
                <Select
                  value={movement.idfilial}
                  onChange={e =>
                    setMovement(v => ({
                      ...v,
                      idfilial: Number(e.target.value),
                    }))
                  }
                >
                  {data?.options.branches.map(x => (
                    <option key={x.id} value={x.id}>
                      {x.nome}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Tipo</FormLabel>
                <Select
                  value={movement.tipo}
                  onChange={e =>
                    setMovement(v => ({ ...v, tipo: Number(e.target.value) }))
                  }
                >
                  <option value={1}>Entrada</option>
                  <option value={2}>Saida</option>
                  <option value={5}>Ajuste de saldo</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Quantidade</FormLabel>
                <Input
                  type="number"
                  min={0}
                  step="0.001"
                  value={movement.quantidade}
                  onChange={e =>
                    setMovement(v => ({
                      ...v,
                      quantidade: Number(e.target.value),
                    }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Observacao</FormLabel>
                <Textarea
                  value={movement.observacao}
                  onChange={e =>
                    setMovement(v => ({ ...v, observacao: e.target.value }))
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
              isDisabled={!movement.idfilial || movement.quantidade <= 0}
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

function Filter({
  value,
  label,
  items,
  change,
}: {
  value: string;
  label: string;
  items?: Array<{ id: number; nome: string }>;
  change: (value: string) => void;
}) {
  return (
    <Select
      aria-label={label}
      value={value}
      onChange={e => change(e.target.value)}
    >
      <option value="">{label}</option>
      {items?.map(x => (
        <option key={x.id} value={x.id}>
          {x.nome}
        </option>
      ))}
    </Select>
  );
}
function ProductImage({ product }: { product: Product }) {
  return product.imagem ? (
    <Image
      src={product.imagem}
      alt={product.nome}
      w="42px"
      h="42px"
      objectFit="cover"
      borderRadius="8px"
    />
  ) : (
    <Flex
      w="42px"
      h="42px"
      align="center"
      justify="center"
      bg="erp.surfaceSubtle"
      color="erp.textMuted"
      borderRadius="8px"
    >
      <BoxIcon size={18} />
    </Flex>
  );
}
type Actions = {
  product: Product;
  openDetail: (p: Product) => void;
  openEdit: (p: Product) => Promise<void>;
  openMove: (p: Product) => void;
  setStatus: (id: number, value: number) => void;
  duplicate: (id: number) => void;
};
function ProductCard(props: Actions) {
  const p = props.product;
  return (
    <Surface interactive p={4}>
      <Flex justify="space-between">
        <Flex gap={3}>
          <ProductImage product={p} />
          <Box>
            <Text fontWeight="700">{p.nome}</Text>
            <Text fontSize="10px" color="erp.textMuted">
              {p.sku || 'Sem SKU'} · {p.categoria || 'Sem categoria'}
            </Text>
          </Box>
        </Flex>
        <ProductMenu {...props} />
      </Flex>
      <Box mt={3}>
        <ProductBadges product={p} />
      </Box>
      <SimpleGrid columns={2} spacing={3} mt={4}>
        <Info
          label="Estoque"
          value={`${formatQuantity(p.estoque)} ${p.unidade}`}
        />
        <Info
          label="Preco"
          value={formatCurrency(p.preco_promocional || p.preco_venda)}
        />
        <Info label="Custo" value={formatCurrency(p.preco_custo)} />
        <Info label="Margem" value={formatPercent(p.margem)} />
      </SimpleGrid>
      <Button
        mt={3}
        size="sm"
        variant="ghost"
        leftIcon={<Eye size={14} />}
        onClick={() => props.openDetail(p)}
      >
        Ver detalhes
      </Button>
    </Surface>
  );
}
function ProductMenu({
  product,
  openDetail,
  openEdit,
  openMove,
  setStatus,
  duplicate,
}: Actions) {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Acoes"
        icon={<MoreHorizontal size={17} />}
        size="sm"
        variant="ghost"
      />
      <MenuList>
        <MenuItem icon={<Eye size={15} />} onClick={() => openDetail(product)}>
          Visualizar
        </MenuItem>
        <MenuItem
          icon={<Pencil size={15} />}
          onClick={() => void openEdit(product)}
        >
          Editar
        </MenuItem>
        <MenuItem
          icon={<Copy size={15} />}
          onClick={() => duplicate(product.idproduto)}
        >
          Duplicar produto
        </MenuItem>
        <MenuItem icon={<Boxes size={15} />} onClick={() => openMove(product)}>
          Movimentar estoque
        </MenuItem>
        <MenuItem
          icon={<History size={15} />}
          onClick={() => openDetail(product)}
        >
          Historico
        </MenuItem>
        <MenuItem
          icon={<FileImage size={15} />}
          onClick={() => openDetail(product)}
        >
          Imagens
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon={<Ban size={15} />}
          color={product.situacao ? 'erp.danger' : 'erp.success'}
          onClick={() => setStatus(product.idproduto, product.situacao ? 0 : 1)}
        >
          {product.situacao ? 'Inativar' : 'Reativar'}
        </MenuItem>
        <Tooltip label="Exclusao bloqueada para preservar historico">
          <MenuItem isDisabled icon={<Trash2 size={15} />}>
            Excluir
          </MenuItem>
        </Tooltip>
      </MenuList>
    </Menu>
  );
}

function DetailDrawer({
  disclosure,
  detail,
  loading,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: ProductDetail;
  loading: boolean;
}) {
  const total =
    detail?.stock.reduce((sum, x) => sum + Number(x.quantidade), 0) || 0;
  const reserved =
    detail?.stock.reduce((sum, x) => sum + Number(x.quantidade_reservada), 0) ||
    0;
  return (
    <Drawer
      isOpen={disclosure.isOpen}
      placement="right"
      size="xl"
      onClose={disclosure.onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {detail?.nome || 'Detalhes do produto'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            {detail?.sku || 'Catalogo e operacao'}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack>
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} h="48px" w="full" />
              ))}
            </VStack>
          ) : (
            <>
              <Flex gap={4} mb={5}>
                {detail.images[0] ? (
                  <Image
                    src={detail.images[0].url}
                    alt={detail.nome}
                    w="72px"
                    h="72px"
                    objectFit="cover"
                    borderRadius="10px"
                  />
                ) : (
                  <Avatar size="lg" name={detail.nome} bg="brand.700" />
                )}
                <Box>
                  <Text fontSize="18px" fontWeight="700">
                    {detail.nome}
                  </Text>
                  <Text fontSize="11px" color="erp.textMuted">
                    {detail.categoria} · {detail.marca}
                  </Text>
                  <ProductBadges product={detail} />
                </Box>
              </Flex>
              <Tabs variant="line">
                <TabList overflowX="auto">
                  <Tab>Informacoes</Tab>
                  <Tab>Estoque</Tab>
                  <Tab>Financeiro</Tab>
                  <Tab>Movimentacoes</Tab>
                  <Tab>Vendas</Tab>
                  <Tab>Fornecedores</Tab>
                  <Tab>Historico</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <Info label="Descricao" value={detail.descricao} />
                    <Info label="SKU" value={detail.sku} />
                    <Info
                      label="Codigo de barras"
                      value={formatBarcode(detail.codigo_barras)}
                    />
                    <Info label="Categoria" value={detail.categoria} />
                    <Info label="Marca" value={detail.marca} />
                    <Info label="Unidade" value={detail.unidade} />
                    <Info label="Peso" value={formatWeight(detail.peso)} />
                    <Info
                      label="Dimensoes"
                      value={formatDimensions(
                        detail.altura,
                        detail.largura,
                        detail.comprimento
                      )}
                    />
                    <Info
                      label="NCM / CEST"
                      value={`${detail.ncm || '-'} / ${detail.cest || '-'}`}
                    />
                    <Info
                      label="Situacao"
                      value={detail.situacao ? 'Ativo' : 'Inativo'}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    <SimpleGrid columns={4} spacing={3} mb={4}>
                      <Metric label="Total" value={formatQuantity(total)} />
                      <Metric
                        label="Minimo"
                        value={formatQuantity(detail.estoque_minimo)}
                      />
                      <Metric
                        label="Maximo"
                        value={formatQuantity(detail.estoque_maximo)}
                      />
                      <Metric
                        label="Disponivel"
                        value={formatQuantity(total - reserved)}
                      />
                    </SimpleGrid>
                    {detail.stock.length ? (
                      <VStack align="stretch" spacing={2}>
                        {detail.stock.map(x => (
                          <Flex
                            key={x.idfilial}
                            p={3}
                            border="1px solid"
                            borderColor="erp.border"
                            borderRadius="8px"
                            justify="space-between"
                          >
                            <Box>
                              <Text fontSize="12px" fontWeight="700">
                                {x.filial}
                              </Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                {formatDateTime(
                                  x.ultima_movimentacao,
                                  'Sem movimento'
                                )}
                              </Text>
                            </Box>
                            <Text fontSize="13px" fontWeight="700">
                              {formatQuantity(x.quantidade)} {detail.unidade}
                            </Text>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Sem estoque"
                        description="Movimente o produto para uma filial."
                        icon={Boxes}
                      />
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    <Info
                      label="Preco de custo"
                      value={formatCurrency(detail.preco_custo)}
                    />
                    <Info
                      label="Preco de venda"
                      value={formatCurrency(detail.preco_venda)}
                    />
                    <Info
                      label="Promocional"
                      value={formatCurrency(detail.preco_promocional)}
                    />
                    <Info label="Margem" value={formatPercent(detail.margem)} />
                    <Info
                      label="Lucro estimado"
                      value={formatCurrency(
                        Number(detail.preco_venda) - Number(detail.preco_custo)
                      )}
                    />
                    <Info
                      label="Ultimo reajuste"
                      value={formatDateTime(detail.ultimo_reajuste)}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.movements.length ? (
                      <Timeline
                        items={detail.movements.map(x => ({
                          id: x.idmovimentacao_estoque,
                          title: `${movementLabel(x.tipo)} · ${x.filial}`,
                          detail: `${formatQuantity(x.quantidade)} ${detail.unidade}${x.observacao ? ` · ${x.observacao}` : ''}`,
                          date: x.criado_em,
                          icon:
                            x.tipo === 1 ? ArrowDownToLine : ArrowUpFromLine,
                        }))}
                      />
                    ) : (
                      <EmptyState
                        title="Sem movimentacoes"
                        description="Entradas, saidas e ajustes aparecerao aqui."
                        icon={Boxes}
                      />
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    <SimpleGrid columns={2} spacing={3} mb={4}>
                      <Metric
                        label="Quantidade vendida"
                        value={formatQuantity(detail.sales.quantity)}
                      />
                      <Metric
                        label="Receita gerada"
                        value={formatCurrency(detail.sales.revenue)}
                      />
                      <Metric
                        label="Ticket medio"
                        value={formatCurrency(detail.sales.average_ticket)}
                      />
                      <Metric
                        label="Ultima venda"
                        value={formatDateTime(detail.sales.last_sale)}
                      />
                    </SimpleGrid>
                    {detail.top_branches.map(x => (
                      <Info
                        key={x.filial}
                        label={x.filial}
                        value={`${formatQuantity(x.quantity)} · ${formatCurrency(x.revenue)}`}
                      />
                    ))}
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.suppliers.length ? (
                      detail.suppliers.map(x => (
                        <Surface key={x.idfornecedor} p={4} mb={2}>
                          <Flex justify="space-between">
                            <Box>
                              <Text fontSize="12px" fontWeight="700">
                                {x.nome_fantasia || x.razao_social}
                              </Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                Codigo: {x.codigo_fornecedor || '-'}
                              </Text>
                            </Box>
                            {x.principal && (
                              <Badge colorScheme="blue">Principal</Badge>
                            )}
                          </Flex>
                        </Surface>
                      ))
                    ) : (
                      <EmptyState
                        title="Sem fornecedores"
                        description="Vincule fornecedores ao editar o produto."
                        icon={Truck}
                      />
                    )}
                    <Divider my={4} />
                    <Info
                      label="Ultima compra"
                      value={formatDateTime(detail.last_purchase?.data_compra)}
                    />
                    <Info
                      label="Ultimo preco"
                      value={formatCurrency(
                        detail.last_purchase?.valor_unitario
                      )}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.history.length ? (
                      <Timeline
                        items={detail.history.map(x => ({
                          id: x.idauditoria,
                          title: x.acao.replaceAll('_', ' '),
                          date: x.criado_em,
                          icon: History,
                        }))}
                      />
                    ) : (
                      <EmptyState
                        title="Sem historico"
                        description="Alteracoes auditaveis aparecerao aqui."
                        icon={History}
                      />
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Surface p={3}>
      <Text fontSize="9px" color="erp.textMuted" textTransform="uppercase">
        {label}
      </Text>
      <Text mt={1} fontSize="14px" fontWeight="700">
        {value}
      </Text>
    </Surface>
  );
}
function movementLabel(type: number) {
  return (
    (
      {
        1: 'Entrada',
        2: 'Saida',
        3: 'Transferencia',
        4: 'Inventario',
        5: 'Ajuste',
      } as Record<number, string>
    )[type] || 'Movimento'
  );
}
function Timeline({
  items,
}: {
  items: Array<{
    id: number;
    title: string;
    detail?: string;
    date: string;
    icon: typeof History;
  }>;
}) {
  return (
    <VStack align="stretch" spacing={0}>
      {items.map(x => (
        <Flex key={x.id} gap={3} pb={5}>
          <Flex
            w="24px"
            h="24px"
            align="center"
            justify="center"
            bg="erp.brandSoft"
            color="erp.brandText"
            borderRadius="full"
          >
            <Icon as={x.icon} boxSize="12px" />
          </Flex>
          <Box>
            <Text fontSize="12px" fontWeight="650">
              {x.title}
            </Text>
            {x.detail && (
              <Text fontSize="11px" color="erp.textSecondary">
                {x.detail}
              </Text>
            )}
            <Text fontSize="10px" color="erp.textMuted">
              {formatDateTime(x.date)}
            </Text>
          </Box>
        </Flex>
      ))}
    </VStack>
  );
}

function ProductFormDrawer({
  disclosure,
  form,
  options,
  step,
  setStep,
  editing,
  saving,
  submit,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  form: UseFormReturn<ProductForm>;
  options?: ProductList['options'];
  step: number;
  setStep: (v: number) => void;
  editing: boolean;
  saving: boolean;
  submit: (v: ProductForm) => void;
}) {
  const w = form.watch();
  const margin =
    Number(w.preco_venda) > 0
      ? ((Number(w.preco_venda) - Number(w.preco_custo)) /
          Number(w.preco_venda)) *
        100
      : 0;
  const category = options?.categories.find(
    x => x.id === Number(w.idcategoria)
  );
  const brand = options?.brands.find(x => x.id === Number(w.idmarca));
  return (
    <Drawer
      isOpen={disclosure.isOpen}
      placement="right"
      size="xl"
      onClose={disclosure.onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {editing ? 'Editar produto' : 'Novo produto'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            Etapa {step + 1} de {steps.length}: {steps[step]}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <Grid
            templateColumns={{ base: '1fr', lg: 'minmax(0,1fr) 245px' }}
            gap={6}
          >
            <Box>
              <Flex gap={1} mb={6}>
                {steps.map((x, i) => (
                  <Tooltip key={x} label={x}>
                    <Box
                      flex="1"
                      h="4px"
                      bg={i <= step ? 'brand.500' : 'erp.border'}
                      borderRadius="full"
                    />
                  </Tooltip>
                ))}
              </Flex>
              <AnimatePresence>
                <MotionBox
                  key={step}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                >
                  <ProductStep
                    step={step}
                    form={form}
                    options={options}
                    margin={margin}
                  />
                </MotionBox>
              </AnimatePresence>
            </Box>
            <Surface p={4} h="fit-content" bg="erp.surfaceSubtle">
              <Text fontSize="12px" fontWeight="700">
                Resumo do produto
              </Text>
              {w.imagens_texto?.split(/\r?\n/)[0] && (
                <Image
                  src={w.imagens_texto.split(/\r?\n/)[0]}
                  alt="Produto"
                  w="full"
                  aspectRatio={16 / 10}
                  objectFit="cover"
                  borderRadius="8px"
                  mt={3}
                />
              )}
              <Info label="Produto" value={w.nome} />
              <Info label="Categoria" value={category?.nome} />
              <Info label="Marca" value={brand?.nome} />
              <Info label="Preco" value={formatCurrency(w.preco_venda)} />
              <Info label="Margem" value={formatPercent(margin)} />
              <Info label="Estoque" value={formatQuantity(w.estoque_inicial)} />
            </Surface>
          </Grid>
        </DrawerBody>
        <DrawerFooter>
          <Button
            variant="ghost"
            mr={3}
            leftIcon={step > 0 ? <ChevronLeft size={15} /> : undefined}
            onClick={step === 0 ? disclosure.onClose : () => setStep(step - 1)}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < steps.length - 1 ? (
            <Button
              rightIcon={<ChevronRight size={15} />}
              isDisabled={step === 0 && !w.nome}
              onClick={() => setStep(step + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              leftIcon={<Check size={15} />}
              isLoading={saving}
              onClick={form.handleSubmit(submit)}
            >
              Salvar produto
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProductStep({
  step,
  form,
  options,
  margin,
}: {
  step: number;
  form: UseFormReturn<ProductForm>;
  options?: ProductList['options'];
  margin: number;
}) {
  const e = form.formState.errors;
  if (step === 0)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="Nome" error={e.nome?.message} required>
          <Input {...form.register('nome')} />
        </Field>
        <Field label="SKU">
          <Input {...form.register('sku')} />
        </Field>
        <Field label="Codigo de barras">
          <Input inputMode="numeric" {...form.register('codigo_barras')} />
        </Field>
        <Field label="Categoria" error={e.idcategoria?.message} required>
          <Select {...form.register('idcategoria')}>
            <option value={0}>Selecione</option>
            {options?.categories.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Marca">
          <Select {...form.register('idmarca')}>
            <option value="">Sem marca</option>
            {options?.brands.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Unidade">
          <Select {...form.register('unidade')}>
            {['UN', 'KG', 'L', 'M', 'CX', 'PC'].map(x => (
              <option key={x}>{x}</option>
            ))}
          </Select>
        </Field>
        <Field label="Descricao">
          <Textarea {...form.register('descricao')} />
        </Field>
        <Field label="Imagens (uma URL por linha)">
          <Textarea
            {...form.register('imagens_texto')}
            placeholder="https://..."
          />
        </Field>
      </SimpleGrid>
    );
  if (step === 1)
    return (
      <VStack align="stretch" spacing={4}>
        <Field label="Fornecedor principal">
          <Select {...form.register('idfornecedor_principal')}>
            <option value="">Sem fornecedor</option>
            {options?.suppliers.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fornecedor secundario">
          <Select {...form.register('idfornecedor_secundario')}>
            <option value="">Sem fornecedor</option>
            {options?.suppliers.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Codigo do fornecedor">
          <Input {...form.register('codigo_fornecedor')} />
        </Field>
      </VStack>
    );
  if (step === 2)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Controller
          control={form.control}
          name="preco_custo"
          render={({ field }) => (
            <Field label="Preco de custo">
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="preco_venda"
          render={({ field }) => (
            <Field
              label="Preco de venda"
              error={e.preco_venda?.message}
              required
            >
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="preco_promocional"
          render={({ field }) => (
            <Field label="Preco promocional">
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <BrandSurface p={4}>
          <Text fontSize="10px" color="erp.textMuted">
            Margem calculada
          </Text>
          <Text fontSize="22px" fontWeight="700">
            {formatPercent(margin)}
          </Text>
        </BrandSurface>
      </SimpleGrid>
    );
  if (step === 3)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="Estoque inicial">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('estoque_inicial')}
          />
        </Field>
        <Field label="Filial inicial">
          <Select {...form.register('idfilial_inicial')}>
            <option value="">Selecione</option>
            {options?.branches.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Estoque minimo">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('estoque_minimo')}
          />
        </Field>
        <Field label="Estoque maximo">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('estoque_maximo')}
          />
        </Field>
        <Checkbox {...form.register('permite_estoque_negativo')}>
          Permitir estoque negativo
        </Checkbox>
      </SimpleGrid>
    );
  if (step === 4)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="Peso (kg)">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('peso')}
          />
        </Field>
        <Field label="Altura (cm)">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('altura')}
          />
        </Field>
        <Field label="Largura (cm)">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('largura')}
          />
        </Field>
        <Field label="Comprimento (cm)">
          <Input
            type="number"
            min={0}
            step="0.001"
            {...form.register('comprimento')}
          />
        </Field>
        <Field label="Garantia (meses)">
          <Input type="number" min={0} {...form.register('garantia_meses')} />
        </Field>
        <Checkbox {...form.register('lancamento')}>
          Produto em lancamento
        </Checkbox>
        <Checkbox {...form.register('destaque')}>Produto destaque</Checkbox>
      </SimpleGrid>
    );
  if (step === 5)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="NCM">
          <Input {...form.register('ncm')} />
        </Field>
        <Field label="CFOP">
          <Input {...form.register('cfop')} />
        </Field>
        <Field label="CEST">
          <Input {...form.register('cest')} />
        </Field>
        <Field label="Origem">
          <Select {...form.register('origem')}>
            <option value="">Selecione</option>
            {Array.from({ length: 9 }).map((_, i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tributacao">
          <Input {...form.register('tributacao')} />
        </Field>
        <Checkbox {...form.register('situacao')}>Produto ativo</Checkbox>
        <Text
          gridColumn={{ md: '1 / -1' }}
          fontSize="10px"
          color="erp.textMuted"
        >
          Estrutura fiscal preparada para integracao tributaria futura.
        </Text>
      </SimpleGrid>
    );
  return (
    <Box>
      <Text fontWeight="700">Revise antes de cadastrar</Text>
      <Text fontSize="11px" color="erp.textMuted">
        Produto, fornecedores, imagens, estoque inicial e auditoria serao
        gravados em uma transacao.
      </Text>
      <Divider my={5} />
      <SimpleGrid columns={2} spacing={4}>
        <Info label="Nome" value={form.watch('nome')} />
        <Info label="SKU" value={form.watch('sku')} />
        <Info label="Preco" value={formatCurrency(form.watch('preco_venda'))} />
        <Info label="Margem" value={formatPercent(margin)} />
        <Info
          label="Estoque inicial"
          value={formatQuantity(form.watch('estoque_inicial'))}
        />
        <Info
          label="Status"
          value={form.watch('situacao') ? 'Ativo' : 'Inativo'}
        />
      </SimpleGrid>
    </Box>
  );
}
function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isRequired={required}>
      <FormLabel>{label}</FormLabel>
      {children}
      <FormErrorMessage>{error}</FormErrorMessage>
    </FormControl>
  );
}
