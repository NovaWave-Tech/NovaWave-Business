import {
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tooltip,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpDown, Eye, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  EmptyState,
  LoadingTable,
  PageHeader,
  StatusBadge,
  Surface,
  TablePagination,
  platformColors,
} from '../components/PlatformUI';
import { useClientPagination } from '../hooks/useClientPagination';
import { platformApi } from '../services/platformApi';
import { platformTokens } from '../theme/platformTokens';

type Company = {
  idempresa: number;
  nome_fantasia: string;
  razao_social: string;
  cnpj?: string;
  plano?: string;
  assinatura_status?: number;
  filiais: string;
  usuarios: string;
  situacao: number;
  criado_em: string;
};

export default function CompaniesPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [situacao, setSituacao] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const { data = [], isLoading } = useQuery({
    queryKey: ['platform-companies', q, situacao],
    queryFn: async () =>
      (
        await platformApi.get<{ data: Company[] }>('/empresas', {
          params: { q, situacao },
        })
      ).data.data,
  });
  const sorted = useMemo(
    () =>
      [...data].sort(
        (a, b) =>
          a.nome_fantasia.localeCompare(b.nome_fantasia) *
          (sortAscending ? 1 : -1)
      ),
    [data, sortAscending]
  );
  const pagination = useClientPagination(sorted, 8);
  return (
    <Box>
      <PageHeader
        title="Empresas"
        description="Clientes e ambientes ativos no NovaWave Business."
        action={() => navigate('/platform/empresas/nova')}
        actionLabel="Nova empresa"
      />
      <Flex gap={3} mb={4} direction={{ base: 'column', md: 'row' }}>
        <InputGroup maxW={{ md: '380px' }}>
          <InputLeftElement>
            <Search size={17} color={platformTokens.colors.placeholder} />
          </InputLeftElement>
          <Input
            value={q}
            onChange={e => setQ(e.target.value)}
            bg="white"
            placeholder="Nome, CNPJ ou e-mail"
          />
        </InputGroup>
        <Select
          value={situacao}
          onChange={e => setSituacao(e.target.value)}
          bg="white"
          maxW={{ md: '190px' }}
        >
          <option value="">Todas as situacoes</option>
          <option value="1">Ativas</option>
          <option value="2">Bloqueadas</option>
          <option value="0">Inativas</option>
        </Select>
      </Flex>
      {isLoading ? (
        <LoadingTable columns={8} />
      ) : (
        <Surface overflow="hidden">
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>
                    <Flex
                      as="button"
                      align="center"
                      gap={1.5}
                      onClick={() => setSortAscending(value => !value)}
                    >
                      Empresa <ArrowUpDown size={12} />
                    </Flex>
                  </Th>
                  <Th>CNPJ</Th>
                  <Th>Plano</Th>
                  <Th>Assinatura</Th>
                  <Th isNumeric>Filiais</Th>
                  <Th isNumeric>Usuarios</Th>
                  <Th>Situacao</Th>
                  <Th w="56px"></Th>
                </Tr>
              </Thead>
              <Tbody>
                {pagination.paginated.map(item => (
                  <Tr key={item.idempresa}>
                    <Td>
                      <Text fontWeight="700">{item.nome_fantasia}</Text>
                      <Text fontSize="xs" color={platformColors.muted}>
                        {item.razao_social}
                      </Text>
                    </Td>
                    <Td>{item.cnpj || '-'}</Td>
                    <Td>{item.plano || '-'}</Td>
                    <Td>
                      <StatusBadge
                        value={item.assinatura_status}
                        type="subscription"
                      />
                    </Td>
                    <Td isNumeric>{item.filiais}</Td>
                    <Td isNumeric>{item.usuarios}</Td>
                    <Td>
                      <StatusBadge value={item.situacao} />
                    </Td>
                    <Td>
                      <Tooltip label="Abrir empresa">
                        <IconButton
                          aria-label="Abrir empresa"
                          icon={<Eye size={17} />}
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(`/platform/empresas/${item.idempresa}`)
                          }
                        />
                      </Tooltip>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          {data.length === 0 && <EmptyState />}
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
    </Box>
  );
}
