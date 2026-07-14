import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  Icon,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
  Tfoot,
  Th,
  Thead,
  Tooltip,
  Tr,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  HandCoins,
  ListChecks,
  PackageCheck,
  Receipt,
  RefreshCw,
  Search,
  Store,
  UserSearch,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  EmptyState,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { Reveal } from '../../../shared/ui/motion';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  formatPaymentMethod,
} from '../../../shared/utils/formatters';
import { CustomerReceivableSearch } from '../components/CustomerReceivableSearch';
import {
  PaymentReceiptModal,
  type PaymentReceiptData,
} from '../components/PaymentReceiptModal';
import { SettleTitleModal } from '../components/SettleTitleModal';
import {
  TitleItemsModal,
  type ItemsSource,
} from '../components/TitleItemsModal';
import { TransactionDetailsModal } from '../components/TransactionDetailsModal';
import { receivableService } from '../services/receivableService';
import type {
  ReceivableCustomerOption,
  ReceivableOrder,
  ReceivableTitle,
  ReceivableTransaction,
  ReceivablesData,
  SettlePayload,
} from '../types/receivableTypes';

type ViewKey =
  | 'titulos'
  | 'pedidos'
  | 'transacoes'
  | 'titulos_pagos'
  | 'pedidos_baixados';

type DueInfo = { kind: 'overdue' | 'soon' | 'ok'; days: number };

/** Classifica o vencimento de um titulo em aberto (vencido / vence em breve). */
function dueInfo(vencimento: string, diasAtraso: number): DueInfo {
  if (diasAtraso > 0) return { kind: 'overdue', days: diasAtraso };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(vencimento)
      ? `${vencimento}T12:00:00`
      : vencimento
  );
  const days = Math.ceil((due.getTime() - today.getTime()) / 86_400_000);
  if (days >= 0 && days <= 3) return { kind: 'soon', days };
  return { kind: 'ok', days };
}

export default function ReceivablesPage() {
  const toast = useToast();
  const client = useQueryClient();
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [view, setView] = useState<ViewKey>('titulos');
  const [syncing, setSyncing] = useState(false);
  const itemsModal = useDisclosure();
  const settleModal = useDisclosure();
  const receiptModal = useDisclosure();
  const txModal = useDisclosure();
  const [active, setActive] = useState<ReceivableTitle | null>(null);
  const [activeItems, setActiveItems] = useState<ItemsSource | null>(null);
  const [activeTx, setActiveTx] = useState<ReceivableTransaction | null>(null);
  const [receipt, setReceipt] = useState<PaymentReceiptData | null>(null);

  const query = useQuery({
    queryKey: ['receivables', customerId],
    queryFn: () => receivableService.load(customerId as number),
    enabled: customerId !== null,
  });
  const data = query.data;

  const settle = useMutation({
    mutationFn: (payload: SettlePayload) =>
      receivableService.settle(active!.idconta_receber, payload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['receivables'] });
      await client.invalidateQueries({ queryKey: ['finance'] });
      await client.invalidateQueries({ queryKey: ['dashboard'] });
      settleModal.onClose();
      toast({ title: 'Titulo recebido com sucesso', status: 'success' });
    },
    onError: (error: unknown) =>
      toast({
        title: 'Nao foi possivel receber o titulo',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        status: 'error',
        position: 'top-right',
      }),
  });

  const selectCustomer = (customer: ReceivableCustomerOption) => {
    setCustomerId(customer.idcliente);
    setView('titulos');
  };
  const openItemsFor = (source: ItemsSource) => {
    setActiveItems(source);
    itemsModal.onOpen();
  };
  const openSettle = (title: ReceivableTitle) => {
    setActive(title);
    settleModal.onOpen();
  };
  const openReceipt = (payment: PaymentReceiptData) => {
    setReceipt(payment);
    receiptModal.onOpen();
  };
  const openTx = (transaction: ReceivableTransaction) => {
    setActiveTx(transaction);
    txModal.onOpen();
  };

  const syncStatus = async () => {
    if (customerId === null) return;
    setSyncing(true);
    const result = await query.refetch();
    setSyncing(false);
    const count = result.data?.summary.transacoes ?? 0;
    toast({
      title: 'Dados atualizados',
      description: `${count} transacao(oes) sincronizada(s) com sucesso.`,
      status: 'success',
      position: 'top-right',
    });
  };

  const receiptFromTitle = (t: ReceivableTitle): PaymentReceiptData => ({
    contrato: t.contrato,
    parcela_numero: t.parcela_numero,
    parcelas_total: t.parcelas_total,
    valor_base: t.valor,
    juros: t.juros,
    multa: t.multa,
    desconto: t.desconto,
    valor_pago: t.valor_pago,
    meio: t.forma_pagamento,
    data: t.data_recebimento ?? '',
  });
  const receiptFromTx = (t: ReceivableTransaction): PaymentReceiptData => ({
    contrato: t.grupo,
    parcela_numero: t.parcela_numero,
    parcelas_total: t.parcelas_total,
    valor_base: t.valor_base,
    juros: t.juros,
    multa: t.multa,
    desconto: t.desconto,
    valor_pago: t.valor,
    meio: t.meio,
    data: t.data_hora,
  });
  const receiptFromOrder = (p: ReceivableOrder): PaymentReceiptData => ({
    contrato: p.contrato,
    parcela_numero: p.titulos_total,
    parcelas_total: p.titulos_total,
    valor_base: p.valor_total,
    juros: 0,
    multa: 0,
    desconto: 0,
    valor_pago: p.valor_pago,
    meio: p.forma_pagamento,
    data: p.data_venda ?? '',
  });

  const doc = data?.customer.documento
    ? formatDocument(data.customer.documento)
    : '-';

  return (
    <Box>
      <PageHeader
        icon={HandCoins}
        title="Recebimentos"
        description="Central de cobranca do cliente: titulos, pedidos, transacoes e comprovantes."
        breadcrumbs={[{ label: 'Financeiro' }, { label: 'Recebimentos' }]}
        actions={
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={15} />}
            isLoading={syncing}
            loadingText="Atualizando..."
            isDisabled={customerId === null}
            onClick={() => void syncStatus()}
          >
            Atualizar dados
          </Button>
        }
      />

      <Surface p={{ base: 4, md: 5 }} mb={5}>
        <Flex justify="space-between" align="flex-start" gap={3} wrap="wrap">
          <SectionHeader
            icon={Search}
            eyebrow="Busca"
            title="Selecione o cliente para carregar titulos e transacoes"
          />
          {data && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<UserSearch size={14} />}
              onClick={() => setCustomerId(null)}
            >
              Busca de clientes
            </Button>
          )}
        </Flex>
        <Box mt={4}>
          <CustomerReceivableSearch onSelect={selectCustomer} />
        </Box>
        {data && (
          <Flex mt={4} align="center" gap={3} wrap="wrap">
            <Flex
              align="center"
              gap={2}
              px={3}
              py={1.5}
              borderRadius="full"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
            >
              <Text fontSize="13px" fontWeight="700" color="erp.brandText">
                {data.customer.nome}
              </Text>
              {data.customer.documento && (
                <Text fontSize="12px" color="erp.brandText" opacity={0.8}>
                  · {doc}
                </Text>
              )}
            </Flex>
            <IconButton
              aria-label="Limpar cliente"
              icon={<X size={14} />}
              size="xs"
              variant="ghost"
              onClick={() => setCustomerId(null)}
            />
          </Flex>
        )}
      </Surface>

      {customerId === null ? (
        <Surface>
          <EmptyState
            icon={Wallet}
            title="Busque um cliente para comecar"
            description="Digite o CPF/CNPJ (carrega automaticamente) ou o nome do cliente para abrir os titulos, pedidos e transacoes."
          />
        </Surface>
      ) : query.isLoading ? (
        <Flex justify="center" py={20}>
          <Spinner color="brand.500" size="lg" />
        </Flex>
      ) : (
        data && (
          <Surface overflow="hidden">
            <TabBar summary={data.summary} view={view} onChange={setView} />
            <Reveal key={view}>
              <ViewContent
                view={view}
                data={data}
                onItems={openItemsFor}
                onSettle={openSettle}
                onTx={openTx}
                onReceiptTitle={t => openReceipt(receiptFromTitle(t))}
                onReceiptOrder={p => openReceipt(receiptFromOrder(p))}
                onReceiptTx={t => openReceipt(receiptFromTx(t))}
              />
            </Reveal>
          </Surface>
        )
      )}

      <TitleItemsModal
        title={activeItems}
        isOpen={itemsModal.isOpen}
        onClose={itemsModal.onClose}
      />
      <SettleTitleModal
        title={active}
        isOpen={settleModal.isOpen}
        loading={settle.isPending}
        onClose={settleModal.onClose}
        onConfirm={payload => settle.mutate(payload)}
      />
      <TransactionDetailsModal
        transaction={activeTx}
        isOpen={txModal.isOpen}
        onClose={txModal.onClose}
        onReceipt={t => {
          txModal.onClose();
          openReceipt(receiptFromTx(t));
        }}
      />
      <PaymentReceiptModal
        isOpen={receiptModal.isOpen}
        onClose={receiptModal.onClose}
        company={data?.company ?? {}}
        customer={data?.customer ?? { nome: '' }}
        payment={receipt}
      />
    </Box>
  );
}

type TabDef = { key: ViewKey; label: string; icon: LucideIcon; count: number };

function TabBar({
  summary,
  view,
  onChange,
}: {
  summary: ReceivablesData['summary'];
  view: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  const primary: TabDef[] = [
    { key: 'titulos', label: 'Titulos', icon: Wallet, count: summary.abertos },
    {
      key: 'pedidos',
      label: 'Pedidos',
      icon: ListChecks,
      count: summary.pedidos_abertos,
    },
    {
      key: 'transacoes',
      label: 'Transacoes',
      icon: Receipt,
      count: summary.transacoes,
    },
  ];
  const secondary: TabDef[] = [
    {
      key: 'titulos_pagos',
      label: 'Titulos pagos',
      icon: CheckCircle2,
      count: summary.pagos,
    },
    {
      key: 'pedidos_baixados',
      label: 'Pedidos baixados',
      icon: PackageCheck,
      count: summary.pedidos_baixados,
    },
  ];
  return (
    <Flex
      px={{ base: 2, md: 4 }}
      pt={2}
      borderBottom="1px solid"
      borderColor="erp.border"
      justify="space-between"
      align="center"
      wrap="wrap"
      gap={1}
      overflowX="auto"
    >
      <Flex gap={0.5}>
        {primary.map(tab => (
          <TabButton
            key={tab.key}
            tab={tab}
            active={view === tab.key}
            onClick={() => onChange(tab.key)}
          />
        ))}
      </Flex>
      <Flex gap={0.5}>
        {secondary.map(tab => (
          <TabButton
            key={tab.key}
            tab={tab}
            active={view === tab.key}
            onClick={() => onChange(tab.key)}
          />
        ))}
      </Flex>
    </Flex>
  );
}

function TabButton({
  tab,
  active,
  onClick,
}: {
  tab: TabDef;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Flex
      as="button"
      align="center"
      gap={2}
      px={3}
      py={2.5}
      borderBottom="2px solid"
      borderColor={active ? 'brand.500' : 'transparent'}
      color={active ? 'erp.brandText' : 'erp.textSecondary'}
      fontWeight={active ? '700' : '500'}
      transition="all 120ms ease"
      _hover={{ color: 'erp.brandText' }}
      whiteSpace="nowrap"
      onClick={onClick}
    >
      <Icon as={tab.icon} boxSize="15px" />
      <Text fontSize="13.5px">{tab.label}</Text>
      {tab.count > 0 && (
        <Badge
          borderRadius="full"
          minW="20px"
          textAlign="center"
          colorScheme={active ? 'blue' : 'orange'}
          fontSize="10px"
        >
          {tab.count}
        </Badge>
      )}
    </Flex>
  );
}

function ViewContent({
  view,
  data,
  onItems,
  onSettle,
  onTx,
  onReceiptTitle,
  onReceiptOrder,
  onReceiptTx,
}: {
  view: ViewKey;
  data: ReceivablesData;
  onItems: (source: ItemsSource) => void;
  onSettle: (title: ReceivableTitle) => void;
  onTx: (transaction: ReceivableTransaction) => void;
  onReceiptTitle: (title: ReceivableTitle) => void;
  onReceiptOrder: (order: ReceivableOrder) => void;
  onReceiptTx: (transaction: ReceivableTransaction) => void;
}) {
  const docNumber = data.customer.documento
    ? formatDocument(data.customer.documento)
    : '-';
  if (view === 'titulos' || view === 'titulos_pagos') {
    return (
      <TitlesTable
        key={view}
        titles={view === 'titulos' ? data.titulos : data.titulos_pagos}
        customerName={data.customer.nome}
        doc={docNumber}
        mode={view === 'titulos' ? 'open' : 'paid'}
        onItems={onItems}
        onSettle={onSettle}
        onReceipt={onReceiptTitle}
      />
    );
  }
  if (view === 'pedidos' || view === 'pedidos_baixados') {
    return (
      <OrdersTable
        orders={view === 'pedidos' ? data.pedidos : data.pedidos_baixados}
        mode={view === 'pedidos' ? 'open' : 'settled'}
        onItems={onItems}
        onReceipt={onReceiptOrder}
      />
    );
  }
  return (
    <TransactionsTable
      transactions={data.transacoes}
      onDetails={onTx}
      onReceipt={onReceiptTx}
    />
  );
}

function FilialChip({ filial }: { filial: string | null }) {
  return (
    <Badge
      variant="outline"
      colorScheme="blue"
      textTransform="none"
      borderRadius="full"
      px={2}
      display="inline-flex"
      alignItems="center"
      gap={1}
      fontWeight="500"
    >
      <Store size={11} />
      {filial ?? '-'}
    </Badge>
  );
}

function TitlesTable({
  titles,
  customerName,
  doc,
  mode,
  onItems,
  onSettle,
  onReceipt,
}: {
  titles: ReceivableTitle[];
  customerName: string;
  doc: string;
  mode: 'open' | 'paid';
  onItems: (source: ItemsSource) => void;
  onSettle: (title: ReceivableTitle) => void;
  onReceipt: (title: ReceivableTitle) => void;
}) {
  const overdueBg = useColorModeValue('#FEF3F2', 'rgba(251,113,133,0.10)');
  const soonBg = useColorModeValue('#FFFBEB', 'rgba(251,191,36,0.10)');
  const footBg = useColorModeValue('#F8FAFC', 'rgba(255,255,255,0.03)');
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allSelected = titles.length > 0 && selected.size === titles.length;
  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(titles.map(t => t.idconta_receber))
    );

  const totals = useMemo(() => {
    const base = selected.size
      ? titles.filter(t => selected.has(t.idconta_receber))
      : titles;
    const semJuros = base.reduce((sum, t) => sum + t.valor, 0);
    const comJuros = base.reduce(
      (sum, t) => sum + (mode === 'open' ? t.valor_com_juros : t.valor_pago),
      0
    );
    return {
      count: base.length,
      semJuros,
      comJuros,
      juros: comJuros - semJuros,
      partial: selected.size > 0,
    };
  }, [titles, selected, mode]);

  if (titles.length === 0) {
    return (
      <EmptyState
        icon={mode === 'open' ? Wallet : CheckCircle2}
        title={
          mode === 'open' ? 'Nenhum titulo em aberto' : 'Nenhum titulo recebido'
        }
        description={
          mode === 'open'
            ? 'Este cliente esta em dia — nao ha parcelas pendentes.'
            : 'Os titulos recebidos aparecerao aqui.'
        }
      />
    );
  }
  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th w="40px" pr={0}>
              <Checkbox
                isChecked={allSelected}
                isIndeterminate={selected.size > 0 && !allSelected}
                onChange={toggleAll}
              />
            </Th>
            <Th>Contrato</Th>
            <Th>Cliente</Th>
            <Th>CPF/CNPJ</Th>
            <Th>Vencimento</Th>
            <Th isNumeric>Parcela</Th>
            <Th isNumeric>Com juros</Th>
            <Th>Filial</Th>
            <Th textAlign="right">Acoes</Th>
          </Tr>
        </Thead>
        <Tbody>
          {titles.map(title => {
            const due =
              mode === 'open'
                ? dueInfo(title.data_vencimento, title.dias_atraso)
                : { kind: 'ok' as const, days: 0 };
            const rowBg =
              due.kind === 'overdue'
                ? overdueBg
                : due.kind === 'soon'
                  ? soonBg
                  : undefined;
            const accent =
              due.kind === 'overdue'
                ? 'erp.danger'
                : due.kind === 'soon'
                  ? 'erp.warning'
                  : 'transparent';
            const isChecked = selected.has(title.idconta_receber);
            return (
              <Tr key={title.idconta_receber} bg={rowBg}>
                <Td pr={0} borderLeft="3px solid" borderLeftColor={accent}>
                  <Checkbox
                    isChecked={isChecked}
                    onChange={() => toggle(title.idconta_receber)}
                  />
                </Td>
                <Td>
                  <Text fontWeight="600">{title.contrato}</Text>
                  <Text fontSize="11px" color="erp.textMuted">
                    Parcela {title.parcela_numero}/{title.parcelas_total}
                  </Text>
                </Td>
                <Td maxW="200px">
                  <Text noOfLines={1} fontWeight="500">
                    {customerName}
                  </Text>
                </Td>
                <Td>{doc}</Td>
                <Td>
                  <Flex align="center" gap={2}>
                    <Text
                      color={due.kind === 'overdue' ? 'erp.danger' : undefined}
                      fontWeight={due.kind === 'overdue' ? '600' : undefined}
                    >
                      {formatDate(
                        mode === 'open'
                          ? title.data_vencimento
                          : title.data_recebimento
                      )}
                    </Text>
                    {mode === 'open' && due.kind === 'overdue' && (
                      <Badge colorScheme="red" textTransform="none">
                        Vencido
                      </Badge>
                    )}
                    {mode === 'open' && due.kind === 'soon' && (
                      <Badge colorScheme="orange" textTransform="none">
                        {due.days === 0
                          ? 'Vence hoje'
                          : `Vence em ${due.days}d`}
                      </Badge>
                    )}
                    {mode === 'paid' && (
                      <Badge colorScheme="green" textTransform="none">
                        {formatPaymentMethod(title.forma_pagamento)}
                      </Badge>
                    )}
                  </Flex>
                </Td>
                <Td isNumeric fontWeight="600">
                  {formatCurrency(
                    mode === 'open' ? title.valor : title.valor_pago
                  )}
                </Td>
                <Td isNumeric fontWeight="700">
                  {formatCurrency(
                    mode === 'open' ? title.valor_com_juros : title.valor_pago
                  )}
                </Td>
                <Td>
                  <FilialChip filial={title.filial} />
                </Td>
                <Td>
                  <Flex justify="flex-end" gap={1}>
                    <Tooltip label="Ver produtos da compra">
                      <IconButton
                        aria-label="Ver produtos"
                        icon={<Search size={15} />}
                        size="sm"
                        variant="ghost"
                        onClick={() => onItems(title)}
                      />
                    </Tooltip>
                    {mode === 'open' ? (
                      <Tooltip label="Receber / baixar titulo">
                        <IconButton
                          aria-label="Receber titulo"
                          icon={<HandCoins size={15} />}
                          size="sm"
                          colorScheme="blue"
                          onClick={() => onSettle(title)}
                        />
                      </Tooltip>
                    ) : (
                      <Tooltip label="Imprimir comprovante">
                        <IconButton
                          aria-label="Comprovante"
                          icon={<Receipt size={15} />}
                          size="sm"
                          colorScheme="blue"
                          variant="ghost"
                          onClick={() => onReceipt(title)}
                        />
                      </Tooltip>
                    )}
                  </Flex>
                </Td>
              </Tr>
            );
          })}
        </Tbody>
        <Tfoot>
          <Tr bg={footBg}>
            <Td colSpan={4} borderBottom="none">
              <Text fontSize="12px" color="erp.textSecondary">
                <Text as="span" textStyle="overline" mr={2}>
                  Totais
                </Text>
                {totals.count} parcela{totals.count === 1 ? '' : 's'}
                {totals.partial ? ' selecionada(s)' : ''} · juros embutidos{' '}
                <Text as="span" fontWeight="700" color="erp.text">
                  {formatCurrency(totals.juros)}
                </Text>
              </Text>
            </Td>
            <Td isNumeric borderBottom="none">
              <Text fontSize="10px" color="erp.textMuted">
                {mode === 'open' ? 'SEM JUROS' : 'PARCELAS'}
              </Text>
              <Text textStyle="numeric" fontWeight="700">
                {formatCurrency(totals.semJuros)}
              </Text>
            </Td>
            <Td isNumeric borderBottom="none">
              <Text fontSize="10px" color="erp.textMuted">
                {mode === 'open' ? 'COM JUROS' : 'RECEBIDO'}
              </Text>
              <Text textStyle="numeric" fontWeight="800" color="erp.brandText">
                {formatCurrency(totals.comJuros)}
              </Text>
            </Td>
            <Td borderBottom="none" />
            <Td borderBottom="none" />
          </Tr>
        </Tfoot>
      </Table>
    </Box>
  );
}

function OrdersTable({
  orders,
  mode,
  onItems,
  onReceipt,
}: {
  orders: ReceivableOrder[];
  mode: 'open' | 'settled';
  onItems: (source: ItemsSource) => void;
  onReceipt: (order: ReceivableOrder) => void;
}) {
  if (orders.length === 0) {
    return (
      <EmptyState
        icon={mode === 'open' ? ListChecks : PackageCheck}
        title={
          mode === 'open' ? 'Nenhum pedido em aberto' : 'Nenhum pedido baixado'
        }
        description={
          mode === 'open'
            ? 'Pedidos com parcelas pendentes aparecerao aqui.'
            : 'Pedidos totalmente pagos aparecerao aqui.'
        }
      />
    );
  }
  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Contrato</Th>
            <Th>Data</Th>
            <Th>Parcelas</Th>
            <Th isNumeric>Valor total</Th>
            <Th isNumeric>{mode === 'open' ? 'Em aberto' : 'Pago'}</Th>
            <Th>{mode === 'open' ? 'Prox. venc.' : 'Meio'}</Th>
            <Th>Filial</Th>
            <Th textAlign="right">Acoes</Th>
          </Tr>
        </Thead>
        <Tbody>
          {orders.map(order => (
            <Tr key={order.idvenda}>
              <Td fontWeight="600">{order.contrato}</Td>
              <Td>{formatDate(order.data_venda)}</Td>
              <Td>
                {order.titulos_pagos}/{order.titulos_total}
              </Td>
              <Td isNumeric fontWeight="700">
                {formatCurrency(order.valor_total)}
              </Td>
              <Td isNumeric fontWeight="700">
                {formatCurrency(
                  mode === 'open' ? order.valor_aberto : order.valor_pago
                )}
              </Td>
              <Td>
                {mode === 'open' ? (
                  <Text fontSize="12px">
                    {formatDate(order.proximo_vencimento)}
                  </Text>
                ) : (
                  <Badge colorScheme="green" textTransform="none">
                    {formatPaymentMethod(order.forma_pagamento)}
                  </Badge>
                )}
              </Td>
              <Td>
                <FilialChip filial={order.filial} />
              </Td>
              <Td>
                <Flex justify="flex-end" gap={1}>
                  <Tooltip label="Ver produtos do pedido">
                    <IconButton
                      aria-label="Ver produtos"
                      icon={<Search size={15} />}
                      size="sm"
                      variant="ghost"
                      onClick={() => onItems(order)}
                    />
                  </Tooltip>
                  {mode === 'settled' && (
                    <Tooltip label="Imprimir comprovante">
                      <IconButton
                        aria-label="Comprovante"
                        icon={<Receipt size={15} />}
                        size="sm"
                        colorScheme="blue"
                        variant="ghost"
                        onClick={() => onReceipt(order)}
                      />
                    </Tooltip>
                  )}
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

function TransactionsTable({
  transactions,
  onDetails,
  onReceipt,
}: {
  transactions: ReceivableTransaction[];
  onDetails: (transaction: ReceivableTransaction) => void;
  onReceipt: (transaction: ReceivableTransaction) => void;
}) {
  if (transactions.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="Nenhuma transacao"
        description="Os pagamentos registrados para este cliente aparecerao aqui."
      />
    );
  }
  return (
    <Box overflowX="auto">
      <Table size="sm" variant="simple">
        <Thead>
          <Tr>
            <Th>Grupo</Th>
            <Th>Status</Th>
            <Th>Data / hora</Th>
            <Th isNumeric>Valor</Th>
            <Th>Origem</Th>
            <Th>Meio</Th>
            <Th textAlign="right">Acoes</Th>
          </Tr>
        </Thead>
        <Tbody>
          {transactions.map(tx => (
            <Tr key={tx.idconta_receber}>
              <Td fontWeight="600">{tx.grupo}</Td>
              <Td>
                <Badge colorScheme="green" textTransform="none">
                  {tx.status}
                </Badge>
              </Td>
              <Td>{formatDateTime(tx.data_hora)}</Td>
              <Td isNumeric fontWeight="700">
                {formatCurrency(tx.valor)}
              </Td>
              <Td>{tx.origem}</Td>
              <Td>{formatPaymentMethod(tx.meio)}</Td>
              <Td>
                <Flex justify="flex-end" gap={1}>
                  <Tooltip label="Ver detalhes">
                    <IconButton
                      aria-label="Detalhes"
                      icon={<Search size={15} />}
                      size="sm"
                      variant="ghost"
                      onClick={() => onDetails(tx)}
                    />
                  </Tooltip>
                  <Tooltip label="Imprimir comprovante">
                    <IconButton
                      aria-label="Comprovante"
                      icon={<Receipt size={15} />}
                      size="sm"
                      colorScheme="blue"
                      variant="ghost"
                      onClick={() => onReceipt(tx)}
                    />
                  </Tooltip>
                </Flex>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
