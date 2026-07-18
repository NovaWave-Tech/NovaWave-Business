import {
  Badge,
  Box,
  Button,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  SimpleGrid,
  Spinner,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  BadgeCheck,
  CheckCircle2,
  MoreHorizontal,
  Network,
  Pencil,
  Plus,
  Search,
  UserPlus,
  Users,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';
import {
  EmptyState,
  ErrorState,
  KpiCard,
  PageHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { FilterSelect } from '../../../shared/ui/FilterSelect';
import { useAuth } from '../../../shared/auth/AuthContext';
import {
  formatCurrency,
  formatDate,
  formatDocument,
  formatNumber,
} from '../../../shared/utils/formatters';
import { EmployeeDrawer } from '../components/EmployeeDrawer';
import { HrStructureModal } from '../components/HrStructureModal';
import { hrService, type Employee } from '../services/hrService';

export default function HrPage() {
  const toast = useToast();
  const client = useQueryClient();
  const { can } = useAuth();
  const canCreate = can('funcionario:criar');
  const canEdit = can('funcionario:editar');
  const drawer = useDisclosure();
  const structure = useDisclosure();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [filters, setFilters] = useState({ q: '', status: '', department: '' });

  const query = useQuery({
    queryKey: ['hr', filters],
    queryFn: () => hrService.list(filters),
  });
  const data = query.data;

  const status = useMutation({
    mutationFn: ({ id, situacao }: { id: number; situacao: number }) =>
      hrService.status(id, situacao),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['hr'] });
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: (error: unknown) =>
      toast({
        title: 'Nao foi possivel concluir a acao',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        status: 'error',
        position: 'top-right',
      }),
  });

  const openNew = () => {
    setEditing(null);
    drawer.onOpen();
  };
  const openEdit = (employee: Employee) => {
    setEditing(employee);
    drawer.onOpen();
  };

  if (query.isError) return <ErrorState retry={() => void query.refetch()} />;

  return (
    <Box>
      <PageHeader
        icon={Users}
        title="Recursos Humanos"
        description="Funcionarios, cargos e departamentos da empresa."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'RH' }]}
        actions={
          <Flex gap={2}>
            <Button
              variant="outline"
              leftIcon={<Network size={16} />}
              onClick={structure.onOpen}
            >
              Estrutura
            </Button>
            {canCreate && (
              <Button leftIcon={<Plus size={16} />} onClick={openNew}>
                Novo funcionario
              </Button>
            )}
          </Flex>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Funcionarios ativos"
          count={Number(data?.metrics.ativos)}
          format={formatNumber}
          detail="Na folha atual"
          icon={Users}
        />
        <KpiCard
          index={1}
          tone="success"
          label="Folha mensal"
          count={Number(data?.metrics.folha)}
          format={formatCurrency}
          detail="Soma dos salarios ativos"
          icon={Wallet}
        />
        <KpiCard
          index={2}
          tone="info"
          label="Admitidos no mes"
          count={Number(data?.metrics.admitidos_mes)}
          format={formatNumber}
          detail="Novas contratacoes"
          icon={UserPlus}
        />
        <KpiCard
          index={3}
          tone="neutral"
          label="Inativos"
          count={Number(data?.metrics.inativos)}
          format={formatNumber}
          detail="Desligados / afastados"
          icon={BadgeCheck}
        />
      </SimpleGrid>

      <Surface overflow="hidden">
        <Flex
          p={4}
          gap={3}
          wrap="wrap"
          align="center"
          borderBottom="1px solid"
          borderColor="erp.border"
        >
          <InputGroup maxW="280px" size="sm">
            <InputLeftElement pointerEvents="none">
              <Search size={15} />
            </InputLeftElement>
            <Input
              placeholder="Buscar por nome, e-mail ou CPF"
              value={filters.q}
              onChange={e => setFilters(f => ({ ...f, q: e.target.value }))}
              borderRadius="8px"
            />
          </InputGroup>
          <FilterSelect
            label="Situacao"
            value={filters.status}
            onChange={value => setFilters(f => ({ ...f, status: value }))}
            options={[
              { value: '', label: 'Todas' },
              { value: '1', label: 'Ativos' },
              { value: '0', label: 'Inativos' },
            ]}
          />
          <FilterSelect
            label="Departamento"
            value={filters.department}
            onChange={value => setFilters(f => ({ ...f, department: value }))}
            options={[
              { value: '', label: 'Todos' },
              ...(data?.options.departments ?? []).map(d => ({
                value: String(d.id),
                label: d.nome,
              })),
            ]}
          />
        </Flex>

        {query.isLoading ? (
          <Flex justify="center" py={16}>
            <Spinner color="brand.500" />
          </Flex>
        ) : (data?.employees.length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum funcionario"
            description={
              canCreate
                ? 'Cadastre o primeiro funcionario ou ajuste os filtros.'
                : 'Nenhum funcionario encontrado.'
            }
            action={canCreate ? openNew : undefined}
            actionLabel="Novo funcionario"
          />
        ) : (
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Funcionario</Th>
                  <Th>Cargo / Departamento</Th>
                  <Th>Filial</Th>
                  <Th>Admissao</Th>
                  <Th isNumeric>Salario</Th>
                  <Th>Situacao</Th>
                  <Th textAlign="right">Acoes</Th>
                </Tr>
              </Thead>
              <Tbody>
                {data?.employees.map(emp => (
                  <Tr
                    key={emp.idfuncionario}
                    cursor={canEdit ? 'pointer' : undefined}
                    onClick={() => canEdit && openEdit(emp)}
                  >
                    <Td>
                      <Text fontWeight="600">{emp.nome}</Text>
                      <Text fontSize="11px" color="erp.textMuted">
                        {emp.cpf ? formatDocument(emp.cpf) : emp.email || '-'}
                      </Text>
                    </Td>
                    <Td>
                      <Text fontSize="12px">{emp.cargo ?? 'Sem cargo'}</Text>
                      <Text fontSize="11px" color="erp.textMuted">
                        {emp.departamento ?? '-'}
                      </Text>
                    </Td>
                    <Td>{emp.filial}</Td>
                    <Td>{formatDate(emp.data_admissao)}</Td>
                    <Td isNumeric fontWeight="600">
                      {formatCurrency(emp.salario)}
                    </Td>
                    <Td>
                      <Badge
                        colorScheme={emp.situacao === 1 ? 'green' : 'gray'}
                        textTransform="none"
                      >
                        {emp.situacao === 1 ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </Td>
                    <Td onClick={e => e.stopPropagation()}>
                      <Flex justify="flex-end">
                        <Menu>
                          <Tooltip label="Acoes">
                            <MenuButton
                              as={IconButton}
                              aria-label="Acoes"
                              icon={<MoreHorizontal size={17} />}
                              variant="ghost"
                              size="sm"
                            />
                          </Tooltip>
                          <MenuList>
                            <MenuItem
                              icon={<Pencil size={15} />}
                              isDisabled={!canEdit}
                              onClick={() => openEdit(emp)}
                            >
                              Editar
                            </MenuItem>
                            {canEdit && <MenuDivider />}
                            {canEdit &&
                              (emp.situacao === 1 ? (
                                <MenuItem
                                  icon={<Ban size={15} />}
                                  color="erp.danger"
                                  onClick={() =>
                                    status.mutate({
                                      id: emp.idfuncionario,
                                      situacao: 0,
                                    })
                                  }
                                >
                                  Inativar
                                </MenuItem>
                              ) : (
                                <MenuItem
                                  icon={<CheckCircle2 size={15} />}
                                  color="erp.success"
                                  onClick={() =>
                                    status.mutate({
                                      id: emp.idfuncionario,
                                      situacao: 1,
                                    })
                                  }
                                >
                                  Ativar
                                </MenuItem>
                              ))}
                          </MenuList>
                        </Menu>
                      </Flex>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        )}
      </Surface>

      <EmployeeDrawer
        isOpen={drawer.isOpen}
        onClose={drawer.onClose}
        employee={editing}
        branches={data?.options.branches ?? []}
        positions={data?.options.positions ?? []}
        departments={data?.options.departments ?? []}
      />
      <HrStructureModal
        isOpen={structure.isOpen}
        onClose={structure.onClose}
        departments={data?.options.departments ?? []}
        positions={data?.options.positions ?? []}
        canCreate={canCreate}
        canEdit={canEdit}
      />
    </Box>
  );
}
