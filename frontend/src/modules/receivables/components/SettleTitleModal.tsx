import {
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
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
import { Check, HandCoins, TriangleAlert } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { MotionBox } from '../../../shared/ui/motion';
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
  const overdue = title.dias_atraso > 0;

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
              <Icon as={HandCoins} boxSize="22px" />
            </Flex>
            <Box flex="1" minW={0}>
              <Text textStyle="h5">Receber titulo</Text>
              <Text
                fontSize="12px"
                fontWeight="400"
                color="erp.textSecondary"
                noOfLines={1}
              >
                Contrato {title.contrato} · parcela {title.parcela_numero}/
                {title.parcelas_total}
              </Text>
            </Box>
            <Badge
              colorScheme={overdue ? 'red' : 'yellow'}
              textTransform="none"
              borderRadius="full"
              px={2.5}
              py={1}
            >
              {overdue ? `Vencido ha ${title.dias_atraso}d` : 'A vencer'}
            </Badge>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody p={5}>
          <MotionBox
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            <FormControl>
              <FormLabel textStyle="overline" color="erp.textMuted">
                Forma de pagamento
              </FormLabel>
              <SimpleGrid columns={{ base: 2, sm: 3 }} spacing={2}>
                {PAYMENT_METHODS.map(method => {
                  const active = payment === method.value;
                  return (
                    <Button
                      key={method.value}
                      size="sm"
                      variant="outline"
                      h="46px"
                      onClick={() => setPayment(method.value)}
                      bg={active ? 'erp.brandSoft' : undefined}
                      color={active ? 'erp.brandText' : undefined}
                      borderColor={active ? 'brand.400' : 'erp.border'}
                      borderWidth={active ? '1.5px' : '1px'}
                      fontWeight={active ? '700' : '500'}
                      _hover={{ borderColor: 'brand.300' }}
                    >
                      {method.label}
                    </Button>
                  );
                })}
              </SimpleGrid>
            </FormControl>

            {overdue && (
              <Flex
                mt={3}
                align="center"
                gap={2}
                p={2.5}
                borderRadius="8px"
                bg="erp.brandSoft"
                color="erp.warning"
              >
                <Icon as={TriangleAlert} boxSize="15px" />
                <Text fontSize="12px">
                  Em atraso ha {title.dias_atraso} dia
                  {title.dias_atraso > 1 ? 's' : ''} · venceu em{' '}
                  {formatDate(title.data_vencimento)} · juros de{' '}
                  {title.juros_atraso}% a.m. sugeridos.
                </Text>
              </Flex>
            )}

            <SimpleGrid columns={2} spacing={3} mt={4}>
              <FormControl>
                <FormLabel textStyle="overline" color="erp.textMuted">
                  Juros / multa
                </FormLabel>
                <CurrencyInput value={juros} onValueChange={setJuros} />
              </FormControl>
              <FormControl>
                <FormLabel textStyle="overline" color="erp.textMuted">
                  Desconto
                </FormLabel>
                <CurrencyInput value={desconto} onValueChange={setDesconto} />
              </FormControl>
            </SimpleGrid>

            <Box
              mt={5}
              p={4}
              borderRadius="12px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
            >
              <SummaryRow
                label="Valor da parcela"
                value={formatCurrency(title.valor)}
              />
              {interest > 0 && (
                <SummaryRow
                  label="Juros / multa"
                  value={`+ ${formatCurrency(interest)}`}
                />
              )}
              {discount > 0 && (
                <SummaryRow
                  label="Desconto"
                  value={`- ${formatCurrency(discount)}`}
                />
              )}
              <Flex
                justify="space-between"
                align="baseline"
                mt={2}
                pt={3}
                borderTop="1px dashed"
                borderColor="erp.brandBorder"
              >
                <Text fontSize="14px" fontWeight="700" color="erp.brandText">
                  Total a receber
                </Text>
                <MotionBox
                  key={total}
                  initial={{ scale: 0.9, opacity: 0.4 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  <Text
                    textStyle="numeric"
                    fontSize="26px"
                    fontWeight="800"
                    color="erp.brandText"
                  >
                    {formatCurrency(total)}
                  </Text>
                </MotionBox>
              </Flex>
            </Box>
          </MotionBox>
        </ModalBody>
        <ModalFooter p={5} pt={0} gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            leftIcon={<Check size={16} />}
            isLoading={loading}
            loadingText="Confirmando..."
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" py={1}>
      <Text fontSize="13px" color="erp.textSecondary">
        {label}
      </Text>
      <Text textStyle="numeric" fontSize="13px" fontWeight="600">
        {value}
      </Text>
    </Flex>
  );
}
