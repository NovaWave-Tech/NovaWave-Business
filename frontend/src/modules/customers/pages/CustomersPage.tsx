import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Grid,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Portal,
  Select,
  SimpleGrid,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Table,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tooltip,
  Tr,
  VStack,
  useBreakpointValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertTriangle,
  Ban,
  Banknote,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Eye,
  FileText,
  History,
  MapPin,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import {
  Controller,
  useForm,
  type FieldErrors,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { FilterSelect } from '../../../shared/ui/FilterSelect';
import { DateRangeField } from '../../../shared/ui/DateRangeField';
import { Reveal } from '../../../shared/ui/motion';
import FormattedInput, {
  CurrencyInput,
} from '../../../shared/ui/FormattedInput';
import {
  formatCep,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDocument,
  formatNumber,
  formatPhone,
} from '../../../shared/utils/formatters';
import { customerSchema, type CustomerForm } from '../schemas/customerSchema';
import {
  customerService,
  type Customer,
  type CustomerDetail,
} from '../services/customerService';

const MotionBox = motion(Box);
const steps = [
  'Tipo de cliente',
  'Dados principais',
  'Endereco',
  'Dados comerciais',
  'Revisao',
];
const defaults: CustomerForm = {
  tipo_pessoa: 1,
  nome: '',
  nome_fantasia: '',
  rg: '',
  inscricao_estadual: '',
  data_nascimento_abertura: '',
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
  limite_credito: 0,
  situacao: true,
  recorrente: false,
  permite_venda_prazo: false,
  observacao: '',
};

function CustomerBadges({ customer }: { customer: Customer }) {
  const isNew =
    Date.now() - new Date(customer.criado_em).getTime() < 30 * 86400000;
  const recurring = customer.recorrente || Number(customer.purchases) >= 2;
  return (
    <Flex gap={1.5} wrap="wrap">
      <Badge colorScheme={customer.situacao ? 'green' : 'red'}>
        {customer.situacao ? 'Ativo' : 'Inativo'}
      </Badge>
      {Number(customer.overdue) > 0 && (
        <Badge colorScheme="orange">Inadimplente</Badge>
      )}
      {recurring && <Badge colorScheme="blue">Recorrente</Badge>}
      {isNew && <Badge colorScheme="cyan">Novo</Badge>}
      {!Number(customer.purchases) && (
        <Badge colorScheme="gray">Sem compras</Badge>
      )}
    </Flex>
  );
}

function Info({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <Flex
      py={2.5}
      justify="space-between"
      gap={4}
      borderBottom="1px solid"
      borderColor="erp.border"
    >
      <Text fontSize="11px" color="erp.textMuted">
        {label}
      </Text>
      <Text fontSize="12px" fontWeight="600" textAlign="right">
        {value || '-'}
      </Text>
    </Flex>
  );
}

export default function CustomersPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const client = useQueryClient();
  const detailDrawer = useDisclosure();
  const formDrawer = useDisclosure();
  const noteModal = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, lg: false });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [noteCustomer, setNoteCustomer] = useState<Customer | null>(null);
  const [note, setNote] = useState('');
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState({
    q: '',
    type: '',
    status: '',
    city: '',
    state: '',
    purchases: '',
    delinquent: '',
    credit: '',
    last_purchase_start: '',
    last_purchase_end: '',
    registered_start: '',
    registered_end: '',
  });
  const form = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema) as Resolver<CustomerForm>,
    defaultValues: defaults,
  });
  const list = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customerService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['customer', selectedId],
    queryFn: () => customerService.detail(selectedId!),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data = list.data;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['customers'] });
    if (selectedId)
      await client.invalidateQueries({ queryKey: ['customer', selectedId] });
  };
  const save = useMutation({
    mutationFn: (values: CustomerForm) =>
      editingId
        ? customerService.update(editingId, values)
        : customerService.create(values),
    onSuccess: async () => {
      await refresh();
      formDrawer.onClose();
      form.reset(defaults);
      setEditingId(null);
      setStep(0);
      toast({
        title: editingId ? 'Cliente atualizado' : 'Cliente criado',
        status: 'success',
      });
    },
    onError: notifyError,
  });
  const status = useMutation({
    mutationFn: ({ id, value }: { id: number; value: number }) =>
      customerService.status(id, value),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: notifyError,
  });
  const addNote = useMutation({
    mutationFn: () => customerService.note(noteCustomer!.idcliente, note),
    onSuccess: async () => {
      await refresh();
      noteModal.onClose();
      setNote('');
      toast({ title: 'Observacao adicionada', status: 'success' });
    },
    onError: notifyError,
  });

  const openDetail = (customer: Customer) => {
    setSelectedId(customer.idcliente);
    detailDrawer.onOpen();
  };
  const openCreate = () => {
    setEditingId(null);
    setStep(0);
    form.reset(defaults);
    formDrawer.onOpen();
  };
  const openEdit = async (customer: Customer) => {
    try {
      const current = await customerService.detail(customer.idcliente);
      setEditingId(customer.idcliente);
      setStep(0);
      form.reset({
        tipo_pessoa: Number(current.tipo_pessoa),
        nome: current.nome,
        nome_fantasia: current.nome_fantasia || '',
        rg: current.rg || '',
        inscricao_estadual: current.inscricao_estadual || '',
        data_nascimento_abertura: current.data_nascimento_abertura || '',
        documento: current.documento,
        email: current.email || '',
        telefone: current.telefone || '',
        cep: current.cep || '',
        endereco: current.endereco || '',
        numero: current.numero || '',
        complemento: current.complemento || '',
        bairro: current.bairro || '',
        cidade: current.cidade || '',
        estado: current.estado || '',
        limite_credito: Number(current.limite_credito),
        situacao: Boolean(current.situacao),
        recorrente: current.recorrente,
        permite_venda_prazo: current.permite_venda_prazo,
        observacao: '',
      });
      formDrawer.onOpen();
    } catch (error) {
      notifyError(error);
    }
  };
  const openNote = (customer: Customer) => {
    setNoteCustomer(customer);
    setNote('');
    noteModal.onOpen();
  };
  const clear = () =>
    setFilters({
      q: '',
      type: '',
      status: '',
      city: '',
      state: '',
      purchases: '',
      delinquent: '',
      credit: '',
      last_purchase_start: '',
      last_purchase_end: '',
      registered_start: '',
      registered_end: '',
    });

  return (
    <Box>
      <PageHeader
        icon={Users}
        title="Clientes"
        description="Gerencie sua base de clientes, contatos, historico comercial e relacionamento."
        breadcrumbs={[{ label: 'Comercial' }, { label: 'Clientes' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Novo cliente
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 6 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Total de clientes"
          count={Number(data?.metrics.total)}
          format={formatNumber}
          detail="Base cadastrada"
          icon={Users}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Clientes ativos"
          count={Number(data?.metrics.active)}
          format={formatNumber}
          detail="Relacionamento ativo"
          icon={UserCheck}
        />
        <KpiCard
          index={2}
          tone="neutral"
          label="Clientes inativos"
          count={Number(data?.metrics.inactive)}
          format={formatNumber}
          detail="Sem operacao"
          icon={UserRoundX}
        />
        <KpiCard
          index={3}
          tone="info"
          label="Receita gerada"
          count={Number(data?.metrics.revenue)}
          format={value => formatCurrency(value, { compact: true })}
          detail="Historico de vendas"
          icon={CircleDollarSign}
        />
        <KpiCard
          index={4}
          tone="brand"
          label="Com compras"
          count={Number(data?.metrics.buyers)}
          format={formatNumber}
          detail="Clientes convertidos"
          icon={ReceiptText}
        />
        <KpiCard
          index={5}
          tone="warning"
          label="Inadimplentes"
          count={Number(data?.metrics.delinquent)}
          format={formatNumber}
          detail="Precisam de atencao"
          icon={AlertTriangle}
        />
      </SimpleGrid>

      <BrandSurface p={4} mb={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(260px,1fr) repeat(5,minmax(115px,.4fr)) auto',
          }}
          gap={3}
        >
          <InputGroup>
            <InputLeftElement>
              <Search size={16} />
            </InputLeftElement>
            <Input
              value={filters.q}
              onChange={event =>
                setFilters(v => ({ ...v, q: event.target.value }))
              }
              placeholder="Buscar por nome, CPF, CNPJ, telefone, e-mail ou cidade..."
            />
          </InputGroup>
          <FilterSelect
            label="Tipo de pessoa"
            value={filters.type}
            onChange={v => setFilters(x => ({ ...x, type: v }))}
            options={[
              { value: '', label: 'Tipo' },
              { value: '1', label: 'Pessoa fisica' },
              { value: '2', label: 'Pessoa juridica' },
            ]}
          />
          <FilterSelect
            label="Situacao"
            value={filters.status}
            onChange={v => setFilters(x => ({ ...x, status: v }))}
            options={[
              { value: '', label: 'Situacao' },
              { value: '1', label: 'Ativos' },
              { value: '0', label: 'Inativos' },
            ]}
          />
          <FilterSelect
            label="Cidade"
            value={filters.city}
            onChange={v => setFilters(x => ({ ...x, city: v }))}
            options={[
              { value: '', label: 'Cidade' },
              ...(data?.options.cities.map(item => ({
                value: item.nome,
                label: item.nome,
              })) ?? []),
            ]}
          />
          <FilterSelect
            label="Estado"
            value={filters.state}
            onChange={v => setFilters(x => ({ ...x, state: v }))}
            options={[
              { value: '', label: 'Estado' },
              ...(data?.options.states.map(item => ({
                value: item.nome,
                label: item.nome,
              })) ?? []),
            ]}
          />
          <FilterSelect
            label="Compras"
            value={filters.purchases}
            onChange={v => setFilters(x => ({ ...x, purchases: v }))}
            options={[
              { value: '', label: 'Compras' },
              { value: 'with', label: 'Com compras' },
              { value: 'without', label: 'Sem compras' },
            ]}
          />
          <Menu closeOnSelect={false}>
            <MenuButton
              as={Button}
              variant="outline"
              leftIcon={<FileText size={15} />}
            >
              Mais filtros
            </MenuButton>
            <Portal>
              <MenuList minW="260px" zIndex={1500}>
                <MenuFilterOption
                  label="Financeiro"
                  value={filters.delinquent}
                  onChange={value =>
                    setFilters(v => ({ ...v, delinquent: value }))
                  }
                  options={[['1', 'Inadimplentes']]}
                />
                <MenuFilterOption
                  label="Limite de credito"
                  value={filters.credit}
                  onChange={value => setFilters(v => ({ ...v, credit: value }))}
                  options={[
                    ['with', 'Com limite'],
                    ['without', 'Sem limite'],
                  ]}
                />
                <Box px={3} py={2}>
                  <Text mb={1} fontSize="10px" color="erp.textMuted">
                    Ultima compra
                  </Text>
                  <DateRangeField
                    size="sm"
                    direction="column"
                    align="stretch"
                    value={{
                      start: filters.last_purchase_start,
                      end: filters.last_purchase_end,
                    }}
                    onChange={next =>
                      setFilters(v => ({
                        ...v,
                        last_purchase_start: next.start,
                        last_purchase_end: next.end,
                      }))
                    }
                  />
                </Box>
                <Box px={3} py={2}>
                  <Text mb={1} fontSize="10px" color="erp.textMuted">
                    Cadastro
                  </Text>
                  <DateRangeField
                    size="sm"
                    direction="column"
                    align="stretch"
                    value={{
                      start: filters.registered_start,
                      end: filters.registered_end,
                    }}
                    onChange={next =>
                      setFilters(v => ({
                        ...v,
                        registered_start: next.start,
                        registered_end: next.end,
                      }))
                    }
                  />
                </Box>
              </MenuList>
            </Portal>
          </Menu>
          <Button variant="ghost" onClick={clear}>
            Limpar
          </Button>
        </Grid>
      </BrandSurface>

      {list.isError ? (
        <Surface>
          <ErrorState retry={() => void list.refetch()} />
        </Surface>
      ) : list.isLoading ? (
        <Surface p={5}>
          <VStack>
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} h="58px" w="full" />
            ))}
          </VStack>
        </Surface>
      ) : data?.customers.length ? (
        isMobile ? (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            {data.customers.map((customer, index) => (
              <MotionBox
                key={customer.idcliente}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <CustomerCard
                  customer={customer}
                  openDetail={openDetail}
                  openEdit={openEdit}
                  openNote={openNote}
                  setStatus={(id, value) => status.mutate({ id, value })}
                  navigate={navigate}
                />
              </MotionBox>
            ))}
          </SimpleGrid>
        ) : (
          <Reveal>
            <Surface overflow="hidden">
              <SectionHeader
                icon={Users}
                eyebrow="Base de clientes"
                title="Clientes cadastrados"
                description={`${formatNumber(data.customers.length)} ${
                  data.customers.length === 1
                    ? 'cliente listado'
                    : 'clientes listados'
                }`}
              />
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Cliente</Th>
                      <Th>Documento</Th>
                      <Th>Tipo</Th>
                      <Th>Telefone</Th>
                      <Th>Cidade/UF</Th>
                      <Th isNumeric>Limite</Th>
                      <Th isNumeric>Total comprado</Th>
                      <Th>Ultima compra</Th>
                      <Th>Status</Th>
                      <Th w="48px" />
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data.customers.map(customer => (
                      <Tr
                        key={customer.idcliente}
                        cursor="pointer"
                        onClick={() => openDetail(customer)}
                      >
                        <Td>
                          <Flex gap={3} align="center">
                            <Avatar
                              size="sm"
                              name={customer.nome}
                              bg="brand.700"
                            />
                            <Box>
                              <Text fontWeight="650">{customer.nome}</Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                {customer.email || 'Sem e-mail'}
                              </Text>
                            </Box>
                          </Flex>
                        </Td>
                        <Td whiteSpace="nowrap">
                          {formatDocument(customer.documento)}
                        </Td>
                        <Td>
                          <Badge>
                            {Number(customer.tipo_pessoa) === 1 ? 'PF' : 'PJ'}
                          </Badge>
                        </Td>
                        <Td whiteSpace="nowrap">
                          {formatPhone(customer.telefone)}
                        </Td>
                        <Td whiteSpace="nowrap">
                          {customer.cidade
                            ? `${customer.cidade}/${customer.estado}`
                            : '-'}
                        </Td>
                        <Td isNumeric>
                          {formatCurrency(customer.limite_credito)}
                        </Td>
                        <Td isNumeric>
                          {formatCurrency(customer.total_bought)}
                        </Td>
                        <Td whiteSpace="nowrap">
                          {formatDate(customer.last_purchase, 'Sem compras')}
                        </Td>
                        <Td>
                          <CustomerBadges customer={customer} />
                        </Td>
                        <Td onClick={event => event.stopPropagation()}>
                          <CustomerMenu
                            customer={customer}
                            openDetail={openDetail}
                            openEdit={openEdit}
                            openNote={openNote}
                            setStatus={(id, value) =>
                              status.mutate({ id, value })
                            }
                            navigate={navigate}
                          />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            </Surface>
          </Reveal>
        )
      ) : (
        <Surface>
          <EmptyState
            title={
              Object.values(filters).some(Boolean)
                ? 'Nenhum cliente encontrado'
                : 'Nenhum cliente cadastrado'
            }
            description="Ajuste os filtros ou cadastre o primeiro cliente da empresa."
            icon={Users}
            action={openCreate}
            actionLabel="Novo cliente"
          />
        </Surface>
      )}

      <DetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
        navigate={navigate}
      />
      <CustomerFormDrawer
        disclosure={formDrawer}
        form={form}
        step={step}
        setStep={setStep}
        editing={Boolean(editingId)}
        saving={save.isPending}
        submit={values => save.mutate(values)}
      />
      <Modal isOpen={noteModal.isOpen} onClose={noteModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Adicionar observacao</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={3} fontSize="12px" color="erp.textSecondary">
              Registre um contato ou informacao relevante sobre{' '}
              {noteCustomer?.nome}.
            </Text>
            <Textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              maxLength={1000}
              rows={5}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={noteModal.onClose}>
              Cancelar
            </Button>
            <Button
              isDisabled={note.trim().length < 3}
              isLoading={addNote.isPending}
              onClick={() => addNote.mutate()}
            >
              Adicionar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function MenuFilterOption({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<[string, string]>;
}) {
  return (
    <Box px={3} py={2}>
      <Text mb={1} fontSize="10px" color="erp.textMuted">
        {label}
      </Text>
      <Select
        size="sm"
        value={value}
        onChange={event => onChange(event.target.value)}
      >
        <option value="">Todos</option>
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </Select>
    </Box>
  );
}

function CustomerCard({
  customer,
  openDetail,
  openEdit,
  openNote,
  setStatus,
  navigate,
}: CustomerActions) {
  return (
    <Surface interactive p={4}>
      <Flex justify="space-between" align="start">
        <Flex gap={3}>
          <Avatar size="sm" name={customer.nome} bg="brand.700" />
          <Box>
            <Text fontWeight="700">{customer.nome}</Text>
            <Text fontSize="10px" color="erp.textMuted">
              {formatDocument(customer.documento)}
            </Text>
          </Box>
        </Flex>
        <CustomerMenu
          {...{ customer, openDetail, openEdit, openNote, setStatus, navigate }}
        />
      </Flex>
      <Box mt={3}>
        <CustomerBadges customer={customer} />
      </Box>
      <SimpleGrid columns={2} spacing={3} mt={4}>
        <Info label="Telefone" value={formatPhone(customer.telefone)} />
        <Info
          label="Cidade"
          value={
            customer.cidade ? `${customer.cidade}/${customer.estado}` : '-'
          }
        />
        <Info
          label="Total comprado"
          value={formatCurrency(customer.total_bought)}
        />
        <Info
          label="Ultima compra"
          value={formatDate(customer.last_purchase, 'Nunca')}
        />
      </SimpleGrid>
      <Button
        mt={3}
        size="sm"
        variant="ghost"
        leftIcon={<Eye size={14} />}
        onClick={() => openDetail(customer)}
      >
        Ver detalhes
      </Button>
    </Surface>
  );
}

type CustomerActions = {
  customer: Customer;
  openDetail: (customer: Customer) => void;
  openEdit: (customer: Customer) => Promise<void>;
  openNote: (customer: Customer) => void;
  setStatus: (id: number, value: number) => void;
  navigate: (path: string) => void;
};
function CustomerMenu({
  customer,
  openDetail,
  openEdit,
  openNote,
  setStatus,
  navigate,
}: CustomerActions) {
  return (
    <Menu>
      <Tooltip label="Acoes">
        <MenuButton
          as={IconButton}
          aria-label="Acoes do cliente"
          icon={<MoreHorizontal size={17} />}
          size="sm"
          variant="ghost"
        />
      </Tooltip>
      <MenuList>
        <MenuItem icon={<Eye size={15} />} onClick={() => openDetail(customer)}>
          Visualizar
        </MenuItem>
        <MenuItem
          icon={<Pencil size={15} />}
          onClick={() => void openEdit(customer)}
        >
          Editar
        </MenuItem>
        <MenuItem
          icon={<Plus size={15} />}
          onClick={() => navigate(`/sales?customer=${customer.idcliente}`)}
        >
          Nova venda
        </MenuItem>
        <MenuItem
          icon={<ShoppingBag size={15} />}
          onClick={() => navigate(`/sales?customer=${customer.idcliente}`)}
        >
          Ver compras
        </MenuItem>
        <MenuItem
          icon={<Banknote size={15} />}
          onClick={() => navigate(`/finance?customer=${customer.idcliente}`)}
        >
          Ver financeiro
        </MenuItem>
        <MenuItem
          icon={<MessageSquarePlus size={15} />}
          onClick={() => openNote(customer)}
        >
          Adicionar observacao
        </MenuItem>
        <MenuDivider />
        <MenuItem
          icon={<Ban size={15} />}
          color={customer.situacao ? 'erp.danger' : 'erp.success'}
          onClick={() =>
            setStatus(customer.idcliente, customer.situacao ? 0 : 1)
          }
        >
          {customer.situacao ? 'Inativar' : 'Reativar'}
        </MenuItem>
        <Tooltip label="Exclusao bloqueada para preservar o historico">
          <MenuItem isDisabled icon={<Trash2 size={15} />}>
            Excluir
          </MenuItem>
        </Tooltip>
      </MenuList>
    </Menu>
  );
}

function DetailDrawer({
  disclosure,
  detail,
  loading,
  navigate,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: CustomerDetail;
  loading: boolean;
  navigate: (path: string) => void;
}) {
  const financialStatus =
    Number(detail?.financial.overdue) > 0
      ? 'Inadimplente'
      : Number(detail?.financial.open_balance) > 0
        ? 'Em aberto'
        : 'Regular';
  return (
    <Drawer
      isOpen={disclosure.isOpen}
      placement="right"
      size="xl"
      onClose={disclosure.onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {detail?.nome || 'Detalhes do cliente'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            {detail
              ? `${Number(detail.tipo_pessoa) === 1 ? 'Pessoa fisica' : 'Pessoa juridica'} · ${formatDocument(detail.documento)}`
              : 'Carregando relacionamento'}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack>
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={index} h="48px" w="full" />
              ))}
            </VStack>
          ) : (
            <>
              <Flex align="center" gap={3} mb={5}>
                <Avatar size="lg" name={detail.nome} bg="brand.700" />
                <Box>
                  <Text fontSize="18px" fontWeight="700">
                    {detail.nome}
                  </Text>
                  <CustomerBadges customer={detail} />
                </Box>
              </Flex>
              <Tabs variant="line">
                <TabList overflowX="auto">
                  <Tab>Visao geral</Tab>
                  <Tab>Enderecos</Tab>
                  <Tab>Compras</Tab>
                  <Tab>Financeiro</Tab>
                  <Tab>Relacionamento</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <Info label="Nome" value={detail.nome} />
                    {Number(detail.tipo_pessoa) === 2 && (
                      <Info
                        label="Nome fantasia"
                        value={detail.nome_fantasia}
                      />
                    )}
                    <Info
                      label="Tipo"
                      value={
                        Number(detail.tipo_pessoa) === 1
                          ? 'Pessoa fisica'
                          : 'Pessoa juridica'
                      }
                    />
                    <Info
                      label="Documento"
                      value={formatDocument(detail.documento)}
                    />
                    <Info
                      label="Telefone"
                      value={formatPhone(detail.telefone)}
                    />
                    <Info label="E-mail" value={detail.email} />
                    <Info
                      label="Nascimento/abertura"
                      value={formatDate(detail.data_nascimento_abertura)}
                    />
                    <Info
                      label={
                        Number(detail.tipo_pessoa) === 1
                          ? 'RG'
                          : 'Inscricao estadual'
                      }
                      value={
                        Number(detail.tipo_pessoa) === 1
                          ? detail.rg
                          : detail.inscricao_estadual
                      }
                    />
                    <Info
                      label="Situacao"
                      value={detail.situacao ? 'Ativo' : 'Inativo'}
                    />
                    <Info
                      label="Cidade/UF"
                      value={
                        detail.cidade
                          ? `${detail.cidade}/${detail.estado}`
                          : '-'
                      }
                    />
                    <Info
                      label="Limite de credito"
                      value={formatCurrency(detail.limite_credito)}
                    />
                    <Info
                      label="Cliente recorrente"
                      value={detail.recorrente ? 'Sim' : 'Nao'}
                    />
                    <Info
                      label="Venda a prazo"
                      value={detail.permite_venda_prazo ? 'Permitida' : 'Nao'}
                    />
                    <Info
                      label="Cadastro"
                      value={formatDateTime(detail.criado_em)}
                    />
                    <Info
                      label="Atualizacao"
                      value={formatDateTime(detail.atualizado_em)}
                    />
                    <Info
                      label="Observacao recente"
                      value={detail.latest_note || 'Nenhuma observacao'}
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    <BrandSurface p={4}>
                      <Flex gap={3} align="center">
                        <MapPin size={17} />
                        <Box>
                          <Text fontSize="12px" fontWeight="700">
                            Endereco principal
                          </Text>
                          <Text fontSize="10px" color="erp.textMuted">
                            Estrutura preparada para multiplos enderecos
                          </Text>
                        </Box>
                      </Flex>
                      <Box mt={3}>
                        <Info label="CEP" value={formatCep(detail.cep)} />
                        <Info label="Endereco" value={detail.endereco} />
                        <Info label="Numero" value={detail.numero} />
                        <Info label="Complemento" value={detail.complemento} />
                        <Info label="Bairro" value={detail.bairro} />
                        <Info
                          label="Cidade/UF"
                          value={
                            detail.cidade
                              ? `${detail.cidade}/${detail.estado}`
                              : '-'
                          }
                        />
                      </Box>
                    </BrandSurface>
                  </TabPanel>
                  <TabPanel px={0}>
                    <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3} mb={5}>
                      {[
                        [
                          'Total comprado',
                          formatCurrency(detail.summary.total_bought),
                        ],
                        ['Compras', formatNumber(detail.summary.purchases)],
                        [
                          'Ticket medio',
                          formatCurrency(detail.summary.average_ticket),
                        ],
                        [
                          'Ultima compra',
                          formatDate(detail.summary.last_purchase, 'Nunca'),
                        ],
                      ].map(([label, value]) => (
                        <Surface key={label} p={3}>
                          <Text fontSize="9px" color="erp.textMuted">
                            {label}
                          </Text>
                          <Text mt={1} fontSize="14px" fontWeight="700">
                            {value}
                          </Text>
                        </Surface>
                      ))}
                    </SimpleGrid>
                    {detail.sales.length ? (
                      <VStack align="stretch" spacing={2}>
                        {detail.sales.map(sale => (
                          <Flex
                            key={sale.idvenda}
                            p={3}
                            border="1px solid"
                            borderColor="erp.border"
                            borderRadius="8px"
                            justify="space-between"
                            align="center"
                          >
                            <Box>
                              <Text fontSize="12px" fontWeight="700">
                                Venda #{sale.idvenda}
                              </Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                {formatDateTime(sale.data_venda)}
                              </Text>
                            </Box>
                            <Flex align="center" gap={3}>
                              <Text fontSize="12px" fontWeight="700">
                                {formatCurrency(sale.valor_total)}
                              </Text>
                              <Badge
                                colorScheme={
                                  sale.situacao === 1 ? 'green' : 'gray'
                                }
                              >
                                {sale.situacao === 1
                                  ? 'Concluida'
                                  : 'Outro status'}
                              </Badge>
                              <IconButton
                                aria-label="Abrir venda"
                                icon={<Eye size={14} />}
                                size="xs"
                                variant="ghost"
                                onClick={() =>
                                  navigate(`/sales?sale=${sale.idvenda}`)
                                }
                              />
                            </Flex>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Sem compras"
                        description="As vendas deste cliente aparecerao aqui."
                        icon={ShoppingBag}
                      />
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    <Info
                      label="Limite de credito"
                      value={formatCurrency(detail.limite_credito)}
                    />
                    <Info
                      label="Saldo em aberto"
                      value={formatCurrency(detail.financial.open_balance)}
                    />
                    <Info
                      label="Contas vencidas"
                      value={formatNumber(detail.financial.overdue)}
                    />
                    <Info
                      label="Contas a vencer"
                      value={formatNumber(detail.financial.upcoming)}
                    />
                    <Info
                      label="Ultimo pagamento"
                      value={formatDate(detail.financial.last_payment)}
                    />
                    <Info
                      label="Status financeiro"
                      value={
                        <Badge
                          colorScheme={
                            financialStatus === 'Inadimplente'
                              ? 'orange'
                              : 'green'
                          }
                        >
                          {financialStatus}
                        </Badge>
                      }
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.timeline.length ? (
                      <VStack align="stretch" spacing={0}>
                        {detail.timeline.map((item, index) => (
                          <Flex
                            key={`${item.criado_em}-${index}`}
                            gap={3}
                            pb={5}
                          >
                            <Flex
                              w="24px"
                              h="24px"
                              align="center"
                              justify="center"
                              borderRadius="full"
                              bg="erp.brandSoft"
                              color="erp.brandText"
                            >
                              {item.source === 'sale' ? (
                                <ShoppingBag size={12} />
                              ) : (
                                <History size={12} />
                              )}
                            </Flex>
                            <Box>
                              <Text fontSize="12px" fontWeight="650">
                                {item.title.replaceAll('_', ' ')}
                              </Text>
                              {item.detail && (
                                <Text fontSize="11px" color="erp.textSecondary">
                                  {item.detail}
                                </Text>
                              )}
                              <Text fontSize="10px" color="erp.textMuted">
                                {formatDateTime(item.criado_em)}
                              </Text>
                            </Box>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Sem eventos"
                        description="Contatos, compras e alteracoes aparecerao aqui."
                        icon={History}
                      />
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}

function CustomerFormDrawer({
  disclosure,
  form,
  step,
  setStep,
  editing,
  saving,
  submit,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  form: UseFormReturn<CustomerForm>;
  step: number;
  setStep: (step: number) => void;
  editing: boolean;
  saving: boolean;
  submit: (values: CustomerForm) => void;
}) {
  const toast = useToast();
  const watched = form.watch();
  const canAdvance = step !== 1 || Boolean(watched.nome && watched.documento);
  const stepOfField: Partial<Record<keyof CustomerForm, number>> = {
    tipo_pessoa: 0,
    nome: 1,
    nome_fantasia: 1,
    rg: 1,
    inscricao_estadual: 1,
    data_nascimento_abertura: 1,
    documento: 1,
    email: 1,
    telefone: 1,
    cep: 2,
    endereco: 2,
    numero: 2,
    complemento: 2,
    bairro: 2,
    cidade: 2,
    estado: 2,
    limite_credito: 3,
    observacao: 3,
  };
  const goNext = async () => {
    if (step === 1) {
      const ok = await form.trigger(['nome', 'documento', 'email', 'telefone']);
      if (!ok) return;
    }
    setStep(step + 1);
  };
  const onInvalid = (errors: FieldErrors<CustomerForm>) => {
    const firstField = Object.keys(errors)[0] as keyof CustomerForm;
    const message = (errors[firstField] as { message?: string } | undefined)
      ?.message;
    setStep(stepOfField[firstField] ?? 1);
    toast({
      title: 'Revise os campos destacados',
      description: message || 'Ha campos invalidos no cadastro.',
      status: 'error',
      position: 'top-right',
    });
  };
  return (
    <Drawer
      isOpen={disclosure.isOpen}
      placement="right"
      size="xl"
      onClose={disclosure.onClose}
    >
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader>
          {editing ? 'Editar cliente' : 'Novo cliente'}
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            Etapa {step + 1} de {steps.length}: {steps[step]}
          </Text>
        </DrawerHeader>
        <DrawerBody>
          <Grid
            templateColumns={{ base: '1fr', lg: 'minmax(0,1fr) 245px' }}
            gap={6}
          >
            <Box>
              <Flex gap={1} mb={6}>
                {steps.map((label, index) => (
                  <Tooltip key={label} label={label}>
                    <Box
                      flex="1"
                      h="4px"
                      borderRadius="full"
                      bg={index <= step ? 'brand.500' : 'erp.border'}
                    />
                  </Tooltip>
                ))}
              </Flex>
              <AnimatePresence>
                <MotionBox
                  key={step}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                >
                  <CustomerStep step={step} form={form} />
                </MotionBox>
              </AnimatePresence>
            </Box>
            <Surface p={4} h="fit-content" bg="erp.surfaceSubtle">
              <Text fontSize="12px" fontWeight="700">
                Resumo do cliente
              </Text>
              <Info
                label="Tipo"
                value={
                  Number(watched.tipo_pessoa) === 1
                    ? 'Pessoa fisica'
                    : 'Pessoa juridica'
                }
              />
              <Info label="Nome" value={watched.nome} />
              <Info
                label="Documento"
                value={formatDocument(watched.documento)}
              />
              <Info label="Telefone" value={formatPhone(watched.telefone)} />
              <Info
                label="Cidade/UF"
                value={
                  watched.cidade ? `${watched.cidade}/${watched.estado}` : '-'
                }
              />
              <Info
                label="Limite"
                value={formatCurrency(watched.limite_credito)}
              />
              <Info
                label="Status"
                value={watched.situacao ? 'Ativo' : 'Inativo'}
              />
            </Surface>
          </Grid>
        </DrawerBody>
        <DrawerFooter>
          <Button
            variant="ghost"
            mr={3}
            leftIcon={step > 0 ? <ChevronLeft size={15} /> : undefined}
            onClick={step === 0 ? disclosure.onClose : () => setStep(step - 1)}
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < steps.length - 1 ? (
            <Button
              rightIcon={<ChevronRight size={15} />}
              isDisabled={!canAdvance}
              onClick={() => void goNext()}
            >
              Continuar
            </Button>
          ) : (
            <Button
              leftIcon={<Check size={15} />}
              isLoading={saving}
              onClick={form.handleSubmit(submit, onInvalid)}
            >
              Salvar cliente
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function CustomerStep({
  step,
  form,
}: {
  step: number;
  form: UseFormReturn<CustomerForm>;
}) {
  const type = Number(form.watch('tipo_pessoa'));
  const errors = form.formState.errors;
  if (step === 0)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <TypeOption
          active={type === 1}
          icon={Users}
          title="Pessoa fisica"
          description="Cliente identificado por CPF"
          onClick={() => form.setValue('tipo_pessoa', 1)}
        />
        <TypeOption
          active={type === 2}
          icon={FileText}
          title="Pessoa juridica"
          description="Empresa identificada por CNPJ"
          onClick={() => form.setValue('tipo_pessoa', 2)}
        />
      </SimpleGrid>
    );
  if (step === 1)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Field
          label={type === 1 ? 'Nome completo' : 'Razao social'}
          error={errors.nome?.message}
          required
        >
          <Input {...form.register('nome')} />
        </Field>
        <Controller
          control={form.control}
          name="documento"
          render={({ field }) => (
            <Field
              label={type === 1 ? 'CPF' : 'CNPJ'}
              error={errors.documento?.message}
              required
            >
              <FormattedInput
                mask={type === 1 ? 'cpf' : 'cnpj'}
                value={field.value}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        {type === 1 ? (
          <Field label="RG">
            <Input {...form.register('rg')} />
          </Field>
        ) : (
          <Field label="Nome fantasia">
            <Input {...form.register('nome_fantasia')} />
          </Field>
        )}
        <FormControl>
          <FormLabel>
            {type === 1 ? 'Data de nascimento' : 'Data de abertura'}
          </FormLabel>
          <Input type="date" {...form.register('data_nascimento_abertura')} />
        </FormControl>
        {type === 2 && (
          <Field label="Inscricao estadual">
            <Input {...form.register('inscricao_estadual')} />
          </Field>
        )}
        <Controller
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <Field label="Telefone / celular" error={errors.telefone?.message}>
              <FormattedInput
                mask="phone"
                value={field.value}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="E-mail" error={errors.email?.message}>
          <Input type="email" {...form.register('email')} />
        </Field>
      </SimpleGrid>
    );
  if (step === 2)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <Controller
          control={form.control}
          name="cep"
          render={({ field }) => (
            <Field label="CEP" error={errors.cep?.message}>
              <FormattedInput
                mask="cep"
                value={field.value}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="Endereco">
          <Input {...form.register('endereco')} />
        </Field>
        <Field label="Numero">
          <Input {...form.register('numero')} />
        </Field>
        <Field label="Complemento">
          <Input {...form.register('complemento')} />
        </Field>
        <Field label="Bairro">
          <Input {...form.register('bairro')} />
        </Field>
        <Field label="Cidade">
          <Input {...form.register('cidade')} />
        </Field>
        <Field label="Estado" error={errors.estado?.message}>
          <Input
            maxLength={2}
            textTransform="uppercase"
            {...form.register('estado')}
          />
        </Field>
        <Text alignSelf="end" fontSize="10px" color="erp.textMuted">
          Estrutura preparada para busca automatica por CEP.
        </Text>
      </SimpleGrid>
    );
  if (step === 3)
    return (
      <VStack align="stretch" spacing={4}>
        <Controller
          control={form.control}
          name="limite_credito"
          render={({ field }) => (
            <Field
              label="Limite de credito"
              error={errors.limite_credito?.message}
            >
              <CurrencyInput
                value={String(field.value || '')}
                onValueChange={field.onChange}
              />
            </Field>
          )}
        />
        <Field label="Observacoes">
          <Textarea rows={4} {...form.register('observacao')} />
        </Field>
        <Checkbox {...form.register('situacao')}>Cliente ativo</Checkbox>
        <Divider />
        <Checkbox {...form.register('recorrente')}>Cliente recorrente</Checkbox>
        <Checkbox {...form.register('permite_venda_prazo')}>
          Permitir venda a prazo
        </Checkbox>
      </VStack>
    );
  return (
    <Box>
      <Flex gap={3} align="center">
        <Flex
          w="40px"
          h="40px"
          align="center"
          justify="center"
          bg="erp.brandSoft"
          color="erp.brandText"
          borderRadius="9px"
        >
          <Check size={18} />
        </Flex>
        <Box>
          <Text fontWeight="700">Revise os dados</Text>
          <Text fontSize="11px" color="erp.textMuted">
            O cliente e o evento de auditoria serao gravados juntos.
          </Text>
        </Box>
      </Flex>
      <Divider my={5} />
      <SimpleGrid columns={2} spacing={4}>
        <Info
          label="Tipo"
          value={type === 1 ? 'Pessoa fisica' : 'Pessoa juridica'}
        />
        <Info label="Nome" value={form.watch('nome')} />
        <Info
          label="Documento"
          value={formatDocument(form.watch('documento'))}
        />
        <Info label="Telefone" value={formatPhone(form.watch('telefone'))} />
        <Info label="E-mail" value={form.watch('email')} />
        <Info
          label="Endereco"
          value={`${form.watch('cidade') || '-'}/${form.watch('estado') || '-'}`}
        />
        <Info
          label="Limite"
          value={formatCurrency(form.watch('limite_credito'))}
        />
        <Info
          label="Status"
          value={form.watch('situacao') ? 'Ativo' : 'Inativo'}
        />
      </SimpleGrid>
    </Box>
  );
}

function TypeOption({
  active,
  icon,
  title,
  description,
  onClick,
}: {
  active: boolean;
  icon: typeof Users;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <Surface
      interactive
      p={5}
      cursor="pointer"
      borderColor={active ? 'brand.500' : 'erp.border'}
      bg={active ? 'erp.brandSoft' : 'erp.surface'}
      onClick={onClick}
    >
      <Flex gap={3}>
        <Flex
          w="38px"
          h="38px"
          align="center"
          justify="center"
          borderRadius="8px"
          bg="erp.surface"
          color="erp.brandText"
        >
          <Icon as={icon} boxSize="17px" />
        </Flex>
        <Box>
          <Text fontSize="14px" fontWeight="700">
            {title}
          </Text>
          <Text fontSize="11px" color="erp.textMuted">
            {description}
          </Text>
        </Box>
      </Flex>
    </Surface>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <FormControl isInvalid={Boolean(error)} isRequired={required}>
      <FormLabel>{label}</FormLabel>
      {children}
      <FormErrorMessage>{error}</FormErrorMessage>
    </FormControl>
  );
}
