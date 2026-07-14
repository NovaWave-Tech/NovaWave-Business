import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Flex,
  IconButton,
  SimpleGrid,
  Spinner,
  Table,
  Tab,
  TabList,
  Tabs,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  HandCoins,
  ListChecks,
  Receipt,
  Search,
  Store,
  TriangleAlert,
  Wallet,
  X,
} from 'lucide-react';
import { useState } from 'react';
import {
  EmptyState,
  KpiCard,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
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
  SettlePayload,
} from '../types/receivableTypes';

export default function ReceivablesPage() {
  const toast = useToast();
  const client = useQueryClient();
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [tab, setTab] = useState(0);
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
    setTab(0);
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
        description="Titulos, pedidos e transacoes do cliente. Baixe parcelas, escolha a forma de pagamento e emita o comprovante."
        breadcrumbs={[{ label: 'Financeiro' }, { label: 'Recebimentos' }]}
      />

      <Surface p={5} mb={5}>
        <SectionHeader
          icon={Search}
          eyebrow="Busca"
          title="Selecione o cliente para carregar titulos e transacoes"
        />
        <Box mt={4} maxW="720px">
          <CustomerReceivableSearch onSelect={selectCustomer} />
        </Box>
        {data && (
          <Flex mt={4} align="center" gap={3} wrap="wrap">
            <Badge colorScheme="blue" fontSize="12px" px={2.5} py={1}>
              {data.customer.nome}
            </Badge>
            {data.customer.documento && (
              <Text fontSize="12px" color="erp.textSecondary">
                {doc}
              </Text>
            )}
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
            description="Digite o CPF/CNPJ ou o nome do cliente para carregar os titulos, pedidos e transacoes."
          />
        </Surface>
      ) : query.isLoading ? (
        <Flex justify="center" py={16}>
          <Spinner color="brand.500" size="lg" />
        </Flex>
      ) : (
        data && (
          <>
            <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} mb={5}>
              <KpiCard
                index={0}
                tone="warning"
                label="Total em aberto"
                value={formatCurrency(data.summary.total_aberto)}
                detail={`${data.summary.abertos} titulo(s) pendente(s)`}
                icon={Wallet}
              />
              <KpiCard
                index={1}
                tone="danger"
                label="Vencido"
                value={formatCurrency(data.summary.total_vencido)}
                detail="Parcelas em atraso"
                icon={TriangleAlert}
              />
              <KpiCard
                index={2}
                tone="success"
                label="Ja recebido"
                value={formatCurrency(data.summary.total_pago)}
                detail={`${data.summary.pagos} titulo(s) baixado(s)`}
                icon={CheckCircle2}
              />
            </SimpleGrid>

            {data.summary.pedidos_abertos > 0 && (
              <Alert
                status="warning"
                variant="left-accent"
                borderRadius="10px"
                mb={4}
              >
                <AlertIcon />
                <Text fontSize="13px" fontWeight="600">
                  Atencao: este cliente possui {data.summary.pedidos_abertos}{' '}
                  contrato(s) em aberto
                </Text>
              </Alert>
            )}

            <Surface overflow="hidden">
              <Tabs index={tab} onChange={setTab} colorScheme="blue">
                <TabList px={4} pt={2} flexWrap="wrap">
                  <Tab fontSize="14px">Titulos ({data.summary.abertos})</Tab>
                  <Tab fontSize="14px">
                    Titulos pagos ({data.summary.pagos})
                  </Tab>
                  <Tab fontSize="14px">
                    Pedidos ({data.summary.pedidos_abertos})
                  </Tab>
                  <Tab fontSize="14px">
                    Pedidos baixados ({data.summary.pedidos_baixados})
                  </Tab>
                  <Tab fontSize="14px">
                    Transacoes ({data.summary.transacoes})
                  </Tab>
                </TabList>
              </Tabs>

              {tab === 0 && (
                <TitlesTable
                  titles={data.titulos}
                  customerName={data.customer.nome}
                  doc={doc}
                  mode="open"
                  onItems={openItemsFor}
                  onSettle={openSettle}
                  onReceipt={t => openReceipt(receiptFromTitle(t))}
                />
              )}
              {tab === 1 && (
                <TitlesTable
                  titles={data.titulos_pagos}
                  customerName={data.customer.nome}
                  doc={doc}
                  mode="paid"
                  onItems={openItemsFor}
                  onSettle={openSettle}
                  onReceipt={t => openReceipt(receiptFromTitle(t))}
                />
              )}
              {tab === 2 && (
                <OrdersTable
                  orders={data.pedidos}
                  mode="open"
                  onItems={openItemsFor}
                  onReceipt={p => openReceipt(receiptFromOrder(p))}
                />
              )}
              {tab === 3 && (
                <OrdersTable
                  orders={data.pedidos_baixados}
                  mode="settled"
                  onItems={openItemsFor}
                  onReceipt={p => openReceipt(receiptFromOrder(p))}
                />
              )}
              {tab === 4 && (
                <TransactionsTable
                  transactions={data.transacoes}
                  onDetails={openTx}
                  onReceipt={t => openReceipt(receiptFromTx(t))}
                />
              )}
            </Surface>
          </>
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
  if (titles.length === 0) {
    return (
      <EmptyState
        icon={mode === 'open' ? Wallet : CheckCircle2}
        title={
          mode === 'open' ? 'Nenhum titulo em aberto' : 'Nenhum titulo recebido'
        }
        description={
          mode === 'open'
            ? 'Este cliente nao possui parcelas pendentes.'
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
            const overdue = title.dias_atraso > 0;
            return (
              <Tr key={title.idconta_receber}>
                <Td fontWeight="600">{title.contrato}</Td>
                <Td maxW="180px">
                  <Text noOfLines={1}>{customerName}</Text>
                </Td>
                <Td>{doc}</Td>
                <Td
                  color={overdue && mode === 'open' ? 'erp.danger' : undefined}
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
                    <Badge
                      colorScheme={overdue ? 'red' : 'yellow'}
                      textTransform="none"
                    >
                      {overdue
                        ? `Vencido ha ${title.dias_atraso}d`
                        : 'A vencer'}
                    </Badge>
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
        icon={ListChecks}
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
