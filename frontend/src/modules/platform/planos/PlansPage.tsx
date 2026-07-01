import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Skeleton,
  Switch,
  Text,
  Textarea,
  useDisclosure,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import { useState } from 'react';
import { apiError, platformApi } from '../services/platformApi';
import {
  EmptyState,
  ErrorState,
  PageHeader,
  Surface,
  platformColors,
} from '../components/PlatformUI';
import { platformTokens } from '../theme/platformTokens';
import { usePlatformToast } from '../hooks/usePlatformToast';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { formatCurrency, formatNumber } from '../../../shared/utils/formatters';

type Plan = {
  idplano: number;
  nome: string;
  descricao?: string;
  valor_mensal: string;
  valor_anual: string;
  limite_usuarios?: number;
  limite_filiais?: number;
  limite_produtos?: number;
  limite_armazenamento_mb?: number;
  modulos: string[];
  situacao: number;
};
const empty = {
  nome: '',
  descricao: '',
  valor_mensal: '',
  valor_anual: '',
  limite_usuarios: '',
  limite_filiais: '',
  limite_produtos: '',
  limite_armazenamento_mb: '',
  modulos: 'financeiro,estoque,crm,vendas',
  situacao: 1,
};

export default function PlansPage() {
  const modal = useDisclosure();
  const toast = usePlatformToast();
  const client = useQueryClient();
  const [form, setForm] = useState(empty);
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () =>
      (await platformApi.get<{ data: Plan[] }>('/planos')).data.data,
  });
  const save = useMutation({
    mutationFn: async () =>
      platformApi.post('/planos', {
        ...form,
        valor_mensal: Number(form.valor_mensal),
        valor_anual: Number(form.valor_anual),
        limite_usuarios: Number(form.limite_usuarios) || null,
        limite_filiais: Number(form.limite_filiais) || null,
        limite_produtos: Number(form.limite_produtos) || null,
        limite_armazenamento_mb: Number(form.limite_armazenamento_mb) || null,
        modulos: form.modulos
          .split(',')
          .map(v => v.trim())
          .filter(Boolean),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['platform-plans'] });
      modal.onClose();
      setForm(empty);
      toast({ title: 'Plano criado', status: 'success' });
    },
    onError: e => toast({ title: apiError(e), status: 'error' }),
  });
  return (
    <Box>
      <PageHeader
        title="Planos"
        description="Limites, modulos e precificacao do SaaS."
        action={modal.onOpen}
        actionLabel="Novo plano"
      />
      {isError ? (
        <Surface>
          <ErrorState retry={() => void refetch()} />
        </Surface>
      ) : isLoading ? (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Surface key={index} p={5}>
              <Skeleton h="190px" />
            </Surface>
          ))}
        </SimpleGrid>
      ) : data.length === 0 ? (
        <Surface>
          <EmptyState
            title="Nenhum plano cadastrado"
            description="Crie o primeiro plano comercial da plataforma."
            action={modal.onOpen}
            actionLabel="Novo plano"
          />
        </Surface>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={5}>
          {data.map(plan => (
            <Surface key={plan.idplano} p={5} interactive>
              <Badge colorScheme={plan.situacao === 1 ? 'green' : 'gray'}>
                {plan.situacao === 1 ? 'Ativo' : 'Inativo'}
              </Badge>
              <Text fontSize="lg" fontWeight="800" mt={3}>
                {plan.nome}
              </Text>
              <Text
                color={platformColors.muted}
                fontSize="sm"
                minH="42px"
                mt={1}
              >
                {plan.descricao || 'Sem descricao'}
              </Text>
              <Text fontSize="2xl" fontWeight="800" mt={5}>
                {formatCurrency(plan.valor_mensal)}
                <Text
                  as="span"
                  fontSize="sm"
                  color={platformColors.muted}
                  fontWeight="500"
                >
                  {' '}
                  / mes
                </Text>
              </Text>
              <Box mt={5}>
                {[
                  ['Usuarios', plan.limite_usuarios],
                  ['Filiais', plan.limite_filiais],
                  ['Produtos', plan.limite_produtos],
                  [
                    'Armazenamento',
                    plan.limite_armazenamento_mb
                      ? `${plan.limite_armazenamento_mb} MB`
                      : null,
                  ],
                ].map(([label, value]) => (
                  <Text key={label} fontSize="sm" py={1}>
                    <Check
                      size={14}
                      style={{
                        display: 'inline',
                        marginRight: 8,
                        color: platformTokens.colors.success,
                      }}
                    />
                    {label}:{' '}
                    <b>
                      {typeof value === 'number'
                        ? formatNumber(value)
                        : (value ?? 'Ilimitado')}
                    </b>
                  </Text>
                ))}
              </Box>
            </Surface>
          ))}
        </SimpleGrid>
      )}
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo plano</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <FormControl isRequired>
                <FormLabel>Nome</FormLabel>
                <Input
                  value={form.nome}
                  onChange={e => setForm(v => ({ ...v, nome: e.target.value }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Modulos</FormLabel>
                <Input
                  value={form.modulos}
                  onChange={e =>
                    setForm(v => ({ ...v, modulos: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Valor mensal</FormLabel>
                <CurrencyInput
                  value={form.valor_mensal}
                  onValueChange={value =>
                    setForm(v => ({ ...v, valor_mensal: value }))
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Valor anual</FormLabel>
                <CurrencyInput
                  value={form.valor_anual}
                  onValueChange={value =>
                    setForm(v => ({ ...v, valor_anual: value }))
                  }
                />
              </FormControl>
              {(
                [
                  'limite_usuarios',
                  'limite_filiais',
                  'limite_produtos',
                  'limite_armazenamento_mb',
                ] as const
              ).map(key => (
                <FormControl key={key}>
                  <FormLabel>{key.replaceAll('_', ' ')}</FormLabel>
                  <Input
                    type="number"
                    value={form[key]}
                    onChange={e =>
                      setForm(v => ({ ...v, [key]: e.target.value }))
                    }
                  />
                </FormControl>
              ))}
              <FormControl gridColumn={{ md: '1 / -1' }}>
                <FormLabel>Descricao</FormLabel>
                <Textarea
                  value={form.descricao}
                  onChange={e =>
                    setForm(v => ({ ...v, descricao: e.target.value }))
                  }
                />
              </FormControl>
              <FormControl display="flex" alignItems="center" gap={3}>
                <Switch
                  isChecked={form.situacao === 1}
                  onChange={e =>
                    setForm(v => ({ ...v, situacao: e.target.checked ? 1 : 0 }))
                  }
                />
                <FormLabel m={0}>Plano ativo</FormLabel>
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={modal.onClose}>
              Cancelar
            </Button>
            <Button isLoading={save.isPending} onClick={() => save.mutate()}>
              Salvar plano
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
