import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputLeftElement,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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
import { apiError, platformApi } from '../services/platformApi';
import { useClientPagination } from '../hooks/useClientPagination';
import { platformTokens } from '../theme/platformTokens';
import { usePlatformToast } from '../hooks/usePlatformToast';

type User = {
  idplatform_usuario: number;
  nome: string;
  email: string;
  telefone?: string;
  cargo?: string;
  nivel_acesso: string;
  situacao: number;
  ultimo_login?: string;
};
const initial = {
  nome: '',
  email: '',
  senha: '',
  telefone: '',
  cargo: '',
  nivel_acesso: 'leitura',
  situacao: 1,
};
export default function PlatformUsersPage() {
  const modal = useDisclosure();
  const toast = usePlatformToast();
  const client = useQueryClient();
  const [form, setForm] = useState(initial);
  const [search, setSearch] = useState('');
  const { data = [], isLoading } = useQuery({
    queryKey: ['platform-users'],
    queryFn: async () =>
      (await platformApi.get<{ data: User[] }>('/usuarios')).data.data,
  });
  const filtered = useMemo(
    () =>
      data.filter(user =>
        `${user.nome} ${user.email} ${user.cargo || ''}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [data, search]
  );
  const pagination = useClientPagination(filtered, 8);
  const save = useMutation({
    mutationFn: async () => platformApi.post('/usuarios', form),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['platform-users'] });
      modal.onClose();
      setForm(initial);
      toast({ title: 'Administrador criado', status: 'success' });
    },
    onError: e => toast({ title: apiError(e), status: 'error' }),
  });
  return (
    <Box>
      <PageHeader
        title="Usuarios da plataforma"
        description="Equipe interna autorizada a administrar o SaaS."
        action={modal.onOpen}
        actionLabel="Novo administrador"
      />
      <InputGroup maxW="360px" mb={4}>
        <InputLeftElement>
          <Search size={16} color={platformTokens.colors.muted} />
        </InputLeftElement>
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Buscar administrador"
          bg="white"
        />
      </InputGroup>
      {isLoading ? (
        <LoadingTable columns={5} />
      ) : (
        <Surface overflow="hidden">
          <Box overflowX="auto">
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Administrador</Th>
                  <Th>Cargo</Th>
                  <Th>Nivel</Th>
                  <Th>Ultimo acesso</Th>
                  <Th>Situacao</Th>
                </Tr>
              </Thead>
              <Tbody>
                {pagination.paginated.map(u => (
                  <Tr key={u.idplatform_usuario}>
                    <Td>
                      <Text fontWeight="700">{u.nome}</Text>
                      <Text fontSize="xs" color={platformColors.muted}>
                        {u.email}
                      </Text>
                    </Td>
                    <Td>{u.cargo || '-'}</Td>
                    <Td textTransform="capitalize">
                      {u.nivel_acesso.replace('_', ' ')}
                    </Td>
                    <Td>
                      {u.ultimo_login
                        ? new Date(u.ultimo_login).toLocaleString('pt-BR')
                        : 'Nunca'}
                    </Td>
                    <Td>
                      <StatusBadge value={u.situacao} type="user" />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
          {filtered.length === 0 && (
            <EmptyState
              title="Nenhum administrador encontrado"
              action={modal.onOpen}
              actionLabel="Novo administrador"
            />
          )}
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
      <Modal isOpen={modal.isOpen} onClose={modal.onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Novo administrador</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              {(['nome', 'email', 'telefone', 'cargo', 'senha'] as const).map(
                key => (
                  <FormControl
                    key={key}
                    isRequired={['nome', 'email', 'senha'].includes(key)}
                  >
                    <FormLabel textTransform="capitalize">{key}</FormLabel>
                    <Input
                      type={
                        key === 'senha'
                          ? 'password'
                          : key === 'email'
                            ? 'email'
                            : 'text'
                      }
                      value={form[key]}
                      onChange={e =>
                        setForm(v => ({ ...v, [key]: e.target.value }))
                      }
                    />
                  </FormControl>
                )
              )}
              <FormControl>
                <FormLabel>Nivel de acesso</FormLabel>
                <Select
                  value={form.nivel_acesso}
                  onChange={e =>
                    setForm(v => ({ ...v, nivel_acesso: e.target.value }))
                  }
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="suporte">Suporte</option>
                  <option value="financeiro">Financeiro</option>
                  <option value="comercial">Comercial</option>
                  <option value="leitura">Leitura</option>
                </Select>
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={modal.onClose}>
              Cancelar
            </Button>
            <Button isLoading={save.isPending} onClick={() => save.mutate()}>
              Criar administrador
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
