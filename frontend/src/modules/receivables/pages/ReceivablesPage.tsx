import {
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
  formatDocument,
  formatPaymentMethod,
} from '../../../shared/utils/formatters';
import { CustomerReceivableSearch } from '../components/CustomerReceivableSearch';
import { SettleTitleModal } from '../components/SettleTitleModal';
import { TitleItemsModal } from '../components/TitleItemsModal';
import { receivableService } from '../services/receivableService';
import type {
  ReceivableCustomerOption,
  ReceivableTitle,
  SettlePayload,
} from '../types/receivableTypes';

export default function ReceivablesPage() {
  const toast = useToast();
  const client = useQueryClient();
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [tab, setTab] = useState(0);
  const itemsModal = useDisclosure();
  const settleModal = useDisclosure();
  const [active, setActive] = useState<ReceivableTitle | null>(null);

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
  const openItems = (title: ReceivableTitle) => {
    setActive(title);
    itemsModal.onOpen();
  };
  const openSettle = (title: ReceivableTitle) => {
    setActive(title);
    settleModal.onOpen();
  };

  const titles =
    tab === 0 ? (data?.titulos ?? []) : (data?.titulos_pagos ?? []);

  return (
    <Box>
      <PageHeader
        icon={HandCoins}
        title="Recebimentos"
        description="Baixe as parcelas dos clientes, veja os produtos de cada titulo e escolha a forma de pagamento."
        breadcrumbs={[{ label: 'Financeiro' }, { label: 'Recebimentos' }]}
      />

      <Surface p={5} mb={5}>
        <SectionHeader
          icon={Search}
          eyebrow="Busca"
          title="Selecione o cliente para carregar os titulos"
        />
        <Box mt={4} maxW="640px">
          <CustomerReceivableSearch onSelect={selectCustomer} />
        </Box>
        {data && (
          <Flex mt={4} align="center" gap={3} wrap="wrap">
            <Badge colorScheme="blue" fontSize="12px" px={2.5} py={1}>
              {data.customer.nome}
            </Badge>
            {data.customer.documento && (
              <Text fontSize="12px" color="erp.textSecondary">
                {formatDocument(data.customer.documento)}
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
            description="Digite o CPF/CNPJ ou o nome do cliente para carregar os titulos a receber."
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

            <Surface overflow="hidden">
              <Tabs index={tab} onChange={setTab} colorScheme="blue">
                <TabList px={4} pt={2}>
                  <Tab fontSize="14px">
                    Titulos em aberto ({data.summary.abertos})
                  </Tab>
                  <Tab fontSize="14px">
                    Titulos pagos ({data.summary.pagos})
                  </Tab>
                </TabList>
              </Tabs>

              {titles.length === 0 ? (
                <EmptyState
                  icon={tab === 0 ? Wallet : CheckCircle2}
                  title={
                    tab === 0
                      ? 'Nenhum titulo em aberto'
                      : 'Nenhum titulo recebido'
                  }
                  description={
                    tab === 0
                      ? 'Este cliente nao possui parcelas pendentes.'
                      : 'Os titulos recebidos aparecerao aqui.'
                  }
                />
              ) : (
                <Box overflowX="auto">
                  <Table size="sm" variant="simple">
                    <Thead>
                      <Tr>
                        <Th>Contrato</Th>
                        <Th>Vencimento</Th>
                        <Th>Parcela</Th>
                        <Th isNumeric>
                          {tab === 0 ? 'Com juros' : 'Recebido'}
                        </Th>
                        <Th>{tab === 0 ? 'Situacao' : 'Pagamento'}</Th>
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
                            <Td>{formatDate(title.data_vencimento)}</Td>
                            <Td>
                              {title.parcela_numero}/{title.parcelas_total}
                            </Td>
                            <Td isNumeric fontWeight="700">
                              {tab === 0
                                ? formatCurrency(title.valor_com_juros)
                                : formatCurrency(title.valor_pago)}
                            </Td>
                            <Td>
                              {tab === 0 ? (
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
                                    onClick={() => openItems(title)}
                                  />
                                </Tooltip>
                                {tab === 0 && (
                                  <Tooltip label="Receber / baixar titulo">
                                    <IconButton
                                      aria-label="Receber titulo"
                                      icon={<HandCoins size={15} />}
                                      size="sm"
                                      colorScheme="blue"
                                      variant="ghost"
                                      onClick={() => openSettle(title)}
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
              )}
            </Surface>
          </>
        )
      )}

      <TitleItemsModal
        title={active}
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
    </Box>
  );
}
