import {
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
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  SimpleGrid,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  BadgeDollarSign,
  Ban,
  Boxes,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  Gauge,
  LayoutDashboard,
  MapPin,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Star,
  Store,
  Trash2,
  UserRoundCog,
  Users,
} from 'lucide-react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import { FilterSelect } from '../../../shared/ui/FilterSelect';
import FormattedInput, {
  CurrencyInput,
} from '../../../shared/ui/FormattedInput';
import {
  formatCep,
  formatCnpj,
  formatCurrency,
  formatDateTime,
  formatNumber,
  formatPhone,
} from '../../../shared/utils/formatters';
import { branchSchema, type BranchForm } from '../schemas/branchSchema';
import {
  branchService,
  type Branch,
  type BranchDetail,
  type BranchList,
} from '../services/branchService';

const MotionBox = motion(Box);
const steps = [
  'Dados da filial',
  'Endereco',
  'Responsavel',
  'Configuracoes',
  'Meta inicial',
  'Revisao',
];
const defaults: BranchForm = {
  nome: '',
  codigo: '',
  cnpj: '',
  inscricao_estadual: '',
  email: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  matriz: false,
  idgerente: undefined,
  latitude: undefined,
  longitude: undefined,
  permite_estoque_negativo: false,
  caixa_obrigatorio: true,
  participa_metas: true,
  aparece_ranking: true,
  situacao: true,
  meta_mensal: undefined,
  meta_diaria: undefined,
  meta_ticket: undefined,
  meta_clientes: undefined,
};

function BranchBadges({ branch }: { branch: Branch }) {
  return (
    <Flex gap={2} wrap="wrap">
      <Badge colorScheme={branch.situacao ? 'green' : 'red'}>
        {branch.situacao ? 'Ativa' : 'Inativa'}
      </Badge>
      {branch.matriz && <Badge colorScheme="blue">Matriz</Badge>}
      <Badge colorScheme={branch.ultima_movimentacao ? 'cyan' : 'gray'}>
        {branch.ultima_movimentacao ? 'Com movimento' : 'Sem movimento'}
      </Badge>
      {Number(branch.estoque_critico) > 0 && (
        <Badge colorScheme="orange">Estoque critico</Badge>
      )}
    </Flex>
  );
}

function Info({ label, value }: { label: string; value?: string | number }) {
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

export default function BranchesPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const detailDrawer = useDisclosure();
  const formDrawer = useDisclosure();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    city: '',
    state: '',
    matrix: '',
    manager: '',
    movement: '',
  });
  const form = useForm<BranchForm>({
    resolver: zodResolver(branchSchema) as Resolver<BranchForm>,
    defaultValues: defaults,
  });
  const watched = form.watch();
  const list = useQuery({
    queryKey: ['branches', filters],
    queryFn: () => branchService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['branch', selectedId],
    queryFn: () => branchService.detail(selectedId!),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data = list.data;
  const options = data?.options;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ['branches'] });
  const save = useMutation({
    mutationFn: (values: BranchForm) =>
      editingId
        ? branchService.update(editingId, values)
        : branchService.create(values),
    onSuccess: async () => {
      await refresh();
      formDrawer.onClose();
      form.reset(defaults);
      setEditingId(null);
      setStep(0);
      toast({
        title: editingId ? 'Filial atualizada' : 'Filial criada',
        status: 'success',
      });
    },
    onError: notifyError,
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) =>
      branchService.status(id, value),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: notifyError,
  });
  const matrix = useMutation({
    mutationFn: branchService.matrix,
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Matriz atualizada', status: 'success' });
    },
    onError: notifyError,
  });

  const openDetail = (branch: Branch) => {
    setSelectedId(branch.idfilial);
    detailDrawer.onOpen();
  };
  const openCreate = () => {
    setEditingId(null);
    setStep(0);
    form.reset(defaults);
    formDrawer.onOpen();
  };
  const openEdit = async (branch: Branch) => {
    try {
      const current = await branchService.detail(branch.idfilial);
      setEditingId(branch.idfilial);
      setStep(0);
      form.reset({
        ...defaults,
        ...current,
        situacao: Boolean(current.situacao),
        meta_mensal: current.monthly_goal
          ? Number(current.monthly_goal)
          : undefined,
        meta_diaria: current.daily_goal
          ? Number(current.daily_goal)
          : undefined,
        meta_ticket: current.ticket_goal
          ? Number(current.ticket_goal)
          : undefined,
        meta_clientes: current.customer_goal
          ? Number(current.customer_goal)
          : undefined,
      });
      formDrawer.onOpen();
    } catch (error) {
      notifyError(error);
    }
  };
  const clear = () =>
    setFilters({
      q: '',
      status: '',
      city: '',
      state: '',
      matrix: '',
      manager: '',
      movement: '',
    });
  const canAdvance = () =>
    step !== 0 || Boolean(watched.nome && watched.codigo);

  return (
    <Box>
      <PageHeader
        icon={Building2}
        title="Filiais"
        description="Gerencie as lojas, unidades e pontos de operacao da empresa."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'Filiais' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Nova filial
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 6 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Total de filiais"
          count={Number(data?.metrics.total)}
          format={formatNumber}
          detail="Unidades cadastradas"
          icon={Store}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Filiais ativas"
          count={Number(data?.metrics.active)}
          format={formatNumber}
          detail="Em operacao"
          icon={Activity}
        />
        <KpiCard
          index={2}
          tone="neutral"
          label="Filiais inativas"
          count={Number(data?.metrics.inactive)}
          format={formatNumber}
          detail="Operacao suspensa"
          icon={Ban}
        />
        <KpiCard
          index={3}
          tone="info"
          label="Matriz"
          value={data?.metrics.matrix || '-'}
          detail="Unidade principal"
          icon={Star}
        />
        <KpiCard
          index={4}
          tone="brand"
          label="Usuarios"
          count={Number(data?.metrics.users)}
          format={formatNumber}
          detail="Vinculados a rede"
          icon={Users}
        />
        <KpiCard
          index={5}
          tone="brand"
          label="Receita do mes"
          count={Number(data?.metrics.revenue)}
          format={value => formatCurrency(value, { compact: true })}
          detail="Venda consolidada"
          icon={CircleDollarSign}
        />
      </SimpleGrid>

      <BrandSurface p={4} mb={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            lg: 'minmax(260px,1fr) repeat(6,minmax(115px,.42fr)) auto',
          }}
          gap={3}
        >
          <InputGroup>
            <InputLeftElement>
              <Search size={16} />
            </InputLeftElement>
            <Input
              value={filters.q}
              onChange={event =>
                setFilters(v => ({ ...v, q: event.target.value }))
              }
              placeholder="Buscar por nome, codigo, cidade, CNPJ ou gerente..."
            />
          </InputGroup>
          <FilterSelect
            label="Situacao"
            value={filters.status}
            onChange={v => setFilters(x => ({ ...x, status: v }))}
            options={[
              { value: '', label: 'Situacao' },
              { value: '1', label: 'Ativas' },
              { value: '0', label: 'Inativas' },
            ]}
          />
          <FilterSelect
            label="Cidade"
            value={filters.city}
            onChange={v => setFilters(x => ({ ...x, city: v }))}
            options={[
              { value: '', label: 'Cidade' },
              ...(options?.cities.map(item => ({
                value: item.nome,
                label: item.nome,
              })) ?? []),
            ]}
          />
          <FilterSelect
            label="Estado"
            value={filters.state}
            onChange={v => setFilters(x => ({ ...x, state: v }))}
            options={[
              { value: '', label: 'Estado' },
              ...(options?.states.map(item => ({
                value: item.nome,
                label: item.nome,
              })) ?? []),
            ]}
          />
          <FilterSelect
            label="Matriz"
            value={filters.matrix}
            onChange={v => setFilters(x => ({ ...x, matrix: v }))}
            options={[
              { value: '', label: 'Todas' },
              { value: '1', label: 'Matriz' },
              { value: '0', label: 'Filiais' },
            ]}
          />
          <FilterSelect
            label="Gerente"
            value={filters.manager}
            onChange={v => setFilters(x => ({ ...x, manager: v }))}
            options={[
              { value: '', label: 'Gerente' },
              ...(options?.managers.map(item => ({
                value: String(item.id),
                label: item.nome,
              })) ?? []),
            ]}
          />
          <FilterSelect
            label="Movimentacao"
            value={filters.movement}
            onChange={v => setFilters(x => ({ ...x, movement: v }))}
            options={[
              { value: '', label: 'Movimentacao' },
              { value: 'with', label: 'Com movimento' },
              { value: 'without', label: 'Sem movimento' },
            ]}
          />
          <Button variant="ghost" onClick={clear}>
            Limpar
          </Button>
        </Grid>
      </BrandSurface>

      {list.isError ? (
        <Surface>
          <ErrorState retry={() => void list.refetch()} />
        </Surface>
      ) : list.isLoading ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} h="285px" borderRadius="12px" />
          ))}
        </SimpleGrid>
      ) : data?.branches.length ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {data.branches.map((branch, index) => (
            <MotionBox
              key={branch.idfilial}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.025 }}
            >
              <Surface interactive h="full" overflow="hidden">
                <Box p={5} cursor="pointer" onClick={() => openDetail(branch)}>
                  <Flex justify="space-between" gap={3} align="start">
                    <Flex gap={3} minW={0}>
                      <Flex
                        w="40px"
                        h="40px"
                        align="center"
                        justify="center"
                        borderRadius="9px"
                        bg="erp.brandSoft"
                        color="erp.brandText"
                      >
                        <Store size={19} />
                      </Flex>
                      <Box minW={0}>
                        <Text fontWeight="700" noOfLines={1}>
                          {branch.nome}
                        </Text>
                        <Text fontSize="11px" color="erp.textMuted">
                          {branch.codigo} · {formatCnpj(branch.cnpj)}
                        </Text>
                      </Box>
                    </Flex>
                    <BranchMenu
                      branch={branch}
                      openDetail={openDetail}
                      openEdit={openEdit}
                      setMatrix={id => matrix.mutate(id)}
                      setStatus={(id, value) => status.mutate({ id, value })}
                      navigate={navigate}
                    />
                  </Flex>
                  <Box mt={4}>
                    <BranchBadges branch={branch} />
                  </Box>
                  <SimpleGrid columns={2} spacing={4} mt={5}>
                    <CardValue
                      icon={MapPin}
                      label="Cidade"
                      value={`${branch.cidade}/${branch.estado}`}
                    />
                    <CardValue
                      icon={UserRoundCog}
                      label="Gerente"
                      value={branch.gerente || 'Nao definido'}
                    />
                    <CardValue
                      icon={Users}
                      label="Usuarios"
                      value={formatNumber(branch.usuarios)}
                    />
                    <CardValue
                      icon={BadgeDollarSign}
                      label="Receita do mes"
                      value={formatCurrency(branch.receita_mes)}
                    />
                  </SimpleGrid>
                  <Text mt={5} fontSize="10px" color="erp.textMuted">
                    Ultima movimentacao
                  </Text>
                  <Text fontSize="12px" fontWeight="600">
                    {branch.ultima_movimentacao
                      ? formatDateTime(branch.ultima_movimentacao)
                      : 'Nenhuma movimentacao registrada'}
                  </Text>
                </Box>
                <Flex
                  px={5}
                  py={3}
                  borderTop="1px solid"
                  borderColor="erp.border"
                  gap={2}
                  wrap="wrap"
                >
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Eye size={14} />}
                    onClick={() => openDetail(branch)}
                  >
                    Detalhes
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    leftIcon={<Pencil size={14} />}
                    onClick={() => void openEdit(branch)}
                  >
                    Editar
                  </Button>
                  <Tooltip label="Visao operacional da unidade">
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<LayoutDashboard size={14} />}
                      onClick={() =>
                        navigate(`/dashboard?branch=${branch.idfilial}`)
                      }
                    >
                      Dashboard
                    </Button>
                  </Tooltip>
                </Flex>
              </Surface>
            </MotionBox>
          ))}
        </SimpleGrid>
      ) : (
        <Surface>
          <EmptyState
            title={
              Object.values(filters).some(Boolean)
                ? 'Nenhuma filial encontrada'
                : 'Nenhuma filial cadastrada'
            }
            description="Ajuste os filtros ou cadastre a primeira unidade da empresa."
            icon={Store}
            action={openCreate}
            actionLabel="Nova filial"
          />
        </Surface>
      )}

      <DetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
        navigate={navigate}
      />
      <BranchFormDrawer
        disclosure={formDrawer}
        form={form}
        options={options}
        step={step}
        setStep={setStep}
        editing={Boolean(editingId)}
        saving={save.isPending}
        canAdvance={canAdvance()}
        submit={values => save.mutate(values)}
      />
    </Box>
  );
}

function CardValue({
  icon,
  label,
  value,
}: {
  icon: typeof Store;
  label: string;
  value: string;
}) {
  return (
    <Flex gap={2}>
      <Icon as={icon} boxSize="14px" mt="2px" color="erp.textMuted" />
      <Box minW={0}>
        <Text fontSize="9px" color="erp.textMuted" textTransform="uppercase">
          {label}
        </Text>
        <Text fontSize="12px" fontWeight="600" noOfLines={1}>
          {value}
        </Text>
      </Box>
    </Flex>
  );
}

function BranchMenu({
  branch,
  openDetail,
  openEdit,
  setMatrix,
  setStatus,
  navigate,
}: {
  branch: Branch;
  openDetail: (branch: Branch) => void;
  openEdit: (branch: Branch) => Promise<void>;
  setMatrix: (id: number) => void;
  setStatus: (id: number, status: number) => void;
  navigate: (path: string) => void;
}) {
  return (
    <Menu>
      <MenuButton
        as={IconButton}
        aria-label="Acoes da filial"
        icon={<MoreHorizontal size={17} />}
        variant="ghost"
        size="sm"
        onClick={event => event.stopPropagation()}
      />
      <MenuList>
        <MenuItem icon={<Eye size={15} />} onClick={() => openDetail(branch)}>
          Visualizar
        </MenuItem>
        <MenuItem
          icon={<Pencil size={15} />}
          onClick={() => void openEdit(branch)}
        >
          Editar
        </MenuItem>
        {!branch.matriz && (
          <MenuItem
            icon={<Star size={15} />}
            onClick={() => setMatrix(branch.idfilial)}
          >
            Definir como matriz
          </MenuItem>
        )}
        <MenuItem
          icon={<Users size={15} />}
          onClick={() => navigate(`/users?branch=${branch.idfilial}`)}
        >
          Gerenciar usuarios
        </MenuItem>
        <MenuItem
          icon={<LayoutDashboard size={15} />}
          onClick={() => navigate(`/dashboard?branch=${branch.idfilial}`)}
        >
          Dashboard da filial
        </MenuItem>
        <MenuItem
          icon={<Boxes size={15} />}
          onClick={() => navigate(`/inventory?branch=${branch.idfilial}`)}
        >
          Ver estoque
        </MenuItem>
        <MenuItem
          icon={<ShoppingBag size={15} />}
          onClick={() => navigate(`/sales?branch=${branch.idfilial}`)}
        >
          Ver vendas
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon={<Ban size={15} />}
          color={branch.situacao ? 'erp.danger' : 'erp.success'}
          onClick={() => setStatus(branch.idfilial, branch.situacao ? 0 : 1)}
        >
          {branch.situacao ? 'Inativar' : 'Reativar'}
        </MenuItem>
        <Tooltip label="Exclusao fisica bloqueada para preservar o historico">
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
  navigate,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: BranchDetail;
  loading: boolean;
  navigate: (path: string) => void;
}) {
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
          {detail?.nome || 'Detalhes da filial'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            {detail
              ? `${detail.codigo} · ${detail.cidade}/${detail.estado}`
              : 'Carregando dados operacionais'}
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
              <Flex gap={3} mb={5}>
                <Flex
                  w="48px"
                  h="48px"
                  align="center"
                  justify="center"
                  bg="erp.brandSoft"
                  color="erp.brandText"
                  borderRadius="10px"
                >
                  <Store size={22} />
                </Flex>
                <Box>
                  <Text fontSize="18px" fontWeight="700">
                    {detail.nome}
                  </Text>
                  <BranchBadges branch={detail} />
                </Box>
              </Flex>
              <Tabs variant="line">
                <TabList overflowX="auto">
                  <Tab>Visao geral</Tab>
                  <Tab>Indicadores</Tab>
                  <Tab>Usuarios</Tab>
                  <Tab>Operacao</Tab>
                  <Tab>Historico</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <Info label="CNPJ" value={formatCnpj(detail.cnpj)} />
                    <Info
                      label="Inscricao estadual"
                      value={detail.inscricao_estadual}
                    />
                    <Info
                      label="Gerente"
                      value={detail.gerente || 'Nao definido'}
                    />
                    <Info
                      label="Telefone"
                      value={formatPhone(detail.telefone)}
                    />
                    <Info label="E-mail" value={detail.email} />
                    <Info
                      label="Participa das metas"
                      value={detail.participa_metas ? 'Sim' : 'Nao'}
                    />
                    <Info
                      label="Aparece no ranking"
                      value={detail.aparece_ranking ? 'Sim' : 'Nao'}
                    />
                    <Info
                      label="Endereco"
                      value={`${detail.endereco || ''}, ${detail.numero || 's/n'} - ${detail.bairro || ''}, ${detail.cidade}/${detail.estado} - ${formatCep(detail.cep)}`}
                    />
                    <Info
                      label="Cadastro"
                      value={formatDateTime(detail.criado_em)}
                    />
                    <Info
                      label="Atualizacao"
                      value={formatDateTime(detail.atualizado_em)}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
                      {[
                        [
                          'Receita do dia',
                          formatCurrency(detail.indicators.revenue_today),
                        ],
                        [
                          'Receita do mes',
                          formatCurrency(detail.indicators.revenue_month),
                        ],
                        ['Pedidos', formatNumber(detail.indicators.orders)],
                        [
                          'Ticket medio',
                          formatCurrency(detail.indicators.average_ticket),
                        ],
                        ['Clientes', formatNumber(detail.indicators.customers)],
                        ['Usuarios', formatNumber(detail.users.length)],
                        ['Produtos', formatNumber(detail.indicators.products)],
                        [
                          'Estoque critico',
                          formatNumber(detail.indicators.critical),
                        ],
                        [
                          'Caixa atual',
                          formatCurrency(detail.indicators.current_cash),
                        ],
                        ['Meta mensal', formatCurrency(detail.monthly_goal)],
                        ['Meta diaria', formatCurrency(detail.daily_goal)],
                        ['Meta ticket', formatCurrency(detail.ticket_goal)],
                        ['Meta clientes', formatNumber(detail.customer_goal)],
                      ].map(([label, value]) => (
                        <Surface key={label} p={3}>
                          <Text
                            fontSize="9px"
                            color="erp.textMuted"
                            textTransform="uppercase"
                          >
                            {label}
                          </Text>
                          <Text mt={1} fontSize="15px" fontWeight="700">
                            {value}
                          </Text>
                        </Surface>
                      ))}
                    </SimpleGrid>
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.users.length ? (
                      <VStack align="stretch" spacing={2}>
                        {detail.users.map(user => (
                          <Flex
                            key={user.idusuario}
                            p={3}
                            border="1px solid"
                            borderColor="erp.border"
                            borderRadius="8px"
                            justify="space-between"
                            align="center"
                          >
                            <Box>
                              <Text fontSize="12px" fontWeight="700">
                                {user.nome}
                              </Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                {user.cargo || 'Sem cargo'} · {user.perfil}
                              </Text>
                            </Box>
                            <Flex align="center" gap={2}>
                              <Badge
                                colorScheme={user.situacao ? 'green' : 'red'}
                              >
                                {user.situacao ? 'Ativo' : 'Inativo'}
                              </Badge>
                              <IconButton
                                aria-label="Abrir usuario"
                                icon={<Eye size={14} />}
                                size="xs"
                                variant="ghost"
                                onClick={() =>
                                  navigate(`/users?user=${user.idusuario}`)
                                }
                              />
                            </Flex>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Sem usuarios vinculados"
                        description="Esta filial ainda nao possui usuarios associados."
                        icon={Users}
                      />
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    <Info
                      label="Caixa"
                      value={
                        Number(detail.indicators.open_cash) > 0
                          ? 'Aberto'
                          : 'Fechado'
                      }
                    />
                    <Info
                      label="Ultima venda"
                      value={formatDateTime(detail.operation.last_sale)}
                    />
                    <Info
                      label="Ultima compra"
                      value={formatDateTime(detail.operation.last_purchase)}
                    />
                    <Info
                      label="Movimentacao de estoque"
                      value={formatDateTime(detail.operation.last_stock)}
                    />
                    <Info
                      label="Produtos criticos"
                      value={formatNumber(detail.indicators.critical)}
                    />
                    <Info
                      label="Contas vinculadas"
                      value={formatNumber(detail.operation.linked_accounts)}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.history.length ? (
                      <VStack align="stretch" spacing={0}>
                        {detail.history.map(item => (
                          <Flex key={item.idauditoria} gap={3} pb={5}>
                            <Box
                              w="8px"
                              h="8px"
                              mt={1.5}
                              borderRadius="full"
                              bg="brand.500"
                            />
                            <Box>
                              <Text fontSize="12px" fontWeight="650">
                                {item.acao.replaceAll('_', ' ')}
                              </Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                {formatDateTime(item.criado_em)}
                              </Text>
                            </Box>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Sem eventos registrados"
                        description="As alteracoes importantes aparecerao nesta linha do tempo."
                        icon={Activity}
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

function BranchFormDrawer({
  disclosure,
  form,
  options,
  step,
  setStep,
  editing,
  saving,
  canAdvance,
  submit,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  form: ReturnType<typeof useForm<BranchForm>>;
  options?: BranchList['options'];
  step: number;
  setStep: (step: number) => void;
  editing: boolean;
  saving: boolean;
  canAdvance: boolean;
  submit: (values: BranchForm) => void;
}) {
  const watched = form.watch();
  const manager = options?.managers.find(
    item => item.id === Number(watched.idgerente)
  );
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
          {editing ? 'Editar filial' : 'Nova filial'}
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
                {steps.map((label, index) => (
                  <Tooltip key={label} label={label}>
                    <Box
                      flex="1"
                      h="4px"
                      bg={index <= step ? 'brand.500' : 'erp.border'}
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
                  <BranchStep step={step} form={form} options={options} />
                </MotionBox>
              </AnimatePresence>
            </Box>
            <Surface p={4} h="fit-content" bg="erp.surfaceSubtle">
              <Text fontSize="12px" fontWeight="700">
                Resumo da unidade
              </Text>
              <Info label="Empresa" value={options?.company.nome} />
              <Info label="Filial" value={watched.nome} />
              <Info
                label="Local"
                value={
                  watched.cidade ? `${watched.cidade}/${watched.estado}` : '-'
                }
              />
              <Info label="Gerente" value={manager?.nome || 'Nao definido'} />
              <Info label="Tipo" value={watched.matriz ? 'Matriz' : 'Filial'} />
              <Info
                label="Status"
                value={watched.situacao ? 'Ativa' : 'Inativa'}
              />
              <Info
                label="Meta mensal"
                value={
                  watched.meta_mensal
                    ? formatCurrency(watched.meta_mensal)
                    : 'Nao definida'
                }
              />
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
              isDisabled={!canAdvance}
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
              Salvar filial
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function BranchStep({
  step,
  form,
  options,
}: {
  step: number;
  form: ReturnType<typeof useForm<BranchForm>>;
  options?: BranchList['options'];
}) {
  const errors = form.formState.errors;
  if (step === 0)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="Nome da filial" error={errors.nome?.message} required>
          <Input {...form.register('nome')} />
        </Field>
        <Field label="Codigo interno" error={errors.codigo?.message} required>
          <Input {...form.register('codigo')} />
        </Field>
        <Controller
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <Field label="CNPJ">
              <FormattedInput
                mask="cnpj"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="Inscricao estadual">
          <Input {...form.register('inscricao_estadual')} />
        </Field>
        <Controller
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <Field label="Telefone">
              <FormattedInput
                mask="phone"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" {...form.register('email')} />
        </Field>
        <Checkbox gridColumn={{ md: '1 / -1' }} {...form.register('matriz')}>
          Definir como matriz
        </Checkbox>
      </SimpleGrid>
    );
  if (step === 1)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Controller
          control={form.control}
          name="cep"
          render={({ field }) => (
            <Field label="CEP">
              <FormattedInput
                mask="cep"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="Endereco">
          <Input {...form.register('endereco')} />
        </Field>
        <Field label="Numero">
          <Input {...form.register('numero')} />
        </Field>
        <Field label="Complemento">
          <Input {...form.register('complemento')} />
        </Field>
        <Field label="Bairro">
          <Input {...form.register('bairro')} />
        </Field>
        <Field label="Cidade" error={errors.cidade?.message} required>
          <Input {...form.register('cidade')} />
        </Field>
        <Field label="Estado" error={errors.estado?.message} required>
          <Input
            maxLength={2}
            textTransform="uppercase"
            {...form.register('estado')}
          />
        </Field>
        <Field label="Latitude">
          <Input type="number" step="any" {...form.register('latitude')} />
        </Field>
        <Field label="Longitude">
          <Input type="number" step="any" {...form.register('longitude')} />
        </Field>
      </SimpleGrid>
    );
  if (step === 2)
    return (
      <Box>
        <Field label="Gerente responsavel">
          <Controller
            control={form.control}
            name="idgerente"
            render={({ field }) => (
              <ComboSelect
                value={String(field.value ?? '')}
                onChange={field.onChange}
                placeholder="Sem gerente inicialmente"
                options={[
                  { value: '', label: 'Sem gerente inicialmente' },
                  ...(options?.managers.map(item => ({
                    value: String(item.id),
                    label: item.nome,
                  })) ?? []),
                ]}
              />
            )}
          />
        </Field>
        <Text mt={3} fontSize="11px" color="erp.textMuted">
          O responsavel pode ser alterado a qualquer momento.
        </Text>
      </Box>
    );
  if (step === 3)
    return (
      <VStack align="stretch" spacing={4}>
        <Checkbox {...form.register('permite_estoque_negativo')}>
          Permitir estoque negativo
        </Checkbox>
        <Checkbox {...form.register('caixa_obrigatorio')}>
          Caixa obrigatorio
        </Checkbox>
        <Checkbox {...form.register('situacao')}>Filial ativa</Checkbox>
        <Divider />
        <Checkbox {...form.register('participa_metas')}>
          Filial participa das metas
        </Checkbox>
        <Checkbox {...form.register('aparece_ranking')}>
          Filial aparece no ranking
        </Checkbox>
      </VStack>
    );
  if (step === 4)
    return (
      <VStack align="stretch" spacing={4}>
        <Controller
          control={form.control}
          name="meta_mensal"
          render={({ field }) => (
            <Field label="Meta mensal de vendas">
              <CurrencyInput
                value={field.value?.toString() || ''}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
          <Controller
            control={form.control}
            name="meta_diaria"
            render={({ field }) => (
              <Field label="Meta diaria sugerida">
                <CurrencyInput
                  value={field.value?.toString() || ''}
                  onValueChange={field.onChange}
                />
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name="meta_ticket"
            render={({ field }) => (
              <Field label="Meta de ticket medio">
                <CurrencyInput
                  value={field.value?.toString() || ''}
                  onValueChange={field.onChange}
                />
              </Field>
            )}
          />
          <FormControl>
            <FormLabel>Meta de clientes</FormLabel>
            <Input type="number" min={0} {...form.register('meta_clientes')} />
          </FormControl>
        </SimpleGrid>
      </VStack>
    );
  return (
    <Box>
      <Flex align="center" gap={3}>
        <Flex
          w="40px"
          h="40px"
          align="center"
          justify="center"
          bg="erp.brandSoft"
          color="erp.brandText"
          borderRadius="9px"
        >
          <Gauge size={18} />
        </Flex>
        <Box>
          <Text fontWeight="700">Revise antes de salvar</Text>
          <Text fontSize="11px" color="erp.textMuted">
            O cadastro e a auditoria serao gravados em uma unica transacao.
          </Text>
        </Box>
      </Flex>
      <Divider my={5} />
      <SimpleGrid columns={2} spacing={4}>
        <Info label="Nome" value={form.watch('nome')} />
        <Info label="Codigo" value={form.watch('codigo')} />
        <Info
          label="Cidade/UF"
          value={`${form.watch('cidade')}/${form.watch('estado')}`}
        />
        <Info
          label="Situacao"
          value={form.watch('situacao') ? 'Ativa' : 'Inativa'}
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
  children: React.ReactNode;
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isRequired={required}>
      <FormLabel>{label}</FormLabel>
      {children}
      <FormErrorMessage>{error}</FormErrorMessage>
    </FormControl>
  );
}
