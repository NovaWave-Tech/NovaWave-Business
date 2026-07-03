import {
  Badge,
  Box,
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  SimpleGrid,
  Skeleton,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Boxes,
  BriefcaseBusiness,
  Building2,
  Download,
  FileBarChart,
  FileSpreadsheet,
  FileText,
  Heart,
  History,
  Package,
  Printer,
  ReceiptText,
  Search,
  Share2,
  ShoppingCart,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { PageHeader, PageSkeleton, Surface } from '../../../shared/ui/ErpUI';
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatNumber,
  formatShortDate,
} from '../../../shared/utils/formatters';
import {
  reportFilterSchema,
  type ReportFilters,
} from '../schemas/reportSchema';
import {
  exportReportExcel,
  exportReportPdf,
} from '../services/reportExportService';
import { getReportCatalog, getReportPreview } from '../services/reportService';

type ReportDefinition = {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: typeof FileBarChart;
  uses: number;
  last: string | null;
};
const reportIcons: Record<string, typeof FileBarChart> = {
  executive: Sparkles,
  finance: ReceiptText,
  sales: ShoppingCart,
  customers: Users,
  products: Package,
  stock: Boxes,
  purchases: BriefcaseBusiness,
};
const fallbackReport: ReportDefinition = {
  slug: 'executive',
  name: 'Resumo executivo',
  description: 'Visao consolidada dos principais indicadores da empresa.',
  category: 'Executivo',
  icon: Sparkles,
  uses: 0,
  last: null,
};
const storage = {
  favorites: 'novawave:reports:favorites',
  history: 'novawave:reports:history',
};
const lightReportTokens = {
  '--chakra-colors-erp-canvas': '#F8FAFC',
  '--chakra-colors-erp-sidebar': '#FFFFFF',
  '--chakra-colors-erp-surface': '#FFFFFF',
  '--chakra-colors-erp-surface-subtle': '#F8FAFC',
  '--chakra-colors-erp-hover': '#F1F5F9',
  '--chakra-colors-erp-border': '#E2E8F0',
  '--chakra-colors-erp-border-strong': '#CBD5E1',
  '--chakra-colors-erp-text': '#0F172A',
  '--chakra-colors-erp-text-secondary': '#64748B',
  '--chakra-colors-erp-text-muted': '#94A3B8',
  '--chakra-colors-erp-brand-soft': '#F3F6FF',
  '--chakra-colors-erp-brand-border': '#C9D7FF',
  '--chakra-colors-erp-brand-text': '#1D4ED8',
};

export default function ReportsPage() {
  const drawer = useDisclosure();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() =>
    read(storage.favorites, [])
  );
  const [history, setHistory] = useState<
    Array<{ name: string; date: string; format: string }>
  >(() => read(storage.history, []));
  const [selected, setSelected] = useState<ReportDefinition>(fallbackReport);
  const catalog = useQuery({
    queryKey: ['reports-catalog'],
    queryFn: getReportCatalog,
  });
  const reports = useMemo<ReportDefinition[]>(
    () =>
      (catalog.data?.reports ?? []).map(report => ({
        ...report,
        icon: reportIcons[report.slug] ?? FileBarChart,
      })),
    [catalog.data?.reports]
  );
  const form = useForm<ReportFilters>({
    resolver: zodResolver(reportFilterSchema),
    defaultValues: { start: dateOffset(-29), end: dateOffset(0), branch: '' },
  });
  const filters = form.watch();
  const preview = useQuery({
    queryKey: ['report-preview', selected.slug, filters],
    queryFn: () => getReportPreview(selected.slug, filters),
    enabled: drawer.isOpen,
    placeholderData: previous => previous,
  });
  const visible = useMemo(
    () =>
      reports.filter(
        report =>
          `${report.name} ${report.description} ${report.category}`
            .toLowerCase()
            .includes(search.toLowerCase()) &&
          (category === 'all' || report.category === category) &&
          (!onlyFavorites || favorites.includes(report.slug))
      ),
    [reports, search, category, onlyFavorites, favorites]
  );
  const open = (report: ReportDefinition) => {
    setSelected(report);
    drawer.onOpen();
  };
  const favorite = (slug: string) => {
    const next = favorites.includes(slug)
      ? favorites.filter(item => item !== slug)
      : [...favorites, slug];
    setFavorites(next);
    localStorage.setItem(storage.favorites, JSON.stringify(next));
  };
  const generated = (format: string) => {
    const next = [
      { name: selected.name, date: new Date().toLocaleString('pt-BR'), format },
      ...history,
    ].slice(0, 8);
    setHistory(next);
    localStorage.setItem(storage.history, JSON.stringify(next));
    toast({
      title: `${format} gerado com sucesso`,
      status: 'success',
      position: 'top-right',
    });
  };
  if (catalog.isLoading) return <PageSkeleton />;
  const mainReport = reports[0] ?? fallbackReport;

  return (
    <Box bg="erp.canvas" minH="100%" color="erp.text" sx={lightReportTokens}>
      <PageHeader
        title="Relatorios"
        description="Visualize, analise e exporte informacoes estrategicas da empresa."
        icon={FileBarChart}
        actions={
          <Button
            leftIcon={<Sparkles size={16} />}
            onClick={() => open(mainReport)}
          >
            Gerar relatorio
          </Button>
        }
      />
      <SimpleGrid columns={{ base: 2, md: 3, xl: 6 }} spacing={3} mb={5}>
        {[
          ['Disponiveis', reports.length, FileBarChart],
          [
            'Mais utilizados',
            reports.reduce((max, report) => Math.max(max, report.uses), 0),
            BarChart3,
          ],
          ['Exportacoes no mes', history.length, Download],
          [
            'PDFs gerados',
            history.filter(x => x.format === 'PDF').length,
            FileText,
          ],
          [
            'Excels gerados',
            history.filter(x => x.format === 'Excel').length,
            FileSpreadsheet,
          ],
          ['Favoritos', favorites.length, Heart],
        ].map(([label, value, KpiIcon]) => (
          <Surface key={String(label)} p={4}>
            <Flex justify="space-between">
              <Stat>
                <StatLabel color="erp.textSecondary" fontSize="11px">
                  {String(label)}
                </StatLabel>
                <StatNumber fontSize="24px">
                  {formatNumber(Number(value))}
                </StatNumber>
              </Stat>
              <Icon
                as={KpiIcon as typeof FileBarChart}
                color="brand.500"
                boxSize="18px"
              />
            </Flex>
          </Surface>
        ))}
      </SimpleGrid>
      <Surface p={4} mb={5}>
        <Flex gap={3} wrap="wrap">
          <InputGroup flex="1" minW="260px">
            <InputLeftElement>
              <Search size={16} />
            </InputLeftElement>
            <Input
              placeholder="Pesquisar relatorios..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </InputGroup>
          <Select
            w={{ base: 'full', md: '190px' }}
            value={category}
            onChange={e => setCategory(e.target.value)}
          >
            <option value="all">Todas as categorias</option>
            {[...new Set(reports.map(x => x.category))].map(x => (
              <option key={x}>{x}</option>
            ))}
          </Select>
          <Checkbox
            isChecked={onlyFavorites}
            onChange={e => setOnlyFavorites(e.target.checked)}
          >
            Somente favoritos
          </Checkbox>
        </Flex>
      </Surface>
      <Flex justify="space-between" align="end" mb={3}>
        <Box>
          <Heading fontSize="18px">Biblioteca de relatorios</Heading>
          <Text color="erp.textSecondary" fontSize="sm">
            Modelos prontos para analise e decisao.
          </Text>
        </Box>
        <Badge colorScheme="blue">{visible.length} modelos</Badge>
      </Flex>
      {visible.length > 0 ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={4}>
          {visible.map((report, index) => (
            <Box
              as={motion.div}
              key={report.slug}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={`${0.15 + index * 0.03}s`}
            >
              <Surface p={5} interactive minH="230px">
                <Flex justify="space-between">
                  <Flex
                    w="40px"
                    h="40px"
                    bg="erp.brandSoft"
                    color="brand.500"
                    borderRadius="9px"
                    align="center"
                    justify="center"
                  >
                    <Icon as={report.icon} boxSize="19px" />
                  </Flex>
                  <Tooltip label="Favoritar">
                    <IconButton
                      aria-label="Favoritar"
                      variant="ghost"
                      icon={
                        <Star
                          size={17}
                          fill={
                            favorites.includes(report.slug)
                              ? 'currentColor'
                              : 'none'
                          }
                        />
                      }
                      color={
                        favorites.includes(report.slug)
                          ? 'brand.500'
                          : 'erp.textMuted'
                      }
                      onClick={() => favorite(report.slug)}
                    />
                  </Tooltip>
                </Flex>
                <Badge mt={4} colorScheme="blue" variant="subtle">
                  {report.category}
                </Badge>
                <Heading mt={2} fontSize="16px">
                  {report.name}
                </Heading>
                <Text
                  mt={1}
                  color="erp.textSecondary"
                  fontSize="13px"
                  minH="40px"
                >
                  {report.description}
                </Text>
                <Flex
                  mt={4}
                  justify="space-between"
                  color="erp.textMuted"
                  fontSize="11px"
                >
                  <Text>{formatNumber(report.uses)} registros base</Text>
                  <Text>
                    {report.last ? formatDate(report.last) : 'Sem movimento'}
                  </Text>
                </Flex>
                <Flex mt={4} gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    flex="1"
                    onClick={() => open(report)}
                  >
                    Visualizar
                  </Button>
                  <Button size="sm" flex="1" onClick={() => open(report)}>
                    Gerar
                  </Button>
                </Flex>
              </Surface>
            </Box>
          ))}
        </SimpleGrid>
      ) : (
        <Surface p={8}>
          <Text fontWeight="700">Nenhum relatorio encontrado</Text>
          <Text mt={1} color="erp.textSecondary" fontSize="sm">
            Ajuste a pesquisa ou remova o filtro de favoritos.
          </Text>
        </Surface>
      )}
      {history.length > 0 && (
        <Surface mt={6}>
          <Flex
            p={4}
            borderBottom="1px solid"
            borderColor="erp.border"
            align="center"
            gap={2}
          >
            <History size={16} />
            <Heading fontSize="15px">Historico recente</Heading>
          </Flex>
          <Stack spacing={0}>
            {history.slice(0, 5).map((item, index) => (
              <Flex
                key={`${item.date}-${index}`}
                px={4}
                py={3}
                borderBottom={index < 4 ? '1px solid' : undefined}
                borderColor="erp.border"
                justify="space-between"
              >
                <Box>
                  <Text fontSize="sm" fontWeight="600">
                    {item.name}
                  </Text>
                  <Text fontSize="xs" color="erp.textMuted">
                    {item.date}
                  </Text>
                </Box>
                <Badge>{item.format}</Badge>
              </Flex>
            ))}
          </Stack>
        </Surface>
      )}

      <Drawer
        isOpen={drawer.isOpen}
        placement="right"
        onClose={drawer.onClose}
        size="full"
      >
        <DrawerOverlay bg="blackAlpha.700" backdropFilter="blur(2px)" />
        <DrawerContent bg="erp.canvas" color="erp.text" sx={lightReportTokens}>
          <DrawerCloseButton />
          <DrawerHeader
            bg="erp.surface"
            borderBottom="1px solid"
            borderColor="erp.border"
          >
            <Flex align="center" gap={3}>
              <Icon as={selected.icon} color="brand.500" />
              <Box>
                <Heading fontSize="20px">{selected.name}</Heading>
                <Text fontSize="xs" color="erp.textSecondary">
                  Pre-visualizacao executiva
                </Text>
              </Box>
            </Flex>
          </DrawerHeader>
          <DrawerBody bg="erp.canvas" p={{ base: 3, lg: 6 }}>
            <Grid
              templateColumns={{ base: '1fr', lg: '250px minmax(0,1fr)' }}
              gap={5}
            >
              <Surface p={4} alignSelf="start">
                <Heading fontSize="14px" mb={4}>
                  Filtros do relatorio
                </Heading>
                <Stack spacing={4}>
                  <FormControl>
                    <FormLabel fontSize="xs">Filial</FormLabel>
                    <Select {...form.register('branch')}>
                      <option value="">Todas as filiais</option>
                      {catalog.data?.branches.map(x => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs">Data inicial</FormLabel>
                    <Input type="date" {...form.register('start')} />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="xs">Data final</FormLabel>
                    <Input type="date" {...form.register('end')} />
                  </FormControl>
                  <Button
                    variant="outline"
                    onClick={() =>
                      form.reset({
                        start: dateOffset(-29),
                        end: dateOffset(0),
                        branch: '',
                      })
                    }
                  >
                    Limpar filtros
                  </Button>
                  <Box borderTop="1px solid" borderColor="erp.border" pt={4}>
                    <Text
                      fontSize="10px"
                      fontWeight="700"
                      color="erp.textMuted"
                      textTransform="uppercase"
                      mb={3}
                    >
                      Exportar e compartilhar
                    </Text>
                    <Stack>
                      <Button
                        leftIcon={<FileSpreadsheet size={16} />}
                        isDisabled={!preview.data}
                        onClick={async () => {
                          if (preview.data) {
                            await exportReportExcel(
                              selected.name,
                              preview.data
                            );
                            generated('Excel');
                          }
                        }}
                      >
                        Exportar Excel
                      </Button>
                      <Button
                        variant="outline"
                        leftIcon={<FileText size={16} />}
                        isDisabled={!preview.data}
                        onClick={async () => {
                          if (preview.data) {
                            await exportReportPdf(selected.name, preview.data);
                            generated('PDF');
                          }
                        }}
                      >
                        Exportar PDF
                      </Button>
                      <Button
                        variant="ghost"
                        leftIcon={<Printer size={16} />}
                        onClick={() => window.print()}
                      >
                        Imprimir
                      </Button>
                      <Button
                        variant="ghost"
                        leftIcon={<Share2 size={16} />}
                        isDisabled
                      >
                        Compartilhar
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </Surface>
              <Box minW={0}>
                {preview.isLoading ? (
                  <Stack>
                    <Skeleton h="110px" />
                    <Skeleton h="300px" />
                  </Stack>
                ) : preview.data ? (
                  <ReportView title={selected.name} data={preview.data} />
                ) : (
                  <Surface p={8}>
                    <Text>Nao foi possivel carregar a visualizacao.</Text>
                  </Surface>
                )}
              </Box>
            </Grid>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

function ReportView({
  title,
  data,
}: {
  title: string;
  data: Awaited<ReturnType<typeof getReportPreview>>;
}) {
  const columns = Object.keys(data.rows[0] ?? {});
  return (
    <Stack spacing={5}>
      <Surface p={5}>
        <Flex justify="space-between" wrap="wrap" gap={3}>
          <Box>
            <Text
              fontSize="10px"
              color="brand.500"
              fontWeight="700"
              textTransform="uppercase"
            >
              NovaWave Intelligence
            </Text>
            <Heading fontSize="22px" mt={1}>
              {title}
            </Heading>
            <Text fontSize="xs" color="erp.textSecondary">
              {data.meta.company} | {data.meta.branch} |{' '}
              {formatDate(data.meta.start)} a {formatDate(data.meta.end)}
            </Text>
          </Box>
          <Building2 size={30} color="#2563FF" />
        </Flex>
      </Surface>
      <SimpleGrid columns={{ base: 2, xl: 4 }} spacing={3}>
        {[
          ['Faturamento', formatCurrency(data.kpis.revenue)],
          ['Operacoes', formatNumber(data.kpis.orders)],
          ['Ticket medio', formatCurrency(data.kpis.average_ticket)],
          ['Clientes', formatNumber(data.kpis.customers)],
        ].map(([label, value]) => (
          <Surface key={label} p={4}>
            <Text fontSize="11px" color="erp.textSecondary">
              {label}
            </Text>
            <Text mt={1} fontSize="20px" fontWeight="700">
              {value}
            </Text>
          </Surface>
        ))}
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={5}>
        <Surface p={5}>
          <Heading fontSize="14px" mb={4}>
            Evolucao no periodo
          </Heading>
          <Box h="250px">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.chart}>
                <defs>
                  <linearGradient id="reportArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#2563FF" stopOpacity={0.25} />
                    <stop offset="1" stopColor="#2563FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={value => formatShortDate(String(value))}
                  fontSize={10}
                />
                <YAxis
                  tickFormatter={value => formatCompactNumber(Number(value))}
                  fontSize={10}
                />
                <ChartTooltip
                  formatter={value => formatCurrency(Number(value))}
                  contentStyle={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    color: '#0F172A',
                    boxShadow: '0 8px 24px rgba(15,23,42,.08)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#2563FF"
                  fill="url(#reportArea)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Box>
        </Surface>
        <Surface p={5}>
          <Flex gap={3}>
            <Sparkles size={18} color="#2563FF" />
            <Box>
              <Heading fontSize="14px">Resumo executivo</Heading>
              <Text
                mt={3}
                fontSize="sm"
                color="erp.textSecondary"
                lineHeight="1.7"
              >
                {data.summary}
              </Text>
              <SimpleGrid columns={2} mt={5} spacing={3}>
                <Box p={3} bg="erp.surfaceSubtle" borderRadius="8px">
                  <Text fontSize="10px">Recebido</Text>
                  <Text fontWeight="700">
                    {formatCurrency(data.kpis.received)}
                  </Text>
                </Box>
                <Box p={3} bg="erp.surfaceSubtle" borderRadius="8px">
                  <Text fontSize="10px">Pago</Text>
                  <Text fontWeight="700">{formatCurrency(data.kpis.paid)}</Text>
                </Box>
              </SimpleGrid>
            </Box>
          </Flex>
        </Surface>
      </SimpleGrid>
      <Surface overflow="hidden">
        <Flex p={4} justify="space-between">
          <Heading fontSize="14px">Dados detalhados</Heading>
          <Badge>{data.rows.length} registros</Badge>
        </Flex>
        {columns.length > 0 ? (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead bg="erp.surfaceSubtle">
                <Tr>
                  {columns.map(column => (
                    <Th key={column}>{column.replaceAll('_', ' ')}</Th>
                  ))}
                </Tr>
              </Thead>
              <Tbody>
                {data.rows.map((row, index) => (
                  <Tr key={index}>
                    {columns.map(column => (
                      <Td key={column} whiteSpace="nowrap">
                        {cell(column, row[column])}
                      </Td>
                    ))}
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        ) : (
          <Box px={5} pb={5}>
            <Box
              p={5}
              bg="erp.surfaceSubtle"
              border="1px dashed"
              borderColor="erp.border"
              borderRadius="10px"
            >
              <Text fontWeight="700">Nenhum registro encontrado</Text>
              <Text mt={1} fontSize="sm" color="erp.textSecondary">
                Ajuste o periodo ou a filial para visualizar os dados detalhados
                deste relatorio.
              </Text>
            </Box>
          </Box>
        )}
      </Surface>
    </Stack>
  );
}
function cell(key: string, value: string | number | null) {
  if (['total', 'price', 'stock_value'].includes(key))
    return formatCurrency(Number(value));
  if (key.includes('date')) return formatDate(String(value));
  return String(value ?? '-');
}
function dateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
function read<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '') as T;
  } catch {
    return fallback;
  }
}
