import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  SimpleGrid,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Check,
  Globe,
  MapPin,
  Package,
  Phone,
  Store,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ErrorState,
  KpiCard,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import FormattedInput from '../../../shared/ui/FormattedInput';
import { formatDateTime, formatNumber } from '../../../shared/utils/formatters';
import {
  companyService,
  type CompanyData,
  type CompanyPayload,
} from '../services/companyService';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Rio_Branco',
];

export default function CompaniesPage() {
  const toast = useToast();
  const client = useQueryClient();
  const company = useQuery({
    queryKey: ['company'],
    queryFn: companyService.show,
  });
  const [form, setForm] = useState<CompanyPayload | null>(null);

  useEffect(() => {
    const data = company.data;
    if (data && !form) {
      setForm({
        razao_social: data.razao_social,
        nome_fantasia: data.nome_fantasia,
        cnpj: data.cnpj || '',
        inscricao_estadual: data.inscricao_estadual || '',
        email: data.email || '',
        telefone: data.telefone || '',
        cep: data.cep || '',
        endereco: data.endereco || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        bairro: data.bairro || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        timezone: data.timezone,
        moeda: data.moeda,
        idioma: data.idioma,
      });
    }
  }, [company.data, form]);

  const save = useMutation({
    mutationFn: () => companyService.update(form as CompanyPayload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['company'] });
      toast({ title: 'Dados da empresa atualizados', status: 'success' });
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

  const data: CompanyData | undefined = company.data;
  const setField = (key: keyof CompanyPayload, value: string) =>
    setForm(current => (current ? { ...current, [key]: value } : current));

  if (company.isError)
    return <ErrorState retry={() => void company.refetch()} />;

  return (
    <Box>
      <PageHeader
        icon={Building2}
        title="Empresa"
        description="Dados cadastrais, contato, endereco e preferencias regionais da empresa."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'Empresa' }]}
        actions={
          <Button
            leftIcon={<Check size={16} />}
            isLoading={save.isPending}
            isDisabled={!form || form.razao_social.trim().length < 3}
            onClick={() => save.mutate()}
          >
            Salvar alteracoes
          </Button>
        }
      />

      <SimpleGrid columns={{ base: 1, sm: 2, xl: 4 }} spacing={3} mb={5}>
        <KpiCard
          index={0}
          tone="brand"
          label="Filiais ativas"
          count={Number(data?.stats.branches)}
          format={formatNumber}
          detail="Unidades em operacao"
          icon={Store}
        />
        <KpiCard
          index={1}
          tone="info"
          label="Usuarios ativos"
          count={Number(data?.stats.users)}
          format={formatNumber}
          detail="Com acesso ao sistema"
          icon={Users}
        />
        <KpiCard
          index={2}
          tone="brand"
          label="Clientes"
          count={Number(data?.stats.customers)}
          format={formatNumber}
          detail="Base cadastrada"
          icon={Users}
        />
        <KpiCard
          index={3}
          tone="neutral"
          label="Produtos"
          count={Number(data?.stats.products)}
          format={formatNumber}
          detail="No catalogo"
          icon={Package}
        />
      </SimpleGrid>

      {company.isLoading || !form ? (
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
      ) : (
        <VStack align="stretch" spacing={5}>
          <Surface overflow="hidden">
            <SectionHeader
              icon={Building2}
              eyebrow="Identificacao"
              title="Dados cadastrais"
              description="Razao social, nome fantasia e documentos fiscais"
            />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} p={5}>
              <FormControl isRequired>
                <FormLabel>Razao social</FormLabel>
                <Input
                  value={form.razao_social}
                  onChange={event =>
                    setField('razao_social', event.target.value)
                  }
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Nome fantasia</FormLabel>
                <Input
                  value={form.nome_fantasia}
                  onChange={event =>
                    setField('nome_fantasia', event.target.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>CNPJ</FormLabel>
                <FormattedInput
                  mask="cnpj"
                  value={form.cnpj || ''}
                  onValueChange={value => setField('cnpj', value)}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Inscricao estadual</FormLabel>
                <Input
                  value={form.inscricao_estadual || ''}
                  onChange={event =>
                    setField('inscricao_estadual', event.target.value)
                  }
                />
              </FormControl>
            </SimpleGrid>
          </Surface>

          <Surface overflow="hidden">
            <SectionHeader
              icon={Phone}
              eyebrow="Contato"
              title="Canais de contato"
              description="E-mail e telefone institucionais"
            />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} p={5}>
              <FormControl>
                <FormLabel>E-mail</FormLabel>
                <Input
                  type="email"
                  value={form.email || ''}
                  onChange={event => setField('email', event.target.value)}
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
            </SimpleGrid>
          </Surface>

          <Surface overflow="hidden">
            <SectionHeader
              icon={MapPin}
              eyebrow="Localizacao"
              title="Endereco da sede"
              description="Endereco fiscal da empresa"
            />
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} p={5}>
              <FormControl>
                <FormLabel>CEP</FormLabel>
                <FormattedInput
                  mask="cep"
                  value={form.cep || ''}
                  onValueChange={value => setField('cep', value)}
                />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}>
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
                <FormLabel>Complemento</FormLabel>
                <Input
                  value={form.complemento || ''}
                  onChange={event =>
                    setField('complemento', event.target.value)
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel>Bairro</FormLabel>
                <Input
                  value={form.bairro || ''}
                  onChange={event => setField('bairro', event.target.value)}
                />
              </FormControl>
              <FormControl gridColumn={{ md: 'span 2' }}>
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
          </Surface>

          <Surface overflow="hidden">
            <SectionHeader
              icon={Globe}
              eyebrow="Regional"
              title="Preferencias regionais"
              description="Fuso horario, moeda e idioma padrao"
            />
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} p={5}>
              <FormControl>
                <FormLabel>Fuso horario</FormLabel>
                <ComboSelect
                  value={form.timezone ?? ''}
                  onChange={value => setField('timezone', value)}
                  options={TIMEZONES.map(zone => ({
                    value: zone,
                    label: zone,
                  }))}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Moeda</FormLabel>
                <ComboSelect
                  value={form.moeda ?? ''}
                  onChange={value => setField('moeda', value)}
                  options={[
                    { value: 'BRL', label: 'Real (BRL)' },
                    { value: 'USD', label: 'Dolar (USD)' },
                    { value: 'EUR', label: 'Euro (EUR)' },
                  ]}
                />
              </FormControl>
              <FormControl>
                <FormLabel>Idioma</FormLabel>
                <ComboSelect
                  value={form.idioma ?? ''}
                  onChange={value => setField('idioma', value)}
                  options={[
                    { value: 'pt-BR', label: 'Portugues (Brasil)' },
                    { value: 'en-US', label: 'Ingles (EUA)' },
                    { value: 'es-ES', label: 'Espanhol' },
                  ]}
                />
              </FormControl>
            </SimpleGrid>
          </Surface>

          {data && (
            <Flex justify="space-between" px={1} wrap="wrap" gap={2}>
              <Text fontSize="11px" color="erp.textMuted">
                Cadastrada em {formatDateTime(data.criado_em)}
              </Text>
              {data.atualizado_em && (
                <Text fontSize="11px" color="erp.textMuted">
                  Ultima atualizacao {formatDateTime(data.atualizado_em)}
                </Text>
              )}
            </Flex>
          )}
        </VStack>
      )}
    </Box>
  );
}
