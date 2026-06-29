import {
  Box,
  Input,
  Select,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  EmptyState,
  LoadingTable,
  PageHeader,
  StatusBadge,
  Surface,
  TablePagination,
  platformColors,
} from '../components/PlatformUI';
import { platformApi } from '../services/platformApi';
import { useClientPagination } from '../hooks/useClientPagination';

type Subscription = {
  idassinatura: number;
  empresa: string;
  plano: string;
  status: number;
  valor_atual: string;
  data_inicio: string;
  data_proxima_cobranca?: string;
  forma_pagamento?: string;
};
export default function SubscriptionsPage() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['platform-subscriptions'],
    queryFn: async () =>
      (await platformApi.get<{ data: Subscription[] }>('/assinaturas')).data
        .data,
  });
  const filtered = useMemo(
    () =>
      data.filter(
        i =>
          (!status || String(i.status) === status) &&
          i.empresa.toLowerCase().includes(q.toLowerCase())
      ),
    [data, q, status]
  );
  const pagination = useClientPagination(filtered, 8);
  return (
    <Box>
      <PageHeader
        title="Assinaturas"
        description="Ciclo comercial e cobrancas das empresas clientes."
      />
      <Box
        display="flex"
        flexDirection={{ base: 'column', md: 'row' }}
        gap={3}
        mb={4}
      >
        <Input
          bg="white"
          maxW="360px"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Buscar empresa"
        />
        <Select
          bg="white"
          maxW="190px"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="1">Ativa</option>
          <option value="2">Em teste</option>
          <option value="3">Vencida</option>
          <option value="4">Cancelada</option>
          <option value="5">Bloqueada</option>
        </Select>
      </Box>
      {isLoading ? (
        <LoadingTable columns={7} />
      ) : (
        <Surface overflow="hidden">
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Empresa</Th>
                  <Th>Plano</Th>
                  <Th>Status</Th>
                  <Th isNumeric>Valor</Th>
                  <Th>Inicio</Th>
                  <Th>Proxima cobranca</Th>
                  <Th>Pagamento</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pagination.paginated.map(i => (
                  <Tr key={i.idassinatura}>
                    <Td fontWeight="700">{i.empresa}</Td>
                    <Td>{i.plano}</Td>
                    <Td>
                      <StatusBadge value={i.status} type="subscription" />
                    </Td>
                    <Td isNumeric>R$ {Number(i.valor_atual).toFixed(2)}</Td>
                    <Td>
                      {new Date(`${i.data_inicio}T12:00:00`).toLocaleDateString(
                        'pt-BR'
                      )}
                    </Td>
                    <Td>
                      {i.data_proxima_cobranca
                        ? new Date(
                            `${i.data_proxima_cobranca}T12:00:00`
                          ).toLocaleDateString('pt-BR')
                        : '-'}
                    </Td>
                    <Td>
                      <Text
                        textTransform="uppercase"
                        fontSize="xs"
                        color={platformColors.muted}
                      >
                        {i.forma_pagamento || '-'}
                      </Text>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          {filtered.length === 0 && <EmptyState />}
          {filtered.length > 0 && (
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
