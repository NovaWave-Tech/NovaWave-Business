import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Icon,
  SimpleGrid,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  CreditCard,
  Plus,
  ShieldAlert,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useNavigate } from 'react-router-dom';
import {
  MetricCard,
  EmptyState,
  PageHeader,
  PanelHeader,
  ErrorState,
  StatusBadge,
  Surface,
} from '../components/PlatformUI';
import { platformApi } from '../services/platformApi';
import { platformTokens } from '../theme/platformTokens';
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from '../../../shared/utils/formatters';

type DashboardData = {
  metrics: Record<string, string>;
  growth: { mes: string; empresas: string; receita: string }[];
  recent_companies: {
    idempresa: number;
    nome_fantasia: string;
    razao_social: string;
    situacao: number;
    criado_em: string;
  }[];
  expiring_subscriptions: {
    idassinatura: number;
    nome_fantasia: string;
    plano: string;
    data_proxima_cobranca: string;
    valor_atual: string;
    status: number;
  }[];
};
export default function PlatformDashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['platform-dashboard'],
    queryFn: async () =>
      (await platformApi.get<{ data: DashboardData }>('/dashboard')).data.data,
  });
  const metrics = data?.metrics;
  const chartData =
    data?.growth.map(item => ({
      ...item,
      empresas: Number(item.empresas),
      receita: Number(item.receita),
    })) || [];
  const hasAlerts =
    Number(metrics?.empresas_bloqueadas || 0) +
      Number(metrics?.assinaturas_vencidas || 0) >
    0;

  if (isError) {
    return (
      <Box>
        <PageHeader
          title="Dashboard"
          description="Visao consolidada da operacao NovaWave."
        />
        <Surface>
          <ErrorState retry={() => void refetch()} />
        </Surface>
      </Box>
    );
  }

  return (
    <Box w="full" minW={0}>
      <PageHeader
        title="Dashboard"
        description="Visao consolidada da operacao NovaWave."
      />
      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={4} mb={5}>
        <MetricCard
          label="Empresas ativas"
          value={formatNumber(metrics?.empresas_ativas)}
          icon={Building2}
          color={platformTokens.colors.primary}
          detail={`${formatNumber(metrics?.novos_clientes_mes)} novas neste mes`}
          loading={isLoading}
        />
        <MetricCard
          label="Receita recorrente"
          value={formatCurrency(metrics?.mrr)}
          icon={CircleDollarSign}
          color={platformTokens.colors.success}
          detail={`${formatCurrency(metrics?.arr)} projetado ao ano`}
          loading={isLoading}
        />
        <MetricCard
          label="Assinaturas ativas"
          value={formatNumber(metrics?.assinaturas_ativas)}
          icon={CreditCard}
          color={platformTokens.colors.indigo}
          detail={`${metrics?.empresas_teste || 0} empresas em teste`}
          loading={isLoading}
        />
        <MetricCard
          label="Usuarios ativos"
          value={metrics?.usuarios_totais || 0}
          icon={Users}
          color={platformTokens.colors.purple}
          detail={`${metrics?.filiais_totais || 0} filiais na plataforma`}
          loading={isLoading}
        />
      </SimpleGrid>

      <Grid
        templateColumns={{
          base: '1fr',
          xl: 'minmax(0,1.65fr) minmax(300px,.75fr)',
        }}
        gap={5}
        mb={5}
      >
        <GridItem minW={0}>
          <Surface overflow="hidden" minW={0}>
            <PanelHeader
              title="Crescimento da plataforma"
              description="Empresas adicionadas e receita contratada nos ultimos seis meses"
            />
            <Box p={5} h="330px">
              {isLoading ? (
                <Skeleton h="100%" />
              ) : chartData.length === 0 ? (
                <EmptyState
                  title="Sem historico de crescimento"
                  description="Os indicadores aparecerao quando houver dados consolidados."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid
                      stroke={platformTokens.colors.border}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="mes"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: platformTokens.colors.muted, fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="left"
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                      tick={{ fill: platformTokens.colors.muted, fontSize: 11 }}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={value => `${Number(value) / 1000}k`}
                      tick={{ fill: platformTokens.colors.muted, fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        border: `1px solid ${platformTokens.colors.border}`,
                        borderRadius: platformTokens.radii.surface,
                        boxShadow: platformTokens.shadows.floating,
                      }}
                      formatter={(value, name) =>
                        name === 'Receita'
                          ? formatCurrency(Number(value))
                          : Number(value)
                      }
                    />
                    <Bar
                      yAxisId="left"
                      dataKey="empresas"
                      name="Empresas"
                      fill={platformTokens.colors.primary}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={28}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="receita"
                      name="Receita"
                      stroke={platformTokens.colors.indigo}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'white', strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </Box>
          </Surface>
        </GridItem>
        <GridItem>
          <VStack spacing={5} align="stretch" h="full">
            <Surface p={5}>
              <Text fontSize="sm" fontWeight="700">
                Acoes rapidas
              </Text>
              <VStack align="stretch" spacing={2} mt={4}>
                <Button
                  justifyContent="flex-start"
                  leftIcon={<Plus size={16} />}
                  onClick={() => navigate('/platform/empresas/nova')}
                >
                  Nova empresa
                </Button>
                <Button
                  variant="outline"
                  justifyContent="flex-start"
                  leftIcon={<CreditCard size={16} />}
                  onClick={() => navigate('/platform/planos')}
                >
                  Gerenciar planos
                </Button>
                <Button
                  variant="ghost"
                  justifyContent="flex-start"
                  leftIcon={<Users size={16} />}
                  onClick={() => navigate('/platform/usuarios')}
                >
                  Administradores
                </Button>
              </VStack>
            </Surface>
            <Surface
              p={5}
              flex="1"
              borderColor={
                hasAlerts
                  ? platformTokens.colors.dangerBorder
                  : platformTokens.colors.border
              }
            >
              <Flex align="center" gap={2}>
                <Icon
                  as={hasAlerts ? ShieldAlert : Sparkles}
                  boxSize="18px"
                  color={
                    hasAlerts
                      ? platformTokens.colors.danger
                      : platformTokens.colors.success
                  }
                />
                <Text fontSize="sm" fontWeight="700">
                  Alertas importantes
                </Text>
              </Flex>
              {isLoading ? (
                <Skeleton h="80px" mt={4} />
              ) : hasAlerts ? (
                <VStack align="stretch" spacing={3} mt={4}>
                  <Flex justify="space-between">
                    <Text
                      fontSize="sm"
                      color={platformTokens.colors.textSecondary}
                    >
                      Empresas bloqueadas
                    </Text>
                    <Text fontWeight="750" color={platformTokens.colors.danger}>
                      {metrics?.empresas_bloqueadas}
                    </Text>
                  </Flex>
                  <Flex justify="space-between">
                    <Text
                      fontSize="sm"
                      color={platformTokens.colors.textSecondary}
                    >
                      Assinaturas vencidas
                    </Text>
                    <Text
                      fontWeight="750"
                      color={platformTokens.colors.warning}
                    >
                      {metrics?.assinaturas_vencidas}
                    </Text>
                  </Flex>
                  <Button
                    size="sm"
                    variant="outline"
                    rightIcon={<ArrowRight size={14} />}
                    onClick={() => navigate('/platform/assinaturas')}
                  >
                    Revisar assinaturas
                  </Button>
                </VStack>
              ) : (
                <Text mt={4} fontSize="sm" color={platformTokens.colors.muted}>
                  Nenhuma pendencia critica no momento.
                </Text>
              )}
            </Surface>
          </VStack>
        </GridItem>
      </Grid>

      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={5}>
        {[
          ['Empresas em teste', metrics?.empresas_teste || 0],
          ['Assinaturas vencidas', metrics?.assinaturas_vencidas || 0],
          ['Filiais ativas', metrics?.filiais_totais || 0],
          ['Vendas processadas', metrics?.vendas_processadas || 0],
        ].map(([label, value]) => (
          <Surface key={label} px={4} py={3.5}>
            <Text fontSize="xs" color={platformTokens.colors.muted}>
              {label}
            </Text>
            <Text mt={1} fontSize="lg" fontWeight="750">
              {value}
            </Text>
          </Surface>
        ))}
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 1fr' }} gap={5}>
        <Surface overflow="hidden">
          <PanelHeader
            title="Empresas recentes"
            description="Ultimos ambientes provisionados"
            action={
              <Button
                size="xs"
                variant="ghost"
                rightIcon={<ArrowRight size={13} />}
                onClick={() => navigate('/platform/empresas')}
              >
                Ver todas
              </Button>
            }
          />
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Empresa</Th>
                  <Th>Status</Th>
                  <Th>Cadastro</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data?.recent_companies.map(item => (
                  <Tr
                    key={item.idempresa}
                    cursor="pointer"
                    onClick={() =>
                      navigate(`/platform/empresas/${item.idempresa}`)
                    }
                  >
                    <Td>
                      <Text fontWeight="650">{item.nome_fantasia}</Text>
                      <Text fontSize="xs" color={platformTokens.colors.muted}>
                        {item.razao_social}
                      </Text>
                    </Td>
                    <Td>
                      <StatusBadge value={item.situacao} />
                    </Td>
                    <Td whiteSpace="nowrap">{formatDate(item.criado_em)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Surface>
        <Surface overflow="hidden">
          <PanelHeader
            title="Proximas cobrancas"
            description="Assinaturas que exigem acompanhamento"
            action={
              <Button
                size="xs"
                variant="ghost"
                rightIcon={<ArrowRight size={13} />}
                onClick={() => navigate('/platform/assinaturas')}
              >
                Ver todas
              </Button>
            }
          />
          <Box overflowX="auto">
            <Table variant="simple" size="sm">
              <Thead>
                <Tr>
                  <Th>Empresa</Th>
                  <Th>Plano</Th>
                  <Th>Vencimento</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data?.expiring_subscriptions.map(item => (
                  <Tr key={item.idassinatura}>
                    <Td fontWeight="650">{item.nome_fantasia}</Td>
                    <Td>{item.plano}</Td>
                    <Td whiteSpace="nowrap">
                      {formatDate(item.data_proxima_cobranca)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Surface>
      </Grid>
    </Box>
  );
}
