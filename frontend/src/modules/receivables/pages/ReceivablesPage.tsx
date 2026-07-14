import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Icon,
  IconButton,
  Spinner,
  Table,
  Tbody,
  Td,
  Text,
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
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';
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
  | 'titulos_pagos'
  | 'pedidos'
  | 'pedidos_baixados'
  | 'transacoes';

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
      title: 'Sincronizacao concluida',
      description: `${count} transacao(oes) atualizada(s) com sucesso.`,
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
            Atualizar status
          </Button>
        }
      />

      <Surface p={{ base: 4, md: 5 }} mb={5}>
        <SectionHeader
          icon={Search}
          eyebrow="Busca"
          title="Selecione o cliente para carregar titulos e transacoes"
        />
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
          <Grid templateColumns={{ base: '1fr', md: '250px 1fr' }} gap={5}>
            <SideMenu data={data} view={view} onChange={setView} />
            <Box minW={0}>
              <Reveal key={view}>
                <Surface overflow="hidden">
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
                </Surface>
              </Reveal>
            </Box>
          </Grid>
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

type MenuItem = {
  key: ViewKey;
  label: string;
  icon: LucideIcon;
  count: number;
};

function SideMenu({
  data,
  view,
  onChange,
}: {
  data: ReceivablesData;
  view: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  const s = data.summary;
  const primary: MenuItem[] = [
    { key: 'titulos', label: 'Titulos', icon: Wallet, count: s.abertos },
    {
      key: 'titulos_pagos',
      label: 'Titulos pagos',
      icon: CheckCircle2,
      count: s.pagos,
    },
    {
      key: 'pedidos',
      label: 'Pedidos',
      icon: ListChecks,
      count: s.pedidos_abertos,
    },
  ];
  const secondary: MenuItem[] = [
    {
      key: 'pedidos_baixados',
      label: 'Pedidos baixados',
      icon: PackageCheck,
      count: s.pedidos_baixados,
    },
    {
      key: 'transacoes',
      label: 'Transacoes',
      icon: Receipt,
      count: s.transacoes,
    },
  ];
  return (
    <Surface p={2} h="fit-content" position={{ md: 'sticky' }} top={{ md: 4 }}>
      <MenuGroup
        label="Operacao"
        items={primary}
        view={view}
        onChange={onChange}
      />
      <Divider my={2} borderColor="erp.border" />
      <Text
        px={3}
        pt={1}
        pb={2}
        textStyle="overline"
        color="erp.textMuted"
        fontSize="10px"
      >
        Consulta
      </Text>
      <MenuGroup items={secondary} view={view} onChange={onChange} />
    </Surface>
  );
}

function MenuGroup({
  label,
  items,
  view,
  onChange,
}: {
  label?: string;
  items: MenuItem[];
  view: ViewKey;
  onChange: (view: ViewKey) => void;
}) {
  return (
    <>
      {label && (
        <Text
          px={3}
          pt={2}
          pb={2}
          textStyle="overline"
          color="erp.textMuted"
          fontSize="10px"
        >
          {label}
        </Text>
      )}
      <Flex direction="column" gap={0.5}>
        {items.map(item => {
          const isActive = view === item.key;
          return (
            <Flex
              key={item.key}
              as="button"
              align="center"
              gap={2.5}
              px={3}
              py={2.5}
              borderRadius="10px"
              textAlign="left"
              transition="all 120ms ease"
              bg={isActive ? 'erp.brandSoft' : 'transparent'}
              color={isActive ? 'erp.brandText' : 'erp.textSecondary'}
              fontWeight={isActive ? '700' : '500'}
              _hover={{ bg: isActive ? 'erp.brandSoft' : 'erp.hover' }}
              onClick={() => onChange(item.key)}
            >
              <Icon as={item.icon} boxSize="17px" flexShrink={0} />
              <Text fontSize="13px" flex="1" noOfLines={1}>
                {item.label}
              </Text>
              <Badge
                borderRadius="full"
                minW="22px"
                textAlign="center"
                colorScheme={isActive ? 'blue' : 'gray'}
                fontSize="10px"
              >
                {item.count}
              </Badge>
            </Flex>
          );
        })}
      </Flex>
    </>
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
  if (view === 'titulos' || view === 'titulos_pagos') {
    return (
      <TitlesTable
        titles={view === 'titulos' ? data.titulos : data.titulos_pagos}
        customerName={data.customer.nome}
        doc={
          data.customer.documento
            ? formatDocument(data.customer.documento)
            : '-'
        }
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
  const overdueBg = useColorModeValue('#FEF2F2', 'rgba(251,113,133,0.10)');
  const soonBg = useColorModeValue('#FFFBEB', 'rgba(251,191,36,0.10)');

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
            <Th>Contrato</Th>
            <Th>Cliente</Th>
            <Th>CPF/CNPJ</Th>
            <Th>{mode === 'open' ? 'Vencimento' : 'Recebido em'}</Th>
            <Th>Parcela</Th>
            <Th isNumeric>{mode === 'open' ? 'Com juros' : 'Valor pago'}</Th>
            <Th>{mode === 'open' ? 'Situacao' : 'Meio'}</Th>
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
            return (
              <Tr key={title.idconta_receber} bg={rowBg}>
                <Td
                  fontWeight="600"
                  borderLeft="3px solid"
                  borderLeftColor={accent}
                >
                  {title.contrato}
                </Td>
                <Td maxW="180px">
                  <Text noOfLines={1}>{customerName}</Text>
                </Td>
                <Td>{doc}</Td>
                <Td
                  color={due.kind === 'overdue' ? 'erp.danger' : undefined}
                  fontWeight={due.kind === 'overdue' ? '600' : undefined}
                >
                  {formatDate(
                    mode === 'open'
                      ? title.data_vencimento
                      : title.data_recebimento
                  )}
                </Td>
                <Td>
                  {title.parcela_numero}/{title.parcelas_total}
                </Td>
                <Td isNumeric fontWeight="700">
                  {formatCurrency(
                    mode === 'open' ? title.valor_com_juros : title.valor_pago
                  )}
                </Td>
                <Td>
                  {mode === 'open' ? (
                    due.kind === 'overdue' ? (
                      <Badge colorScheme="red" textTransform="none">
                        Vencido ha {due.days}d
                      </Badge>
                    ) : due.kind === 'soon' ? (
                      <Badge colorScheme="orange" textTransform="none">
                        {due.days === 0
                          ? 'Vence hoje'
                          : `Vence em ${due.days}d`}
                      </Badge>
                    ) : (
                      <Badge colorScheme="gray" textTransform="none">
                        A vencer
                      </Badge>
                    )
                  ) : (
                    <Text fontSize="12px">
                      {formatPaymentMethod(title.forma_pagamento)}
                    </Text>
                  )}
                </Td>
                <Td>
                  <Flex align="center" gap={1}>
                    <Store size={13} />
                    <Text fontSize="12px" noOfLines={1}>
                      {title.filial ?? '-'}
                    </Text>
                  </Flex>
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
                          variant="ghost"
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
                  <Text fontSize="12px">
                    {formatPaymentMethod(order.forma_pagamento)}
                  </Text>
                )}
              </Td>
              <Td>
                <Flex align="center" gap={1}>
                  <Store size={13} />
                  <Text fontSize="12px" noOfLines={1}>
                    {order.filial ?? '-'}
                  </Text>
                </Flex>
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
