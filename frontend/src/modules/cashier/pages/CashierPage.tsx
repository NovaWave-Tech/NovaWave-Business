import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Building2,
  CircleDollarSign,
  Clock3,
  CreditCard,
  History,
  Lock,
  LockOpen,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import {
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import { FilterSelect } from '../../../shared/ui/FilterSelect';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../../../shared/utils/formatters';
import { cashierService } from '../services/cashierService';
import { CASH_MOVEMENT_TYPES, type CashierData } from '../types/cashierTypes';

export default function CashierPage() {
  const toast = useToast();
  const client = useQueryClient();
  const openModal = useDisclosure();
  const movementModal = useDisclosure();
  const closeModal = useDisclosure();
  const [branch, setBranch] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [movement, setMovement] = useState({
    tipo: '1',
    descricao: '',
    valor: 0,
  });
  const [countedBalance, setCountedBalance] = useState<number | null>(null);

  const overview = useQuery({
    queryKey: ['cashier', branch],
    queryFn: () => cashierService.overview(branch),
  });
  const data: CashierData | undefined = overview.data;
  const current = data?.current ?? null;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = () => client.invalidateQueries({ queryKey: ['cashier'] });

  const openCash = useMutation({
    mutationFn: () =>
      cashierService.open({
        idfilial: Number(branch || data?.branch || 0),
        saldo_inicial: openingBalance,
      }),
    onSuccess: async () => {
      await refresh();
      openModal.onClose();
      setOpeningBalance(0);
      toast({ title: 'Caixa aberto com sucesso', status: 'success' });
    },
    onError: notifyError,
  });
  const addMovement = useMutation({
    mutationFn: () =>
      cashierService.movement(current!.idcaixa, {
        tipo: Number(movement.tipo),
        descricao: movement.descricao,
        valor: movement.valor,
      }),
    onSuccess: async () => {
      await refresh();
      movementModal.onClose();
      setMovement({ tipo: '1', descricao: '', valor: 0 });
      toast({ title: 'Movimentacao registrada', status: 'success' });
    },
    onError: notifyError,
  });
  const closeCash = useMutation({
    mutationFn: () =>
      cashierService.close(current!.idcaixa, {
        saldo_final: countedBalance ?? undefined,
      }),
    onSuccess: async result => {
      await refresh();
      closeModal.onClose();
      setCountedBalance(null);
      const difference = result.diferenca;
      toast({
        title: 'Caixa fechado',
        description:
          difference === 0
            ? 'Fechamento sem diferenca de caixa.'
            : `Diferenca de ${formatCurrency(difference)} em relacao ao esperado.`,
        status: difference === 0 ? 'success' : 'warning',
        position: 'top-right',
        duration: 7000,
      });
    },
    onError: notifyError,
  });

  const openMovement = (tipo: '1' | '2') => {
    setMovement({ tipo, descricao: '', valor: 0 });
    movementModal.onOpen();
  };

  return (
    <Box>
      <PageHeader
        icon={Wallet}
        title="Caixa"
        description="Abertura, movimentacoes e fechamento de caixa por filial."
        breadcrumbs={[{ label: 'Financeiro' }, { label: 'Caixa' }]}
        actions={
          <FilterSelect
            label="Filial do caixa"
            icon={Building2}
            value={branch || String(data?.branch ?? '')}
            onChange={setBranch}
            w={{ base: 'full', md: '220px' }}
            options={
              data?.options.branches.map(item => ({
                value: String(item.id),
                label: item.nome,
              })) ?? []
            }
          />
        }
      />

      {overview.isError ? (
        <Surface>
          <ErrorState retry={() => void overview.refetch()} />
        </Surface>
      ) : overview.isLoading ? (
        <Surface p={6}>
          <VStack spacing={4}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Box
                key={index}
                h="56px"
                w="full"
                bg="erp.surfaceSubtle"
                borderRadius="8px"
              />
            ))}
          </VStack>
        </Surface>
      ) : (
        <>
          <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={3} mb={5}>
            <KpiCard
              index={0}
              tone={current ? 'success' : 'neutral'}
              label="Situacao do caixa"
              value={current ? 'Aberto' : 'Fechado'}
              detail={
                current
                  ? `Desde ${formatDateTime(current.aberto_em)}`
                  : 'Nenhum caixa aberto nesta filial'
              }
              icon={current ? LockOpen : Lock}
            />
            <KpiCard
              index={1}
              tone="brand"
              label="Saldo atual"
              count={Number(current?.saldo_atual ?? 0)}
              format={formatCurrency}
              detail={`Inicial ${formatCurrency(current?.saldo_inicial ?? 0)}`}
              icon={CircleDollarSign}
            />
            <KpiCard
              index={2}
              tone="success"
              label="Entradas"
              count={Number(current?.entradas ?? 0)}
              format={formatCurrency}
              detail="Suprimentos e vendas"
              icon={ArrowDownCircle}
            />
            <KpiCard
              index={3}
              tone="danger"
              label="Saidas"
              count={Number(current?.saidas ?? 0)}
              format={formatCurrency}
              detail="Sangrias e despesas"
              icon={ArrowUpCircle}
            />
          </SimpleGrid>

          {current ? (
            <Grid
              templateColumns={{
                base: '1fr',
                xl: 'minmax(0,1.5fr) minmax(300px,.6fr)',
              }}
              gap={5}
              mb={5}
            >
              <Surface overflow="hidden">
                <SectionHeader
                  icon={Banknote}
                  eyebrow="Caixa aberto"
                  title="Movimentacoes"
                  description={`Operador ${current.operador}`}
                  action={
                    <Flex gap={2}>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<ArrowDownCircle size={15} />}
                        onClick={() => openMovement('1')}
                      >
                        Suprimento
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        leftIcon={<ArrowUpCircle size={15} />}
                        onClick={() => openMovement('2')}
                      >
                        Sangria
                      </Button>
                    </Flex>
                  }
                />
                {current.movements.length ? (
                  <VStack align="stretch" spacing={0}>
                    {current.movements.map(item => {
                      const meta = CASH_MOVEMENT_TYPES[item.tipo] ?? {
                        label: 'Mov.',
                        in: true,
                      };
                      return (
                        <Flex
                          key={item.idmovimentacao_caixa}
                          px={5}
                          py={3}
                          justify="space-between"
                          align="center"
                          gap={4}
                          borderBottom="1px solid"
                          borderColor="erp.border"
                          _last={{ borderBottom: 0 }}
                        >
                          <Box minW={0}>
                            <Flex align="center" gap={2}>
                              <Badge
                                colorScheme={meta.in ? 'green' : 'red'}
                                textTransform="none"
                              >
                                {meta.label}
                              </Badge>
                              <Text
                                fontSize="12px"
                                fontWeight="600"
                                noOfLines={1}
                              >
                                {item.descricao}
                              </Text>
                            </Flex>
                            <Text
                              fontSize="10px"
                              color="erp.textMuted"
                              mt={0.5}
                            >
                              {formatDateTime(item.criado_em)} · {item.usuario}
                            </Text>
                          </Box>
                          <Text
                            fontSize="13px"
                            fontWeight="800"
                            color={meta.in ? 'erp.success' : 'erp.danger'}
                            sx={{ fontVariantNumeric: 'tabular-nums' }}
                            flexShrink={0}
                          >
                            {meta.in ? '+' : '-'}
                            {formatCurrency(item.valor)}
                          </Text>
                        </Flex>
                      );
                    })}
                  </VStack>
                ) : (
                  <EmptyState
                    title="Nenhuma movimentacao"
                    description="Registre suprimentos e sangrias durante a operacao."
                    icon={Banknote}
                  />
                )}
              </Surface>

              <Surface p={5} h="fit-content">
                <Text
                  fontSize="10px"
                  fontWeight="700"
                  color="erp.textMuted"
                  textTransform="uppercase"
                  letterSpacing=".05em"
                >
                  Resumo do caixa
                </Text>
                <VStack align="stretch" spacing={0} mt={2}>
                  <SummaryRow
                    label="Saldo inicial"
                    value={formatCurrency(current.saldo_inicial)}
                  />
                  <SummaryRow
                    label="Entradas"
                    value={`+${formatCurrency(current.entradas)}`}
                    color="erp.success"
                  />
                  <SummaryRow
                    label="Saidas"
                    value={`-${formatCurrency(current.saidas)}`}
                    color="erp.danger"
                  />
                </VStack>
                <Flex
                  justify="space-between"
                  align="baseline"
                  pt={3}
                  mt={2}
                  borderTop="1px solid"
                  borderColor="erp.border"
                >
                  <Text fontSize="13px" fontWeight="700">
                    Saldo esperado
                  </Text>
                  <Text
                    fontSize="22px"
                    fontWeight="800"
                    sx={{ fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatCurrency(current.saldo_atual)}
                  </Text>
                </Flex>
                <Button
                  mt={5}
                  w="full"
                  variant="danger"
                  leftIcon={<Lock size={15} />}
                  onClick={() => {
                    setCountedBalance(null);
                    closeModal.onOpen();
                  }}
                >
                  Fechar caixa
                </Button>
              </Surface>
            </Grid>
          ) : (
            <Surface mb={5}>
              <EmptyState
                title="Nenhum caixa aberto nesta filial"
                description="Abra o caixa informando o saldo inicial em dinheiro para comecar a operacao."
                icon={CreditCard}
                action={openModal.onOpen}
                actionLabel="Abrir caixa"
              />
            </Surface>
          )}

          <Surface overflow="hidden">
            <SectionHeader
              icon={History}
              eyebrow="Fechamentos anteriores"
              title="Historico de caixas"
              description={`${formatNumber(data?.history.length ?? 0)} ${
                (data?.history.length ?? 0) === 1
                  ? 'caixa fechado'
                  : 'caixas fechados'
              }`}
            />
            {data?.history.length ? (
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Caixa</Th>
                      <Th>Operador</Th>
                      <Th>Abertura</Th>
                      <Th>Fechamento</Th>
                      <Th isNumeric>Saldo inicial</Th>
                      <Th isNumeric>Entradas</Th>
                      <Th isNumeric>Saidas</Th>
                      <Th isNumeric>Saldo final</Th>
                      <Th isNumeric>Diferenca</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.history.map(row => {
                      const expected =
                        row.saldo_inicial + row.entradas - row.saidas;
                      const difference =
                        row.saldo_final !== null &&
                        row.saldo_final !== undefined
                          ? row.saldo_final - expected
                          : 0;
                      return (
                        <Tr key={row.idcaixa}>
                          <Td fontWeight="700">#{row.idcaixa}</Td>
                          <Td>{row.operador}</Td>
                          <Td whiteSpace="nowrap">
                            {formatDateTime(row.aberto_em)}
                          </Td>
                          <Td whiteSpace="nowrap">
                            {formatDateTime(row.fechado_em)}
                          </Td>
                          <Td isNumeric>{formatCurrency(row.saldo_inicial)}</Td>
                          <Td isNumeric color="erp.success">
                            {formatCurrency(row.entradas)}
                          </Td>
                          <Td isNumeric color="erp.danger">
                            {formatCurrency(row.saidas)}
                          </Td>
                          <Td isNumeric fontWeight="700">
                            {formatCurrency(row.saldo_final)}
                          </Td>
                          <Td isNumeric>
                            <Badge
                              colorScheme={
                                difference === 0
                                  ? 'green'
                                  : difference > 0
                                    ? 'blue'
                                    : 'red'
                              }
                              textTransform="none"
                            >
                              {formatCurrency(difference)}
                            </Badge>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            ) : (
              <EmptyState
                title="Nenhum fechamento registrado"
                description="Os caixas fechados desta filial aparecerao aqui."
                icon={Clock3}
              />
            )}
          </Surface>
        </>
      )}

      <Modal isOpen={openModal.isOpen} onClose={openModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Abrir caixa</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="13px" color="erp.textSecondary">
              Informe o valor em dinheiro disponivel na gaveta para iniciar a
              operacao.
            </Text>
            <FormControl isRequired>
              <FormLabel>Saldo inicial</FormLabel>
              <CurrencyInput
                value={String(openingBalance || '')}
                onValueChange={value => setOpeningBalance(Number(value) || 0)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={openModal.onClose}>
              Cancelar
            </Button>
            <Button
              leftIcon={<LockOpen size={15} />}
              isLoading={openCash.isPending}
              onClick={() => openCash.mutate()}
            >
              Abrir caixa
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={movementModal.isOpen} onClose={movementModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>
            {movement.tipo === '1' ? 'Suprimento de caixa' : 'Sangria de caixa'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel>Tipo</FormLabel>
                <ComboSelect
                  value={movement.tipo}
                  onChange={value => setMovement(v => ({ ...v, tipo: value }))}
                  options={[
                    { value: '1', label: 'Suprimento (entrada)' },
                    { value: '2', label: 'Sangria (saida)' },
                  ]}
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Descricao</FormLabel>
                <Textarea
                  rows={2}
                  value={movement.descricao}
                  onChange={event =>
                    setMovement(v => ({ ...v, descricao: event.target.value }))
                  }
                  placeholder={
                    movement.tipo === '1'
                      ? 'Ex.: Troco inicial adicional'
                      : 'Ex.: Deposito no banco'
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Valor</FormLabel>
                <CurrencyInput
                  value={String(movement.valor || '')}
                  onValueChange={value =>
                    setMovement(v => ({ ...v, valor: Number(value) || 0 }))
                  }
                />
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={movementModal.onClose}>
              Cancelar
            </Button>
            <Button
              isDisabled={
                movement.descricao.trim().length < 3 || movement.valor <= 0
              }
              isLoading={addMovement.isPending}
              onClick={() => addMovement.mutate()}
            >
              Registrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={closeModal.isOpen} onClose={closeModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Fechar caixa</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="13px" color="erp.textSecondary">
              Saldo esperado:{' '}
              <Text as="span" fontWeight="700">
                {formatCurrency(current?.saldo_atual ?? 0)}
              </Text>
              . Informe o valor conferido na gaveta (opcional) para registrar a
              diferenca.
            </Text>
            <FormControl>
              <FormLabel>Saldo conferido</FormLabel>
              <CurrencyInput
                value={countedBalance !== null ? String(countedBalance) : ''}
                onValueChange={value =>
                  setCountedBalance(value === '' ? null : Number(value) || 0)
                }
              />
              <Text mt={1} fontSize="10px" color="erp.textMuted">
                Em branco, o fechamento usa o saldo esperado.
              </Text>
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={closeModal.onClose}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              leftIcon={<Lock size={15} />}
              isLoading={closeCash.isPending}
              onClick={() => closeCash.mutate()}
            >
              Confirmar fechamento
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function SummaryRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <Flex
      justify="space-between"
      py={2}
      borderBottom="1px solid"
      borderColor="erp.border"
      _last={{ borderBottom: 0 }}
    >
      <Text fontSize="12px" color="erp.textSecondary">
        {label}
      </Text>
      <Text
        fontSize="13px"
        fontWeight="700"
        color={color}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Text>
    </Flex>
  );
}
