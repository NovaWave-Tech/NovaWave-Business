import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Icon,
  IconButton,
  Select,
  SimpleGrid,
  Text,
  Tooltip,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowRight,
  BanknoteArrowDown,
  BanknoteArrowUp,
  Boxes,
  CircleDollarSign,
  PackagePlus,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  PageSkeleton,
  SectionHeader,
  StatusCard,
  Surface,
} from '../../../shared/ui/ErpUI';
import { getDashboard } from '../services/dashboardService';

const money = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    value
  );

export default function DashboardPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState('30d');
  const dashboard = useQuery({
    queryKey: ['erp-dashboard', period],
    queryFn: () => getDashboard(period),
  });
  if (dashboard.isLoading) return <PageSkeleton />;
  if (dashboard.isError || !dashboard.data)
    return <ErrorState retry={() => void dashboard.refetch()} />;

  const {
    indicators,
    recent_sales: sales,
    recent_purchases: purchases,
    financial_history: history = [],
  } = dashboard.data;
  const activities = [
    ...sales.map(item => ({ ...item, type: 'Venda' })),
    ...purchases.map(item => ({ ...item, type: 'Compra' })),
  ].slice(0, 6);
  const alerts = indicators.critical_stock + (indicators.payables > 0 ? 1 : 0);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        description="Acompanhe os principais indicadores e pendencias da operacao."
        breadcrumbs={[{ label: 'Visao geral' }, { label: 'Dashboard' }]}
        actions={
          <Flex gap={2} w="full">
            <Select
              aria-label="Periodo do dashboard"
              value={period}
              onChange={event => setPeriod(event.target.value)}
              w={{ base: 'full', md: '160px' }}
            >
              <option value="30d">Ultimos 30 dias</option>
              <option value="90d">Ultimos 90 dias</option>
              <option value="12m">Ultimos 12 meses</option>
            </Select>
            <Tooltip label="Atualizar dados">
              <IconButton
                aria-label="Atualizar dashboard"
                icon={<RefreshCw size={17} />}
                variant="outline"
                onClick={() => void dashboard.refetch()}
              />
            </Tooltip>
          </Flex>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={5}>
        <MetricCard
          title="Faturamento"
          value={money(indicators.revenue)}
          icon={TrendingUp}
          context="Periodo selecionado"
          trend="Sem comparativo"
          onDetails={() => navigate('/sales')}
        />
        <MetricCard
          title="Lucro estimado"
          value={money(indicators.profit)}
          icon={CircleDollarSign}
          context="Periodo selecionado"
          trend="Sem comparativo"
          onDetails={() => navigate('/finance')}
        />
        <MetricCard
          title="Contas a receber"
          value={money(indicators.receivables)}
          icon={BanknoteArrowUp}
          context="Em aberto"
          onDetails={() => navigate('/finance')}
        />
        <MetricCard
          title="Contas a pagar"
          value={money(indicators.payables)}
          icon={BanknoteArrowDown}
          context="Em aberto"
          trendTone={indicators.payables > 0 ? 'negative' : 'neutral'}
          onDetails={() => navigate('/finance')}
        />
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={5}>
        <StatusCard
          title="Estoque critico"
          value={indicators.critical_stock}
          detail="produtos"
          tone={indicators.critical_stock > 0 ? 'warning' : 'success'}
          icon={Boxes}
        />
        <StatusCard
          title="Vendas recentes"
          value={sales.length}
          detail="registros"
          tone="info"
          icon={ShoppingCart}
        />
        <StatusCard
          title="Pendencias"
          value={alerts}
          detail="exigem atencao"
          tone={alerts > 0 ? 'danger' : 'success'}
          icon={AlertTriangle}
        />
      </SimpleGrid>

      <Grid
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0,1.55fr) minmax(300px,.65fr)',
        }}
        gap={5}
        mb={5}
      >
        <GridItem minW={0}>
          <Surface overflow="hidden">
            <SectionHeader
              title="Evolucao financeira"
              description="Faturamento e lucro no periodo selecionado"
            />
            {history.length > 0 ? (
              <Box h="320px" p={5}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={history}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="erpRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
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
                    <CartesianGrid
                      stroke="var(--chakra-colors-erp-border)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      fontSize={11}
                      tickFormatter={value => `${Number(value) / 1000}k`}
                    />
                    <ChartTooltip formatter={value => money(Number(value))} />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Faturamento"
                      stroke="#2F80FF"
                      strokeWidth={2}
                      fill="url(#erpRevenue)"
                    />
                    <Area
                      type="monotone"
                      dataKey="profit"
                      name="Lucro"
                      stroke="#32D583"
                      strokeWidth={2}
                      fill="transparent"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <EmptyState
                title="Historico ainda indisponivel"
                description="O grafico sera exibido quando houver dados consolidados para o periodo."
                icon={TrendingUp}
              />
            )}
          </Surface>
        </GridItem>
        <GridItem>
          <VStack align="stretch" spacing={5}>
            <Surface p={5}>
              <Text fontSize="14px" fontWeight="600" color="erp.text">
                Atalhos operacionais
              </Text>
              <VStack align="stretch" spacing={2} mt={4}>
                <Button
                  justifyContent="flex-start"
                  leftIcon={<ShoppingCart size={17} />}
                  onClick={() => navigate('/sales')}
                >
                  Nova venda
                </Button>
                <Button
                  variant="outline"
                  justifyContent="flex-start"
                  leftIcon={<UserPlus size={17} />}
                  onClick={() => navigate('/customers')}
                >
                  Cadastrar cliente
                </Button>
                <Button
                  variant="ghost"
                  justifyContent="flex-start"
                  leftIcon={<PackagePlus size={17} />}
                  onClick={() => navigate('/products')}
                >
                  Cadastrar produto
                </Button>
              </VStack>
            </Surface>
            <Surface p={5}>
              <Flex align="center" gap={2}>
                <Icon
                  as={AlertTriangle}
                  boxSize="18px"
                  color={alerts > 0 ? 'erp.warning' : 'erp.success'}
                />
                <Text fontSize="14px" fontWeight="600">
                  Alertas operacionais
                </Text>
              </Flex>
              {alerts > 0 ? (
                <VStack align="stretch" spacing={3} mt={4}>
                  {indicators.critical_stock > 0 && (
                    <Flex justify="space-between">
                      <Text color="erp.textSecondary" fontSize="13px">
                        Estoque critico
                      </Text>
                      <Text color="erp.warning" fontWeight="700">
                        {indicators.critical_stock}
                      </Text>
                    </Flex>
                  )}
                  {indicators.payables > 0 && (
                    <Flex justify="space-between">
                      <Text color="erp.textSecondary" fontSize="13px">
                        Contas a pagar
                      </Text>
                      <Text color="erp.danger" fontWeight="700">
                        {money(indicators.payables)}
                      </Text>
                    </Flex>
                  )}
                </VStack>
              ) : (
                <Text mt={4} color="erp.textSecondary" fontSize="13px">
                  Nenhuma pendencia critica no momento.
                </Text>
              )}
            </Surface>
          </VStack>
        </GridItem>
      </Grid>

      <Surface overflow="hidden">
        <SectionHeader
          title="Atividades recentes"
          description="Ultimas movimentacoes registradas"
          action={
            <Button
              size="xs"
              variant="ghost"
              rightIcon={<ArrowRight size={13} />}
              onClick={() => navigate('/reports')}
            >
              Ver relatorios
            </Button>
          }
        />
        {activities.length > 0 ? (
          <VStack align="stretch" spacing={0}>
            {activities.map((item, index) => (
              <Flex
                key={`${item.type}-${item.id || index}`}
                align="center"
                gap={3}
                px={5}
                py={3.5}
                borderBottom={
                  index < activities.length - 1 ? '1px solid' : 'none'
                }
                borderColor="erp.border"
              >
                <Flex
                  w="34px"
                  h="34px"
                  align="center"
                  justify="center"
                  bg="erp.hover"
                  borderRadius="8px"
                >
                  <Icon
                    as={item.type === 'Venda' ? ShoppingCart : PackagePlus}
                    boxSize="16px"
                    color="brand.400"
                  />
                </Flex>
                <Box flex="1" minW={0}>
                  <Text
                    color="erp.text"
                    fontSize="13px"
                    fontWeight="600"
                    noOfLines={1}
                  >
                    {item.description || item.type}
                  </Text>
                  <Text color="erp.textMuted" fontSize="11px">
                    {item.date || 'Data nao informada'}
                  </Text>
                </Box>
                <Text color="erp.text" fontSize="13px" fontWeight="600">
                  {money(Number(item.value || 0))}
                </Text>
              </Flex>
            ))}
          </VStack>
        ) : (
          <EmptyState
            title="Nenhuma atividade recente"
            description="Vendas, compras e movimentacoes aparecerao aqui."
          />
        )}
      </Surface>
    </Box>
  );
}
