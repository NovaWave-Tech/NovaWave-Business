import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Ban, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiError, platformApi } from '../services/platformApi';
import { platformTokens } from '../theme/platformTokens';
import { usePlatformToast } from '../hooks/usePlatformToast';
import { StatusBadge, Surface, platformColors } from '../components/PlatformUI';

type Detail = {
  idempresa: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj?: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
  situacao: number;
  plano?: string;
  assinatura_status?: number;
  valor_atual?: string;
  data_proxima_cobranca?: string;
  filiais: {
    idfilial: number;
    nome: string;
    codigo: string;
    matriz: boolean;
    situacao: number;
  }[];
  usuarios: {
    idusuario: number;
    nome: string;
    email: string;
    admin_empresa: boolean;
    situacao: number;
    ultimo_login?: string;
  }[];
};

export default function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = usePlatformToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['platform-company', id],
    queryFn: async () =>
      (await platformApi.get<{ data: Detail }>(`/empresas/${id}`)).data.data,
  });
  const status = useMutation({
    mutationFn: async (situacao: number) =>
      platformApi.patch(`/empresas/${id}/situacao`, { situacao }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['platform-company', id],
      });
      toast({ title: 'Situacao atualizada', status: 'success' });
    },
    onError: e => toast({ title: apiError(e), status: 'error' }),
  });
  if (isLoading || !data) return <Skeleton h="420px" />;
  return (
    <Box>
      <Button
        variant="ghost"
        leftIcon={<ArrowLeft size={16} />}
        mb={3}
        onClick={() => navigate('/platform/empresas')}
      >
        Empresas
      </Button>
      <Flex
        justify="space-between"
        align={{ base: 'start', md: 'center' }}
        direction={{ base: 'column', md: 'row' }}
        mb={6}
        gap={3}
      >
        <Box>
          <Flex align="center" gap={3}>
            <Text fontSize="xl" fontWeight="800">
              {data.nome_fantasia}
            </Text>
            <StatusBadge value={data.situacao} />
          </Flex>
          <Text color={platformColors.muted} mt={1}>
            {data.razao_social}
          </Text>
        </Box>
        <Button
          variant="outline"
          colorScheme={data.situacao === 2 ? 'green' : 'red'}
          leftIcon={
            data.situacao === 2 ? <CheckCircle2 size={16} /> : <Ban size={16} />
          }
          isLoading={status.isPending}
          onClick={() => status.mutate(data.situacao === 2 ? 1 : 2)}
        >
          {data.situacao === 2 ? 'Desbloquear' : 'Bloquear empresa'}
        </Button>
      </Flex>
      <Surface overflow="hidden">
        <Tabs colorScheme="blue">
          <TabList px={4} overflowX="auto">
            <Tab>Visao geral</Tab>
            <Tab>Filiais</Tab>
            <Tab>Usuarios</Tab>
            <Tab>Assinatura</Tab>
            <Tab>Auditoria</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
                <GridItem>
                  <Text fontWeight="800" mb={4}>
                    Dados principais
                  </Text>
                  {[
                    ['CNPJ', data.cnpj],
                    ['E-mail', data.email],
                    ['Telefone', data.telefone],
                    [
                      'Localidade',
                      [data.cidade, data.estado].filter(Boolean).join(' / '),
                    ],
                  ].map(([l, v]) => (
                    <Flex
                      key={l}
                      justify="space-between"
                      py={2}
                      borderBottom="1px solid"
                      borderColor={platformTokens.colors.borderSubtle}
                    >
                      <Text color={platformColors.muted}>{l}</Text>
                      <Text fontWeight="600">{v || '-'}</Text>
                    </Flex>
                  ))}
                </GridItem>
                <GridItem>
                  <Text fontWeight="800" mb={4}>
                    Ambiente
                  </Text>
                  {[
                    ['Plano', data.plano],
                    ['Filiais', String(data.filiais.length)],
                    ['Usuarios', String(data.usuarios.length)],
                  ].map(([l, v]) => (
                    <Flex
                      key={l}
                      justify="space-between"
                      py={2}
                      borderBottom="1px solid"
                      borderColor={platformTokens.colors.borderSubtle}
                    >
                      <Text color={platformColors.muted}>{l}</Text>
                      <Text fontWeight="600">{v || '-'}</Text>
                    </Flex>
                  ))}
                </GridItem>
              </Grid>
            </TabPanel>
            <TabPanel>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Filial</Th>
                    <Th>Codigo</Th>
                    <Th>Tipo</Th>
                    <Th>Situacao</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.filiais.map(f => (
                    <Tr key={f.idfilial}>
                      <Td fontWeight="700">{f.nome}</Td>
                      <Td>{f.codigo}</Td>
                      <Td>{f.matriz ? 'Matriz' : 'Filial'}</Td>
                      <Td>
                        <StatusBadge type="user" value={f.situacao} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
            <TabPanel>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Usuario</Th>
                    <Th>E-mail</Th>
                    <Th>Perfil</Th>
                    <Th>Situacao</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {data.usuarios.map(u => (
                    <Tr key={u.idusuario}>
                      <Td fontWeight="700">{u.nome}</Td>
                      <Td>{u.email}</Td>
                      <Td>{u.admin_empresa ? 'Administrador' : 'Usuario'}</Td>
                      <Td>
                        <StatusBadge type="user" value={u.situacao} />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>
            <TabPanel>
              <Grid
                templateColumns={{ base: '1fr', md: 'repeat(3,1fr)' }}
                gap={4}
              >
                {[
                  ['Plano atual', data.plano || '-'],
                  [
                    'Valor mensal',
                    `R$ ${Number(data.valor_atual || 0).toFixed(2)}`,
                  ],
                  [
                    'Proxima cobranca',
                    data.data_proxima_cobranca
                      ? new Date(
                          `${data.data_proxima_cobranca}T12:00:00`
                        ).toLocaleDateString('pt-BR')
                      : '-',
                  ],
                ].map(([l, v]) => (
                  <Box
                    key={l}
                    p={4}
                    bg={platformTokens.colors.surfaceSubtle}
                    borderRadius={platformTokens.radii.control}
                  >
                    <Text color={platformColors.muted} fontSize="sm">
                      {l}
                    </Text>
                    <Text fontWeight="800" mt={1}>
                      {v}
                    </Text>
                  </Box>
                ))}
              </Grid>
            </TabPanel>
            <TabPanel>
              <Text color={platformColors.muted}>
                Use a tela de Auditoria Global filtrando por esta empresa.
              </Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Surface>
    </Box>
  );
}
