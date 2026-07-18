import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Network, Pencil, Power, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../../shared/ui/ErpUI';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  hrService,
  type Department,
  type Position,
  type StructureEntity,
} from '../services/hrService';

/** Departamentos e cargos: base para lotar os funcionarios. */
export function HrStructureModal({
  isOpen,
  onClose,
  departments,
  positions,
  canCreate,
  canEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  positions: Position[];
  canCreate: boolean;
  canEdit: boolean;
}) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['hr'] });
  const status = useMutation({
    mutationFn: ({
      entity,
      id,
      situacao,
    }: {
      entity: StructureEntity;
      id: number;
      situacao: number;
    }) => hrService.structureStatus(entity, id, situacao),
    onSuccess: refresh,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent borderRadius="16px" overflow="hidden">
        <ModalHeader p={5} borderBottom="1px solid" borderColor="erp.border">
          <Flex align="center" gap={3}>
            <Flex
              w="44px"
              h="44px"
              align="center"
              justify="center"
              borderRadius="12px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
              color="brand.500"
              flexShrink={0}
            >
              <Icon as={Network} boxSize="22px" />
            </Flex>
            <Box>
              <Text textStyle="h5">Estrutura organizacional</Text>
              <Text fontSize="12px" fontWeight="400" color="erp.textSecondary">
                Departamentos e cargos usados no cadastro de funcionarios.
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody p={5} maxH="70vh" overflowY="auto">
          <Tabs variant="line" colorScheme="blue">
            <TabList>
              <Tab fontSize="13px">Departamentos ({departments.length})</Tab>
              <Tab fontSize="13px">Cargos ({positions.length})</Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <DepartmentsTab
                  departments={departments}
                  canCreate={canCreate}
                  canEdit={canEdit}
                  onSaved={refresh}
                  onToggle={(id, situacao) =>
                    status.mutate({ entity: 'departments', id, situacao })
                  }
                />
              </TabPanel>
              <TabPanel px={0}>
                <PositionsTab
                  positions={positions}
                  departments={departments}
                  canCreate={canCreate}
                  canEdit={canEdit}
                  onSaved={refresh}
                  onToggle={(id, situacao) =>
                    status.mutate({ entity: 'positions', id, situacao })
                  }
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function Row({
  title,
  detail,
  active,
  canEdit,
  onEdit,
  onToggle,
}: {
  title: string;
  detail?: string;
  active: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: () => void;
}) {
  return (
    <Flex
      align="center"
      gap={3}
      py={2.5}
      borderBottom="1px solid"
      borderColor="erp.border"
      opacity={active ? 1 : 0.55}
    >
      <Box flex="1" minW={0}>
        <Text fontSize="13px" fontWeight="600" noOfLines={1}>
          {title}
        </Text>
        {detail && (
          <Text fontSize="11px" color="erp.textMuted" noOfLines={1}>
            {detail}
          </Text>
        )}
      </Box>
      {!active && (
        <Badge colorScheme="gray" fontSize="10px">
          Inativo
        </Badge>
      )}
      {canEdit && (
        <Flex gap={1} flexShrink={0}>
          <Tooltip label="Editar">
            <IconButton
              aria-label="Editar"
              icon={<Pencil size={13} />}
              size="xs"
              variant="ghost"
              onClick={onEdit}
            />
          </Tooltip>
          <Tooltip label={active ? 'Inativar' : 'Ativar'}>
            <IconButton
              aria-label="Alternar situacao"
              icon={<Power size={13} />}
              size="xs"
              variant="ghost"
              color={active ? 'erp.danger' : 'erp.success'}
              onClick={onToggle}
            />
          </Tooltip>
        </Flex>
      )}
    </Flex>
  );
}

function FormActions({
  saving,
  onCancel,
  label,
}: {
  saving: boolean;
  onCancel?: () => void;
  label: string;
}) {
  return (
    <Flex gap={2} mt={3} justify="flex-end">
      {onCancel && (
        <Button
          size="sm"
          variant="ghost"
          leftIcon={<X size={13} />}
          onClick={onCancel}
        >
          Cancelar
        </Button>
      )}
      <Button
        size="sm"
        type="submit"
        leftIcon={<Check size={14} />}
        isLoading={saving}
      >
        {label}
      </Button>
    </Flex>
  );
}

function DepartmentsTab({
  departments,
  canCreate,
  canEdit,
  onSaved,
  onToggle,
}: {
  departments: Department[];
  canCreate: boolean;
  canEdit: boolean;
  onSaved: () => void;
  onToggle: (id: number, situacao: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const save = useMutation({
    mutationFn: () =>
      hrService.saveDepartment(
        { nome: nome.trim(), descricao: descricao.trim() || undefined },
        editingId ?? undefined
      ),
    onSuccess: () => {
      onSaved();
      setEditingId(null);
      setNome('');
      setDescricao('');
    },
  });

  return (
    <Box>
      {departments.length === 0 ? (
        <EmptyState
          title="Sem departamentos"
          description="Cadastre o primeiro."
        />
      ) : (
        departments.map(dep => (
          <Row
            key={dep.id}
            title={dep.nome}
            detail={dep.descricao ?? undefined}
            active={dep.situacao === 1}
            canEdit={canEdit}
            onEdit={() => {
              setEditingId(dep.id);
              setNome(dep.nome);
              setDescricao(dep.descricao ?? '');
            }}
            onToggle={() => onToggle(dep.id, dep.situacao === 1 ? 0 : 1)}
          />
        ))
      )}
      {(canCreate || editingId) && (
        <Box
          as="form"
          mt={4}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Text textStyle="overline" color="erp.textMuted" mb={2}>
            {editingId ? 'Editar departamento' : 'Novo departamento'}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
            <Input
              size="sm"
              placeholder="Nome"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <Input
              size="sm"
              placeholder="Descricao (opcional)"
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
            />
          </SimpleGrid>
          <FormActions
            saving={save.isPending}
            label={editingId ? 'Salvar' : 'Adicionar'}
            onCancel={
              editingId
                ? () => {
                    setEditingId(null);
                    setNome('');
                    setDescricao('');
                  }
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
}

function PositionsTab({
  positions,
  departments,
  canCreate,
  canEdit,
  onSaved,
  onToggle,
}: {
  positions: Position[];
  departments: Department[];
  canCreate: boolean;
  canEdit: boolean;
  onSaved: () => void;
  onToggle: (id: number, situacao: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [dep, setDep] = useState('');
  const [salario, setSalario] = useState('0.00');
  const depName = (id?: number | null) =>
    departments.find(d => d.id === id)?.nome;

  const save = useMutation({
    mutationFn: () =>
      hrService.savePosition(
        {
          nome: nome.trim(),
          salario_base: Number(salario) || 0,
          iddepartamento: dep ? Number(dep) : null,
        },
        editingId ?? undefined
      ),
    onSuccess: () => {
      onSaved();
      setEditingId(null);
      setNome('');
      setDep('');
      setSalario('0.00');
    },
  });

  return (
    <Box>
      {positions.length === 0 ? (
        <EmptyState title="Sem cargos" description="Cadastre o primeiro." />
      ) : (
        positions.map(pos => (
          <Row
            key={pos.id}
            title={pos.nome}
            detail={`${depName(pos.iddepartamento) ? `${depName(pos.iddepartamento)} · ` : ''}Base ${formatCurrency(pos.salario_base)}`}
            active={pos.situacao === 1}
            canEdit={canEdit}
            onEdit={() => {
              setEditingId(pos.id);
              setNome(pos.nome);
              setDep(pos.iddepartamento ? String(pos.iddepartamento) : '');
              setSalario(Number(pos.salario_base).toFixed(2));
            }}
            onToggle={() => onToggle(pos.id, pos.situacao === 1 ? 0 : 1)}
          />
        ))
      )}
      {(canCreate || editingId) && (
        <Box
          as="form"
          mt={4}
          onSubmit={(e: React.FormEvent) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <Text textStyle="overline" color="erp.textMuted" mb={2}>
            {editingId ? 'Editar cargo' : 'Novo cargo'}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2}>
            <Input
              size="sm"
              placeholder="Nome do cargo"
              value={nome}
              onChange={e => setNome(e.target.value)}
            />
            <ComboSelect
              size="sm"
              value={dep}
              onChange={setDep}
              placeholder="Departamento"
              options={departments.map(d => ({
                value: String(d.id),
                label: d.nome,
              }))}
            />
            <CurrencyInput value={salario} onValueChange={setSalario} />
          </SimpleGrid>
          <FormActions
            saving={save.isPending}
            label={editingId ? 'Salvar' : 'Adicionar'}
            onCancel={
              editingId
                ? () => {
                    setEditingId(null);
                    setNome('');
                    setDep('');
                    setSalario('0.00');
                  }
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
}
