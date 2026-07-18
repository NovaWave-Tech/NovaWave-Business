import {
  Box,
  Button,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  FormControl,
  FormLabel,
  Input,
  SimpleGrid,
  Switch,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import FormattedInput, {
  CurrencyInput,
} from '../../../shared/ui/FormattedInput';
import {
  hrService,
  type Department,
  type Employee,
  type Position,
} from '../services/hrService';

type FormState = {
  nome: string;
  idfilial: string;
  idcargo: string;
  cpf: string;
  email: string;
  telefone: string;
  salario: string;
  data_admissao: string;
  data_demissao: string;
  data_nascimento: string;
  ativo: boolean;
};

const empty: FormState = {
  nome: '',
  idfilial: '',
  idcargo: '',
  cpf: '',
  email: '',
  telefone: '',
  salario: '0.00',
  data_admissao: '',
  data_demissao: '',
  data_nascimento: '',
  ativo: true,
};

export function EmployeeDrawer({
  isOpen,
  onClose,
  employee,
  branches,
  positions,
  departments,
}: {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  branches: Array<{ id: number; nome: string }>;
  positions: Position[];
  departments: Department[];
}) {
  const toast = useToast();
  const client = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [touched, setTouched] = useState(false);
  const set = (patch: Partial<FormState>) =>
    setForm(current => ({ ...current, ...patch }));

  useEffect(() => {
    if (!isOpen) return;
    if (employee) {
      set({
        nome: employee.nome,
        idfilial: String(employee.idfilial),
        idcargo: employee.idcargo ? String(employee.idcargo) : '',
        cpf: employee.cpf ?? '',
        email: employee.email ?? '',
        telefone: employee.telefone ?? '',
        salario: employee.salario.toFixed(2),
        data_admissao: employee.data_admissao ?? '',
        data_demissao: employee.data_demissao ?? '',
        data_nascimento: employee.data_nascimento ?? '',
        ativo: employee.situacao === 1,
      });
    } else {
      setForm({
        ...empty,
        idfilial: branches[0] ? String(branches[0].id) : '',
      });
    }
    setTouched(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, employee]);

  const nomeError = form.nome.trim().length < 3;
  const filialError = !form.idfilial;
  const invalid = nomeError || filialError;

  const depOf = (positionId: string) =>
    departments.find(
      d =>
        d.id ===
        positions.find(p => String(p.id) === positionId)?.iddepartamento
    )?.nome;

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        nome: form.nome.trim(),
        idfilial: Number(form.idfilial),
        idcargo: form.idcargo ? Number(form.idcargo) : null,
        cpf: form.cpf || undefined,
        email: form.email.trim() || undefined,
        telefone: form.telefone || undefined,
        salario: Number(form.salario) || 0,
        data_admissao: form.data_admissao || undefined,
        data_demissao: form.data_demissao || undefined,
        data_nascimento: form.data_nascimento || undefined,
        situacao: form.ativo,
      };
      return employee
        ? hrService.update(employee.idfuncionario, payload)
        : hrService.create(payload);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['hr'] });
      toast({
        title: employee ? 'Funcionario atualizado' : 'Funcionario cadastrado',
        status: 'success',
      });
      onClose();
    },
    onError: (error: unknown) =>
      toast({
        title: 'Nao foi possivel salvar',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        status: 'error',
        position: 'top-right',
      }),
  });

  const submit = () => {
    setTouched(true);
    if (!invalid) save.mutate();
  };

  return (
    <Drawer isOpen={isOpen} placement="right" size="md" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottom="1px solid" borderColor="erp.border">
          {employee ? 'Editar funcionario' : 'Novo funcionario'}
        </DrawerHeader>
        <DrawerBody>
          <FormControl isRequired isInvalid={touched && nomeError} mt={2}>
            <FormLabel>Nome completo</FormLabel>
            <Input
              value={form.nome}
              onChange={e => set({ nome: e.target.value })}
              placeholder="Nome do funcionario"
            />
          </FormControl>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
            <FormControl isRequired isInvalid={touched && filialError}>
              <FormLabel>Filial</FormLabel>
              <ComboSelect
                value={form.idfilial}
                onChange={idfilial => set({ idfilial })}
                placeholder="Selecione"
                options={branches.map(b => ({
                  value: String(b.id),
                  label: b.nome,
                }))}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Cargo</FormLabel>
              <ComboSelect
                value={form.idcargo}
                onChange={idcargo => set({ idcargo })}
                placeholder="Sem cargo"
                options={positions
                  .filter(
                    p => p.situacao === 1 || String(p.id) === form.idcargo
                  )
                  .map(p => ({ value: String(p.id), label: p.nome }))}
              />
              {form.idcargo && depOf(form.idcargo) && (
                <Text mt={1} fontSize="11px" color="erp.textMuted">
                  Departamento: {depOf(form.idcargo)}
                </Text>
              )}
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
            <FormControl>
              <FormLabel>CPF</FormLabel>
              <FormattedInput
                mask="cpf"
                value={form.cpf}
                onValueChange={cpf => set({ cpf })}
                placeholder="000.000.000-00"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Data de nascimento</FormLabel>
              <Input
                type="date"
                value={form.data_nascimento}
                onChange={e => set({ data_nascimento: e.target.value })}
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
            <FormControl>
              <FormLabel>E-mail</FormLabel>
              <Input
                type="email"
                value={form.email}
                onChange={e => set({ email: e.target.value })}
                placeholder="email@empresa.com"
              />
            </FormControl>
            <FormControl>
              <FormLabel>Telefone</FormLabel>
              <FormattedInput
                mask="phone"
                value={form.telefone}
                onValueChange={telefone => set({ telefone })}
                placeholder="(00) 00000-0000"
              />
            </FormControl>
          </SimpleGrid>

          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={4} mt={4}>
            <FormControl>
              <FormLabel>Salario</FormLabel>
              <CurrencyInput
                value={form.salario}
                onValueChange={salario => set({ salario })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Admissao</FormLabel>
              <Input
                type="date"
                value={form.data_admissao}
                onChange={e => set({ data_admissao: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>Demissao</FormLabel>
              <Input
                type="date"
                value={form.data_demissao}
                onChange={e => set({ data_demissao: e.target.value })}
              />
            </FormControl>
          </SimpleGrid>

          <FormControl
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mt={5}
            p={3}
            borderRadius="8px"
            bg="erp.surfaceSubtle"
          >
            <Box>
              <FormLabel mb={0}>Funcionario ativo</FormLabel>
              <Text fontSize="11px" color="erp.textMuted">
                Inativos saem da folha e das metricas.
              </Text>
            </Box>
            <Switch
              isChecked={form.ativo}
              onChange={e => set({ ativo: e.target.checked })}
            />
          </FormControl>
        </DrawerBody>
        <DrawerFooter borderTop="1px solid" borderColor="erp.border" gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button isLoading={save.isPending} onClick={submit}>
            {employee ? 'Salvar' : 'Cadastrar'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
