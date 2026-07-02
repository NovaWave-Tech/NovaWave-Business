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
  Select,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Ban,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Eye,
  KeyRound,
  Laptop,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundX,
  Users,
} from 'lucide-react';
import {
  Controller,
  useForm,
  type Resolver,
  type UseFormReturn,
} from 'react-hook-form';
import { useMemo, useState } from 'react';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  PageHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import FormattedInput from '../../../shared/ui/FormattedInput';
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from '../../../shared/utils/formatters';
import {
  editUserSchema,
  userSchema,
  type EditUserFormData,
  type UserFormData,
} from '../schemas/userSchema';
import {
  userService,
  type UserDetail,
  type UserListData,
  type UserPayload,
  type UserRow,
} from '../services/userService';

const MotionBox = motion(Box);
const steps = [
  'Dados pessoais',
  'Empresa',
  'Filial',
  'Departamento',
  'Cargo',
  'Perfil',
  'Credenciais',
  'Resumo',
];
const defaultForm: UserFormData = {
  nome: '',
  cpf: '',
  telefone: '',
  birth_date: '',
  email: '',
  idfilial: 0,
  iddepartamento: undefined,
  idcargo: undefined,
  idperfil: undefined,
  senha: '',
  confirmar_senha: '',
  admin_empresa: false,
  force_password_change: true,
  two_factor_enabled: false,
};

function Kpi({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof Users;
}) {
  return (
    <Surface p={4} minH="112px">
      <Flex justify="space-between" align="start">
        <Box>
          <Text fontSize="11px" color="erp.textMuted" textTransform="uppercase">
            {label}
          </Text>
          <Text mt={1} fontSize="25px" fontWeight="700">
            {value}
          </Text>
          <Text mt={1} fontSize="10px" color="erp.textSecondary">
            {detail}
          </Text>
        </Box>
        <Flex
          w="34px"
          h="34px"
          align="center"
          justify="center"
          borderRadius="9px"
          color="erp.brandText"
          bg="erp.brandSoft"
          border="1px solid"
          borderColor="erp.brandBorder"
        >
          <Icon as={icon} boxSize="16px" />
        </Flex>
      </Flex>
    </Surface>
  );
}

function StatusBadge({ status }: { status: number }) {
  return (
    <Badge colorScheme={status === 1 ? 'green' : 'red'} textTransform="none">
      {status === 1 ? 'Ativo' : 'Bloqueado'}
    </Badge>
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

export default function UsersPage() {
  const toast = useToast();
  const client = useQueryClient();
  const detailDrawer = useDisclosure();
  const createDrawer = useDisclosure();
  const editModal = useDisclosure();
  const passwordModal = useDisclosure();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserRow | null>(null);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [step, setStep] = useState(0);
  const [filters, setFilters] = useState({
    q: '',
    branch: '',
    department: '',
    role: '',
    profile: '',
    status: '',
    last_access: '',
  });
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema) as Resolver<UserFormData>,
    defaultValues: defaultForm,
    mode: 'onBlur',
  });
  const watched = form.watch();
  const editForm = useForm<EditUserFormData>({
    resolver: zodResolver(editUserSchema) as Resolver<EditUserFormData>,
    defaultValues: {
      nome: '',
      cpf: '',
      telefone: '',
      birth_date: '',
      email: '',
      idfilial: 0,
      iddepartamento: undefined,
      idcargo: undefined,
      idperfil: undefined,
      admin_empresa: false,
      force_password_change: false,
      two_factor_enabled: false,
    },
  });

  const list = useQuery({
    queryKey: ['erp-users', filters],
    queryFn: () => userService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['erp-user', selectedId],
    queryFn: () => userService.detail(selectedId as number),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data: UserListData | undefined = list.data;
  const options = data?.options;
  const selectedBranch = options?.branches.find(
    item => item.id === Number(watched.idfilial)
  );
  const selectedDepartment = options?.departments.find(
    item => item.id === Number(watched.iddepartamento)
  );
  const availableRoles = useMemo(
    () =>
      options?.roles.filter(
        item =>
          !watched.iddepartamento ||
          item.iddepartamento === Number(watched.iddepartamento)
      ) ?? [],
    [options?.roles, watched.iddepartamento]
  );
  const selectedRole = options?.roles.find(
    item => item.id === Number(watched.idcargo)
  );
  const selectedProfile = options?.profiles.find(
    item => item.id === Number(watched.idperfil)
  );

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['erp-users'] });
    if (selectedId)
      await client.invalidateQueries({ queryKey: ['erp-user', selectedId] });
  };

  const create = useMutation({
    mutationFn: (values: UserFormData) =>
      userService.create({
        ...(values as UserPayload),
        filiais: [Number(values.idfilial)],
      }),
    onSuccess: async () => {
      await refresh();
      createDrawer.onClose();
      form.reset(defaultForm);
      setStep(0);
      toast({ title: 'Usuario criado com sucesso', status: 'success' });
    },
    onError: notifyError,
  });
  const update = useMutation({
    mutationFn: (values: EditUserFormData) =>
      userService.update(editingUser!.idusuario, {
        ...values,
        filiais: [Number(values.idfilial)],
      }),
    onSuccess: async () => {
      await refresh();
      editModal.onClose();
      setEditingUser(null);
      toast({ title: 'Usuario atualizado com sucesso', status: 'success' });
    },
    onError: notifyError,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      userService.setStatus(id, status),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: notifyError,
  });
  const resetPassword = useMutation({
    mutationFn: () =>
      userService.resetPassword(passwordUser!.idusuario, newPassword),
    onSuccess: () => {
      passwordModal.onClose();
      setNewPassword('');
      toast({ title: 'Senha redefinida', status: 'success' });
    },
    onError: notifyError,
  });
  const revokeSession = useMutation({
    mutationFn: (sessionId: number) =>
      userService.revokeSession(selectedId!, sessionId),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Sessao encerrada', status: 'success' });
    },
    onError: notifyError,
  });

  const openDetail = (user: UserRow) => {
    setSelectedId(user.idusuario);
    detailDrawer.onOpen();
  };
  const openPassword = (user: UserRow) => {
    setPasswordUser(user);
    setNewPassword('');
    passwordModal.onOpen();
  };
  const openEdit = async (user: UserRow) => {
    try {
      const current = await userService.detail(user.idusuario);
      setEditingUser(user);
      editForm.reset({
        nome: current.nome,
        cpf: current.cpf || '',
        telefone: current.telefone || '',
        birth_date: current.birth_date || '',
        email: current.email,
        idfilial: Number(current.idfilial_padrao || 0),
        iddepartamento: current.iddepartamento || undefined,
        idcargo: current.idcargo || undefined,
        idperfil: current.profiles[0]?.id || undefined,
        admin_empresa: current.admin_empresa,
        force_password_change: current.exigir_troca_senha,
        two_factor_enabled: current.dois_fatores_ativo,
      });
      editModal.onOpen();
    } catch (error) {
      notifyError(error);
    }
  };
  const clearFilters = () =>
    setFilters({
      q: '',
      branch: '',
      department: '',
      role: '',
      profile: '',
      status: '',
      last_access: '',
    });

  const canAdvance = () => {
    if (step === 0) return Boolean(watched.nome && watched.email);
    if (step === 2) return Number(watched.idfilial) > 0;
    if (step === 6)
      return (
        watched.senha.length >= 10 && watched.senha === watched.confirmar_senha
      );
    return true;
  };

  return (
    <Box>
      <PageHeader
        icon={Users}
        title="Usuarios"
        description="Gerencie todos os usuarios e seus acessos ao sistema."
        breadcrumbs={[{ label: 'Configuracoes' }, { label: 'Usuarios' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={createDrawer.onOpen}>
            Novo usuario
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 5 }} spacing={3} mb={5}>
        <Kpi
          label="Usuarios"
          value={formatNumber(data?.metrics.total)}
          detail="Acessos cadastrados"
          icon={Users}
        />
        <Kpi
          label="Ativos"
          value={formatNumber(data?.metrics.active)}
          detail="Acesso liberado"
          icon={UserCheck}
        />
        <Kpi
          label="Inativos"
          value={formatNumber(data?.metrics.inactive)}
          detail="Sem acesso"
          icon={UserRoundX}
        />
        <Kpi
          label="Administradores"
          value={formatNumber(data?.metrics.admins)}
          detail="Acesso administrativo"
          icon={ShieldCheck}
        />
        <Kpi
          label="Filiais"
          value={formatNumber(data?.metrics.branches)}
          detail="Com usuarios vinculados"
          icon={Building2}
        />
      </SimpleGrid>

      <BrandSurface mb={4} p={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(260px,1fr) repeat(6,minmax(120px,.42fr)) auto',
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
              placeholder="Buscar por nome, e-mail, telefone ou cargo..."
            />
          </InputGroup>
          <Select
            aria-label="Filial"
            value={filters.branch}
            onChange={event =>
              setFilters(v => ({ ...v, branch: event.target.value }))
            }
          >
            <option value="">Todas as filiais</option>
            {options?.branches.map(item => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Departamento"
            value={filters.department}
            onChange={event =>
              setFilters(v => ({ ...v, department: event.target.value }))
            }
          >
            <option value="">Departamentos</option>
            {options?.departments.map(item => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Cargo"
            value={filters.role}
            onChange={event =>
              setFilters(v => ({ ...v, role: event.target.value }))
            }
          >
            <option value="">Cargos</option>
            {options?.roles.map(item => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Perfil"
            value={filters.profile}
            onChange={event =>
              setFilters(v => ({ ...v, profile: event.target.value }))
            }
          >
            <option value="">Perfis</option>
            {options?.profiles.map(item => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Situacao"
            value={filters.status}
            onChange={event =>
              setFilters(v => ({ ...v, status: event.target.value }))
            }
          >
            <option value="">Situacoes</option>
            <option value="1">Ativos</option>
            <option value="0">Bloqueados</option>
          </Select>
          <Select
            aria-label="Ultimo acesso"
            value={filters.last_access}
            onChange={event =>
              setFilters(v => ({ ...v, last_access: event.target.value }))
            }
          >
            <option value="">Ultimo acesso</option>
            <option value="7d">Ultimos 7 dias</option>
            <option value="30d">Ultimos 30 dias</option>
            <option value="never">Nunca acessou</option>
          </Select>
          <Button variant="ghost" onClick={clearFilters}>
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
            {Array.from({ length: 6 }).map((_, i) => (
              <Box
                key={i}
                h="52px"
                w="full"
                bg="erp.surfaceSubtle"
                borderRadius="8px"
              />
            ))}
          </VStack>
        </Surface>
      ) : data?.users.length ? (
        <Surface overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Usuario</Th>
                  <Th>Cargo</Th>
                  <Th>Perfil</Th>
                  <Th>Filial</Th>
                  <Th>Status</Th>
                  <Th>Ultimo acesso</Th>
                  <Th w="52px" />
                </Tr>
              </Thead>
              <Tbody>
                {data.users.map(user => (
                  <Tr
                    key={user.idusuario}
                    cursor="pointer"
                    onClick={() => openDetail(user)}
                  >
                    <Td>
                      <Flex align="center" gap={3}>
                        <Avatar
                          size="sm"
                          name={user.nome}
                          src={user.avatar_url}
                          bg="brand.700"
                        />
                        <Box>
                          <Text fontWeight="600">{user.nome}</Text>
                          <Text fontSize="11px" color="erp.textMuted">
                            {user.email}
                          </Text>
                        </Box>
                      </Flex>
                    </Td>
                    <Td>
                      <Badge variant="subtle" textTransform="none">
                        {user.cargo || 'Sem cargo'}
                      </Badge>
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={user.admin_empresa ? 'blue' : 'gray'}
                        textTransform="none"
                      >
                        {user.perfil}
                      </Badge>
                    </Td>
                    <Td>{user.filial || '-'}</Td>
                    <Td>
                      <StatusBadge status={user.situacao} />
                    </Td>
                    <Td whiteSpace="nowrap">
                      {user.ultimo_login
                        ? formatDateTime(user.ultimo_login)
                        : 'Nunca acessou'}
                    </Td>
                    <Td onClick={event => event.stopPropagation()}>
                      <Menu>
                        <Tooltip label="Acoes">
                          <MenuButton
                            as={IconButton}
                            aria-label="Acoes do usuario"
                            icon={<MoreHorizontal size={17} />}
                            variant="ghost"
                            size="sm"
                          />
                        </Tooltip>
                        <MenuList>
                          <MenuItem
                            icon={<Eye size={15} />}
                            onClick={() => openDetail(user)}
                          >
                            Visualizar
                          </MenuItem>
                          <MenuItem
                            icon={<Pencil size={15} />}
                            onClick={() => void openEdit(user)}
                          >
                            Editar
                          </MenuItem>
                          <MenuItem
                            icon={<ShieldCheck size={15} />}
                            onClick={() => openDetail(user)}
                          >
                            Permissoes
                          </MenuItem>
                          <MenuItem
                            icon={<KeyRound size={15} />}
                            onClick={() => openPassword(user)}
                          >
                            Alterar senha
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem
                            icon={<Ban size={15} />}
                            color={user.situacao ? 'erp.danger' : 'erp.success'}
                            onClick={() =>
                              statusMutation.mutate({
                                id: user.idusuario,
                                status: user.situacao ? 0 : 1,
                              })
                            }
                          >
                            {user.situacao ? 'Bloquear' : 'Reativar'}
                          </MenuItem>
                          <MenuItem
                            icon={<Trash2 size={15} />}
                            color="erp.danger"
                            onClick={() =>
                              statusMutation.mutate({
                                id: user.idusuario,
                                status: 0,
                              })
                            }
                          >
                            Excluir acesso
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
                ? 'Nenhum resultado encontrado'
                : 'Nenhum usuario cadastrado'
            }
            description="Ajuste os filtros ou cadastre o primeiro usuario da empresa."
            icon={Users}
            action={createDrawer.onOpen}
            actionLabel="Novo usuario"
          />
        </Surface>
      )}

      <UserDetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        loading={detail.isLoading}
        onRevoke={id => revokeSession.mutate(id)}
        revoking={revokeSession.isPending}
      />

      <EditUserModal
        disclosure={editModal}
        form={editForm}
        options={options}
        saving={update.isPending}
        onSubmit={values => update.mutate(values)}
      />

      <Drawer
        isOpen={createDrawer.isOpen}
        placement="right"
        size="xl"
        onClose={createDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            Novo usuario
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
              templateColumns={{ base: '1fr', lg: 'minmax(0,1fr) 250px' }}
              gap={6}
            >
              <Box>
                <Flex gap={1} mb={6}>
                  {steps.map((label, index) => (
                    <Tooltip key={label} label={label}>
                      <Box
                        flex="1"
                        h="4px"
                        bg={index <= step ? 'brand.500' : 'erp.border'}
                        borderRadius="full"
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
                    transition={{ duration: 0.16 }}
                  >
                    <UserStep
                      step={step}
                      form={form}
                      options={options}
                      availableRoles={availableRoles}
                    />
                  </MotionBox>
                </AnimatePresence>
              </Box>
              <Surface p={4} h="fit-content" bg="erp.surfaceSubtle">
                <Text fontSize="12px" fontWeight="700">
                  Resumo do acesso
                </Text>
                <VStack mt={3} align="stretch" spacing={0}>
                  <DetailRow label="Empresa" value={options?.company.nome} />
                  <DetailRow label="Filial" value={selectedBranch?.nome} />
                  <DetailRow
                    label="Departamento"
                    value={selectedDepartment?.nome}
                  />
                  <DetailRow label="Cargo" value={selectedRole?.nome} />
                  <DetailRow label="Perfil" value={selectedProfile?.nome} />
                  <DetailRow label="Status" value="Ativo" />
                </VStack>
                <Text mt={4} fontSize="10px" color="erp.textMuted">
                  Permissoes serao herdadas automaticamente do perfil
                  selecionado.
                </Text>
              </Surface>
            </Grid>
          </DrawerBody>
          <DrawerFooter>
            <Button
              variant="ghost"
              mr={3}
              onClick={
                step === 0 ? createDrawer.onClose : () => setStep(v => v - 1)
              }
              leftIcon={step > 0 ? <ChevronLeft size={15} /> : undefined}
            >
              {step === 0 ? 'Cancelar' : 'Voltar'}
            </Button>
            {step < steps.length - 1 ? (
              <Button
                rightIcon={<ChevronRight size={15} />}
                isDisabled={!canAdvance()}
                onClick={() => setStep(v => v + 1)}
              >
                Continuar
              </Button>
            ) : (
              <Button
                leftIcon={<Check size={15} />}
                isLoading={create.isPending}
                onClick={form.handleSubmit(values => create.mutate(values))}
              >
                Criar usuario
              </Button>
            )}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      <Modal isOpen={passwordModal.isOpen} onClose={passwordModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Alterar senha</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontSize="13px" color="erp.textSecondary">
              Defina uma senha temporaria para {passwordUser?.nome}. As sessoes
              ativas serao encerradas.
            </Text>
            <FormControl>
              <FormLabel>Nova senha</FormLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={event => setNewPassword(event.target.value)}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={passwordModal.onClose}>
              Cancelar
            </Button>
            <Button
              isDisabled={newPassword.length < 10}
              isLoading={resetPassword.isPending}
              onClick={() => resetPassword.mutate()}
            >
              Redefinir senha
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

function EditUserModal({
  disclosure,
  form,
  options,
  saving,
  onSubmit,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  form: UseFormReturn<EditUserFormData>;
  options?: UserListData['options'];
  saving: boolean;
  onSubmit: (values: EditUserFormData) => void;
}) {
  const errors = form.formState.errors;
  const departmentId = form.watch('iddepartamento');
  const roles =
    options?.roles.filter(
      role => !departmentId || role.iddepartamento === Number(departmentId)
    ) ?? [];

  return (
    <Modal isOpen={disclosure.isOpen} onClose={disclosure.onClose} size="2xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Editar usuario</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isInvalid={Boolean(errors.nome)} isRequired>
              <FormLabel>Nome completo</FormLabel>
              <Input {...form.register('nome')} />
              <FormErrorMessage>{errors.nome?.message}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={Boolean(errors.email)} isRequired>
              <FormLabel>E-mail</FormLabel>
              <Input type="email" {...form.register('email')} />
              <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
            </FormControl>
            <Controller
              control={form.control}
              name="cpf"
              render={({ field }) => (
                <FormControl>
                  <FormLabel>CPF</FormLabel>
                  <FormattedInput
                    mask="cpf"
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  />
                </FormControl>
              )}
            />
            <Controller
              control={form.control}
              name="telefone"
              render={({ field }) => (
                <FormControl>
                  <FormLabel>Telefone</FormLabel>
                  <FormattedInput
                    mask="phone"
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  />
                </FormControl>
              )}
            />
            <FormControl>
              <FormLabel>Data de nascimento</FormLabel>
              <Input type="date" {...form.register('birth_date')} />
            </FormControl>
            <FormControl isInvalid={Boolean(errors.idfilial)} isRequired>
              <FormLabel>Filial principal</FormLabel>
              <Select {...form.register('idfilial')}>
                <option value={0}>Selecione</option>
                {options?.branches.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
              <FormErrorMessage>{errors.idfilial?.message}</FormErrorMessage>
            </FormControl>
            <FormControl>
              <FormLabel>Departamento</FormLabel>
              <Select {...form.register('iddepartamento')}>
                <option value="">Sem departamento</option>
                {options?.departments.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Cargo</FormLabel>
              <Select {...form.register('idcargo')}>
                <option value="">Sem cargo</option>
                {roles.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>Perfil de acesso</FormLabel>
              <Select {...form.register('idperfil')}>
                <option value="">Sem perfil</option>
                {options?.profiles.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.nome}
                  </option>
                ))}
              </Select>
            </FormControl>
          </SimpleGrid>
          <Checkbox mt={5} {...form.register('admin_empresa')}>
            Administrador da empresa
          </Checkbox>
          <Checkbox mt={5} ml={5} {...form.register('force_password_change')}>
            Exigir troca de senha
          </Checkbox>
          <Checkbox mt={5} ml={5} {...form.register('two_factor_enabled')}>
            Autenticacao em dois fatores
          </Checkbox>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={disclosure.onClose}>
            Cancelar
          </Button>
          <Button isLoading={saving} onClick={form.handleSubmit(onSubmit)}>
            Salvar alteracoes
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function UserStep({
  step,
  form,
  options,
  availableRoles,
}: {
  step: number;
  form: UseFormReturn<UserFormData>;
  options?: UserListData['options'];
  availableRoles: UserListData['options']['roles'];
}) {
  const errors = form.formState.errors;
  if (step === 0)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isInvalid={Boolean(errors.nome)} isRequired>
          <FormLabel>Nome completo</FormLabel>
          <Input {...form.register('nome')} />
          <FormErrorMessage>{errors.nome?.message}</FormErrorMessage>
        </FormControl>
        <Controller
          control={form.control}
          name="cpf"
          render={({ field }) => (
            <FormControl>
              <FormLabel>CPF</FormLabel>
              <FormattedInput
                mask="cpf"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            </FormControl>
          )}
        />
        <Controller
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormControl>
              <FormLabel>Telefone</FormLabel>
              <FormattedInput
                mask="phone"
                value={field.value || ''}
                onValueChange={field.onChange}
              />
            </FormControl>
          )}
        />
        <FormControl isInvalid={Boolean(errors.email)} isRequired>
          <FormLabel>E-mail</FormLabel>
          <Input type="email" {...form.register('email')} />
          <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
        </FormControl>
        <FormControl>
          <FormLabel>Data de nascimento</FormLabel>
          <Input type="date" {...form.register('birth_date')} />
        </FormControl>
        <FormControl>
          <FormLabel>Foto</FormLabel>
          <Input type="file" accept="image/*" isDisabled />
          <Text mt={1} fontSize="10px" color="erp.textMuted">
            Upload sera habilitado com o armazenamento de arquivos.
          </Text>
        </FormControl>
      </SimpleGrid>
    );
  if (step === 1)
    return (
      <BrandSurface p={5}>
        <Text fontSize="11px" color="erp.textMuted">
          Empresa carregada automaticamente
        </Text>
        <Text mt={2} fontSize="20px" fontWeight="700">
          {options?.company.nome || 'Empresa atual'}
        </Text>
        <Text mt={2} fontSize="12px" color="erp.textSecondary">
          O usuario sera criado no tenant autenticado e nao podera ser movido
          entre empresas.
        </Text>
      </BrandSurface>
    );
  if (step === 2)
    return (
      <FormControl isInvalid={Boolean(errors.idfilial)} isRequired>
        <FormLabel>Filial principal</FormLabel>
        <Select {...form.register('idfilial')}>
          <option value={0}>Selecione</option>
          {options?.branches.map(item => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </Select>
        <FormErrorMessage>{errors.idfilial?.message}</FormErrorMessage>
        <Text mt={2} fontSize="11px" color="erp.textMuted">
          A estrutura do backend ja permite vincular multiplas filiais
          futuramente.
        </Text>
      </FormControl>
    );
  if (step === 3)
    return (
      <FormControl>
        <FormLabel>Departamento</FormLabel>
        <Select {...form.register('iddepartamento')}>
          <option value="">Sem departamento</option>
          {options?.departments.map(item => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </Select>
      </FormControl>
    );
  if (step === 4)
    return (
      <FormControl>
        <FormLabel>Cargo</FormLabel>
        <Select {...form.register('idcargo')}>
          <option value="">Sem cargo</option>
          {availableRoles.map(item => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </Select>
      </FormControl>
    );
  if (step === 5)
    return (
      <Box>
        <FormControl>
          <FormLabel>Perfil de acesso</FormLabel>
          <Select {...form.register('idperfil')}>
            <option value="">Sem perfil</option>
            {options?.profiles.map(item => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </Select>
        </FormControl>
        <Checkbox mt={4} {...form.register('admin_empresa')}>
          Administrador da empresa
        </Checkbox>
      </Box>
    );
  if (step === 6)
    return (
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
        <FormControl isInvalid={Boolean(errors.senha)} isRequired>
          <FormLabel>Senha temporaria</FormLabel>
          <Input type="password" {...form.register('senha')} />
          <FormErrorMessage>{errors.senha?.message}</FormErrorMessage>
        </FormControl>
        <FormControl isInvalid={Boolean(errors.confirmar_senha)} isRequired>
          <FormLabel>Confirmar senha</FormLabel>
          <Input type="password" {...form.register('confirmar_senha')} />
          <FormErrorMessage>{errors.confirmar_senha?.message}</FormErrorMessage>
        </FormControl>
        <Checkbox
          gridColumn={{ md: '1 / -1' }}
          isChecked={form.watch('force_password_change')}
          onChange={event =>
            form.setValue('force_password_change', event.target.checked)
          }
        >
          Obrigar troca de senha no primeiro acesso
        </Checkbox>
        <Checkbox
          gridColumn={{ md: '1 / -1' }}
          {...form.register('two_factor_enabled')}
        >
          Ativar autenticacao em dois fatores
        </Checkbox>
      </SimpleGrid>
    );
  return (
    <Box>
      <Text fontSize="16px" fontWeight="700">
        Revise os dados antes de criar
      </Text>
      <Text mt={2} fontSize="12px" color="erp.textSecondary">
        A criacao registrara o usuario, funcionario vinculado, filial, perfil e
        evento de auditoria em uma unica transacao.
      </Text>
      <Divider my={5} />
      <SimpleGrid columns={2} spacing={4}>
        <DetailRow label="Nome" value={form.watch('nome')} />
        <DetailRow label="E-mail" value={form.watch('email')} />
        <DetailRow label="Situacao" value="Ativo" />
        <DetailRow label="Convite" value="Preparado para evolucao" />
      </SimpleGrid>
    </Box>
  );
}

function UserDetailDrawer({
  disclosure,
  detail,
  loading,
  onRevoke,
  revoking,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: UserDetail;
  loading: boolean;
  onRevoke: (id: number) => void;
  revoking: boolean;
}) {
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
          {detail?.nome || 'Detalhes do usuario'}
          {detail && (
            <Text
              mt={1}
              fontSize="12px"
              fontWeight="400"
              color="erp.textSecondary"
            >
              {detail.email}
            </Text>
          )}
        </DrawerHeader>
        <DrawerBody>
          {loading || !detail ? (
            <VStack spacing={4}>
              {Array.from({ length: 6 }).map((_, i) => (
                <Box
                  key={i}
                  h="52px"
                  w="full"
                  bg="erp.surfaceSubtle"
                  borderRadius="8px"
                />
              ))}
            </VStack>
          ) : (
            <>
              <Flex align="center" gap={4} mb={5}>
                <Avatar
                  size="lg"
                  name={detail.nome}
                  src={detail.avatar_url}
                  bg="brand.700"
                />
                <Box>
                  <Flex gap={2} align="center">
                    <Text fontSize="18px" fontWeight="700">
                      {detail.nome}
                    </Text>
                    <StatusBadge status={detail.situacao} />
                  </Flex>
                  <Text fontSize="12px" color="erp.textMuted">
                    {detail.cargo || 'Sem cargo'} -{' '}
                    {detail.filial || 'Sem filial'}
                  </Text>
                </Box>
              </Flex>
              <Tabs variant="line">
                <TabList overflowX="auto">
                  <Tab>Informacoes</Tab>
                  <Tab>Permissoes</Tab>
                  <Tab>Sessoes</Tab>
                  <Tab>Historico</Tab>
                </TabList>
                <TabPanels>
                  <TabPanel px={0}>
                    <DetailRow label="CPF" value={detail.cpf} />
                    <DetailRow label="Telefone" value={detail.telefone} />
                    <DetailRow label="E-mail" value={detail.email} />
                    <DetailRow
                      label="Nascimento"
                      value={
                        detail.birth_date
                          ? formatDate(detail.birth_date)
                          : 'Nao informado'
                      }
                    />
                    <DetailRow label="Cargo" value={detail.cargo} />
                    <DetailRow
                      label="Departamento"
                      value={detail.departamento}
                    />
                    <DetailRow label="Filial principal" value={detail.filial} />
                    <DetailRow
                      label="Ultimo login"
                      value={
                        detail.ultimo_login
                          ? formatDateTime(detail.ultimo_login)
                          : 'Nunca acessou'
                      }
                    />
                  </TabPanel>
                  <TabPanel px={0}>
                    <Text mb={3} fontSize="12px" color="erp.textSecondary">
                      Modulos herdados dos perfis:{' '}
                      {detail.profiles.map(item => item.nome).join(', ') ||
                        'sem perfil'}
                      .
                    </Text>
                    <Flex gap={2} wrap="wrap">
                      {detail.permissions.length ? (
                        detail.permissions.map(item => (
                          <Badge
                            key={item.modulo}
                            colorScheme="blue"
                            textTransform="capitalize"
                          >
                            {item.modulo}
                          </Badge>
                        ))
                      ) : (
                        <Text fontSize="12px" color="erp.textMuted">
                          Nenhuma permissao herdada.
                        </Text>
                      )}
                    </Flex>
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.sessions.length ? (
                      <VStack align="stretch">
                        {detail.sessions.map(session => (
                          <Surface key={session.idsessao} p={4}>
                            <Flex justify="space-between" gap={4}>
                              <Flex gap={3}>
                                <Icon
                                  as={Laptop}
                                  boxSize="18px"
                                  color="erp.brandText"
                                />
                                <Box>
                                  <Text fontSize="12px" fontWeight="600">
                                    {session.dispositivo ||
                                      'Dispositivo nao identificado'}
                                  </Text>
                                  <Text fontSize="10px" color="erp.textMuted">
                                    {[
                                      session.sistema_operacional,
                                      session.navegador,
                                      session.ip,
                                    ]
                                      .filter(Boolean)
                                      .join(' - ')}
                                  </Text>
                                  <Text
                                    mt={1}
                                    fontSize="10px"
                                    color="erp.textMuted"
                                  >
                                    Criada em{' '}
                                    {formatDateTime(session.criado_em)}
                                  </Text>
                                </Box>
                              </Flex>
                              {session.active && (
                                <Button
                                  size="xs"
                                  variant="outline"
                                  isLoading={revoking}
                                  onClick={() => onRevoke(session.idsessao)}
                                >
                                  Encerrar
                                </Button>
                              )}
                            </Flex>
                          </Surface>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Nenhuma sessao registrada"
                        icon={Laptop}
                      />
                    )}
                  </TabPanel>
                  <TabPanel px={0}>
                    {detail.history.length ? (
                      <VStack align="stretch" spacing={0}>
                        {detail.history.map(item => (
                          <Flex
                            key={item.idauditoria}
                            gap={3}
                            py={3}
                            borderBottom="1px solid"
                            borderColor="erp.border"
                          >
                            <Flex
                              w="28px"
                              h="28px"
                              align="center"
                              justify="center"
                              bg="erp.brandSoft"
                              color="erp.brandText"
                              borderRadius="8px"
                            >
                              <Clock3 size={14} />
                            </Flex>
                            <Box>
                              <Text
                                fontSize="12px"
                                fontWeight="600"
                                textTransform="capitalize"
                              >
                                {item.acao.replaceAll('_', ' ')}
                              </Text>
                              <Text fontSize="10px" color="erp.textMuted">
                                {formatDateTime(item.criado_em)}
                                {item.ip ? ` - ${item.ip}` : ''}
                              </Text>
                            </Box>
                          </Flex>
                        ))}
                      </VStack>
                    ) : (
                      <EmptyState
                        title="Nenhum evento registrado"
                        icon={Clock3}
                      />
                    )}
                  </TabPanel>
                </TabPanels>
              </Tabs>
            </>
          )}
        </DrawerBody>
        <DrawerFooter>
          <Button variant="outline" onClick={disclosure.onClose}>
            Fechar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
