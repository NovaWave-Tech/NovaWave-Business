import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Grid,
  Input,
  Select,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Save } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, Surface, platformColors } from '../components/PlatformUI';
import { apiError, platformApi } from '../services/platformApi';
import { platformTokens } from '../theme/platformTokens';
import { usePlatformToast } from '../hooks/usePlatformToast';

type Plan = { idplano: number; nome: string; valor_mensal: string };
type FormState = Record<string, string>;
const initial: FormState = {
  razao_social: '',
  nome_fantasia: '',
  cnpj: '',
  inscricao_estadual: '',
  email: '',
  telefone: '',
  cep: '',
  endereco: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  timezone: 'America/Sao_Paulo',
  moeda: 'BRL',
  idioma: 'pt-BR',
  idplano: '',
  data_inicio: new Date().toISOString().slice(0, 10),
  data_proxima_cobranca: '',
  forma_pagamento: 'pix',
  assinatura_status: '2',
  valor_atual: '',
  filial_nome: 'Matriz',
  filial_codigo: 'MATRIZ',
  filial_cnpj: '',
  admin_nome: '',
  admin_email: '',
  admin_telefone: '',
  admin_senha: '',
};
const steps = ['Empresa', 'Plano', 'Filial matriz', 'Administrador', 'Revisao'];

function Field({
  label,
  name,
  form,
  setForm,
  type = 'text',
  required = false,
}: {
  label: string;
  name: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  type?: string;
  required?: boolean;
}) {
  return (
    <FormControl isRequired={required}>
      <FormLabel fontSize="sm">{label}</FormLabel>
      <Input
        type={type}
        value={form[name]}
        onChange={e => setForm(v => ({ ...v, [name]: e.target.value }))}
        bg="white"
      />
    </FormControl>
  );
}

export default function NewCompanyPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const toast = usePlatformToast();
  const queryClient = useQueryClient();
  const { data: plans = [] } = useQuery({
    queryKey: ['platform-plans'],
    queryFn: async () =>
      (await platformApi.get<{ data: Plan[] }>('/planos')).data.data,
  });
  const canContinue =
    step === 0
      ? Boolean(form.razao_social && form.nome_fantasia)
      : step === 1
        ? Boolean(form.idplano && form.data_inicio)
        : step === 2
          ? Boolean(form.filial_nome && form.filial_codigo)
          : step === 3
            ? Boolean(
                form.admin_nome &&
                form.admin_email &&
                form.admin_senha.length >= 8
              )
            : true;
  const submit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(
          Object.entries(form).filter(
            ([key]) =>
              !key.includes('_nome') &&
              !key.includes('_codigo') &&
              !key.startsWith('admin_') &&
              !key.startsWith('filial_') &&
              ![
                'idplano',
                'data_inicio',
                'data_proxima_cobranca',
                'forma_pagamento',
                'assinatura_status',
                'valor_atual',
              ].includes(key)
          )
        ),
        assinatura: {
          idplano: Number(form.idplano),
          data_inicio: form.data_inicio,
          data_proxima_cobranca: form.data_proxima_cobranca || null,
          forma_pagamento: form.forma_pagamento,
          status: Number(form.assinatura_status),
          valor_atual: Number(form.valor_atual || 0),
        },
        filial: {
          nome: form.filial_nome,
          codigo: form.filial_codigo,
          cnpj: form.filial_cnpj || form.cnpj,
          email: form.email,
          telefone: form.telefone,
          cep: form.cep,
          endereco: form.endereco,
          numero: form.numero,
          complemento: form.complemento,
          bairro: form.bairro,
          cidade: form.cidade,
          estado: form.estado,
        },
        administrador: {
          nome: form.admin_nome,
          email: form.admin_email,
          telefone: form.admin_telefone,
          senha: form.admin_senha,
        },
      };
      const response = await platformApi.post<{ data: { idempresa: number } }>(
        '/empresas',
        payload
      );
      await queryClient.invalidateQueries({ queryKey: ['platform-companies'] });
      toast({
        title: 'Empresa provisionada',
        status: 'success',
        position: 'top-right',
      });
      navigate(`/platform/empresas/${response.data.data.idempresa}`);
    } catch (error) {
      toast({
        title: 'Nao foi possivel criar a empresa',
        description: apiError(error),
        status: 'error',
        position: 'top-right',
      });
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box>
      <PageHeader
        title="Nova empresa"
        description="Provisionamento completo do ambiente cliente."
      />
      <Flex gap={0} mb={5} overflowX="auto">
        {steps.map((label, index) => (
          <Flex key={label} align="center" minW="150px" flex="1">
            <Flex
              w="28px"
              h="28px"
              borderRadius="full"
              align="center"
              justify="center"
              bg={
                index <= step
                  ? platformTokens.colors.primary
                  : platformTokens.colors.border
              }
              color={
                index <= step ? 'white' : platformTokens.colors.textSecondary
              }
              fontSize="sm"
              fontWeight="800"
            >
              {index < step ? <Check size={15} /> : index + 1}
            </Flex>
            <Text
              ml={2}
              fontSize="sm"
              fontWeight={index === step ? '800' : '600'}
              color={
                index === step ? platformColors.text : platformColors.muted
              }
            >
              {label}
            </Text>
            {index < steps.length - 1 && (
              <Box h="1px" bg={platformTokens.colors.border} flex="1" mx={3} />
            )}
          </Flex>
        ))}
      </Flex>
      <Surface p={{ base: 4, md: 6 }}>
        {step === 0 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Field
              label="Razao social"
              name="razao_social"
              form={form}
              setForm={setForm}
              required
            />
            <Field
              label="Nome fantasia"
              name="nome_fantasia"
              form={form}
              setForm={setForm}
              required
            />
            <Field label="CNPJ" name="cnpj" form={form} setForm={setForm} />
            <Field
              label="Inscricao estadual"
              name="inscricao_estadual"
              form={form}
              setForm={setForm}
            />
            <Field
              label="E-mail"
              name="email"
              form={form}
              setForm={setForm}
              type="email"
            />
            <Field
              label="Telefone"
              name="telefone"
              form={form}
              setForm={setForm}
            />
            <Field label="CEP" name="cep" form={form} setForm={setForm} />
            <Field
              label="Endereco"
              name="endereco"
              form={form}
              setForm={setForm}
            />
            <Field label="Numero" name="numero" form={form} setForm={setForm} />
            <Field label="Bairro" name="bairro" form={form} setForm={setForm} />
            <Field label="Cidade" name="cidade" form={form} setForm={setForm} />
            <Field label="Estado" name="estado" form={form} setForm={setForm} />
          </SimpleGrid>
        )}
        {step === 1 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Plano</FormLabel>
              <Select
                value={form.idplano}
                onChange={e => {
                  const plan = plans.find(
                    p => p.idplano === Number(e.target.value)
                  );
                  setForm(v => ({
                    ...v,
                    idplano: e.target.value,
                    valor_atual: plan?.valor_mensal || '',
                  }));
                }}
              >
                <option value="">Selecione</option>
                {plans.map(p => (
                  <option key={p.idplano} value={p.idplano}>
                    {p.nome} · R$ {Number(p.valor_mensal).toFixed(2)}
                  </option>
                ))}
              </Select>
            </FormControl>
            <Field
              label="Valor contratado"
              name="valor_atual"
              form={form}
              setForm={setForm}
              type="number"
            />
            <Field
              label="Data de inicio"
              name="data_inicio"
              form={form}
              setForm={setForm}
              type="date"
            />
            <Field
              label="Proxima cobranca"
              name="data_proxima_cobranca"
              form={form}
              setForm={setForm}
              type="date"
            />
            <FormControl>
              <FormLabel fontSize="sm">Forma de pagamento</FormLabel>
              <Select
                value={form.forma_pagamento}
                onChange={e =>
                  setForm(v => ({ ...v, forma_pagamento: e.target.value }))
                }
              >
                <option value="pix">PIX</option>
                <option value="cartao">Cartao</option>
                <option value="boleto">Boleto</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Status inicial</FormLabel>
              <Select
                value={form.assinatura_status}
                onChange={e =>
                  setForm(v => ({ ...v, assinatura_status: e.target.value }))
                }
              >
                <option value="2">Em teste</option>
                <option value="1">Ativa</option>
              </Select>
            </FormControl>
          </SimpleGrid>
        )}
        {step === 2 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Field
              label="Nome da filial"
              name="filial_nome"
              form={form}
              setForm={setForm}
              required
            />
            <Field
              label="Codigo"
              name="filial_codigo"
              form={form}
              setForm={setForm}
              required
            />
            <Field
              label="CNPJ"
              name="filial_cnpj"
              form={form}
              setForm={setForm}
            />
            <Box
              p={4}
              bg={platformTokens.colors.primarySubtle}
              borderRadius={platformTokens.radii.control}
            >
              <Text color={platformTokens.colors.primary} fontWeight="700">
                Filial matriz
              </Text>
              <Text fontSize="sm" color={platformColors.muted} mt={1}>
                Endereco e contatos serao herdados da empresa e poderao ser
                editados depois.
              </Text>
            </Box>
          </SimpleGrid>
        )}
        {step === 3 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Field
              label="Nome completo"
              name="admin_nome"
              form={form}
              setForm={setForm}
              required
            />
            <Field
              label="E-mail"
              name="admin_email"
              form={form}
              setForm={setForm}
              type="email"
              required
            />
            <Field
              label="Telefone"
              name="admin_telefone"
              form={form}
              setForm={setForm}
            />
            <Field
              label="Senha temporaria"
              name="admin_senha"
              form={form}
              setForm={setForm}
              type="password"
              required
            />
          </SimpleGrid>
        )}
        {step === 4 && (
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={5}>
            {[
              [
                'Empresa',
                [
                  ['Nome fantasia', form.nome_fantasia],
                  ['Razao social', form.razao_social],
                  ['CNPJ', form.cnpj || '-'],
                ],
              ],
              [
                'Assinatura',
                [
                  [
                    'Plano',
                    plans.find(p => p.idplano === Number(form.idplano))?.nome ||
                      '-',
                  ],
                  ['Valor', `R$ ${Number(form.valor_atual || 0).toFixed(2)}`],
                  ['Inicio', form.data_inicio],
                ],
              ],
              [
                'Filial matriz',
                [
                  ['Nome', form.filial_nome],
                  ['Codigo', form.filial_codigo],
                ],
              ],
              [
                'Administrador',
                [
                  ['Nome', form.admin_nome],
                  ['E-mail', form.admin_email],
                ],
              ],
            ].map(([title, items]) => (
              <Box key={String(title)}>
                <Text fontWeight="800" mb={2}>
                  {String(title)}
                </Text>
                <Divider mb={2} />
                {(items as string[][]).map(([label, value]) => (
                  <Flex key={label} justify="space-between" py={1}>
                    <Text color={platformColors.muted} fontSize="sm">
                      {label}
                    </Text>
                    <Text fontWeight="600" fontSize="sm">
                      {value}
                    </Text>
                  </Flex>
                ))}
              </Box>
            ))}
          </Grid>
        )}
        <Flex
          justify="space-between"
          mt={8}
          pt={5}
          borderTop="1px solid"
          borderColor={platformColors.border}
        >
          <Button
            variant="outline"
            leftIcon={<ArrowLeft size={16} />}
            onClick={() =>
              step === 0 ? navigate('/platform/empresas') : setStep(v => v - 1)
            }
          >
            {step === 0 ? 'Cancelar' : 'Voltar'}
          </Button>
          {step < 4 ? (
            <Button
              rightIcon={<ArrowRight size={16} />}
              isDisabled={!canContinue}
              onClick={() => setStep(v => v + 1)}
            >
              Continuar
            </Button>
          ) : (
            <Button
              leftIcon={<Save size={16} />}
              isLoading={saving}
              onClick={() => void submit()}
            >
              Criar ambiente
            </Button>
          )}
        </Flex>
      </Surface>
    </Box>
  );
}
