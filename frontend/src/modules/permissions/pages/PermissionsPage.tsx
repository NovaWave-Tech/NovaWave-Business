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
  FormErrorMessage,
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
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Check,
  Clock3,
  Copy,
  Eye,
  GitBranch,
  KeyRound,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import {
  BrandSurface,
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { formatDateTime, formatNumber } from '../../../shared/utils/formatters';
import PermissionMatrix from '../components/PermissionMatrix';
import {
  profileSchema,
  type ProfileFormData,
} from '../schemas/permissionSchema';
import { permissionService } from '../services/permissionService';
import type {
  Catalog,
  ProfileDetail,
  ProfileListData,
  ProfilePermission,
  ProfileRow,
} from '../types/permissionTypes';

const defaultForm: ProfileFormData = { nome: '', descricao: '' };

const permissionsToSet = (permissions: ProfilePermission[]) =>
  new Set(permissions.map(item => `${item.modulo}:${item.acao}`));

const setToPermissions = (selected: Set<string>) =>
  Array.from(selected).map(key => {
    const [modulo, acao] = key.split(':');
    return { modulo, acao };
  });

function ScopeBadge({ escopo }: { escopo: number }) {
  return (
    <Badge colorScheme={escopo === 1 ? 'blue' : 'purple'} textTransform="none">
      {escopo === 1 ? 'Sistema' : 'Personalizado'}
    </Badge>
  );
}

function StatusBadge({ status }: { status: number }) {
  return (
    <Badge colorScheme={status === 1 ? 'green' : 'red'} textTransform="none">
      {status === 1 ? 'Ativo' : 'Inativo'}
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
        {value ?? '-'}
      </Text>
    </Flex>
  );
}

export default function PermissionsPage() {
  const toast = useToast();
  const client = useQueryClient();
  const detailDrawer = useDisclosure();
  const formDrawer = useDisclosure();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(
    new Set()
  );
  const [filters, setFilters] = useState({
    q: '',
    status: '',
    type: '',
    users: '',
  });
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema) as Resolver<ProfileFormData>,
    defaultValues: defaultForm,
    mode: 'onBlur',
  });

  const list = useQuery({
    queryKey: ['permission-profiles', filters],
    queryFn: () => permissionService.list(filters),
  });
  const detail = useQuery({
    queryKey: ['permission-profile', selectedId],
    queryFn: () => permissionService.detail(selectedId as number),
    enabled: selectedId !== null && detailDrawer.isOpen,
  });
  const data: ProfileListData | undefined = list.data;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['permission-profiles'] });
    if (selectedId)
      await client.invalidateQueries({
        queryKey: ['permission-profile', selectedId],
      });
  };

  const save = useMutation({
    mutationFn: (values: ProfileFormData) => {
      const payload = {
        ...values,
        permissions: setToPermissions(selectedPermissions),
      };
      return editingId
        ? permissionService.update(editingId, payload)
        : permissionService.create(payload);
    },
    onSuccess: async () => {
      await refresh();
      formDrawer.onClose();
      form.reset(defaultForm);
      setSelectedPermissions(new Set());
      setEditingId(null);
      toast({
        title: editingId
          ? 'Perfil atualizado com sucesso'
          : 'Perfil criado com sucesso',
        status: 'success',
      });
    },
    onError: notifyError,
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: number }) =>
      permissionService.setStatus(id, status),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: notifyError,
  });
  const duplicate = useMutation({
    mutationFn: (id: number) => permissionService.duplicate(id),
    onSuccess: async () => {
      await refresh();
      toast({ title: 'Perfil duplicado com sucesso', status: 'success' });
    },
    onError: notifyError,
  });

  const openDetail = (profile: ProfileRow) => {
    setSelectedId(profile.idperfil);
    detailDrawer.onOpen();
  };
  const openCreate = () => {
    setEditingId(null);
    form.reset(defaultForm);
    setSelectedPermissions(new Set());
    formDrawer.onOpen();
  };
  const openEdit = async (profile: ProfileRow) => {
    try {
      const current = await permissionService.detail(profile.idperfil);
      setEditingId(profile.idperfil);
      form.reset({ nome: current.nome, descricao: current.descricao || '' });
      setSelectedPermissions(permissionsToSet(current.permissions));
      formDrawer.onOpen();
    } catch (error) {
      notifyError(error);
    }
  };
  const clearFilters = () =>
    setFilters({ q: '', status: '', type: '', users: '' });
  const submit = form.handleSubmit(values => {
    if (selectedPermissions.size === 0) {
      toast({
        title: 'Selecione pelo menos uma permissao',
        status: 'warning',
        position: 'top-right',
      });
      return;
    }
    save.mutate(values);
  });

  return (
    <Box>
      <PageHeader
        icon={ShieldCheck}
        title="Permissoes"
        description="Gerencie perfis de acesso, permissoes por modulo e vinculos com usuarios."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'Permissoes' }]}
        actions={
          <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
            Novo perfil
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 6 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Perfis"
          count={Number(data?.metrics.profiles)}
          format={formatNumber}
          detail="Cadastrados na empresa"
          icon={ShieldCheck}
        />
        <KpiCard
          index={1}
          tone="info"
          label="Personalizados"
          count={Number(data?.metrics.custom_profiles)}
          format={formatNumber}
          detail="Criados pela empresa"
          icon={Settings2}
        />
        <KpiCard
          index={2}
          tone="brand"
          label="Usuarios vinculados"
          count={Number(data?.metrics.linked_users)}
          format={formatNumber}
          detail="Com perfil atribuido"
          icon={Users}
        />
        <KpiCard
          index={3}
          tone="brand"
          label="Permissoes"
          count={Number(data?.metrics.permissions)}
          format={formatNumber}
          detail="Disponiveis no catalogo"
          icon={KeyRound}
        />
        <KpiCard
          index={4}
          tone="info"
          label="Filiais"
          count={Number(data?.metrics.branches)}
          format={formatNumber}
          detail="Com usuarios vinculados"
          icon={GitBranch}
        />
        <KpiCard
          index={5}
          tone="neutral"
          label="Perfil mais usado"
          value={data?.metrics.top_profile || '-'}
          detail="Maior numero de usuarios"
          icon={Sparkles}
        />
      </SimpleGrid>

      <BrandSurface mb={4} p={4}>
        <Grid
          templateColumns={{
            base: '1fr',
            xl: 'minmax(260px,1fr) repeat(3,minmax(140px,.45fr)) auto',
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
              placeholder="Buscar por nome, descricao ou modulo..."
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
          <Select
            aria-label="Tipo"
            value={filters.type}
            onChange={event =>
              setFilters(v => ({ ...v, type: event.target.value }))
            }
          >
            <option value="">Tipos</option>
            <option value="system">Sistema</option>
            <option value="custom">Personalizado</option>
          </Select>
          <Select
            aria-label="Usuarios"
            value={filters.users}
            onChange={event =>
              setFilters(v => ({ ...v, users: event.target.value }))
            }
          >
            <option value="">Usuarios</option>
            <option value="with">Com usuarios</option>
            <option value="without">Sem usuarios</option>
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
      ) : data?.profiles.length ? (
        <Surface overflow="hidden">
          <Box overflowX="auto">
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Perfil</Th>
                  <Th>Tipo</Th>
                  <Th isNumeric>Usuarios</Th>
                  <Th isNumeric>Permissoes</Th>
                  <Th isNumeric>Filiais</Th>
                  <Th>Status</Th>
                  <Th>Ultima alteracao</Th>
                  <Th w="52px" />
                </Tr>
              </Thead>
              <Tbody>
                {data.profiles.map(profile => (
                  <Tr
                    key={profile.idperfil}
                    cursor="pointer"
                    onClick={() => openDetail(profile)}
                  >
                    <Td>
                      <Text fontWeight="600">{profile.nome}</Text>
                      {profile.descricao && (
                        <Text
                          fontSize="11px"
                          color="erp.textMuted"
                          noOfLines={1}
                        >
                          {profile.descricao}
                        </Text>
                      )}
                    </Td>
                    <Td>
                      <ScopeBadge escopo={profile.escopo} />
                    </Td>
                    <Td isNumeric>{formatNumber(profile.usuarios)}</Td>
                    <Td isNumeric>{formatNumber(profile.permissoes)}</Td>
                    <Td isNumeric>{formatNumber(profile.filiais)}</Td>
                    <Td>
                      <StatusBadge status={profile.situacao} />
                    </Td>
                    <Td whiteSpace="nowrap">
                      {formatDateTime(
                        profile.ultima_alteracao || profile.criado_em
                      )}
                    </Td>
                    <Td onClick={event => event.stopPropagation()}>
                      <Menu>
                        <Tooltip label="Acoes">
                          <MenuButton
                            as={IconButton}
                            aria-label="Acoes do perfil"
                            icon={<MoreHorizontal size={17} />}
                            variant="ghost"
                            size="sm"
                          />
                        </Tooltip>
                        <MenuList>
                          <MenuItem
                            icon={<Eye size={15} />}
                            onClick={() => openDetail(profile)}
                          >
                            Visualizar
                          </MenuItem>
                          <MenuItem
                            icon={<Pencil size={15} />}
                            onClick={() => void openEdit(profile)}
                          >
                            Editar
                          </MenuItem>
                          <MenuItem
                            icon={<Copy size={15} />}
                            onClick={() => duplicate.mutate(profile.idperfil)}
                          >
                            Duplicar
                          </MenuItem>
                          <MenuDivider />
                          <MenuItem
                            icon={<Ban size={15} />}
                            color={
                              profile.situacao ? 'erp.danger' : 'erp.success'
                            }
                            onClick={() =>
                              statusMutation.mutate({
                                id: profile.idperfil,
                                status: profile.situacao ? 0 : 1,
                              })
                            }
                          >
                            {profile.situacao ? 'Desativar' : 'Reativar'}
                          </MenuItem>
                          <Tooltip label="Exclusao bloqueada para preservar o historico e os vinculos">
                            <MenuItem isDisabled icon={<Trash2 size={15} />}>
                              Excluir
                            </MenuItem>
                          </Tooltip>
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
                : 'Nenhum perfil cadastrado'
            }
            description="Ajuste os filtros ou cadastre o primeiro perfil de acesso."
            icon={ShieldCheck}
            action={openCreate}
            actionLabel="Novo perfil"
          />
        </Surface>
      )}

      <ProfileDetailDrawer
        disclosure={detailDrawer}
        detail={detail.data}
        catalog={data?.catalog}
        loading={detail.isLoading}
      />

      <Drawer
        isOpen={formDrawer.isOpen}
        placement="right"
        size="xl"
        onClose={formDrawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>
            {editingId ? 'Editar perfil' : 'Novo perfil'}
            <Text
              mt={1}
              fontSize="12px"
              fontWeight="400"
              color="erp.textSecondary"
            >
              Defina o nome, a descricao e as permissoes do perfil.
            </Text>
          </DrawerHeader>
          <DrawerBody>
            <FormControl
              isInvalid={Boolean(form.formState.errors.nome)}
              isRequired
            >
              <FormLabel>Nome do perfil</FormLabel>
              <Input {...form.register('nome')} />
              <FormErrorMessage>
                {form.formState.errors.nome?.message}
              </FormErrorMessage>
            </FormControl>
            <FormControl mt={4}>
              <FormLabel>Descricao</FormLabel>
              <Textarea rows={2} {...form.register('descricao')} />
            </FormControl>
            <Box mt={5}>
              <Text mb={2} fontSize="12px" fontWeight="700">
                Permissoes por modulo
              </Text>
              {data?.catalog && (
                <PermissionMatrix
                  catalog={data.catalog}
                  selected={selectedPermissions}
                  onChange={setSelectedPermissions}
                />
              )}
            </Box>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="ghost" mr={3} onClick={formDrawer.onClose}>
              Cancelar
            </Button>
            <Button
              leftIcon={<Check size={15} />}
              isLoading={save.isPending}
              onClick={submit}
            >
              {editingId ? 'Salvar alteracoes' : 'Criar perfil'}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}

function ProfileDetailDrawer({
  disclosure,
  detail,
  catalog,
  loading,
}: {
  disclosure: ReturnType<typeof useDisclosure>;
  detail?: ProfileDetail;
  catalog?: Catalog;
  loading: boolean;
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
          {detail?.nome || 'Detalhes do perfil'}
          {detail && (
            <Flex align="center" gap={2} mt={1}>
              <ScopeBadge escopo={detail.escopo} />
              <StatusBadge status={detail.situacao} />
            </Flex>
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
            <Tabs variant="line">
              <TabList overflowX="auto">
                <Tab>Informacoes</Tab>
                <Tab>Permissoes</Tab>
                <Tab>Usuarios</Tab>
                <Tab>Historico</Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <DetailRow label="Descricao" value={detail.descricao} />
                  <DetailRow label="Criado por" value={detail.criado_por} />
                  <DetailRow
                    label="Usuarios vinculados"
                    value={formatNumber(detail.usuarios)}
                  />
                  <DetailRow
                    label="Permissoes ativas"
                    value={formatNumber(detail.permissoes)}
                  />
                  <DetailRow
                    label="Criado em"
                    value={formatDateTime(detail.criado_em)}
                  />
                  <DetailRow
                    label="Atualizado em"
                    value={formatDateTime(detail.atualizado_em)}
                  />
                </TabPanel>
                <TabPanel px={0}>
                  {catalog && detail.permissions.length ? (
                    <PermissionMatrix
                      catalog={catalog}
                      selected={permissionsToSet(detail.permissions)}
                      readOnly
                    />
                  ) : (
                    <EmptyState
                      title="Nenhuma permissao atribuida"
                      icon={KeyRound}
                    />
                  )}
                </TabPanel>
                <TabPanel px={0}>
                  {detail.users.length ? (
                    <VStack align="stretch" spacing={2}>
                      {detail.users.map(user => (
                        <Flex
                          key={user.idusuario}
                          p={3}
                          border="1px solid"
                          borderColor="erp.border"
                          borderRadius="8px"
                          justify="space-between"
                          align="center"
                        >
                          <Box minW={0}>
                            <Text fontSize="12px" fontWeight="700">
                              {user.nome}
                            </Text>
                            <Text fontSize="10px" color="erp.textMuted">
                              {user.email} - {user.cargo} - {user.filial}
                            </Text>
                          </Box>
                          <StatusBadge status={user.situacao} />
                        </Flex>
                      ))}
                    </VStack>
                  ) : (
                    <EmptyState
                      title="Sem usuarios vinculados"
                      description="Nenhum usuario utiliza este perfil no momento."
                      icon={Users}
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
                            flexShrink={0}
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
                              {formatDateTime(item.criado_em)} - {item.usuario}
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
