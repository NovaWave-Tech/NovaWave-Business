import {
  Badge,
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Select,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  CircleDollarSign,
  Eye,
  MoreHorizontal,
  Pencil,
  Plus,
  Receipt,
  Search,
  ShoppingBag,
  Truck,
  TruckIcon,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import FormattedInput from '../../../shared/ui/FormattedInput';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  formatNumber,
  formatPhone,
} from '../../../shared/utils/formatters';
import { supplierService } from '../services/supplierService';
import type {
  Supplier,
  SupplierDetail,
  SupplierListData,
  SupplierPayload,
} from '../types/supplierTypes';

const emptyForm: SupplierPayload = {
  razao_social: '',
  nome_fantasia: '',
  documento: '',
  email: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  situacao: true,
};

function StatusBadge({ status }: { status: number }) {
  return (
    <Badge colorScheme={status === 1 ? 'green' : 'red'} textTransform="none">
      {status === 1 ? 'Ativo' : 'Inativo'}
    </Badge>
  );
}

export default function SuppliersPage() {
  const toast = useToast();
  const client = useQueryClient();
  const formDrawer = useDisclosure();
  const detailDrawer = useDisclosure();
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<SupplierPayload>(emptyForm);

  const list = useQuery({
    queryKey: ['suppliers', filters],
    queryFn: () => supplierService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['supplier', selectedId],
    queryFn: () => supplierService.detail(selectedId as number),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data: SupplierListData | undefined = list.data;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['suppliers'] });
    await client.invalidateQueries({ queryKey: ['purchases'] });
    if (selectedId)
      await client.invalidateQueries({ queryKey: ['supplier', selectedId] });
  };

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? supplierService.update(editingId, form)
        : supplierService.create(form),
    onSuccess: async () => {
      await refresh();
      formDrawer.onClose();
      setForm(emptyForm);
      setEditingId(null);
      toast({
        title: editingId ? 'Fornecedor atualizado' : 'Fornecedor criado',
        status: 'success',
      });
    },
    onError: notifyError,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      supplierService.setStatus(id, status),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: notifyError,
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    formDrawer.onOpen();
  };
  const openEdit = async (supplier: Supplier) => {
    try {
      const current = await supplierService.detail(supplier.idfornecedor);
      setEditingId(supplier.idfornecedor);
      setForm({
        razao_social: current.razao_social,
        nome_fantasia: current.nome_fantasia || '',
        documento: current.documento || '',
        email: current.email || '',
        telefone: current.telefone || '',
        cep: current.cep || '',
        endereco: current.endereco || '',
        numero: current.numero || '',
        complemento: current.complemento || '',
        bairro: current.bairro || '',
        cidade: current.cidade || '',
        estado: current.estado || '',
        situacao: current.situacao === 1,
      });
      formDrawer.onOpen();
    } catch (error) {
      notifyError(error);
    }
  };
  const openDetail = (supplier: Supplier) => {
    setSelectedId(supplier.idfornecedor);
    detailDrawer.onOpen();
  };
  const setField = (key: keyof SupplierPayload, value: string | boolean) =>
    setForm(current => ({ ...current, [key]: value }));

  return (
    <Box>
      <PageHeader
        icon={Truck}
        title="Fornecedores"
        description="Cadastre e gerencie os fornecedores da empresa e o relacionamento com compras."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'Fornecedores' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Novo fornecedor
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Fornecedores"
          count={Number(data?.metrics.total)}
          format={formatNumber}
          detail="Cadastrados"
          icon={Truck}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Ativos"
          count={Number(data?.metrics.active)}
          format={formatNumber}
          detail="Relacionamento ativo"
          icon={TruckIcon}
        />
        <KpiCard
          index={2}
          tone="neutral"
          label="Inativos"
          count={Number(data?.metrics.inactive)}
          format={formatNumber}
          detail="Sem operacao"
          icon={XCircle}
        />
        <KpiCard
          index={3}
          tone="info"
          label="Com compras"
          count={Number(data?.metrics.with_purchases)}
          format={formatNumber}
          detail="Fornecedores utilizados"
          icon={ShoppingBag}
        />
        <KpiCard
          index={4}
          tone="brand"
          label="Volume comprado"
          count={Number(data?.metrics.volume)}
          format={value => formatCurrency(value, { compact: true })}
          detail="Historico total"
          icon={CircleDollarSign}
        />
      </SimpleGrid>

      <BrandSurface mb={4} p={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(260px,1fr) minmax(160px,.4fr) auto',
          }}
          gap={3}
          alignItems="center"
        >
          <InputGroup>
            <InputLeftElement pointerEvents="none">
              <Search size={16} />
            </InputLeftElement>
            <Input
              value={filters.q}
              onChange={event =>
                setFilters(v => ({ ...v, q: event.target.value }))
              }
              placeholder="Buscar por razao social, fantasia, documento, e-mail ou cidade..."
            />
          </InputGroup>
          <Select
            aria-label="Situacao"
            value={filters.status}
            onChange={event =>
              setFilters(v => ({ ...v, status: event.target.value }))
            }
          >
            <option value="">Situacoes</option>
            <option value="1">Ativos</option>
            <option value="0">Inativos</option>
          </Select>
          <Button
            variant="ghost"
            onClick={() => setFilters({ q: '', status: '' })}
          >
            Limpar
          </Button>
        </Grid>
      </BrandSurface>

      {list.isError ? (
        <Surface>
          <ErrorState retry={() => void list.refetch()} />
        </Surface>
      ) : list.isLoading ? (
        <Surface p={6}>
          <VStack spacing={4}>
            {Array.from({ length: 6 }).map((_, index) => (
              <Box
                key={index}
                h="52px"
                w="full"
                bg="erp.surfaceSubtle"
                borderRadius="8px"
              />
            ))}
          </VStack>
        </Surface>
      ) : data?.suppliers.length ? (
        <Surface overflow="hidden">
          <SectionHeader
            icon={Receipt}
            eyebrow="Base de fornecedores"
            title="Fornecedores cadastrados"
            description={`${formatNumber(data.suppliers.length)} ${
              data.suppliers.length === 1 ? 'registro' : 'registros'
            }`}
          />
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Fornecedor</Th>
                  <Th>Documento</Th>
                  <Th>Contato</Th>
                  <Th>Cidade/UF</Th>
                  <Th isNumeric>Compras</Th>
                  <Th isNumeric>Total comprado</Th>
                  <Th>Ultima compra</Th>
                  <Th>Status</Th>
                  <Th w="48px" />
                </Tr>
              </Thead>
              <Tbody>
                {data.suppliers.map(supplier => (
                  <Tr
                    key={supplier.idfornecedor}
                    cursor="pointer"
                    onClick={() => openDetail(supplier)}
                  >
                    <Td>
                      <Text fontWeight="600">
                        {supplier.nome_fantasia || supplier.razao_social}
                      </Text>
                      {supplier.nome_fantasia && (
                        <Text fontSize="10px" color="erp.textMuted">
                          {supplier.razao_social}
                        </Text>
                      )}
                    </Td>
                    <Td whiteSpace="nowrap">
                      {supplier.documento
                        ? formatDocument(supplier.documento)
                        : '-'}
                    </Td>
                    <Td>
                      <Text fontSize="12px">
                        {formatPhone(supplier.telefone)}
                      </Text>
                      <Text fontSize="10px" color="erp.textMuted">
                        {supplier.email || 'Sem e-mail'}
                      </Text>
                    </Td>
                    <Td whiteSpace="nowrap">
                      {supplier.cidade
                        ? `${supplier.cidade}/${supplier.estado}`
                        : '-'}
                    </Td>
                    <Td isNumeric>{formatNumber(supplier.compras)}</Td>
                    <Td isNumeric fontWeight="700">
                      {formatCurrency(supplier.total_comprado)}
                    </Td>
                    <Td whiteSpace="nowrap">
                      {formatDate(supplier.ultima_compra, 'Sem compras')}
                    </Td>
                    <Td>
                      <StatusBadge status={supplier.situacao} />
                    </Td>
                    <Td onClick={event => event.stopPropagation()}>
                      <Menu>
                        <Tooltip label="Acoes">
                          <MenuButton
                            as={IconButton}
                            aria-label="Acoes do fornecedor"
                            icon={<MoreHorizontal size={17} />}
                            variant="ghost"
                            size="sm"
                          />
                        </Tooltip>
                        <MenuList>
                          <MenuItem
                            icon={<Eye size={15} />}
                            onClick={() => openDetail(supplier)}
                          >
                            Visualizar
                          </MenuItem>
                          <MenuItem
                            icon={<Pencil size={15} />}
                            onClick={() => void openEdit(supplier)}
                          >
                            Editar
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem
                            icon={<Ban size={15} />}
                            color={
                              supplier.situacao ? 'erp.danger' : 'erp.success'
                            }
                            onClick={() =>
                              statusMutation.mutate({
                                id: supplier.idfornecedor,
                                status: supplier.situacao ? 0 : 1,
                              })
                            }
                          >
                            {supplier.situacao ? 'Inativar' : 'Reativar'}
                          </MenuItem>
                        </MenuList>
                      </Menu>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Surface>
      ) : (
        <Surface>
          <EmptyState
            title={
              Object.values(filters).some(Boolean)
                ? 'Nenhum fornecedor encontrado'
                : 'Nenhum fornecedor cadastrado'
            }
            description="Cadastre o primeiro fornecedor para vincular as compras."
            icon={Truck}
            action={openCreate}
            actionLabel="Novo fornecedor"
          />
        </Surface>
      )}

      <SupplierDetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
      />

      <Drawer
        isOpen={formDrawer.isOpen}
        placement="right"
        size="lg"
        onClose={formDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {editingId ? 'Editar fornecedor' : 'Novo fornecedor'}
            <Text
              mt={1}
              fontSize="12px"
              fontWeight="400"
              color="erp.textSecondary"
            >
              Somente a razao social e obrigatoria.
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired gridColumn={{ md: '1 / -1' }}>
                <FormLabel>Razao social</FormLabel>
                <Input
                  value={form.razao_social}
                  onChange={event =>
                    setField('razao_social', event.target.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Nome fantasia</FormLabel>
                <Input
                  value={form.nome_fantasia || ''}
                  onChange={event =>
                    setField('nome_fantasia', event.target.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>CNPJ / CPF</FormLabel>
                <FormattedInput
                  mask="document"
                  value={form.documento || ''}
                  onValueChange={value => setField('documento', value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Telefone</FormLabel>
                <FormattedInput
                  mask="phone"
                  value={form.telefone || ''}
                  onValueChange={value => setField('telefone', value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>E-mail</FormLabel>
                <Input
                  type="email"
                  value={form.email || ''}
                  onChange={event => setField('email', event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>CEP</FormLabel>
                <FormattedInput
                  mask="cep"
                  value={form.cep || ''}
                  onValueChange={value => setField('cep', value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Endereco</FormLabel>
                <Input
                  value={form.endereco || ''}
                  onChange={event => setField('endereco', event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Numero</FormLabel>
                <Input
                  value={form.numero || ''}
                  onChange={event => setField('numero', event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Bairro</FormLabel>
                <Input
                  value={form.bairro || ''}
                  onChange={event => setField('bairro', event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Cidade</FormLabel>
                <Input
                  value={form.cidade || ''}
                  onChange={event => setField('cidade', event.target.value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Estado (UF)</FormLabel>
                <Input
                  maxLength={2}
                  textTransform="uppercase"
                  value={form.estado || ''}
                  onChange={event => setField('estado', event.target.value)}
                />
              </FormControl>
            </SimpleGrid>
          </DrawerBody>
          <DrawerFooter borderTop="1px solid" borderColor="erp.border">
            <Button variant="ghost" mr={3} onClick={formDrawer.onClose}>
              Cancelar
            </Button>
            <Button
              isDisabled={form.razao_social.trim().length < 3}
              isLoading={save.isPending}
              onClick={() => save.mutate()}
            >
              {editingId ? 'Salvar alteracoes' : 'Criar fornecedor'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <Flex
      py={2.5}
      justify="space-between"
      gap={4}
      borderBottom="1px solid"
      borderColor="erp.border"
    >
      <Text fontSize="12px" color="erp.textMuted">
        {label}
      </Text>
      <Text fontSize="12px" fontWeight="600" textAlign="right">
        {value || '-'}
      </Text>
    </Flex>
  );
}

function SupplierDetailDrawer({
  disclosure,
  detail,
  loading,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: SupplierDetail;
  loading: boolean;
}) {
  return (
    <Drawer
      isOpen={disclosure.isOpen}
      placement="right"
      size="lg"
      onClose={disclosure.onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {detail?.nome_fantasia || detail?.razao_social || 'Fornecedor'}
          {detail && (
            <Flex align="center" gap={2} mt={1}>
              <StatusBadge status={detail.situacao} />
              <Text fontSize="12px" color="erp.textSecondary">
                {detail.documento
                  ? formatDocument(detail.documento)
                  : 'Sem documento'}
              </Text>
            </Flex>
          )}
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack spacing={4}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Box
                  key={index}
                  h="48px"
                  w="full"
                  bg="erp.surfaceSubtle"
                  borderRadius="8px"
                />
              ))}
            </VStack>
          ) : (
            <>
              <DetailRow label="Razao social" value={detail.razao_social} />
              <DetailRow
                label="Telefone"
                value={formatPhone(detail.telefone)}
              />
              <DetailRow label="E-mail" value={detail.email} />
              <DetailRow
                label="Endereco"
                value={
                  detail.cidade
                    ? `${detail.endereco || ''} ${detail.numero || ''} - ${detail.cidade}/${detail.estado}`
                    : '-'
                }
              />
              <DetailRow
                label="Total comprado"
                value={formatCurrency(detail.total_comprado)}
              />
              <DetailRow
                label="Cadastro"
                value={formatDateTime(detail.criado_em)}
              />

              <Text
                fontSize="10px"
                fontWeight="700"
                color="erp.textMuted"
                textTransform="uppercase"
                mt={6}
                mb={2}
              >
                Compras recentes
              </Text>
              {detail.purchases.length ? (
                <VStack align="stretch" spacing={2}>
                  {detail.purchases.map(purchase => (
                    <Flex
                      key={purchase.idcompra}
                      p={3}
                      border="1px solid"
                      borderColor="erp.border"
                      borderRadius="8px"
                      justify="space-between"
                      align="center"
                    >
                      <Box>
                        <Text fontSize="12px" fontWeight="700">
                          Compra #{purchase.idcompra}
                        </Text>
                        <Text fontSize="10px" color="erp.textMuted">
                          {purchase.filial} ·{' '}
                          {formatDateTime(purchase.data_compra)}
                        </Text>
                      </Box>
                      <Flex align="center" gap={2}>
                        <Text fontSize="12px" fontWeight="700">
                          {formatCurrency(purchase.valor_total)}
                        </Text>
                        <Badge
                          colorScheme={
                            purchase.situacao === 1 ? 'green' : 'red'
                          }
                          textTransform="none"
                        >
                          {purchase.situacao === 1 ? 'Concluida' : 'Cancelada'}
                        </Badge>
                      </Flex>
                    </Flex>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="12px" color="erp.textMuted">
                  Nenhuma compra registrada para este fornecedor.
                </Text>
              )}
            </>
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="ghost" onClick={disclosure.onClose}>
            Fechar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
