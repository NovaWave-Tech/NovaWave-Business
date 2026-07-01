import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  Skeleton,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ErrorState,
  PageHeader,
  Surface,
  platformColors,
} from '../components/PlatformUI';
import { apiError, platformApi } from '../services/platformApi';
import { platformTokens } from '../theme/platformTokens';
import { usePlatformToast } from '../hooks/usePlatformToast';

type Config = {
  chave: string;
  valor: unknown;
  grupo: string;
  segredo: boolean;
};
type ConfigValue = string | boolean | number;
const defaults: Record<string, ConfigValue> = {
  nome_plataforma: 'NovaWave Platform',
  dominio_principal: '',
  timezone_padrao: 'America/Sao_Paulo',
  idioma_padrao: 'pt-BR',
  token_expiracao_minutos: 60,
  max_tentativas_login: 5,
  rate_limit_minuto: 60,
  smtp_host: '',
  smtp_porta: 587,
  smtp_remetente: '',
  stripe_ativo: false,
  mercado_pago_ativo: false,
  pix_ativo: true,
  whatsapp_ativo: false,
};

export default function SettingsPage() {
  const toast = usePlatformToast();
  const [form, setForm] = useState(defaults);
  const [saving, setSaving] = useState(false);
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () =>
      (await platformApi.get<{ data: Config[] }>('/configuracoes')).data.data,
  });

  useEffect(() => {
    const values = Object.fromEntries(
      data
        .filter(
          item =>
            !item.segredo &&
            ['string', 'number', 'boolean'].includes(typeof item.valor)
        )
        .map(item => [item.chave, item.valor])
    ) as Record<string, ConfigValue>;
    if (Object.keys(values).length)
      setForm(current => ({ ...current, ...values }));
  }, [data]);

  const set = (key: string, value: ConfigValue) =>
    setForm(current => ({ ...current, [key]: value }));
  const group = (key: string) =>
    key.startsWith('smtp')
      ? 'email'
      : ['stripe_ativo', 'mercado_pago_ativo', 'pix_ativo'].includes(key)
        ? 'pagamentos'
        : [
              'token_expiracao_minutos',
              'max_tentativas_login',
              'rate_limit_minuto',
            ].includes(key)
          ? 'seguranca'
          : key.includes('whatsapp')
            ? 'integracoes'
            : 'sistema';
  const save = async () => {
    setSaving(true);
    try {
      await platformApi.put('/configuracoes', {
        items: Object.entries(form).map(([chave, valor]) => ({
          chave,
          valor,
          grupo: group(chave),
          segredo: false,
        })),
      });
      toast({ title: 'Configuracoes salvas', status: 'success' });
    } catch (error) {
      toast({ title: apiError(error), status: 'error' });
    } finally {
      setSaving(false);
    }
  };
  const textField = (label: string, key: string, type = 'text') => (
    <FormControl>
      <FormLabel>{label}</FormLabel>
      <Input
        type={type}
        value={String(form[key] ?? '')}
        onChange={event => set(key, event.target.value)}
      />
    </FormControl>
  );
  const toggle = (label: string, key: string) => (
    <FormControl
      display="flex"
      justifyContent="space-between"
      alignItems="center"
      p={4}
      bg={platformTokens.colors.surfaceSubtle}
      borderRadius={platformTokens.radii.control}
    >
      <Box>
        <FormLabel m={0}>{label}</FormLabel>
        <Text fontSize="sm" color={platformColors.muted}>
          Ativar integracao na plataforma
        </Text>
      </Box>
      <Switch
        isChecked={Boolean(form[key])}
        onChange={event => set(key, event.target.checked)}
      />
    </FormControl>
  );

  return (
    <Box>
      <PageHeader
        title="Configuracoes globais"
        description="Parametros compartilhados por toda a operacao SaaS."
      />
      {isError ? (
        <Surface>
          <ErrorState retry={() => void refetch()} />
        </Surface>
      ) : isLoading ? (
        <Surface p={5}>
          <Skeleton h="360px" />
        </Surface>
      ) : (
        <Surface>
          <Tabs variant="line" colorScheme="blue">
            <TabList px={3} pt={2} overflowX="auto">
              {[
                'Sistema',
                'Seguranca',
                'E-mail',
                'Pagamentos',
                'Integracoes',
              ].map(label => (
                <Tab key={label} justifyContent="flex-start">
                  {label}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              <TabPanel>
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                  {textField('Nome da plataforma', 'nome_plataforma')}
                  {textField('Dominio principal', 'dominio_principal')}
                  <FormControl>
                    <FormLabel>Timezone padrao</FormLabel>
                    <Select
                      value={String(form.timezone_padrao)}
                      onChange={event =>
                        set('timezone_padrao', event.target.value)
                      }
                    >
                      <option>America/Sao_Paulo</option>
                      <option>UTC</option>
                    </Select>
                  </FormControl>
                  <FormControl>
                    <FormLabel>Idioma padrao</FormLabel>
                    <Select
                      value={String(form.idioma_padrao)}
                      onChange={event =>
                        set('idioma_padrao', event.target.value)
                      }
                    >
                      <option value="pt-BR">Portugues (Brasil)</option>
                      <option value="en-US">English</option>
                    </Select>
                  </FormControl>
                </Grid>
              </TabPanel>
              <TabPanel>
                <Grid
                  templateColumns={{ base: '1fr', md: 'repeat(3,1fr)' }}
                  gap={4}
                >
                  {[
                    ['Expiracao do token', 'token_expiracao_minutos'],
                    ['Tentativas de login', 'max_tentativas_login'],
                    ['Rate limit / minuto', 'rate_limit_minuto'],
                  ].map(([label, key]) => (
                    <FormControl key={key}>
                      <FormLabel>{label}</FormLabel>
                      <NumberInput
                        value={Number(form[key])}
                        min={1}
                        onChange={(_, value) => set(key, value)}
                      >
                        <NumberInputField />
                      </NumberInput>
                    </FormControl>
                  ))}
                </Grid>
              </TabPanel>
              <TabPanel>
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                  {textField('SMTP host', 'smtp_host')}
                  {textField('SMTP porta', 'smtp_porta', 'number')}
                  {textField('Remetente padrao', 'smtp_remetente', 'email')}
                </Grid>
              </TabPanel>
              <TabPanel>
                <Grid gap={3}>
                  {toggle('Stripe', 'stripe_ativo')}
                  {toggle('Mercado Pago', 'mercado_pago_ativo')}
                  {toggle('PIX', 'pix_ativo')}
                </Grid>
              </TabPanel>
              <TabPanel>{toggle('WhatsApp', 'whatsapp_ativo')}</TabPanel>
            </TabPanels>
          </Tabs>
          <Box
            p={5}
            borderTop="1px solid"
            borderColor={platformColors.border}
            textAlign="right"
          >
            <Button
              leftIcon={<Save size={16} />}
              isLoading={saving}
              onClick={() => void save()}
            >
              Salvar configuracoes
            </Button>
          </Box>
        </Surface>
      )}
    </Box>
  );
}
