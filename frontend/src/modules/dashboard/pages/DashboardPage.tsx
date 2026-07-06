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
import {
  Activity,
  AlertTriangle,
  Banknote,
  Building2,
  CircleDollarSign,
  Clock3,
  HelpCircle,
  LineChart,
  PackagePlus,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Store,
  Target,
  TrendingUp,
  Trophy,
  UserPlus,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  PageSkeleton,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { ChartAreaGradient, PremiumTooltip } from '../../../shared/ui/chart';
import {
  chartAnimation,
  chartColors,
  useChartTheme,
} from '../../../shared/ui/chartTheme';
import {
  DateRangeField,
  type DateRange,
} from '../../../shared/ui/DateRangeField';
import { Reveal } from '../../../shared/ui/motion';
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatDelta,
  formatMonthYear,
  formatNumber,
  formatPercent,
  isoDaysAgo,
  isoToday,
} from '../../../shared/utils/formatters';
import { getDashboard } from '../services/dashboardService';

function HelpLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <Flex align="center" gap={1.5}>
      <Text
        fontSize="10px"
        fontWeight="700"
        color="erp.textMuted"
        textTransform="uppercase"
        letterSpacing=".05em"
      >
        {label}
      </Text>
      {hint && (
        <Tooltip label={hint} hasArrow placement="top">
          <Box as="span" color="erp.textMuted" cursor="help" lineHeight={0}>
            <Icon as={HelpCircle} boxSize="12px" />
          </Box>
        </Tooltip>
      )}
    </Flex>
  );
}

function CompareRow({
  label,
  hint,
  value,
  delta,
}: {
  label: string;
  hint?: string;
  value: string;
  delta?: number;
}) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={4}
      px={4}
      py={3.5}
      bg="erp.surface"
      border="1px solid"
      borderColor="erp.border"
      borderRadius="10px"
    >
      <Box minW={0}>
        <HelpLabel label={label} hint={hint} />
        <Text
          mt={1}
          fontSize="15px"
          fontWeight="700"
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </Text>
      </Box>
      {delta !== undefined && (
        <Badge
          colorScheme={delta >= 0 ? 'green' : 'red'}
          variant="subtle"
          borderRadius="full"
          textTransform="none"
          px={2.5}
          py={1}
          flexShrink={0}
        >
          {formatDelta(delta)}
        </Badge>
      )}
    </Flex>
  );
}

export default function DashboardPage() {
  const [range, setRange] = useState<DateRange>({
    start: isoDaysAgo(30),
    end: isoToday(),
  });
  const [branchFilter, setBranchFilter] = useState('all');
  const dashboard = useQuery({
    queryKey: ['matrix-dashboard', range],
    queryFn: () => getDashboard(range),
    refetchInterval: 60_000,
  });
  const chartTheme = useChartTheme();

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
  const yoyDelta =
    goal.same_month_last_year > 0
      ? ((goal.sold - goal.same_month_last_year) / goal.same_month_last_year) *
        100
      : undefined;
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
            <DateRangeField value={range} onChange={setRange} />
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

      <Reveal>
        <Surface px={5} py={3.5} mb={5}>
          <Flex align="center" justify="space-between" gap={4} wrap="wrap">
            <Flex align="center" gap={3} minW={0}>
              <Flex
                w="38px"
                h="38px"
                align="center"
                justify="center"
                borderRadius="10px"
                bg="erp.brandSoft"
                border="1px solid"
                borderColor="erp.brandBorder"
                color="brand.500"
                flexShrink={0}
              >
                <Store size={18} />
              </Flex>
              <Box minW={0}>
                <Text
                  fontSize="10px"
                  fontWeight="700"
                  color="erp.textMuted"
                  textTransform="uppercase"
                  letterSpacing=".05em"
                >
                  Empresa monitorada
                </Text>
                <Text fontSize="15px" fontWeight="700" noOfLines={1}>
                  {summary.company_name}
                </Text>
              </Box>
            </Flex>
            <Flex align="center" gap={2} wrap="wrap">
              <Badge variant="outline" textTransform="none" px={2.5} py={1}>
                {summary.branches_total} filiais
              </Badge>
              <Badge
                colorScheme="green"
                variant="subtle"
                textTransform="none"
                px={2.5}
                py={1}
              >
                {summary.branches_with_activity} com movimento
              </Badge>
              <Text
                fontSize="11px"
                color="erp.textMuted"
                display={{ base: 'none', md: 'block' }}
              >
                Atualizado em {formatDateTime(summary.last_sync)}
              </Text>
            </Flex>
          </Flex>
        </Surface>
      </Reveal>

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Receita do mes"
          count={kpis.revenue_month}
          format={formatCurrency}
          delta={kpis.revenue_change}
          detail="Faturamento consolidado"
          icon={CircleDollarSign}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Lucro do mes"
          count={kpis.profit_month}
          format={formatCurrency}
          delta={kpis.profit_change}
          detail={`Margem de ${formatPercent(kpis.profit_margin)}`}
          icon={TrendingUp}
        />
        <KpiCard
          index={2}
          tone="info"
          label="Pedidos"
          count={kpis.orders}
          format={formatNumber}
          delta={kpis.orders_change}
          detail="Vendas concluidas"
          icon={ShoppingCart}
        />
        <KpiCard
          index={3}
          tone="neutral"
          label="Ticket medio"
          count={kpis.average_ticket}
          format={formatCurrency}
          detail={`${formatNumber(kpis.customers)} clientes atendidos`}
          icon={ReceiptText}
        />
      </SimpleGrid>

      <Reveal index={1}>
        <Surface mb={5}>
          <Flex
            align="center"
            gap={3}
            px={5}
            py={4}
            borderBottom="1px solid"
            borderColor="erp.border"
          >
            <Flex
              w="40px"
              h="40px"
              align="center"
              justify="center"
              borderRadius="10px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
              color="brand.500"
              flexShrink={0}
            >
              <LineChart size={19} />
            </Flex>
            <Box>
              <Text
                fontSize="10px"
                fontWeight="700"
                color="erp.textMuted"
                textTransform="uppercase"
                letterSpacing=".05em"
              >
                Projecao de venda da rede
              </Text>
              <Text fontSize="17px" fontWeight="700">
                {formatMonthYear()}
              </Text>
            </Box>
          </Flex>

          <Grid
            templateColumns={{
              base: '1fr',
              lg: 'minmax(0,1.3fr) minmax(0,1fr)',
            }}
            gap={5}
            p={5}
          >
            <Box
              bg="erp.surfaceSubtle"
              border="1px solid"
              borderColor="erp.border"
              borderRadius="12px"
              p={5}
            >
              <HelpLabel
                label="Venda realizada no mes"
                hint="Total ja faturado pela rede na competencia atual."
              />
              <Text
                mt={1}
                fontSize={{ base: '30px', md: '38px' }}
                fontWeight="800"
                lineHeight="1.1"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCurrency(goal.sold)}
              </Text>
              <Flex mt={2.5} gap={2} wrap="wrap">
                <Badge variant="outline" textTransform="none" px={2.5} py={1}>
                  {formatPercent(goal.percentage)} da meta
                </Badge>
                <Badge variant="outline" textTransform="none" px={2.5} py={1}>
                  {goal.days_remaining} dias restantes
                </Badge>
              </Flex>

              <Flex mt={6} align="center" justify="space-between" gap={4}>
                <HelpLabel
                  label="Projecao de fechamento"
                  hint="Estimativa de faturamento ao fim do mes mantido o ritmo atual."
                />
                <Text
                  fontSize="15px"
                  fontWeight="800"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatCurrency(goal.projection)}
                </Text>
              </Flex>
              <Progress
                mt={2.5}
                value={Math.min(goal.projection_percentage, 100)}
                size="sm"
                colorScheme={
                  goal.projection_percentage >= 100 ? 'green' : 'blue'
                }
                borderRadius="full"
                bg="erp.hover"
              />
              <Text mt={2} fontSize="11px" color="erp.textSecondary">
                {formatPercent(goal.projection_percentage)} da projecao · faltam{' '}
                {formatCurrency(goal.remaining)} ·{' '}
                {formatCurrency(goal.daily_required)}/dia
              </Text>
            </Box>

            <VStack align="stretch" spacing={3}>
              <CompareRow
                label="Vs mes anterior"
                hint="Faturamento total do mes anterior fechado."
                value={formatCurrency(goal.previous_month)}
                delta={kpis.revenue_change}
              />
              <CompareRow
                label="Vs mesmo mes / ano passado"
                hint="Faturamento no mesmo mes do ano anterior."
                value={formatCurrency(goal.same_month_last_year)}
                delta={yoyDelta}
              />
              <CompareRow
                label="Ritmo esperado no ponto"
                hint="Percentual da meta normalmente vendido ate este ponto do mes."
                value={formatPercent(goal.expected_pace_percentage)}
                delta={goal.percentage - goal.expected_pace_percentage}
              />
            </VStack>
          </Grid>

          <Text px={5} pb={4} fontSize="11px" color="erp.textMuted">
            Estimativa baseada no ritmo de venda do periodo. A precisao aumenta
            conforme o mes avanca.
          </Text>
        </Surface>
      </Reveal>

      <Reveal index={2}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(0,1.6fr) minmax(300px,.5fr)',
          }}
          gap={5}
          mb={5}
        >
          <Surface overflow="hidden">
            <SectionHeader
              icon={Activity}
              eyebrow="Inteligencia comercial"
              title="Evolucao das vendas"
              description={`${formatDateRange(range.start, range.end)} comparado ao periodo anterior`}
            />
            {evolution.length ? (
              <Box h="360px" p={5}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={evolution}
                    margin={{ top: 10, right: 12, left: 4, bottom: 0 }}
                  >
                    <ChartAreaGradient
                      id="dashRevenue"
                      color={chartColors.primary}
                    />
                    <CartesianGrid stroke={chartTheme.grid} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={value => formatDate(String(value))}
                      axisLine={false}
                      tickLine={false}
                      minTickGap={28}
                      tick={chartTheme.axisTick}
                    />
                    <YAxis
                      tickFormatter={value =>
                        formatCurrency(Number(value), { compact: true })
                      }
                      axisLine={false}
                      tickLine={false}
                      width={72}
                      tick={chartTheme.axisTick}
                    />
                    <ChartTooltip
                      cursor={{ stroke: chartColors.primary, strokeWidth: 1 }}
                      content={
                        <PremiumTooltip
                          labelFormatter={value => formatDate(String(value))}
                          valueFormatter={value => formatCurrency(value)}
                        />
                      }
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Periodo atual"
                      stroke={chartColors.primary}
                      strokeWidth={2.5}
                      fill="url(#dashRevenue)"
                      dot={false}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                      {...chartAnimation}
                    />
                    <Line
                      type="monotone"
                      dataKey="previous_revenue"
                      name="Periodo anterior"
                      stroke={chartColors.muted}
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      {...chartAnimation}
                    />
                  </ComposedChart>
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
                    transition="background 140ms ease"
                    _hover={{ bg: 'erp.hover' }}
                  >
                    <Flex
                      w="31px"
                      h="31px"
                      align="center"
                      justify="center"
                      borderRadius="9px"
                      bg="erp.surfaceSubtle"
                      color={`erp.${alert.type}`}
                      flexShrink={0}
                    >
                      <AlertTriangle size={15} />
                    </Flex>
                    <Box>
                      <Text fontSize="12px" fontWeight="700">
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
      </Reveal>

      <Reveal index={3} mb={5}>
        <Surface overflow="hidden">
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
                    md: '44px minmax(0,1fr) 160px 84px',
                  }}
                  gap={3}
                  alignItems="center"
                  py={3}
                  borderBottom={
                    index < visibleBranches.length - 1 ? '1px solid' : undefined
                  }
                  borderColor="erp.border"
                >
                  <Flex
                    w="30px"
                    h="30px"
                    align="center"
                    justify="center"
                    borderRadius="8px"
                    bg="erp.surfaceSubtle"
                    border="1px solid"
                    borderColor="erp.border"
                    color={index < 3 ? 'brand.500' : 'erp.textSecondary'}
                    fontSize="13px"
                    fontWeight="800"
                  >
                    {index + 1}
                  </Flex>
                  <Box minW={0}>
                    <Text fontSize="13px" fontWeight="700" noOfLines={1}>
                      {branch.name}
                    </Text>
                    <Progress
                      mt={2}
                      value={(branch.revenue / maxBranchRevenue) * 100}
                      size="xs"
                      colorScheme="blue"
                      borderRadius="full"
                      bg="erp.hover"
                    />
                  </Box>
                  <Box
                    display={{ base: 'none', md: 'block' }}
                    textAlign="right"
                  >
                    <Text
                      fontSize="13px"
                      fontWeight="800"
                      sx={{ fontVariantNumeric: 'tabular-nums' }}
                    >
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
                    fontWeight="700"
                    color={branch.growth >= 0 ? 'erp.success' : 'erp.danger'}
                  >
                    {formatDelta(branch.growth)}
                  </Text>
                  <Flex
                    display={{ base: 'flex', md: 'none' }}
                    gridColumn="2"
                    justify="space-between"
                    gap={3}
                  >
                    <Text fontSize="11px" fontWeight="700">
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
      </Reveal>

      <Reveal index={4}>
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
                    transition="background 140ms ease"
                    _hover={{ bg: 'erp.hover' }}
                  >
                    <Flex
                      w="32px"
                      h="32px"
                      align="center"
                      justify="center"
                      borderRadius="9px"
                      bg="erp.brandSoft"
                      border="1px solid"
                      borderColor="erp.brandBorder"
                      color="brand.500"
                    >
                      <ActivityIcon size={16} />
                    </Flex>
                    <Box minW={0}>
                      <Text fontSize="12px" fontWeight="700">
                        {activity.title}
                      </Text>
                      <Text fontSize="10px" color="erp.textMuted" noOfLines={1}>
                        {[activity.branch, formatDateTime(activity.occurred_at)]
                          .filter(Boolean)
                          .join(' - ')}
                      </Text>
                    </Box>
                    {activity.value !== null &&
                      activity.value !== undefined && (
                        <Text
                          fontSize="12px"
                          fontWeight="800"
                          sx={{ fontVariantNumeric: 'tabular-nums' }}
                        >
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
      </Reveal>
    </Box>
  );
}
