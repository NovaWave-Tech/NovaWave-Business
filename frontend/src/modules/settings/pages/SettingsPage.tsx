import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Select,
  SimpleGrid,
  Switch,
  Text,
  VStack,
  useColorMode,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  CircleDollarSign,
  LayoutDashboard,
  Palette,
  Settings,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ErrorState,
  PageHeader,
  SectionHeader,
  Surface,
} from '../../../shared/ui/ErpUI';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { formatCurrency } from '../../../shared/utils/formatters';
import {
  settingsService,
  type PreferencesPayload,
  type SettingsData,
} from '../services/settingsService';

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Fortaleza',
  'America/Cuiaba',
  'America/Rio_Branco',
];

export default function SettingsPage() {
  const toast = useToast();
  const client = useQueryClient();
  const { setColorMode } = useColorMode();
  const settings = useQuery({
    queryKey: ['settings'],
    queryFn: settingsService.show,
  });
  const [preferences, setPreferences] = useState<PreferencesPayload | null>(
    null
  );
  const [monthlyGoal, setMonthlyGoal] = useState<number | null>(null);

  useEffect(() => {
    const data = settings.data;
    if (data && !preferences) {
      setPreferences(data.preferences);
      setMonthlyGoal(data.finance.meta_mensal);
    }
  }, [settings.data, preferences]);

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel salvar',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });

  const savePreferences = useMutation({
    mutationFn: () =>
      settingsService.savePreferences(preferences as PreferencesPayload),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['settings'] });
      if (preferences) {
        if (preferences.tema !== 'system') {
          setColorMode(preferences.tema);
        }
        localStorage.setItem(
          'erp_sidebar_collapsed',
          String(preferences.sidebar_recolhida)
        );
      }
      toast({ title: 'Preferencias salvas', status: 'success' });
    },
    onError: notifyError,
  });
  const saveFinance = useMutation({
    mutationFn: () =>
      settingsService.saveFinance({ meta_mensal: monthlyGoal ?? 0 }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['settings'] });
      await client.invalidateQueries({ queryKey: ['matrix-dashboard'] });
      toast({ title: 'Meta financeira salva', status: 'success' });
    },
    onError: notifyError,
  });

  const data: SettingsData | undefined = settings.data;
  const setPref = <Key extends keyof PreferencesPayload>(
    key: Key,
    value: PreferencesPayload[Key]
  ) =>
    setPreferences(current =>
      current ? { ...current, [key]: value } : current
    );

  if (settings.isError)
    return <ErrorState retry={() => void settings.refetch()} />;

  return (
    <Box>
      <PageHeader
        icon={Settings}
        title="Configuracoes"
        description="Preferencias pessoais de uso e parametros gerais da empresa."
        breadcrumbs={[{ label: 'Gestao' }, { label: 'Configuracoes' }]}
      />

      {settings.isLoading || !preferences ? (
        <Surface p={6}>
          <VStack spacing={4}>
            {Array.from({ length: 5 }).map((_, index) => (
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
        <VStack align="stretch" spacing={5} maxW="920px">
          <Surface overflow="hidden">
            <SectionHeader
              icon={Palette}
              eyebrow="Preferencias pessoais"
              title="Aparencia e regiao"
              description="Valem apenas para o seu usuario"
              action={
                <Button
                  size="sm"
                  leftIcon={<Check size={15} />}
                  isLoading={savePreferences.isPending}
                  onClick={() => savePreferences.mutate()}
                >
                  Salvar preferencias
                </Button>
              }
            />
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} p={5}>
              <FormControl>
                <FormLabel>Tema</FormLabel>
                <Select
                  value={preferences.tema}
                  onChange={event =>
                    setPref(
                      'tema',
                      event.target.value as PreferencesPayload['tema']
                    )
                  }
                >
                  <option value="dark">Escuro</option>
                  <option value="light">Claro</option>
                  <option value="system">Sistema</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Idioma</FormLabel>
                <Select
                  value={preferences.idioma}
                  onChange={event => setPref('idioma', event.target.value)}
                >
                  <option value="pt-BR">Portugues (Brasil)</option>
                  <option value="en-US">Ingles (EUA)</option>
                  <option value="es-ES">Espanhol</option>
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Fuso horario</FormLabel>
                <Select
                  value={preferences.timezone}
                  onChange={event => setPref('timezone', event.target.value)}
                >
                  {TIMEZONES.map(zone => (
                    <option key={zone} value={zone}>
                      {zone}
                    </option>
                  ))}
                </Select>
              </FormControl>
            </SimpleGrid>
          </Surface>

          <Surface overflow="hidden">
            <SectionHeader
              icon={LayoutDashboard}
              eyebrow="Navegacao"
              title="Comportamento padrao"
              description="Como o sistema abre para voce"
            />
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} p={5}>
              <FormControl>
                <FormLabel>Filial padrao</FormLabel>
                <Select
                  value={preferences.idfilial_padrao ?? ''}
                  onChange={event =>
                    setPref(
                      'idfilial_padrao',
                      event.target.value ? Number(event.target.value) : null
                    )
                  }
                >
                  <option value="">Sem filial padrao</option>
                  {data?.options.branches.map(item => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl>
                <FormLabel>Escopo do dashboard</FormLabel>
                <Select
                  value={preferences.dashboard_escopo_padrao}
                  onChange={event =>
                    setPref(
                      'dashboard_escopo_padrao',
                      event.target
                        .value as PreferencesPayload['dashboard_escopo_padrao']
                    )
                  }
                >
                  <option value="empresa">Empresa (consolidado)</option>
                  <option value="filial">Filial padrao</option>
                </Select>
              </FormControl>
              <FormControl display="flex" alignItems="center" pt={{ md: 8 }}>
                <Switch
                  id="sidebar-collapsed"
                  isChecked={preferences.sidebar_recolhida}
                  onChange={event =>
                    setPref('sidebar_recolhida', event.target.checked)
                  }
                  mr={3}
                />
                <FormLabel htmlFor="sidebar-collapsed" mb={0}>
                  Iniciar com menu recolhido
                </FormLabel>
              </FormControl>
            </SimpleGrid>
          </Surface>

          <Surface overflow="hidden">
            <SectionHeader
              icon={CircleDollarSign}
              eyebrow="Empresa"
              title="Meta financeira mensal"
              description="Usada no dashboard e nas projecoes de venda"
              action={
                <Button
                  size="sm"
                  leftIcon={<Check size={15} />}
                  isLoading={saveFinance.isPending}
                  onClick={() => saveFinance.mutate()}
                >
                  Salvar meta
                </Button>
              }
            />
            <Box p={5} maxW="360px">
              <FormControl>
                <FormLabel>Meta mensal de vendas</FormLabel>
                <CurrencyInput
                  value={monthlyGoal !== null ? String(monthlyGoal) : ''}
                  onValueChange={value =>
                    setMonthlyGoal(value === '' ? 0 : Number(value) || 0)
                  }
                />
                <Text mt={1} fontSize="10px" color="erp.textMuted">
                  Meta atual: {formatCurrency(data?.finance.meta_mensal ?? 0)}
                </Text>
              </FormControl>
            </Box>
          </Surface>
        </VStack>
      )}
    </Box>
  );
}
