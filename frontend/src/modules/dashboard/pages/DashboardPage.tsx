import {
  Badge,
  Box,
  Flex,
  Grid,
  Icon,
  IconButton,
  Progress,
  Select,
  SimpleGrid,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  Banknote,
  Building2,
  CircleDollarSign,
  Clock3,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  Store,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  PageSkeleton,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from '../../../shared/utils/formatters';
import {
  getDashboard,
  type DashboardPeriod,
} from '../services/dashboardService';

const MotionBox = motion(Box);
const periods: Record<DashboardPeriod, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  year: 'Ano',
};

function MetricCell({
  label,
  value,
  change,
  tone = 'blue',
}: {
  label: string;
  value: ReactNode;
  change?: number;
  tone?: 'blue' | 'green' | 'neutral';
}) {
  const positive = (change ?? 0) >= 0;
  const backgrounds = {
    blue: 'rgba(47,128,255,.07)',
    green: 'rgba(22,138,91,.07)',
    neutral: 'erp.surfaceSubtle',
  };
  const accents = {
    blue: '#2F80FF',
    green: '#168A5B',
    neutral: '#64748B',
  };
  return (
    <Box
      minH="88px"
      p={3.5}
      bg={backgrounds[tone]}
      border="1px solid"
      borderColor="erp.border"
      borderRadius="12px"
      boxShadow={`inset 3px 0 0 ${accents[tone]}`}
    >
      <Text
        fontSize="10px"
        fontWeight="600"
        color="erp.textMuted"
        textTransform="uppercase"
      >
        {label}
      </Text>
      <Text
        mt={1}
        fontSize="19px"
        lineHeight="25px"
        fontWeight="700"
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Text>
      {change !== undefined && (
        <Flex
          mt={1}
          align="center"
          gap={1}
          color={positive ? 'erp.success' : 'erp.danger'}
        >
          <Icon as={positive ? TrendingUp : TrendingDown} boxSize="11px" />
          <Text fontSize="10px" fontWeight="600">
            {change >= 0 ? '+' : ''}
            {change.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
          </Text>
        </Flex>
      )}
    </Box>
  );
}

function ComparisonRow({
  label,
  value,
  indicator,
}: {
  label: string;
  value: ReactNode;
  indicator?: number;
}) {
  return (
    <Flex
      minH="64px"
      px={4}
      py={3}
      align="center"
      justify="space-between"
      gap={4}
      borderBottom="1px solid"
      borderColor="erp.border"
      _last={{ borderBottom: 0 }}
    >
      <Box>
        <Text fontSize="10px" color="erp.textMuted" textTransform="uppercase">
          {label}
        </Text>
        <Text mt={1} fontSize="13px" fontWeight="600">
          {value}
        </Text>
      </Box>
      {indicator !== undefined && (
        <Badge
          colorScheme={indicator >= 0 ? 'green' : 'red'}
          borderRadius="full"
          textTransform="none"
        >
          {indicator >= 0 ? '+' : ''}
          {indicator.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
        </Badge>
      )}
    </Flex>
  );
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<DashboardPeriod>('30d');
  const [branchFilter, setBranchFilter] = useState('all');
  const dashboard = useQuery({
    queryKey: ['matrix-dashboard', period],
    queryFn: () => getDashboard(period),
    refetchInterval: 60_000,
  });

  if (dashboard.isLoading) return <PageSkeleton />;
  if (dashboard.isError || !dashboard.data)
    return <ErrorState retry={() => void dashboard.refetch()} />;

  const { summary, kpis, goal, branches, evolution, alerts, activities } =
    dashboard.data;
  const visibleBranches =
    branchFilter === 'all'
      ? branches
      : branches.filter(branch => branch.id === Number(branchFilter));
  const maxBranchRevenue = Math.max(
    ...visibleBranches.map(branch => branch.revenue),
    1
  );
  const activityIcons: Record<string, LucideIcon> = {
    sale: ShoppingCart,
    purchase: WalletCards,
    customer: UserPlus,
    product: PackagePlus,
    cash: Banknote,
  };

  return (
    <Box>
      <PageHeader
        icon={TrendingUp}
        title="Dashboard"
        description="Visao analitica da empresa, com desempenho consolidado por filial."
        breadcrumbs={[{ label: 'Visao geral' }, { label: 'Dashboard' }]}
        actions={
          <Flex gap={2} w="full" wrap={{ base: 'wrap', md: 'nowrap' }}>
            <Select
              aria-label="Periodo de analise"
              value={period}
              onChange={event =>
                setPeriod(event.target.value as DashboardPeriod)
              }
              w={{ base: 'full', md: '140px' }}
            >
              {Object.entries(periods).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filial em destaque"
              value={branchFilter}
              onChange={event => setBranchFilter(event.target.value)}
              w={{ base: 'full', md: '180px' }}
            >
              <option value="all">Todas as filiais</option>
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </Select>
            <Tooltip label="Atualizar indicadores">
              <IconButton
                aria-label="Atualizar indicadores"
                icon={<RefreshCw size={17} />}
                variant="outline"
                isLoading={dashboard.isFetching}
                onClick={() => void dashboard.refetch()}
              />
            </Tooltip>
          </Flex>
        }
      />

      <MotionBox
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
      >
        <BrandSurface mb={5}>
          <Grid
            templateColumns={{
              base: '1fr',
              xl: 'minmax(0,1.6fr) minmax(420px,.9fr)',
            }}
          >
            <Flex
              p={{ base: 5, md: 6 }}
              gap={4}
              minH={{ xl: '238px' }}
              bg="erp.surfaceSubtle"
              align="start"
            >
              <Flex
                w="54px"
                h="54px"
                align="center"
                justify="center"
                borderRadius="14px"
                color="brand.500"
                bg="rgba(47,128,255,.08)"
                border="1px solid rgba(47,128,255,.16)"
                flexShrink={0}
              >
                <Store size={25} />
              </Flex>
              <Box>
                <Text
                  fontSize="10px"
                  fontWeight="600"
                  color="erp.textMuted"
                  textTransform="uppercase"
                >
                  Escopo monitorado
                </Text>
                <Text mt={2} fontSize="25px" fontWeight="700">
                  {summary.company_name}
                </Text>
                <Text mt={2} color="erp.textSecondary" fontSize="13px">
                  {summary.branches_with_activity} de {summary.branches_total}{' '}
                  filiais com movimentacao em {periods[period].toLowerCase()}.
                </Text>
                <Flex mt={5} gap={2} wrap="wrap">
                  <Badge colorScheme="blue" textTransform="none">
                    {summary.branches_total} filiais
                  </Badge>
                  <Badge colorScheme="green" textTransform="none">
                    {summary.branches_with_activity} com movimento
                  </Badge>
                  <Badge colorScheme="gray" textTransform="none">
                    {summary.branches_without_activity} sem movimento
                  </Badge>
                </Flex>
                <Text mt={5} fontSize="10px" color="erp.textMuted">
                  Atualizado em {formatDateTime(summary.last_sync)}
                </Text>
              </Box>
            </Flex>

            <Box
              p={{ base: 4, md: 5 }}
              borderLeft={{ xl: '1px solid' }}
              borderTop={{ base: '1px solid', xl: 0 }}
              borderColor="erp.border"
            >
              <Text
                mb={3}
                fontSize="10px"
                fontWeight="600"
                color="erp.textMuted"
                textTransform="uppercase"
              >
                Leitura do periodo
              </Text>
              <SimpleGrid columns={2} spacing={2}>
                <MetricCell
                  label="Receita do dia"
                  value={formatCurrency(kpis.revenue_today)}
                  tone="blue"
                />
                <MetricCell
                  label="Receita do mes"
                  value={formatCurrency(kpis.revenue_month)}
                  change={kpis.revenue_change}
                  tone="blue"
                />
                <MetricCell
                  label="Lucro"
                  value={formatCurrency(kpis.profit_month)}
                  change={kpis.profit_change}
                  tone="green"
                />
                <MetricCell
                  label="Pedidos"
                  value={formatNumber(kpis.orders)}
                  change={kpis.orders_change}
                  tone="neutral"
                />
                <MetricCell
                  label="Ticket medio"
                  value={formatCurrency(kpis.average_ticket)}
                  tone="neutral"
                />
                <MetricCell
                  label="Clientes atendidos"
                  value={formatNumber(kpis.customers)}
                  tone="neutral"
                />
              </SimpleGrid>
            </Box>
          </Grid>
        </BrandSurface>
      </MotionBox>

      <BrandSurface mb={5}>
        <Flex px={5} py={4} align="center" gap={3}>
          <Flex
            w="38px"
            h="38px"
            align="center"
            justify="center"
            borderRadius="10px"
            bg="rgba(47,128,255,.08)"
            color="brand.500"
          >
            <Target size={18} />
          </Flex>
          <Box>
            <Text
              fontSize="10px"
              color="erp.textMuted"
              textTransform="uppercase"
            >
              Projecao de venda da rede
            </Text>
            <Text fontSize="14px" fontWeight="600">
              Competencia atual
            </Text>
          </Box>
        </Flex>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(0,1.4fr) minmax(330px,.6fr)',
          }}
          borderTop="1px solid"
          borderColor="erp.border"
        >
          <Box p={{ base: 5, md: 6 }} bg="rgba(47,128,255,.045)">
            <Text
              fontSize="10px"
              color="erp.textMuted"
              textTransform="uppercase"
            >
              Venda realizada no mes
            </Text>
            <Text
              mt={1}
              fontSize={{ base: '30px', md: '36px' }}
              fontWeight="700"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(goal.sold)}
            </Text>
            <Flex mt={2} gap={2} wrap="wrap">
              <Badge variant="outline" textTransform="none">
                {formatPercent(goal.percentage)} da meta
              </Badge>
              <Badge variant="outline" colorScheme="blue" textTransform="none">
                Margem {formatPercent(kpis.profit_margin)}
              </Badge>
            </Flex>
            <Flex mt={5} justify="space-between" gap={4}>
              <Text
                fontSize="10px"
                color="erp.textMuted"
                textTransform="uppercase"
              >
                Projecao de fechamento
              </Text>
              <Text fontSize="12px" fontWeight="600">
                {formatCurrency(goal.projection)}
              </Text>
            </Flex>
            <Progress
              mt={2}
              value={Math.min(goal.projection_percentage, 100)}
              size="sm"
              colorScheme={goal.projection_percentage >= 100 ? 'green' : 'blue'}
              borderRadius="full"
            />
            <Flex mt={2} justify="space-between" gap={4} wrap="wrap">
              <Text fontSize="11px" color="erp.textSecondary">
                {formatPercent(goal.projection_percentage)} da meta projetada
              </Text>
              <Text fontSize="11px" color="erp.textSecondary">
                Faltam {formatCurrency(goal.remaining)}
              </Text>
            </Flex>
            <Flex mt={4} gap={6} wrap="wrap">
              <Text fontSize="11px" color="erp.textMuted">
                Media necessaria: {formatCurrency(goal.daily_required)}/dia
              </Text>
              <Text fontSize="11px" color="erp.textMuted">
                {goal.days_remaining} dias restantes
              </Text>
            </Flex>
          </Box>
          <Box borderLeft={{ xl: '1px solid' }} borderColor="erp.border">
            <ComparisonRow
              label="Vs mes anterior"
              value={formatCurrency(goal.previous_month)}
              indicator={kpis.revenue_change}
            />
            <ComparisonRow
              label="Vs mesmo mes / ano passado"
              value={formatCurrency(goal.same_month_last_year)}
            />
            <ComparisonRow
              label="Ritmo esperado no mesmo ponto"
              value={formatPercent(goal.expected_pace_percentage)}
              indicator={goal.percentage - goal.expected_pace_percentage}
            />
          </Box>
        </Grid>
      </BrandSurface>

      <Surface overflow="hidden" mb={5}>
        <SectionHeader
          icon={Trophy}
          eyebrow="Desempenho da rede"
          title="Ranking por venda"
          description="Filiais ordenadas pelo valor vendido no mes."
        />
        {visibleBranches.length ? (
          <Box maxH="520px" overflowY="auto" px={{ base: 4, md: 5 }} py={2}>
            {visibleBranches.map((branch, index) => (
              <Grid
                key={branch.id}
                templateColumns={{
                  base: '36px minmax(0,1fr)',
                  md: '42px minmax(0,1fr) 150px 76px',
                }}
                gap={3}
                alignItems="center"
                py={2.5}
                pl={index < 3 ? 2 : 0}
                borderLeft={index < 3 ? '2px solid' : undefined}
                borderLeftColor={
                  index === 0
                    ? 'brand.500'
                    : index === 1
                      ? 'brand.300'
                      : index === 2
                        ? 'brand.200'
                        : undefined
                }
                bg={index === 0 ? 'erp.brandSoft' : 'transparent'}
                borderRadius={index === 0 ? '8px' : 0}
              >
                <Text
                  fontSize="13px"
                  color={index < 3 ? 'erp.brandText' : 'erp.textSecondary'}
                  fontWeight={index < 3 ? '700' : '500'}
                >
                  #{index + 1}
                </Text>
                <Box minW={0}>
                  <Text fontSize="13px" fontWeight="600" noOfLines={1}>
                    {branch.name}
                  </Text>
                  <Progress
                    mt={2}
                    value={(branch.revenue / maxBranchRevenue) * 100}
                    size="sm"
                    colorScheme="blue"
                    borderRadius="full"
                  />
                </Box>
                <Box display={{ base: 'none', md: 'block' }} textAlign="right">
                  <Text fontSize="13px" fontWeight="700">
                    {formatCurrency(branch.revenue)}
                  </Text>
                  <Text fontSize="10px" color="erp.textMuted">
                    {branch.target
                      ? `${formatPercent(branch.target_percentage)} da meta`
                      : 'Meta nao configurada'}
                  </Text>
                </Box>
                <Text
                  display={{ base: 'none', md: 'block' }}
                  textAlign="right"
                  fontSize="11px"
                  fontWeight="600"
                  color={branch.growth >= 0 ? 'erp.success' : 'erp.danger'}
                >
                  {branch.growth >= 0 ? '+' : ''}
                  {branch.growth.toLocaleString('pt-BR', {
                    maximumFractionDigits: 1,
                  })}
                  %
                </Text>
                <Flex
                  display={{ base: 'flex', md: 'none' }}
                  gridColumn="2"
                  justify="space-between"
                  gap={3}
                >
                  <Text fontSize="11px" fontWeight="600">
                    {formatCurrency(branch.revenue)}
                  </Text>
                  <Text fontSize="10px" color="erp.textMuted">
                    {branch.target
                      ? formatPercent(branch.target_percentage)
                      : 'Sem meta'}
                  </Text>
                </Flex>
              </Grid>
            ))}
          </Box>
        ) : (
          <EmptyState
            title="Nenhuma filial encontrada"
            description="O ranking sera exibido quando houver filiais ativas."
            icon={Building2}
          />
        )}
      </Surface>

      <Grid
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0,1.55fr) minmax(300px,.45fr)',
        }}
        gap={5}
        mb={5}
      >
        <Surface overflow="hidden">
          <SectionHeader
            icon={Activity}
            eyebrow="Inteligencia comercial"
            title="Evolucao das vendas"
            description={`Periodo atual comparado aos ${periods[period].toLowerCase()} anteriores`}
          />
          {evolution.length ? (
            <Box h="390px" p={5}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={evolution}
                  margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
                >
                  <CartesianGrid
                    stroke="var(--chakra-colors-erp-border)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={value => formatDate(String(value))}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                    fontSize={11}
                  />
                  <YAxis
                    tickFormatter={value =>
                      formatCurrency(Number(value), { compact: true })
                    }
                    axisLine={false}
                    tickLine={false}
                    width={72}
                    fontSize={11}
                  />
                  <ChartTooltip
                    labelFormatter={value => formatDate(String(value))}
                    formatter={value => formatCurrency(Number(value))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    name="Periodo atual"
                    stroke="#2F80FF"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="previous_revenue"
                    name="Periodo anterior"
                    stroke="#94A3B8"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          ) : (
            <EmptyState
              title="Sem vendas no periodo"
              description="A evolucao aparecera quando houver movimentacao."
              icon={TrendingUp}
            />
          )}
        </Surface>

        <Surface overflow="hidden">
          <SectionHeader
            icon={AlertTriangle}
            eyebrow="Monitoramento"
            title="Alertas"
            description="Pontos que exigem atencao"
          />
          {alerts.length ? (
            <VStack align="stretch" spacing={0}>
              {alerts.map((alert, index) => (
                <Flex
                  key={`${alert.title}-${index}`}
                  p={4}
                  gap={3}
                  borderBottom={
                    index < alerts.length - 1 ? '1px solid' : undefined
                  }
                  borderColor="erp.border"
                >
                  <Flex
                    w="31px"
                    h="31px"
                    align="center"
                    justify="center"
                    borderRadius="8px"
                    bg="erp.surfaceSubtle"
                    color={`erp.${alert.type}`}
                    flexShrink={0}
                  >
                    <AlertTriangle size={15} />
                  </Flex>
                  <Box>
                    <Text fontSize="12px" fontWeight="600">
                      {alert.title}
                    </Text>
                    <Text mt={0.5} fontSize="11px" color="erp.textSecondary">
                      {alert.description}
                    </Text>
                    <Text mt={1} fontSize="10px" color="erp.textMuted">
                      {formatDateTime(alert.occurred_at)}
                    </Text>
                  </Box>
                </Flex>
              ))}
            </VStack>
          ) : (
            <EmptyState
              title="Operacao sob controle"
              description="Nenhum alerta gerencial identificado."
              icon={Target}
            />
          )}
        </Surface>
      </Grid>

      <Surface overflow="hidden">
        <SectionHeader
          icon={Clock3}
          eyebrow="Tempo real"
          title="Atividades recentes"
          description="Movimentacoes em ordem cronologica"
        />
        {activities.length ? (
          <VStack align="stretch" spacing={0}>
            {activities.map((activity, index) => {
              const ActivityIcon = activityIcons[activity.type] || Building2;
              return (
                <Grid
                  key={`${activity.type}-${activity.occurred_at}-${index}`}
                  templateColumns="36px minmax(0,1fr) auto"
                  gap={3}
                  alignItems="center"
                  px={5}
                  py={3.5}
                  borderBottom={
                    index < activities.length - 1 ? '1px solid' : undefined
                  }
                  borderColor="erp.border"
                >
                  <Flex
                    w="32px"
                    h="32px"
                    align="center"
                    justify="center"
                    borderRadius="8px"
                    bg="erp.surfaceSubtle"
                    color="brand.500"
                  >
                    <ActivityIcon size={16} />
                  </Flex>
                  <Box minW={0}>
                    <Text fontSize="12px" fontWeight="600">
                      {activity.title}
                    </Text>
                    <Text fontSize="10px" color="erp.textMuted" noOfLines={1}>
                      {[activity.branch, formatDateTime(activity.occurred_at)]
                        .filter(Boolean)
                        .join(' - ')}
                    </Text>
                  </Box>
                  {activity.value !== null && activity.value !== undefined && (
                    <Text fontSize="12px" fontWeight="700">
                      {formatCurrency(activity.value)}
                    </Text>
                  )}
                </Grid>
              );
            })}
          </VStack>
        ) : (
          <EmptyState
            title="Nenhuma atividade recente"
            description="As movimentacoes relevantes aparecerao aqui."
            icon={CircleDollarSign}
          />
        )}
      </Surface>
    </Box>
  );
}
