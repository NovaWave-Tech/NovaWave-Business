import {
  Box,
  Flex,
  Grid,
  Icon,
  IconButton,
  Progress,
  SimpleGrid,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Building2,
  CircleDollarSign,
  Clock3,
  HelpCircle,
  LineChart,
  ReceiptText,
  RefreshCw,
  ShoppingCart,
  Store,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';
import { useState, type ReactNode } from 'react';
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
  DeltaPill,
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
import { FilterSelect } from '../../../shared/ui/FilterSelect';
import { Reveal } from '../../../shared/ui/motion';
import {
  formatCurrency,
  formatDate,
  formatDateRange,
  formatDateTime,
  formatMonthYear,
  formatNumber,
  formatPercent,
  isoDaysAgo,
  isoToday,
} from '../../../shared/utils/formatters';
import { getDashboard } from '../services/dashboardService';

function MetaPill({
  icon,
  dotColor,
  children,
}: {
  icon?: LucideIcon;
  dotColor?: string;
  children: ReactNode;
}) {
  return (
    <Flex
      align="center"
      gap={1.5}
      px={2.5}
      py={1}
      border="1px solid"
      borderColor="erp.border"
      borderRadius="full"
      bg="erp.surface"
      flexShrink={0}
    >
      {icon && <Icon as={icon} boxSize="12px" color="erp.textSecondary" />}
      {dotColor && (
        <Box w="6px" h="6px" borderRadius="full" bg={dotColor} flexShrink={0} />
      )}
      <Text
        fontSize="12px"
        fontWeight="500"
        color="erp.textSecondary"
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {children}
      </Text>
    </Flex>
  );
}

function HelpLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <Flex align="center" gap={1.5}>
      <Text textStyle="overline" fontSize="10px" color="erp.textMuted">
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
      px={5}
      py={4}
      transition="background 140ms ease"
      _hover={{ bg: 'erp.hover' }}
      _notLast={{ borderBottom: '1px solid', borderColor: 'erp.border' }}
    >
      <Box minW={0}>
        <HelpLabel label={label} hint={hint} />
        <Text mt={1} textStyle="numeric" fontSize="15px" fontWeight="600">
          {value}
        </Text>
      </Box>
      {delta !== undefined && <DeltaPill delta={delta} />}
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

  const { summary, kpis, goal, branches, evolution, alerts } = dashboard.data;
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
  const totalNetworkRevenue = branches.reduce(
    (sum, branch) => sum + Number(branch.revenue),
    0
  );
  const periodTotal = evolution.reduce(
    (sum, point) => sum + Number(point.revenue),
    0
  );
  const previousTotal = evolution.reduce(
    (sum, point) => sum + Number(point.previous_revenue),
    0
  );
  const evolutionDelta =
    previousTotal > 0
      ? ((periodTotal - previousTotal) / previousTotal) * 100
      : undefined;
  const alertTint: Record<string, string> = {
    warning: 'rgba(253,176,34,.14)',
    danger: 'rgba(249,112,102,.14)',
    info: 'rgba(56,189,248,.14)',
    success: 'rgba(50,213,131,.14)',
  };

  return (
    <Box>
      <PageHeader
        icon={TrendingUp}
        title="Dashboard"
        description="Visao analitica da empresa, com desempenho consolidado por filial."
        breadcrumbs={[{ label: 'Visao geral' }, { label: 'Dashboard' }]}
        actions={
          <Flex
            gap={2}
            w="full"
            align="center"
            wrap={{ base: 'wrap', md: 'nowrap' }}
          >
            <DateRangeField value={range} onChange={setRange} />
            <FilterSelect
              label="Filial em destaque"
              icon={Building2}
              value={branchFilter}
              onChange={setBranchFilter}
              w={{ base: 'full', md: '200px' }}
              options={[
                { value: 'all', label: 'Todas as filiais' },
                ...branches.map(branch => ({
                  value: String(branch.id),
                  label: branch.name,
                })),
              ]}
            />
            <Tooltip label="Atualizar indicadores">
              <IconButton
                aria-label="Atualizar indicadores"
                icon={<RefreshCw size={16} />}
                variant="outline"
                w="40px"
                h="40px"
                flexShrink={0}
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
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                >
                  Empresa monitorada
                </Text>
                <Text textStyle="subtitle1" fontWeight="600" noOfLines={1}>
                  {summary.company_name}
                </Text>
              </Box>
            </Flex>
            <Flex align="center" gap={2} wrap="wrap">
              <MetaPill icon={Building2}>
                {summary.branches_total} filiais
              </MetaPill>
              <MetaPill dotColor="erp.success">
                {summary.branches_with_activity} com movimento
              </MetaPill>
              <Flex
                align="center"
                gap={1.5}
                display={{ base: 'none', md: 'flex' }}
                color="erp.textMuted"
              >
                <Icon as={Clock3} boxSize="12px" />
                <Text
                  fontSize="11px"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  Atualizado em {formatDateTime(summary.last_sync)}
                </Text>
              </Flex>
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
          detail="Vendas do mes (sem juros de atraso)"
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
        <Surface mb={5} overflow="hidden">
          <SectionHeader
            icon={LineChart}
            eyebrow="Projecao de venda da rede"
            title={formatMonthYear()}
            description="Estimativa pelo ritmo de venda; a precisao aumenta conforme o mes avanca."
            action={
              <MetaPill icon={Clock3}>
                {goal.days_remaining} dias restantes
              </MetaPill>
            }
          />

          <Grid
            templateColumns={{
              base: '1fr',
              lg: 'minmax(0,1.15fr) minmax(0,1fr)',
            }}
          >
            <Box
              p={5}
              borderRight={{ base: 'none', lg: '1px solid' }}
              borderBottom={{ base: '1px solid', lg: 'none' }}
              borderColor="erp.border"
            >
              <Flex align="center" justify="space-between" gap={3} wrap="wrap">
                <HelpLabel
                  label="Venda realizada no mes"
                  hint="Total ja faturado pela rede na competencia atual."
                />
                <MetaPill icon={Target}>
                  Meta {formatCurrency(goal.target)}
                </MetaPill>
              </Flex>
              <Text
                mt={1.5}
                textStyle="numeric"
                fontSize={{ base: '30px', md: '36px' }}
                fontWeight="600"
                lineHeight="1.1"
              >
                {formatCurrency(goal.sold)}
              </Text>

              <Progress
                mt={5}
                value={Math.min(goal.percentage, 100)}
                size="sm"
                colorScheme={goal.percentage >= 100 ? 'green' : 'blue'}
                borderRadius="full"
                bg="erp.hover"
              />
              <Flex mt={2} justify="space-between" gap={3} wrap="wrap">
                <Text
                  fontSize="11px"
                  color="erp.textSecondary"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatPercent(goal.percentage)} da meta atingida
                </Text>
                <Text
                  fontSize="11px"
                  color="erp.textSecondary"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  faltam {formatCurrency(goal.remaining)} ·{' '}
                  {formatCurrency(goal.daily_required)}/dia
                </Text>
              </Flex>

              <Flex
                mt={5}
                pt={4}
                borderTop="1px solid"
                borderColor="erp.border"
                align="center"
                justify="space-between"
                gap={4}
              >
                <HelpLabel
                  label="Projecao de fechamento"
                  hint="Estimativa de faturamento ao fim do mes mantido o ritmo atual."
                />
                <Flex align="center" gap={2}>
                  <Text textStyle="numeric" fontSize="16px" fontWeight="600">
                    {formatCurrency(goal.projection)}
                  </Text>
                  <MetaPill
                    dotColor={
                      goal.projection_percentage >= 100
                        ? 'erp.success'
                        : 'erp.warning'
                    }
                  >
                    {formatPercent(goal.projection_percentage)} da meta
                  </MetaPill>
                </Flex>
              </Flex>
            </Box>

            <Box>
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
            </Box>
          </Grid>
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
              action={
                evolution.length ? (
                  <Flex
                    align="center"
                    gap={2}
                    display={{ base: 'none', sm: 'flex' }}
                  >
                    <Text textStyle="numeric" fontSize="15px" fontWeight="600">
                      {formatCurrency(periodTotal)}
                    </Text>
                    {evolutionDelta !== undefined && (
                      <DeltaPill delta={evolutionDelta} />
                    )}
                  </Flex>
                ) : undefined
              }
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
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      iconSize={7}
                      wrapperStyle={{ fontSize: 11, paddingBottom: 12 }}
                    />
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
              action={
                alerts.length ? (
                  <MetaPill dotColor="erp.warning">
                    {alerts.length} {alerts.length === 1 ? 'item' : 'itens'}
                  </MetaPill>
                ) : undefined
              }
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
                      w="32px"
                      h="32px"
                      align="center"
                      justify="center"
                      borderRadius="9px"
                      bg={alertTint[alert.type] ?? 'erp.surfaceSubtle'}
                      color={`erp.${alert.type}`}
                      flexShrink={0}
                    >
                      <AlertTriangle size={15} />
                    </Flex>
                    <Box minW={0}>
                      <Text textStyle="subtitle2" fontWeight="600">
                        {alert.title}
                      </Text>
                      <Text mt={0.5} fontSize="12px" color="erp.textSecondary">
                        {alert.description}
                      </Text>
                      <Text
                        mt={1}
                        fontSize="11px"
                        color="erp.textMuted"
                        sx={{ fontVariantNumeric: 'tabular-nums' }}
                      >
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

      <Reveal index={3}>
        <Surface overflow="hidden">
          <SectionHeader
            icon={Trophy}
            eyebrow="Desempenho da rede"
            title="Ranking por venda"
            description="Filiais ordenadas pelo valor vendido no mes."
            action={
              <MetaPill icon={Building2}>
                {visibleBranches.length}{' '}
                {visibleBranches.length === 1 ? 'filial' : 'filiais'}
              </MetaPill>
            }
          />
          {visibleBranches.length ? (
            <Box maxH="520px" overflowY="auto">
              <Grid
                display={{ base: 'none', md: 'grid' }}
                templateColumns="44px minmax(0,1.4fr) 140px 130px 120px 100px"
                gap={3}
                px={5}
                py={2.5}
                bg="erp.surfaceSubtle"
                borderBottom="1px solid"
                borderColor="erp.border"
                position="sticky"
                top={0}
                zIndex={1}
              >
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                >
                  #
                </Text>
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                >
                  Filial
                </Text>
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                  textAlign="right"
                >
                  Vendido
                </Text>
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                  textAlign="right"
                >
                  Meta
                </Text>
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                  textAlign="right"
                >
                  Participacao
                </Text>
                <Text
                  textStyle="overline"
                  fontSize="10px"
                  color="erp.textMuted"
                  textAlign="right"
                >
                  Crescimento
                </Text>
              </Grid>
              {visibleBranches.map((branch, index) => (
                <Grid
                  key={branch.id}
                  templateColumns={{
                    base: '36px minmax(0,1fr)',
                    md: '44px minmax(0,1.4fr) 140px 130px 120px 100px',
                  }}
                  gap={3}
                  alignItems="center"
                  px={5}
                  py={3.5}
                  transition="background 140ms ease"
                  _hover={{ bg: 'erp.hover' }}
                  _notLast={{
                    borderBottom: '1px solid',
                    borderColor: 'erp.border',
                  }}
                >
                  <Flex
                    w="30px"
                    h="30px"
                    align="center"
                    justify="center"
                    borderRadius="8px"
                    bg={index < 3 ? 'erp.brandSoft' : 'erp.surfaceSubtle'}
                    border="1px solid"
                    borderColor={index < 3 ? 'erp.brandBorder' : 'erp.border'}
                    color={index < 3 ? 'erp.brandText' : 'erp.textSecondary'}
                    fontSize="13px"
                    fontWeight="700"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {index + 1}
                  </Flex>
                  <Box minW={0}>
                    <Text textStyle="subtitle2" fontWeight="600" noOfLines={1}>
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
                  <Text
                    display={{ base: 'none', md: 'block' }}
                    textAlign="right"
                    textStyle="numeric"
                    fontSize="13px"
                    fontWeight="600"
                  >
                    {formatCurrency(branch.revenue)}
                  </Text>
                  <Text
                    display={{ base: 'none', md: 'block' }}
                    textAlign="right"
                    fontSize="12px"
                    color={branch.target ? 'erp.text' : 'erp.textMuted'}
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {branch.target
                      ? `${formatPercent(branch.target_percentage)} da meta`
                      : 'Sem meta'}
                  </Text>
                  <Text
                    display={{ base: 'none', md: 'block' }}
                    textAlign="right"
                    fontSize="12px"
                    color="erp.textSecondary"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {totalNetworkRevenue > 0
                      ? formatPercent(
                          (branch.revenue / totalNetworkRevenue) * 100
                        )
                      : '-'}
                  </Text>
                  <Flex
                    display={{ base: 'none', md: 'flex' }}
                    justify="flex-end"
                  >
                    <DeltaPill delta={branch.growth} />
                  </Flex>
                  <Flex
                    display={{ base: 'flex', md: 'none' }}
                    gridColumn="2"
                    justify="space-between"
                    gap={3}
                  >
                    <Text textStyle="numeric" fontSize="11px" fontWeight="600">
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
    </Box>
  );
}
