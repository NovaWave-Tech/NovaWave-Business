import {
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { formatCurrency, formatDate } from '../../../shared/utils/formatters';
import { PAYMENT_METHODS } from '../../sales/types/saleTypes';
import type { ReceivableTitle, SettlePayload } from '../types/receivableTypes';

export function SettleTitleModal({
  title,
  isOpen,
  loading,
  onClose,
  onConfirm,
}: {
  title: ReceivableTitle | null;
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (payload: SettlePayload) => void;
}) {
  const [payment, setPayment] = useState('dinheiro');
  const [juros, setJuros] = useState('0.00');
  const [desconto, setDesconto] = useState('0.00');

  // Ao abrir, pre-preenche os juros com o valor projetado por atraso.
  useEffect(() => {
    if (isOpen && title) {
      setPayment(title.forma_pagamento ?? 'dinheiro');
      setJuros(title.juros_projetado.toFixed(2));
      setDesconto('0.00');
    }
  }, [isOpen, title]);

  if (!title) return null;

  const interest = Number(juros) || 0;
  const discount = Number(desconto) || 0;
  const total = Math.max(0, title.valor + interest - discount);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Receber titulo
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            Contrato {title.contrato} · parcela {title.parcela_numero}/
            {title.parcelas_total} · vence {formatDate(title.data_vencimento)}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <FormControl>
            <FormLabel fontSize="12px">Forma de pagamento</FormLabel>
            <SimpleGrid columns={3} spacing={2}>
              {PAYMENT_METHODS.map(method => {
                const active = payment === method.value;
                return (
                  <Button
                    key={method.value}
                    size="sm"
                    variant="outline"
                    h="44px"
                    onClick={() => setPayment(method.value)}
                    bg={active ? 'erp.brandSoft' : undefined}
                    color={active ? 'erp.brand' : undefined}
                    borderColor={active ? 'erp.brand' : 'erp.border'}
                    fontWeight={active ? '700' : '500'}
                  >
                    {method.label}
                  </Button>
                );
              })}
            </SimpleGrid>
          </FormControl>

          {title.dias_atraso > 0 && (
            <Text mt={3} fontSize="11px" color="erp.warning">
              Titulo em atraso ha {title.dias_atraso} dia
              {title.dias_atraso > 1 ? 's' : ''} · juros de {title.juros_atraso}
              % a.m. sugeridos.
            </Text>
          )}

          <SimpleGrid columns={2} spacing={3} mt={4}>
            <FormControl>
              <FormLabel fontSize="12px">Juros / multa</FormLabel>
              <CurrencyInput value={juros} onValueChange={setJuros} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="12px">Desconto</FormLabel>
              <CurrencyInput value={desconto} onValueChange={setDesconto} />
            </FormControl>
          </SimpleGrid>

          <Divider my={4} />
          <Flex justify="space-between" align="baseline">
            <Text fontSize="13px" color="erp.textSecondary">
              Valor do titulo
            </Text>
            <Text textStyle="numeric" fontSize="13px">
              {formatCurrency(title.valor)}
            </Text>
          </Flex>
          <Flex justify="space-between" align="baseline" mt={2}>
            <Text fontSize="15px" fontWeight="700">
              Total a receber
            </Text>
            <Text textStyle="numeric" fontSize="22px" fontWeight="800">
              {formatCurrency(total)}
            </Text>
          </Flex>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            isLoading={loading}
            onClick={() =>
              onConfirm({
                forma_pagamento: payment,
                juros: interest,
                desconto: discount,
              })
            }
          >
            Confirmar recebimento
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
