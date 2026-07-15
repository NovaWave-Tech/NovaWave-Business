import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Icon,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { PackagePlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ComboSelect } from '../../../shared/ui/ComboSelect';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { productService } from '../../products/services/productService';
import type { ProductOption } from '../types/purchaseTypes';

const UNITS = ['UN', 'CX', 'KG', 'L', 'M', 'PC', 'SC'];

/**
 * Cadastro rapido de produto de dentro da compra: a compra e justamente
 * onde um produto novo entra no catalogo. Pede so o minimo que o backend
 * exige (nome, categoria e preco de venda) e ja devolve o produto pronto
 * para entrar no carrinho.
 */
export function QuickProductModal({
  isOpen,
  onClose,
  initialName,
  categories,
  onCreated,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialName: string;
  categories: Array<{ id: number; nome: string }>;
  onCreated: (product: ProductOption) => void;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState('');
  const [unidade, setUnidade] = useState('UN');
  const [custo, setCusto] = useState('0.00');
  const [venda, setVenda] = useState('0.00');
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setNome(initialName);
      setCategoria(categories.length === 1 ? String(categories[0].id) : '');
      setUnidade('UN');
      setCusto('0.00');
      setVenda('0.00');
      setTouched(false);
    }
  }, [isOpen, initialName, categories]);

  const custoValue = Number(custo) || 0;
  const vendaValue = Number(venda) || 0;
  const nomeError = nome.trim().length < 2;
  const categoriaError = !categoria;
  const vendaError = vendaValue <= 0;
  const invalid = nomeError || categoriaError || vendaError;

  const create = useMutation({
    mutationFn: () =>
      productService.quickCreate({
        nome: nome.trim(),
        idcategoria: Number(categoria),
        unidade,
        preco_custo: custoValue,
        preco_venda: vendaValue,
      }),
    onSuccess: async result => {
      await client.invalidateQueries({ queryKey: ['products'] });
      await client.invalidateQueries({ queryKey: ['purchases'] });
      onCreated({
        id: Number(result.data.idproduto),
        nome: nome.trim(),
        sku: null,
        codigo_barras: null,
        unidade,
        preco_custo: custoValue,
        estoque: 0,
      });
      toast({
        title: 'Produto cadastrado',
        description: 'Ja adicionamos ele nesta compra.',
        status: 'success',
        position: 'top-right',
      });
      onClose();
    },
    onError: (error: unknown) =>
      toast({
        title: 'Nao foi possivel cadastrar o produto',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        status: 'error',
        position: 'top-right',
      }),
  });

  const submit = () => {
    setTouched(true);
    if (!invalid) create.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent borderRadius="16px" overflow="hidden">
        <ModalHeader p={5} borderBottom="1px solid" borderColor="erp.border">
          <Flex align="center" gap={3}>
            <Flex
              w="44px"
              h="44px"
              align="center"
              justify="center"
              borderRadius="12px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
              color="brand.500"
              flexShrink={0}
            >
              <Icon as={PackagePlus} boxSize="22px" />
            </Flex>
            <Box>
              <Text textStyle="h5">Cadastro rapido de produto</Text>
              <Text fontSize="12px" fontWeight="400" color="erp.textSecondary">
                So o essencial. Complete o cadastro depois, na tela de Produtos.
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody p={5}>
          {categories.length === 0 ? (
            <Alert status="warning" borderRadius="8px">
              <AlertIcon />
              <Text fontSize="13px">
                Nenhuma categoria ativa. Cadastre uma categoria em Produtos
                antes de criar o produto por aqui.
              </Text>
            </Alert>
          ) : (
            <>
              <FormControl isRequired isInvalid={touched && nomeError}>
                <FormLabel>Nome do produto</FormLabel>
                <Input
                  autoFocus
                  value={nome}
                  onChange={event => setNome(event.target.value)}
                  placeholder="Ex.: Geladeira Frost Free 400L"
                />
                <FormErrorMessage>
                  Informe ao menos 2 caracteres.
                </FormErrorMessage>
              </FormControl>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
                <FormControl isRequired isInvalid={touched && categoriaError}>
                  <FormLabel>Categoria</FormLabel>
                  <ComboSelect
                    value={categoria}
                    onChange={setCategoria}
                    placeholder="Selecione a categoria"
                    options={categories.map(category => ({
                      value: String(category.id),
                      label: category.nome,
                    }))}
                  />
                  <FormErrorMessage>Selecione a categoria.</FormErrorMessage>
                </FormControl>
                <FormControl>
                  <FormLabel>Unidade</FormLabel>
                  <ComboSelect
                    value={unidade}
                    onChange={setUnidade}
                    options={UNITS.map(unit => ({ value: unit, label: unit }))}
                  />
                </FormControl>
              </SimpleGrid>

              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
                <FormControl>
                  <FormLabel>Preco de custo</FormLabel>
                  <CurrencyInput value={custo} onValueChange={setCusto} />
                  <Text mt={1} fontSize="11px" color="erp.textMuted">
                    Sera o valor sugerido na compra.
                  </Text>
                </FormControl>
                <FormControl isRequired isInvalid={touched && vendaError}>
                  <FormLabel>Preco de venda</FormLabel>
                  <CurrencyInput value={venda} onValueChange={setVenda} />
                  <FormErrorMessage>
                    O preco de venda deve ser maior que zero.
                  </FormErrorMessage>
                </FormControl>
              </SimpleGrid>

              <Text mt={4} fontSize="11px" color="erp.textMuted">
                O estoque nao e informado aqui: quem da a entrada e esta compra,
                ao ser registrada.
              </Text>
            </>
          )}
        </ModalBody>
        <ModalFooter p={5} pt={0} gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            leftIcon={<PackagePlus size={16} />}
            isLoading={create.isPending}
            isDisabled={categories.length === 0}
            onClick={submit}
          >
            Cadastrar e adicionar
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
