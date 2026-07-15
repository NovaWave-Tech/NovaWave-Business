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
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Pencil, Power, Settings2, X } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../../shared/ui/ErpUI';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  financeService,
  type InfraBank,
  type InfraCategory,
  type InfraCostCenter,
  type InfraEntity,
} from '../services/financeService';

type EditingBank = {
  banco: string;
  agencia: string;
  conta: string;
  saldo: string;
};
type EditingCategory = { nome: string; tipo: string; cor: string };

const emptyBank: EditingBank = {
  banco: '',
  agencia: '',
  conta: '',
  saldo: '0.00',
};
const emptyCategory: EditingCategory = { nome: '', tipo: '2', cor: '' };

/**
 * Cadastros que o formulario de lancamento exige (conta bancaria, categoria
 * e centro de custo). Antes so existiam os dados semeados: nao havia tela
 * para criar nem editar.
 */
export function FinanceInfraModal({
  isOpen,
  onClose,
  canCreate,
  canEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  canCreate: boolean;
  canEdit: boolean;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ['finance-infra'],
    queryFn: financeService.infra,
    enabled: isOpen,
  });

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['finance-infra'] });
    // O formulario de lancamento le as opcoes do /finance.
    await client.invalidateQueries({ queryKey: ['finance'] });
  };
  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel salvar',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });

  const status = useMutation({
    mutationFn: ({
      entity,
      id,
      situacao,
    }: {
      entity: InfraEntity;
      id: number;
      situacao: number;
    }) => financeService.infraStatus(entity, id, situacao),
    onSuccess: refresh,
    onError: notifyError,
  });

  const data = query.data;

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
              <Icon as={Settings2} boxSize="22px" />
            </Flex>
            <Box>
              <Text textStyle="h5">Infraestrutura financeira</Text>
              <Text fontSize="12px" fontWeight="400" color="erp.textSecondary">
                Contas, categorias e centros de custo usados nos lancamentos.
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody p={5} maxH="70vh" overflowY="auto">
          {query.isLoading || !data ? (
            <Flex justify="center" py={10}>
              <Spinner color="brand.500" />
            </Flex>
          ) : (
            <Tabs variant="line" colorScheme="blue">
              <TabList>
                <Tab fontSize="13px">Contas ({data.banks.length})</Tab>
                <Tab fontSize="13px">Categorias ({data.categories.length})</Tab>
                <Tab fontSize="13px">
                  Centros de custo ({data.cost_centers.length})
                </Tab>
              </TabList>
              <TabPanels>
                <TabPanel px={0}>
                  <BanksTab
                    banks={data.banks}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    onSaved={refresh}
                    onError={notifyError}
                    onToggle={(id, situacao) =>
                      status.mutate({ entity: 'banks', id, situacao })
                    }
                  />
                </TabPanel>
                <TabPanel px={0}>
                  <CategoriesTab
                    categories={data.categories}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    onSaved={refresh}
                    onError={notifyError}
                    onToggle={(id, situacao) =>
                      status.mutate({ entity: 'categories', id, situacao })
                    }
                  />
                </TabPanel>
                <TabPanel px={0}>
                  <CostCentersTab
                    items={data.cost_centers}
                    canCreate={canCreate}
                    canEdit={canEdit}
                    onSaved={refresh}
                    onError={notifyError}
                    onToggle={(id, situacao) =>
                      status.mutate({ entity: 'cost-centers', id, situacao })
                    }
                  />
                </TabPanel>
              </TabPanels>
            </Tabs>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

/** Linha da lista: nome + detalhe, com editar e ativar/inativar. */
function InfraRow({
  title,
  detail,
  active,
  canEdit,
  onEdit,
  onToggle,
  accessory,
}: {
  title: string;
  detail?: string;
  active: boolean;
  canEdit: boolean;
  onEdit: () => void;
  onToggle: () => void;
  accessory?: React.ReactNode;
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
      {accessory}
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

function BanksTab({
  banks,
  canCreate,
  canEdit,
  onSaved,
  onError,
  onToggle,
}: {
  banks: InfraBank[];
  canCreate: boolean;
  canEdit: boolean;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
  onToggle: (id: number, situacao: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditingBank>(emptyBank);
  const open = Boolean(editingId) || form !== emptyBank;

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        banco: form.banco.trim(),
        agencia: form.agencia.trim(),
        conta: form.conta.trim(),
        saldo_inicial: Number(form.saldo) || 0,
      };
      return editingId
        ? financeService.updateBank(editingId, payload)
        : financeService.createBank(payload);
    },
    onSuccess: async () => {
      await onSaved();
      setForm(emptyBank);
      setEditingId(null);
    },
    onError,
  });

  return (
    <Box>
      {banks.length === 0 ? (
        <EmptyState
          title="Sem contas"
          description="Cadastre a primeira conta bancaria."
        />
      ) : (
        banks.map(bank => (
          <InfraRow
            key={bank.idconta_bancaria}
            title={`${bank.banco} · ${bank.conta}`}
            detail={`${bank.agencia ? `Ag. ${bank.agencia} · ` : ''}Saldo inicial ${formatCurrency(bank.saldo_inicial)}`}
            active={bank.situacao === 1}
            canEdit={canEdit}
            onEdit={() => {
              setEditingId(bank.idconta_bancaria);
              setForm({
                banco: bank.banco,
                agencia: bank.agencia ?? '',
                conta: bank.conta,
                saldo: Number(bank.saldo_inicial).toFixed(2),
              });
            }}
            onToggle={() =>
              onToggle(bank.idconta_bancaria, bank.situacao === 1 ? 0 : 1)
            }
          />
        ))
      )}

      {(canCreate || editingId) && (
        <Box
          as="form"
          mt={4}
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Text textStyle="overline" color="erp.textMuted" mb={2}>
            {editingId ? 'Editar conta' : 'Nova conta'}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
            <Input
              size="sm"
              placeholder="Banco"
              value={form.banco}
              onChange={e => setForm({ ...form, banco: e.target.value })}
            />
            <Input
              size="sm"
              placeholder="Agencia (opcional)"
              value={form.agencia}
              onChange={e => setForm({ ...form, agencia: e.target.value })}
            />
            <Input
              size="sm"
              placeholder="Conta"
              value={form.conta}
              onChange={e => setForm({ ...form, conta: e.target.value })}
            />
            <CurrencyInput
              value={form.saldo}
              onValueChange={saldo => setForm({ ...form, saldo })}
            />
          </SimpleGrid>
          <FormActions
            saving={save.isPending}
            label={editingId ? 'Salvar' : 'Adicionar'}
            onCancel={
              open
                ? () => {
                    setForm(emptyBank);
                    setEditingId(null);
                  }
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
}

function CategoriesTab({
  categories,
  canCreate,
  canEdit,
  onSaved,
  onError,
  onToggle,
}: {
  categories: InfraCategory[];
  canCreate: boolean;
  canEdit: boolean;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
  onToggle: (id: number, situacao: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditingCategory>(emptyCategory);

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        nome: form.nome.trim(),
        tipo: Number(form.tipo),
        cor: form.cor.trim() || undefined,
      };
      return editingId
        ? financeService.updateCategory(editingId, payload)
        : financeService.createCategory(payload);
    },
    onSuccess: async () => {
      await onSaved();
      setForm(emptyCategory);
      setEditingId(null);
    },
    onError,
  });

  return (
    <Box>
      {categories.length === 0 ? (
        <EmptyState
          title="Sem categorias"
          description="Cadastre a primeira categoria."
        />
      ) : (
        categories.map(category => (
          <InfraRow
            key={category.idcategoria_financeira}
            title={category.nome}
            detail={category.tipo === 1 ? 'Receita' : 'Despesa'}
            active={category.situacao === 1}
            canEdit={canEdit}
            accessory={
              <Box
                w="10px"
                h="10px"
                borderRadius="full"
                flexShrink={0}
                bg={
                  category.cor ||
                  (category.tipo === 1 ? 'erp.success' : 'erp.danger')
                }
              />
            }
            onEdit={() => {
              setEditingId(category.idcategoria_financeira);
              setForm({
                nome: category.nome,
                tipo: String(category.tipo),
                cor: category.cor ?? '',
              });
            }}
            onToggle={() =>
              onToggle(
                category.idcategoria_financeira,
                category.situacao === 1 ? 0 : 1
              )
            }
          />
        ))
      )}

      {(canCreate || editingId) && (
        <Box
          as="form"
          mt={4}
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Text textStyle="overline" color="erp.textMuted" mb={2}>
            {editingId ? 'Editar categoria' : 'Nova categoria'}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2}>
            <Input
              size="sm"
              placeholder="Nome"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
            />
            <ComboSelect
              size="sm"
              value={form.tipo}
              onChange={tipo => setForm({ ...form, tipo })}
              options={[
                { value: '1', label: 'Receita' },
                { value: '2', label: 'Despesa' },
              ]}
            />
            <Input
              size="sm"
              type="color"
              p={1}
              value={form.cor || '#2F80FF'}
              onChange={e => setForm({ ...form, cor: e.target.value })}
            />
          </SimpleGrid>
          <FormActions
            saving={save.isPending}
            label={editingId ? 'Salvar' : 'Adicionar'}
            onCancel={
              editingId
                ? () => {
                    setForm(emptyCategory);
                    setEditingId(null);
                  }
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
}

function CostCentersTab({
  items,
  canCreate,
  canEdit,
  onSaved,
  onError,
  onToggle,
}: {
  items: InfraCostCenter[];
  canCreate: boolean;
  canEdit: boolean;
  onSaved: () => Promise<void>;
  onError: (error: unknown) => void;
  onToggle: (id: number, situacao: number) => void;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [nome, setNome] = useState('');

  const save = useMutation({
    mutationFn: () =>
      editingId
        ? financeService.updateCostCenter(editingId, { nome: nome.trim() })
        : financeService.createCostCenter({ nome: nome.trim() }),
    onSuccess: async () => {
      await onSaved();
      setNome('');
      setEditingId(null);
    },
    onError,
  });

  return (
    <Box>
      {items.length === 0 ? (
        <EmptyState
          title="Sem centros de custo"
          description="Cadastre o primeiro."
        />
      ) : (
        items.map(item => (
          <InfraRow
            key={item.idcentro_custo}
            title={item.nome}
            active={item.situacao === 1}
            canEdit={canEdit}
            onEdit={() => {
              setEditingId(item.idcentro_custo);
              setNome(item.nome);
            }}
            onToggle={() =>
              onToggle(item.idcentro_custo, item.situacao === 1 ? 0 : 1)
            }
          />
        ))
      )}

      {(canCreate || editingId) && (
        <Box
          as="form"
          mt={4}
          onSubmit={(event: React.FormEvent) => {
            event.preventDefault();
            save.mutate();
          }}
        >
          <Text textStyle="overline" color="erp.textMuted" mb={2}>
            {editingId ? 'Editar centro de custo' : 'Novo centro de custo'}
          </Text>
          <Input
            size="sm"
            placeholder="Nome do centro de custo"
            value={nome}
            onChange={e => setNome(e.target.value)}
          />
          <FormActions
            saving={save.isPending}
            label={editingId ? 'Salvar' : 'Adicionar'}
            onCancel={
              editingId
                ? () => {
                    setNome('');
                    setEditingId(null);
                  }
                : undefined
            }
          />
        </Box>
      )}
    </Box>
  );
}
