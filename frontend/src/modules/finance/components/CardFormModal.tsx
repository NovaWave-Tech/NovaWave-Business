import {
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
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  SimpleGrid,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { digitsOnly } from '../../../shared/utils/formatters';
import { financeService, type FinanceData } from '../services/financeService';

export type CompanyCard = FinanceData['cards'][number];

/** Cadastro/edicao de cartao corporativo (limite, fatura e vencimento). */
export function CardFormModal({
  isOpen,
  onClose,
  card,
}: {
  isOpen: boolean;
  onClose: () => void;
  card: CompanyCard | null;
}) {
  const toast = useToast();
  const client = useQueryClient();
  const [banco, setBanco] = useState('');
  const [descricao, setDescricao] = useState('');
  const [final, setFinal] = useState('');
  const [limite, setLimite] = useState('0.00');
  const [dia, setDia] = useState(10);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setBanco(card?.banco ?? '');
    setDescricao(card?.descricao ?? '');
    setFinal(card?.final_cartao ?? '');
    setLimite((card?.limite ?? 0).toFixed(2));
    setDia(card?.next_due ? Number(card.next_due.slice(8, 10)) : 10);
    setTouched(false);
  }, [isOpen, card]);

  const bancoError = banco.trim().length < 2;
  const descricaoError = descricao.trim().length < 2;
  const finalError = final !== '' && digitsOnly(final).length !== 4;
  const invalid = bancoError || descricaoError || finalError;

  const save = useMutation({
    mutationFn: () => {
      const payload = {
        banco: banco.trim(),
        descricao: descricao.trim(),
        final_cartao: final || undefined,
        limite: Number(limite) || 0,
        dia_vencimento: dia,
      };
      return card
        ? financeService.updateCard(card.idcartao, payload)
        : financeService.createCard(payload);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['finance'] });
      toast({
        title: card ? 'Cartao atualizado' : 'Cartao cadastrado',
        status: 'success',
      });
      onClose();
    },
    onError: (error: unknown) =>
      toast({
        title: 'Nao foi possivel salvar o cartao',
        description:
          error instanceof Error ? error.message : 'Tente novamente.',
        status: 'error',
        position: 'top-right',
      }),
  });

  const submit = () => {
    setTouched(true);
    if (!invalid) save.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
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
              <Icon as={CreditCard} boxSize="22px" />
            </Flex>
            <Box>
              <Text textStyle="h5">
                {card ? 'Editar cartao' : 'Novo cartao corporativo'}
              </Text>
              <Text fontSize="12px" fontWeight="400" color="erp.textSecondary">
                A fatura e somada das despesas pagas neste cartao.
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody p={5}>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4}>
            <FormControl isRequired isInvalid={touched && bancoError}>
              <FormLabel>Banco / emissor</FormLabel>
              <Input
                autoFocus
                value={banco}
                onChange={event => setBanco(event.target.value)}
                placeholder="Ex.: Nubank"
              />
              <FormErrorMessage>Informe o banco emissor.</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={touched && finalError}>
              <FormLabel>Final do cartao</FormLabel>
              <Input
                value={final}
                maxLength={4}
                onChange={event => setFinal(digitsOnly(event.target.value))}
                placeholder="4321"
              />
              <FormErrorMessage>Informe os 4 ultimos digitos.</FormErrorMessage>
            </FormControl>
          </SimpleGrid>

          <FormControl mt={4} isRequired isInvalid={touched && descricaoError}>
            <FormLabel>Descricao</FormLabel>
            <Input
              value={descricao}
              onChange={event => setDescricao(event.target.value)}
              placeholder="Ex.: Cartao operacional"
            />
            <FormErrorMessage>Informe uma descricao.</FormErrorMessage>
          </FormControl>

          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={4} mt={4}>
            <FormControl>
              <FormLabel>Limite</FormLabel>
              <CurrencyInput value={limite} onValueChange={setLimite} />
            </FormControl>
            <FormControl>
              <FormLabel>Dia do vencimento</FormLabel>
              <NumberInput
                min={1}
                max={31}
                value={dia}
                onChange={(_, value) => setDia(Number.isNaN(value) ? 1 : value)}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
        </ModalBody>
        <ModalFooter p={5} pt={0} gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button isLoading={save.isPending} onClick={submit}>
            {card ? 'Salvar' : 'Cadastrar cartao'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
