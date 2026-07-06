import {
  Badge,
  Box,
  Button,
  Editable,
  EditableInput,
  EditablePreview,
  Flex,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Tag, Tags } from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '../../../shared/ui/ErpUI';
import { catalogService } from '../services/catalogService';
import type { CatalogData } from '../types/catalogTypes';

type CatalogEntry = {
  id: number;
  nome: string;
  situacao: number;
  produtos: number;
};

export default function CatalogManager({
  isOpen,
  onClose,
  initialTab = 'categories',
}: {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'categories' | 'brands';
}) {
  const toast = useToast();
  const client = useQueryClient();
  const catalog = useQuery({
    queryKey: ['catalog'],
    queryFn: catalogService.list,
    enabled: isOpen,
  });
  const data: CatalogData | undefined = catalog.data;

  const notifyError = (error: unknown) =>
    toast({
      title: 'Nao foi possivel concluir a acao',
      description: error instanceof Error ? error.message : 'Tente novamente.',
      status: 'error',
      position: 'top-right',
    });
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: ['catalog'] });
    await client.invalidateQueries({ queryKey: ['products'] });
    await client.invalidateQueries({ queryKey: ['inventory'] });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Categorias e marcas</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Tabs
            variant="line"
            defaultIndex={initialTab === 'brands' ? 1 : 0}
            colorScheme="brand"
          >
            <TabList>
              <Tab>
                <Flex align="center" gap={2}>
                  <Tags size={15} /> Categorias
                </Flex>
              </Tab>
              <Tab>
                <Flex align="center" gap={2}>
                  <Tag size={15} /> Marcas
                </Flex>
              </Tab>
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <CatalogSection
                  entity="categoria"
                  loading={catalog.isLoading}
                  items={(data?.categories ?? []).map(item => ({
                    id: item.idcategoria,
                    nome: item.nome,
                    situacao: item.situacao,
                    produtos: item.produtos,
                  }))}
                  onCreate={async nome => {
                    await catalogService.createCategory({ nome });
                    await refresh();
                  }}
                  onRename={async (id, nome) => {
                    await catalogService.updateCategory(id, { nome });
                    await refresh();
                  }}
                  onToggle={async (id, situacao) => {
                    await catalogService.setCategoryStatus(id, situacao);
                    await refresh();
                  }}
                  onError={notifyError}
                  onDone={message =>
                    toast({ title: message, status: 'success' })
                  }
                />
              </TabPanel>
              <TabPanel px={0}>
                <CatalogSection
                  entity="marca"
                  loading={catalog.isLoading}
                  items={(data?.brands ?? []).map(item => ({
                    id: item.idmarca,
                    nome: item.nome,
                    situacao: item.situacao,
                    produtos: item.produtos,
                  }))}
                  onCreate={async nome => {
                    await catalogService.createBrand({ nome });
                    await refresh();
                  }}
                  onRename={async (id, nome) => {
                    await catalogService.updateBrand(id, { nome });
                    await refresh();
                  }}
                  onToggle={async (id, situacao) => {
                    await catalogService.setBrandStatus(id, situacao);
                    await refresh();
                  }}
                  onError={notifyError}
                  onDone={message =>
                    toast({ title: message, status: 'success' })
                  }
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}

function CatalogSection({
  entity,
  items,
  loading,
  onCreate,
  onRename,
  onToggle,
  onError,
  onDone,
}: {
  entity: 'categoria' | 'marca';
  items: CatalogEntry[];
  loading: boolean;
  onCreate: (nome: string) => Promise<void>;
  onRename: (id: number, nome: string) => Promise<void>;
  onToggle: (id: number, situacao: number) => Promise<void>;
  onError: (error: unknown) => void;
  onDone: (message: string) => void;
}) {
  const [name, setName] = useState('');

  const create = useMutation({
    mutationFn: () => onCreate(name.trim()),
    onSuccess: () => {
      setName('');
      onDone(`${entity === 'categoria' ? 'Categoria' : 'Marca'} criada`);
    },
    onError,
  });
  const rename = useMutation({
    mutationFn: ({ id, nome }: { id: number; nome: string }) =>
      onRename(id, nome),
    onSuccess: () => onDone('Nome atualizado'),
    onError,
  });
  const toggle = useMutation({
    mutationFn: ({ id, situacao }: { id: number; situacao: number }) =>
      onToggle(id, situacao),
    onError,
  });

  return (
    <Box>
      <Flex gap={2} mt={2} mb={4}>
        <Input
          value={name}
          onChange={event => setName(event.target.value)}
          placeholder={`Nova ${entity}...`}
          onKeyDown={event => {
            if (event.key === 'Enter' && name.trim().length >= 2)
              create.mutate();
          }}
        />
        <Button
          leftIcon={<Plus size={16} />}
          flexShrink={0}
          isDisabled={name.trim().length < 2}
          isLoading={create.isPending}
          onClick={() => create.mutate()}
        >
          Adicionar
        </Button>
      </Flex>

      {loading ? (
        <VStack spacing={2}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Box
              key={index}
              h="44px"
              w="full"
              bg="erp.surfaceSubtle"
              borderRadius="8px"
            />
          ))}
        </VStack>
      ) : items.length ? (
        <VStack align="stretch" spacing={0}>
          {items.map(item => (
            <Flex
              key={item.id}
              align="center"
              justify="space-between"
              gap={3}
              py={2.5}
              borderBottom="1px solid"
              borderColor="erp.border"
            >
              <Flex align="center" gap={3} minW={0} flex="1">
                <Editable
                  defaultValue={item.nome}
                  fontSize="14px"
                  fontWeight="600"
                  isPreviewFocusable
                  submitOnBlur
                  onSubmit={next => {
                    const value = next.trim();
                    if (value.length >= 2 && value !== item.nome)
                      rename.mutate({ id: item.id, nome: value });
                  }}
                  flex="1"
                  minW={0}
                >
                  <EditablePreview
                    px={2}
                    py={1}
                    borderRadius="6px"
                    _hover={{ bg: 'erp.hover' }}
                    cursor="text"
                  />
                  <EditableInput px={2} />
                </Editable>
                <Badge variant="subtle" textTransform="none" flexShrink={0}>
                  {item.produtos} {item.produtos === 1 ? 'produto' : 'produtos'}
                </Badge>
              </Flex>
              <Flex align="center" gap={2} flexShrink={0}>
                <Text fontSize="11px" color="erp.textMuted">
                  {item.situacao ? 'Ativa' : 'Inativa'}
                </Text>
                <Switch
                  isChecked={item.situacao === 1}
                  isDisabled={toggle.isPending}
                  onChange={event =>
                    toggle.mutate({
                      id: item.id,
                      situacao: event.target.checked ? 1 : 0,
                    })
                  }
                />
              </Flex>
            </Flex>
          ))}
        </VStack>
      ) : (
        <EmptyState
          title={`Nenhuma ${entity} cadastrada`}
          description={`Adicione a primeira ${entity} no campo acima.`}
          icon={entity === 'categoria' ? Tags : Tag}
        />
      )}
    </Box>
  );
}
