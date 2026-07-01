import {
  Box,
  Code,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  Button,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import {
  EmptyState,
  ErrorState,
  FilterBar,
  LoadingTable,
  PageHeader,
  Surface,
  TablePagination,
  platformColors,
} from '../components/PlatformUI';
import { platformApi } from '../services/platformApi';
import { useClientPagination } from '../hooks/useClientPagination';
import { platformTokens } from '../theme/platformTokens';
import { formatDateTime } from '../../../shared/utils/formatters';

type Audit = {
  idauditoria: number;
  criado_em: string;
  origem_usuario: string;
  empresa?: string;
  filial?: string;
  usuario: string;
  acao: string;
  tabela: string;
  registro_id?: number;
  ip?: string;
  dispositivo?: string;
  navegador?: string;
  sistema_operacional?: string;
  cidade?: string;
  valores_anteriores?: unknown;
  valores_novos?: unknown;
};
export default function AuditPage() {
  const [origin, setOrigin] = useState('');
  const [table, setTable] = useState('');
  const [selected, setSelected] = useState<Audit | null>(null);
  const drawer = useDisclosure();
  const {
    data = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['platform-audit', origin, table],
    queryFn: async () =>
      (
        await platformApi.get<{ data: Audit[] }>('/auditoria', {
          params: { origem_usuario: origin, tabela: table },
        })
      ).data.data,
  });
  const pagination = useClientPagination(data, 10);
  const open = (item: Audit) => {
    setSelected(item);
    drawer.onOpen();
  };
  return (
    <Box>
      <PageHeader
        title="Auditoria global"
        description="Rastreabilidade de acoes da plataforma, empresas e processos automaticos."
      />
      <FilterBar>
        <Select
          maxW="190px"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
        >
          <option value="">Todas as origens</option>
          <option value="platform">Plataforma</option>
          <option value="empresa">Empresa</option>
          <option value="sistema">Sistema</option>
        </Select>
        <Input
          maxW="240px"
          value={table}
          onChange={e => setTable(e.target.value)}
          placeholder="Filtrar por tabela"
        />
      </FilterBar>
      {isError ? (
        <Surface>
          <ErrorState retry={() => void refetch()} />
        </Surface>
      ) : isLoading ? (
        <LoadingTable columns={7} rows={8} />
      ) : (
        <Surface overflow="hidden">
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Data</Th>
                  <Th>Origem</Th>
                  <Th>Empresa</Th>
                  <Th>Usuario</Th>
                  <Th>Acao</Th>
                  <Th>Tabela / registro</Th>
                  <Th>IP</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pagination.paginated.map(i => (
                  <Tr
                    key={i.idauditoria}
                    cursor="pointer"
                    onClick={() => open(i)}
                  >
                    <Td whiteSpace="nowrap">{formatDateTime(i.criado_em)}</Td>
                    <Td textTransform="capitalize">{i.origem_usuario}</Td>
                    <Td>{i.empresa || '-'}</Td>
                    <Td>{i.usuario}</Td>
                    <Td fontWeight="700">{i.acao}</Td>
                    <Td>
                      {i.tabela}
                      {i.registro_id ? ` #${i.registro_id}` : ''}
                    </Td>
                    <Td>{i.ip || '-'}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          {data.length === 0 && <EmptyState title="Nenhum evento registrado" />}
          {data.length > 0 && (
            <TablePagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalItems}
              onChange={pagination.setPage}
            />
          )}
        </Surface>
      )}
      <Drawer
        isOpen={drawer.isOpen}
        placement="right"
        size="md"
        onClose={drawer.onClose}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>Detalhes do evento</DrawerHeader>
          <DrawerBody>
            {selected && (
              <Box>
                {[
                  ['Data', formatDateTime(selected.criado_em)],
                  ['Usuario', selected.usuario],
                  ['Empresa', selected.empresa || '-'],
                  ['Filial', selected.filial || '-'],
                  ['Acao', selected.acao],
                  [
                    'Registro',
                    `${selected.tabela} #${selected.registro_id || '-'}`,
                  ],
                  ['IP', selected.ip || '-'],
                  ['Dispositivo', selected.dispositivo || '-'],
                  ['Navegador', selected.navegador || '-'],
                  ['Sistema', selected.sistema_operacional || '-'],
                ].map(([l, v]) => (
                  <Flex
                    key={l}
                    justify="space-between"
                    py={2}
                    borderBottom="1px solid"
                    borderColor={platformTokens.colors.border}
                  >
                    <Text color={platformColors.muted}>{l}</Text>
                    <Text fontWeight="600" textAlign="right">
                      {v}
                    </Text>
                  </Flex>
                ))}
                <Text fontWeight="800" mt={6} mb={2}>
                  Valores anteriores
                </Text>
                <Code
                  display="block"
                  p={3}
                  whiteSpace="pre-wrap"
                  bg={platformTokens.colors.surfaceSubtle}
                  border="1px solid"
                  borderColor={platformTokens.colors.border}
                  borderRadius="6px"
                  fontSize="xs"
                >
                  {JSON.stringify(selected.valores_anteriores, null, 2) || '-'}
                </Code>
                <Text fontWeight="800" mt={6} mb={2}>
                  Valores novos
                </Text>
                <Code
                  display="block"
                  p={3}
                  whiteSpace="pre-wrap"
                  bg={platformTokens.colors.surfaceSubtle}
                  border="1px solid"
                  borderColor={platformTokens.colors.border}
                  borderRadius="6px"
                  fontSize="xs"
                >
                  {JSON.stringify(selected.valores_novos, null, 2) || '-'}
                </Code>
              </Box>
            )}
          </DrawerBody>
          <DrawerFooter>
            <Button variant="outline" onClick={drawer.onClose}>
              Fechar
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
