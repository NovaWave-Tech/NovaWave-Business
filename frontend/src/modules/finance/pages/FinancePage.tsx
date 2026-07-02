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
  Progress,
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
  Tr,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowDownRight,
  ArrowUpRight,
  Ban,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Copy,
  CreditCard,
  Eye,
  FileText,
  Landmark,
  MoreHorizontal,
  Pencil,
  ReceiptText,
  Search,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import {
  Controller,
  useForm,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { useState, type ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  PageHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import {
  formatCurrency,
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPaymentMethod,
  formatPercent,
  formatShortDate,
} from '../../../shared/utils/formatters';
import { financeSchema, type FinanceForm } from '../schemas/financeSchema';
import {
  financeService,
  type FinanceData,
  type FinanceDetail,
  type FinanceType,
  type Movement,
} from '../services/financeService';

const MotionBox = motion(Box);
const steps = ['Dados', 'Financeiro', 'Resumo'];
const defaults: FinanceForm = {
  descricao: '',
  idcategoria_financeira: 0,
  idcentro_custo: 0,
  idconta_bancaria: 0,
  idfilial: undefined,
  idcliente: undefined,
  idfornecedor: undefined,
  valor: 0,
  data_vencimento: new Date().toISOString().slice(0, 10),
  forma_pagamento: 'pix',
  documento: '',
  observacoes: '',
  juros: 0,
  desconto: 0,
  multa: 0,
  parcelas_total: 1,
  recorrente: false,
};

function Kpi({
  label,
  value,
  detail,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Wallet;
  tone?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <Surface p={4} minH="118px">
      <Flex justify="space-between">
        <Box minW={0}>
          <Text fontSize="10px" color="erp.textMuted" textTransform="uppercase">
            {label}
          </Text>
          <Text mt={1} fontSize="21px" fontWeight="700" noOfLines={1}>
            {value}
          </Text>
          <Text
            mt={1}
            fontSize="10px"
            color={
              tone === 'positive'
                ? 'erp.success'
                : tone === 'negative'
                  ? 'erp.danger'
                  : 'erp.textSecondary'
            }
          >
            {detail}
          </Text>
        </Box>
        <Flex
          w="34px"
          h="34px"
          align="center"
          justify="center"
          borderRadius="8px"
          bg="erp.brandSoft"
          color="erp.brandText"
        >
          <Icon as={icon} boxSize="16px" />
        </Flex>
      </Flex>
    </Surface>
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
function Status({ item }: { item: Movement }) {
  const map = {
    settled: ['green', item.type === 'revenue' ? 'Recebido' : 'Pago'],
    pending: ['yellow', 'Pendente'],
    overdue: ['red', 'Vencido'],
    cancelled: ['gray', 'Cancelado'],
  } as const;
  const [color, label] = map[item.status_key];
  return <Badge colorScheme={color}>{label}</Badge>;
}

export default function FinancePage() {
  const toast = useToast();
  const qc = useQueryClient();
  const detailDrawer = useDisclosure();
  const formDrawer = useDisclosure();
  const [selected, setSelected] = useState<{
    type: FinanceType;
    id: number;
  } | null>(null);
  const [formType, setFormType] = useState<FinanceType>('revenue');
  const [editing, setEditing] = useState<number | null>(null);
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState('30d');
  const [filters, setFilters] = useState({
    q: '',
    bank: '',
    cost_center: '',
    category: '',
    type: '',
    payment: '',
    branch: '',
    status: '',
  });
  const form = useForm<FinanceForm>({
    resolver: zodResolver(financeSchema) as Resolver<FinanceForm>,
    defaultValues: defaults,
  });
  const list = useQuery({
    queryKey: ['finance', period, filters],
    queryFn: () => financeService.list({ ...filters, period }),
  });
  const detail = useQuery({
    queryKey: ['finance-detail', selected],
    queryFn: () => financeService.detail(selected!.type, selected!.id),
    enabled: Boolean(selected && detailDrawer.isOpen),
  });
  const data = list.data;
  const error = (e: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: e instanceof Error ? e.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = () => qc.invalidateQueries({ queryKey: ['finance'] });
  const save = useMutation({
    mutationFn: (v: FinanceForm) =>
      editing
        ? financeService.update(formType, editing, v)
        : financeService.create(formType, v),
    onSuccess: async () => {
      await refresh();
      formDrawer.onClose();
      setEditing(null);
      setStep(0);
      form.reset(defaults);
      toast({ title: 'Lancamento salvo', status: 'success' });
    },
    onError: error,
  });
  const status = useMutation({
    mutationFn: ({ item, value }: { item: Movement; value: number }) =>
      financeService.status(item.type, item.id, value),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: error,
  });
  const duplicate = useMutation({
    mutationFn: (item: Movement) =>
      financeService.duplicate(item.type, item.id),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Lancamento duplicado', status: 'success' });
    },
    onError: error,
  });
  const openDetail = (item: Movement) => {
    setSelected({ type: item.type, id: Number(item.id) });
    detailDrawer.onOpen();
  };
  const openCreate = (type: FinanceType) => {
    setFormType(type);
    setEditing(null);
    setStep(0);
    form.reset(defaults);
    formDrawer.onOpen();
  };
  const openEdit = async (item: Movement) => {
    try {
      const x = await financeService.detail(item.type, item.id);
      setFormType(item.type);
      setEditing(item.id);
      setStep(0);
      form.reset({
        descricao: x.descricao,
        idcategoria_financeira: Number(x.idcategoria_financeira),
        idcentro_custo: Number(x.idcentro_custo),
        idconta_bancaria: Number(x.idconta_bancaria),
        idfilial: x.idfilial ? Number(x.idfilial) : undefined,
        idcliente: x.idcliente ? Number(x.idcliente) : undefined,
        idfornecedor: x.idfornecedor ? Number(x.idfornecedor) : undefined,
        valor: Number(x.valor),
        data_vencimento: x.data_vencimento,
        forma_pagamento: x.forma_pagamento || '',
        documento: x.documento || '',
        observacoes: x.observacoes || '',
        juros: Number(x.juros),
        desconto: Number(x.desconto),
        multa: Number(x.multa),
        parcelas_total: 1,
        recorrente: x.recorrente,
      });
      formDrawer.onOpen();
    } catch (e) {
      error(e);
    }
  };
  const clear = () =>
    setFilters({
      q: '',
      bank: '',
      cost_center: '',
      category: '',
      type: '',
      payment: '',
      branch: '',
      status: '',
    });
  const revenueChange = change(
    data?.kpis.month_revenue,
    data?.kpis.previous_revenue
  );
  const expenseChange = change(
    data?.kpis.month_expense,
    data?.kpis.previous_expense
  );
  return (
    <Box>
      <PageHeader
        icon={Wallet}
        title="Financeiro"
        description="Gerencie receitas, despesas, fluxo de caixa e saude financeira da empresa."
        breadcrumbs={[{ label: 'Financeiro' }]}
        actions={
          <>
            <Button
              variant="outline"
              leftIcon={<ArrowDownLeft size={16} />}
              onClick={() => openCreate('revenue')}
            >
              Nova receita
            </Button>
            <Button
              leftIcon={<ArrowUpRight size={16} />}
              onClick={() => openCreate('expense')}
            >
              Nova despesa
            </Button>
          </>
        }
      />
      <SimpleGrid
        columns={{ base: 1, sm: 2, xl: 4, '2xl': 8 }}
        spacing={3}
        mb={5}
      >
        <Kpi
          label="Saldo atual"
          value={formatCurrency(data?.kpis.current_balance)}
          detail="Disponivel consolidado"
          icon={Wallet}
          tone={
            (data?.kpis.current_balance || 0) >= 0 ? 'positive' : 'negative'
          }
        />
        <Kpi
          label="Receitas do mes"
          value={formatCurrency(data?.kpis.month_revenue)}
          detail={`${revenueChange >= 0 ? '+' : ''}${formatPercent(revenueChange)} vs anterior`}
          icon={TrendingUp}
          tone="positive"
        />
        <Kpi
          label="Despesas do mes"
          value={formatCurrency(data?.kpis.month_expense)}
          detail={`${expenseChange >= 0 ? '+' : ''}${formatPercent(expenseChange)} vs anterior`}
          icon={TrendingDown}
          tone="negative"
        />
        <Kpi
          label="Fluxo de caixa"
          value={formatCurrency(data?.kpis.cash_flow)}
          detail="Resultado operacional"
          icon={CircleDollarSign}
        />
        <Kpi
          label="A receber"
          value={formatCurrency(data?.kpis.receivable)}
          detail="Titulos pendentes"
          icon={ArrowDownRight}
        />
        <Kpi
          label="A pagar"
          value={formatCurrency(data?.kpis.payable)}
          detail="Compromissos pendentes"
          icon={ArrowUpRight}
        />
        <Kpi
          label="Saldo bancario"
          value={formatCurrency(data?.kpis.current_balance)}
          detail={`${data?.banks.length || 0} contas`}
          icon={Landmark}
        />
        <Kpi
          label="Cartoes"
          value={formatNumber(data?.cards.length)}
          detail="Cartoes corporativos"
          icon={CreditCard}
        />
      </SimpleGrid>
      <BrandSurface p={4} mb={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(240px,1fr) repeat(8,minmax(105px,.34fr)) auto',
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
              placeholder="Buscar por descricao, categoria, fornecedor, cliente ou documento..."
            />
          </InputGroup>
          <Select
            aria-label="Periodo"
            value={period}
            onChange={e => setPeriod(e.target.value)}
          >
            <option value="today">Hoje</option>
            <option value="7d">7 dias</option>
            <option value="30d">30 dias</option>
            <option value="90d">90 dias</option>
            <option value="year">Ano</option>
          </Select>
          <Opt
            label="Conta"
            value={filters.bank}
            items={data?.options.banks}
            change={v => setFilters(x => ({ ...x, bank: v }))}
          />
          <Opt
            label="Centro de custo"
            value={filters.cost_center}
            items={data?.options.cost_centers}
            change={v => setFilters(x => ({ ...x, cost_center: v }))}
          />
          <Opt
            label="Categoria"
            value={filters.category}
            items={data?.options.categories}
            change={v => setFilters(x => ({ ...x, category: v }))}
          />
          <Opt
            label="Filial"
            value={filters.branch}
            items={data?.options.branches}
            change={v => setFilters(x => ({ ...x, branch: v }))}
          />
          <Select
            aria-label="Tipo"
            value={filters.type}
            onChange={e => setFilters(v => ({ ...v, type: e.target.value }))}
          >
            <option value="">Tipo</option>
            <option value="revenue">Receita</option>
            <option value="expense">Despesa</option>
          </Select>
          <Select
            aria-label="Forma de pagamento"
            value={filters.payment}
            onChange={e => setFilters(v => ({ ...v, payment: e.target.value }))}
          >
            <option value="">Pagamento</option>
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferencia</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartao</option>
          </Select>
          <Select
            aria-label="Situacao"
            value={filters.status}
            onChange={e => setFilters(v => ({ ...v, status: e.target.value }))}
          >
            <option value="">Situacao</option>
            <option value="1">Pendente</option>
            <option value="2">Pago / recebido</option>
            <option value="3">Cancelado</option>
          </Select>
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
        <VStack>
          <Skeleton h="340px" w="full" />
          <Skeleton h="260px" w="full" />
        </VStack>
      ) : (
        data && (
          <>
            <SimpleGrid columns={{ base: 1, xl: 3 }} spacing={4} mb={4}>
              <Surface gridColumn={{ xl: 'span 2' }} overflow="hidden">
                <Flex
                  p={4}
                  justify="space-between"
                  align="center"
                  borderBottom="1px solid"
                  borderColor="erp.border"
                >
                  <Box>
                    <Text fontSize="14px" fontWeight="700">
                      Evolucao financeira
                    </Text>
                    <Text fontSize="11px" color="erp.textMuted">
                      Receitas, despesas e saldo diario
                    </Text>
                  </Box>
                  <Badge
                    colorScheme={
                      data.kpis.projected_balance >= 0 ? 'green' : 'red'
                    }
                  >
                    Projetado {formatCurrency(data.kpis.projected_balance)}
                  </Badge>
                </Flex>
                <Box h="300px" p={4}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chart}>
                      <defs>
                        <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor="#2F80FF"
                            stopOpacity={0.25}
                          />
                          <stop
                            offset="95%"
                            stopColor="#2F80FF"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={value => formatShortDate(String(value))}
                      />
                      <YAxis tickFormatter={formatCompactNumber} />
                      <ChartTooltip
                        formatter={value => formatCurrency(Number(value))}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        name="Receitas"
                        stroke="#2563FF"
                        fill="url(#rev)"
                      />
                      <Line
                        type="monotone"
                        dataKey="expense"
                        name="Despesas"
                        stroke="#ef4444"
                      />
                      <ReferenceLine y={0} stroke="#94a3b8" />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Surface>
              <Surface p={5}>
                <Text fontSize="14px" fontWeight="700">
                  Meta financeira
                </Text>
                <Text mt={3} fontSize="28px" fontWeight="700">
                  {formatPercent(data.goal.percentage)}
                </Text>
                <Progress
                  mt={3}
                  value={data.goal.percentage}
                  colorScheme="blue"
                  borderRadius="full"
                />
                <Text mt={2} fontSize="11px" color="erp.textMuted">
                  {formatCurrency(data.kpis.month_revenue)} de{' '}
                  {formatCurrency(data.goal.value)}
                </Text>
                <Divider my={5} />
                <Text fontSize="12px" fontWeight="700">
                  Insights financeiros
                </Text>
                <VStack mt={3} align="stretch" spacing={3}>
                  {data.insights.map((x, i) => (
                    <Flex key={i} gap={3}>
                      <Flex
                        w="28px"
                        h="28px"
                        align="center"
                        justify="center"
                        bg="erp.surfaceSubtle"
                        color={
                          x.tone === 'danger'
                            ? 'erp.danger'
                            : x.tone === 'warning'
                              ? 'erp.warning'
                              : 'erp.success'
                        }
                        borderRadius="8px"
                      >
                        <AlertTriangle size={14} />
                      </Flex>
                      <Box>
                        <Text fontSize="11px" fontWeight="700">
                          {x.title}
                        </Text>
                        <Text fontSize="10px" color="erp.textMuted">
                          {x.description}
                        </Text>
                      </Box>
                    </Flex>
                  ))}
                </VStack>
              </Surface>
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4} mb={4}>
              <AccountPanel
                title="Contas a pagar"
                icon={ArrowUpRight}
                stats={[
                  ['Total pendente', formatCurrency(data.payable.pending)],
                  ['Vencendo hoje', formatNumber(data.payable.today)],
                  ['Amanha', formatNumber(data.payable.tomorrow)],
                  ['Atrasadas', formatNumber(data.payable.overdue)],
                ]}
                items={data.movements
                  .filter(x => x.type === 'expense')
                  .slice(0, 4)}
                open={openDetail}
              />
              <AccountPanel
                title="Contas a receber"
                icon={ArrowDownLeft}
                stats={[
                  ['Total a receber', formatCurrency(data.receivable.pending)],
                  ['Recebido hoje', formatCurrency(data.receivable.today)],
                  ['Atrasados', formatNumber(data.receivable.overdue)],
                  ['Previsto', formatCurrency(data.receivable.expected)],
                ]}
                items={data.movements
                  .filter(x => x.type === 'revenue')
                  .slice(0, 4)}
                open={openDetail}
              />
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4} mb={4}>
              <Surface p={5}>
                <Text fontSize="14px" fontWeight="700">
                  Fluxo de caixa
                </Text>
                <Box h="240px" mt={4}>
                  <ResponsiveContainer>
                    <BarChart data={data.chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={value => formatShortDate(String(value))}
                      />
                      <YAxis tickFormatter={formatCompactNumber} />
                      <ChartTooltip
                        formatter={v => formatCurrency(Number(v))}
                      />
                      <Bar
                        dataKey="revenue"
                        name="Entradas"
                        fill="#2563FF"
                        radius={[3, 3, 0, 0]}
                      />
                      <Bar
                        dataKey="expense"
                        name="Saidas"
                        fill="#ef4444"
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Surface>
              <Surface p={5}>
                <Text fontSize="14px" fontWeight="700">
                  Contas bancarias
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mt={4}>
                  {data.banks.length ? (
                    data.banks.map(x => (
                      <BrandSurface key={x.idconta_bancaria} p={4}>
                        <Flex justify="space-between">
                          <Landmark size={17} />
                          <Text fontSize="10px" color="erp.textMuted">
                            {x.agencia || '-'} / {x.conta}
                          </Text>
                        </Flex>
                        <Text mt={3} fontSize="12px" fontWeight="700">
                          {x.banco}
                        </Text>
                        <Text fontSize="22px" fontWeight="700">
                          {formatCurrency(x.balance)}
                        </Text>
                        <Text fontSize="10px" color="erp.textMuted">
                          Ultimo movimento {formatDate(x.last_movement)}
                        </Text>
                      </BrandSurface>
                    ))
                  ) : (
                    <EmptyState
                      title="Sem contas"
                      description="Cadastre contas bancarias na infraestrutura financeira."
                      icon={Landmark}
                    />
                  )}
                </SimpleGrid>
              </Surface>
            </SimpleGrid>
            <Surface overflow="hidden">
              <Flex
                p={4}
                justify="space-between"
                borderBottom="1px solid"
                borderColor="erp.border"
              >
                <Box>
                  <Text fontSize="14px" fontWeight="700">
                    Ultimas movimentacoes
                  </Text>
                  <Text fontSize="11px" color="erp.textMuted">
                    Receitas e despesas consolidadas
                  </Text>
                </Box>
              </Flex>
              {data.movements.length ? (
                <Box overflowX="auto">
                  <Table variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Data</Th>
                        <Th>Descricao</Th>
                        <Th>Categoria</Th>
                        <Th>Conta</Th>
                        <Th>Pagamento</Th>
                        <Th isNumeric>Valor</Th>
                        <Th>Status</Th>
                        <Th>Filial</Th>
                        <Th w="48px" />
                      </Tr>
                    </Thead>
                    <Tbody>
                      {data.movements.map(x => (
                        <Tr
                          key={`${x.type}-${x.id}`}
                          cursor="pointer"
                          onClick={() => openDetail(x)}
                        >
                          <Td whiteSpace="nowrap">{formatDate(x.due_date)}</Td>
                          <Td>
                            <Flex gap={2} align="center">
                              <Icon
                                as={
                                  x.type === 'revenue'
                                    ? ArrowDownLeft
                                    : ArrowUpRight
                                }
                                boxSize="14px"
                                color={
                                  x.type === 'revenue'
                                    ? 'erp.success'
                                    : 'erp.danger'
                                }
                              />
                              <Box>
                                <Text fontWeight="650">{x.descricao}</Text>
                                <Text fontSize="10px" color="erp.textMuted">
                                  {x.party || x.documento || '-'}
                                </Text>
                              </Box>
                            </Flex>
                          </Td>
                          <Td>{x.categoria || '-'}</Td>
                          <Td>{x.conta || '-'}</Td>
                          <Td>{formatPaymentMethod(x.forma_pagamento)}</Td>
                          <Td
                            isNumeric
                            color={
                              x.type === 'revenue'
                                ? 'erp.success'
                                : 'erp.danger'
                            }
                          >
                            {x.type === 'revenue' ? '+' : '-'}{' '}
                            {formatCurrency(x.total)}
                          </Td>
                          <Td>
                            <Status item={x} />
                          </Td>
                          <Td>{x.filial || '-'}</Td>
                          <Td onClick={e => e.stopPropagation()}>
                            <MovementMenu
                              item={x}
                              open={openDetail}
                              edit={openEdit}
                              setStatus={(item, value) =>
                                status.mutate({ item, value })
                              }
                              duplicate={item => duplicate.mutate(item)}
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              ) : (
                <EmptyState
                  title="Sem movimentacoes"
                  description="Cadastre a primeira receita ou despesa."
                  icon={ReceiptText}
                />
              )}
            </Surface>
          </>
        )
      )}
      <DetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
      />
      <FinanceFormDrawer
        disclosure={formDrawer}
        form={form}
        options={data?.options}
        type={formType}
        step={step}
        setStep={setStep}
        editing={Boolean(editing)}
        saving={save.isPending}
        submit={v => save.mutate(v)}
      />
    </Box>
  );
}

function Opt({
  label,
  value,
  items,
  change,
}: {
  label: string;
  value: string;
  items?: Array<{ id: number; nome: string }>;
  change: (v: string) => void;
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
function change(current?: number, previous?: number) {
  return Number(previous) > 0
    ? ((Number(current) - Number(previous)) / Number(previous)) * 100
    : 0;
}
function AccountPanel({
  title,
  icon,
  stats,
  items,
  open,
}: {
  title: string;
  icon: typeof Wallet;
  stats: Array<[string, string]>;
  items: Movement[];
  open: (x: Movement) => void;
}) {
  return (
    <Surface p={5}>
      <Flex gap={2} align="center">
        <Icon as={icon} boxSize="17px" color="erp.brandText" />
        <Text fontSize="14px" fontWeight="700">
          {title}
        </Text>
      </Flex>
      <SimpleGrid columns={4} spacing={2} mt={4}>
        {stats.map(([l, v]) => (
          <Box key={l}>
            <Text fontSize="9px" color="erp.textMuted">
              {l}
            </Text>
            <Text fontSize="13px" fontWeight="700">
              {v}
            </Text>
          </Box>
        ))}
      </SimpleGrid>
      <Divider my={4} />
      {items.length ? (
        items.map(x => (
          <Flex
            key={x.id}
            py={2}
            justify="space-between"
            cursor="pointer"
            onClick={() => open(x)}
          >
            <Box>
              <Text fontSize="11px" fontWeight="650">
                {x.descricao}
              </Text>
              <Text fontSize="9px" color="erp.textMuted">
                {formatDate(x.due_date)}
              </Text>
            </Box>
            <Text fontSize="11px" fontWeight="700">
              {formatCurrency(x.total)}
            </Text>
          </Flex>
        ))
      ) : (
        <Text fontSize="11px" color="erp.textMuted">
          Sem lancamentos.
        </Text>
      )}
    </Surface>
  );
}
function MovementMenu({
  item,
  open,
  edit,
  setStatus,
  duplicate,
}: {
  item: Movement;
  open: (x: Movement) => void;
  edit: (x: Movement) => Promise<void>;
  setStatus: (x: Movement, v: number) => void;
  duplicate: (x: Movement) => void;
}) {
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
        <MenuItem icon={<Eye size={15} />} onClick={() => open(item)}>
          Visualizar
        </MenuItem>
        <MenuItem icon={<Pencil size={15} />} onClick={() => void edit(item)}>
          Editar
        </MenuItem>
        <MenuItem icon={<Copy size={15} />} onClick={() => duplicate(item)}>
          Duplicar
        </MenuItem>
        {item.situacao === 1 && (
          <MenuItem
            icon={<Check size={15} />}
            onClick={() => setStatus(item, 2)}
          >
            {item.type === 'revenue'
              ? 'Marcar como recebido'
              : 'Marcar como pago'}
          </MenuItem>
        )}
        <MenuDivider />
        <MenuItem
          icon={<Ban size={15} />}
          color="erp.danger"
          onClick={() => setStatus(item, 3)}
        >
          Cancelar
        </MenuItem>
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
  detail?: FinanceDetail;
  loading: boolean;
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
          {detail?.descricao || 'Detalhes financeiros'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            {detail
              ? `${detail.type === 'revenue' ? 'Receita' : 'Despesa'} · ${formatCurrency(detail.total)}`
              : 'Carregando'}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} h="48px" w="full" />
              ))}
            </VStack>
          ) : (
            <Tabs variant="line">
              <TabList>
                <Tab>Informacoes</Tab>
                <Tab>Financeiro</Tab>
                <Tab>Anexos</Tab>
                <Tab>Historico</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <Info label="Descricao" value={detail.descricao} />
                  <Info label="Categoria" value={detail.categoria} />
                  <Info label="Centro de custo" value={detail.centro_custo} />
                  <Info label="Conta" value={detail.conta} />
                  <Info label="Valor" value={formatCurrency(detail.valor)} />
                  <Info
                    label="Vencimento"
                    value={formatDate(detail.data_vencimento)}
                  />
                  <Info
                    label="Pagamento"
                    value={formatPaymentMethod(detail.forma_pagamento)}
                  />
                  <Info label="Documento" value={detail.documento} />
                  <Info label="Observacoes" value={detail.observacoes} />
                </TabPanel>
                <TabPanel px={0}>
                  <Info
                    label="Parcela"
                    value={`${formatNumber(detail.parcela_numero)}/${formatNumber(detail.parcelas_total)}`}
                  />
                  <Info
                    label="Recorrente"
                    value={detail.recorrente ? 'Sim' : 'Nao'}
                  />
                  <Info label="Juros" value={formatCurrency(detail.juros)} />
                  <Info
                    label="Desconto"
                    value={formatCurrency(detail.desconto)}
                  />
                  <Info label="Multa" value={formatCurrency(detail.multa)} />
                  <Info label="Saldo" value={formatCurrency(detail.total)} />
                  <Info
                    label="Baixa"
                    value={formatDate(detail.settlement_date)}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  {detail.attachments.length ? (
                    detail.attachments.map(x => (
                      <Surface key={x.idanexo} p={3} mb={2}>
                        <Flex gap={2}>
                          <FileText size={15} />
                          <Text fontSize="12px">{x.nome}</Text>
                        </Flex>
                      </Surface>
                    ))
                  ) : (
                    <EmptyState
                      title="Sem anexos"
                      description="Boletos, notas e comprovantes aparecerao aqui."
                      icon={FileText}
                    />
                  )}
                </TabPanel>
                <TabPanel px={0}>
                  {detail.history.length ? (
                    detail.history.map(x => (
                      <Flex key={x.idauditoria} gap={3} pb={4}>
                        <Box
                          w="8px"
                          h="8px"
                          mt={1.5}
                          borderRadius="full"
                          bg="brand.500"
                        />
                        <Box>
                          <Text fontSize="12px" fontWeight="650">
                            {x.acao.replaceAll('_', ' ')}
                          </Text>
                          <Text fontSize="10px" color="erp.textMuted">
                            {formatDateTime(x.criado_em)}
                          </Text>
                        </Box>
                      </Flex>
                    ))
                  ) : (
                    <EmptyState
                      title="Sem historico"
                      description="Eventos auditaveis aparecerao aqui."
                      icon={CalendarDays}
                    />
                  )}
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function FinanceFormDrawer({
  disclosure,
  form,
  options,
  type,
  step,
  setStep,
  editing,
  saving,
  submit,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  form: UseFormReturn<FinanceForm>;
  options?: FinanceData['options'];
  type: FinanceType;
  step: number;
  setStep: (v: number) => void;
  editing: boolean;
  saving: boolean;
  submit: (v: FinanceForm) => void;
}) {
  const w = form.watch();
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
          {editing
            ? 'Editar'
            : type === 'revenue'
              ? 'Nova receita'
              : 'Nova despesa'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            Etapa {step + 1} de 3: {steps[step]}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <Grid
            templateColumns={{ base: '1fr', lg: 'minmax(0,1fr) 240px' }}
            gap={6}
          >
            <Box>
              <Flex gap={1} mb={6}>
                {steps.map((x, i) => (
                  <Box
                    key={x}
                    flex="1"
                    h="4px"
                    bg={i <= step ? 'brand.500' : 'erp.border'}
                    borderRadius="full"
                  />
                ))}
              </Flex>
              <AnimatePresence>
                <MotionBox
                  key={step}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <FinanceStep
                    step={step}
                    form={form}
                    options={options}
                    type={type}
                  />
                </MotionBox>
              </AnimatePresence>
            </Box>
            <Surface p={4} h="fit-content" bg="erp.surfaceSubtle">
              <Text fontSize="12px" fontWeight="700">
                Resumo
              </Text>
              <Info
                label="Tipo"
                value={type === 'revenue' ? 'Receita' : 'Despesa'}
              />
              <Info label="Descricao" value={w.descricao} />
              <Info label="Valor" value={formatCurrency(w.valor)} />
              <Info label="Parcelas" value={formatNumber(w.parcelas_total)} />
              <Info label="Vencimento" value={formatDate(w.data_vencimento)} />
              <Info
                label="Total liquido"
                value={formatCurrency(
                  Number(w.valor) +
                    Number(w.juros || 0) +
                    Number(w.multa || 0) -
                    Number(w.desconto || 0)
                )}
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
          {step < 2 ? (
            <Button
              rightIcon={<ChevronRight size={15} />}
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
              Salvar lancamento
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
function FinanceStep({
  step,
  form,
  options,
  type,
}: {
  step: number;
  form: UseFormReturn<FinanceForm>;
  options?: FinanceData['options'];
  type: FinanceType;
}) {
  const e = form.formState.errors;
  const categories = options?.categories.filter(
    x => x.tipo === (type === 'revenue' ? 1 : 2)
  );
  if (step === 0)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field label="Descricao" error={e.descricao?.message} required>
          <Input {...form.register('descricao')} />
        </Field>
        <Field
          label="Categoria"
          error={e.idcategoria_financeira?.message}
          required
        >
          <Select {...form.register('idcategoria_financeira')}>
            <option value={0}>Selecione</option>
            {categories?.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Centro de custo"
          error={e.idcentro_custo?.message}
          required
        >
          <Select {...form.register('idcentro_custo')}>
            <option value={0}>Selecione</option>
            {options?.cost_centers.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Filial">
          <Select {...form.register('idfilial')}>
            <option value="">Sem rateio</option>
            {options?.branches.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={type === 'revenue' ? 'Cliente' : 'Fornecedor'}>
          <Select
            {...form.register(
              type === 'revenue' ? 'idcliente' : 'idfornecedor'
            )}
          >
            <option value="">Nao vinculado</option>
            {(type === 'revenue'
              ? options?.customers
              : options?.suppliers
            )?.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Documento">
          <Input {...form.register('documento')} />
        </Field>
      </SimpleGrid>
    );
  if (step === 1)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Controller
          control={form.control}
          name="valor"
          render={({ field }) => (
            <Field label="Valor" error={e.valor?.message} required>
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="Vencimento" error={e.data_vencimento?.message} required>
          <Input type="date" {...form.register('data_vencimento')} />
        </Field>
        <Field
          label="Conta bancaria"
          error={e.idconta_bancaria?.message}
          required
        >
          <Select {...form.register('idconta_bancaria')}>
            <option value={0}>Selecione</option>
            {options?.banks.map(x => (
              <option key={x.id} value={x.id}>
                {x.nome}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Forma de pagamento">
          <Select {...form.register('forma_pagamento')}>
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="transferencia">Transferencia</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="cartao">Cartao</option>
          </Select>
        </Field>
        <Field label="Parcelas">
          <Input
            type="number"
            min={1}
            max={120}
            {...form.register('parcelas_total')}
          />
        </Field>
        <Controller
          control={form.control}
          name="juros"
          render={({ field }) => (
            <Field label="Juros">
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="desconto"
          render={({ field }) => (
            <Field label="Desconto">
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name="multa"
          render={({ field }) => (
            <Field label="Multa">
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Checkbox {...form.register('recorrente')}>
          Lancamento recorrente
        </Checkbox>
        <Field label="Observacoes">
          <Textarea {...form.register('observacoes')} />
        </Field>
      </SimpleGrid>
    );
  return (
    <Box>
      <Flex gap={3} align="center">
        <Flex
          w="40px"
          h="40px"
          align="center"
          justify="center"
          bg="erp.brandSoft"
          color="erp.brandText"
          borderRadius="9px"
        >
          <Target size={18} />
        </Flex>
        <Box>
          <Text fontWeight="700">Revise o lancamento</Text>
          <Text fontSize="11px" color="erp.textMuted">
            Parcelas e auditoria serao geradas automaticamente.
          </Text>
        </Box>
      </Flex>
      <Divider my={5} />
      <Info label="Descricao" value={form.watch('descricao')} />
      <Info label="Valor total" value={formatCurrency(form.watch('valor'))} />
      <Info
        label="Parcelamento"
        value={`${formatNumber(form.watch('parcelas_total'))}x`}
      />
      <Info
        label="Primeiro vencimento"
        value={formatDate(form.watch('data_vencimento'))}
      />
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
