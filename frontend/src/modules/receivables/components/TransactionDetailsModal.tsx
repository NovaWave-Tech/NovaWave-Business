import {
  Badge,
  Box,
  Button,
  Divider,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { Receipt } from 'lucide-react';
import {
  formatCurrency,
  formatDateTime,
  formatPaymentMethod,
} from '../../../shared/utils/formatters';
import type { ReceivableTransaction } from '../types/receivableTypes';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} py={1.5}>
      <Text fontSize="12px" color="erp.textSecondary">
        {label}
      </Text>
      <Text fontSize="12px" fontWeight="600" textAlign="right">
        {value}
      </Text>
    </Flex>
  );
}

export function TransactionDetailsModal({
  transaction,
  isOpen,
  onClose,
  onReceipt,
}: {
  transaction: ReceivableTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onReceipt: (transaction: ReceivableTransaction) => void;
}) {
  if (!transaction) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Detalhes da transacao
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            Grupo {transaction.grupo} · {transaction.origem}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Flex mb={2}>
            <Badge colorScheme="green" textTransform="none">
              {transaction.status}
            </Badge>
          </Flex>
          <Row
            label="Data / hora"
            value={formatDateTime(transaction.data_hora)}
          />
          <Row label="Origem" value={transaction.origem} />
          <Row label="Meio" value={formatPaymentMethod(transaction.meio)} />
          <Row label="Filial" value={transaction.filial ?? '-'} />
          <Divider my={2} />
          <Row
            label="Valor da parcela"
            value={formatCurrency(transaction.valor_base)}
          />
          {transaction.juros > 0 && (
            <Row label="Juros" value={formatCurrency(transaction.juros)} />
          )}
          {transaction.multa > 0 && (
            <Row label="Multa" value={formatCurrency(transaction.multa)} />
          )}
          {transaction.desconto > 0 && (
            <Row
              label="Desconto"
              value={`- ${formatCurrency(transaction.desconto)}`}
            />
          )}
          <Flex
            justify="space-between"
            align="baseline"
            mt={2}
            pt={2}
            borderTop="2px solid"
            borderColor="erp.borderStrong"
          >
            <Text fontSize="14px" fontWeight="700">
              Valor pago
            </Text>
            <Text textStyle="numeric" fontSize="20px" fontWeight="800">
              {formatCurrency(transaction.valor)}
            </Text>
          </Flex>

          {transaction.items.length > 0 && (
            <Box mt={4}>
              <Text
                fontSize="10px"
                fontWeight="700"
                color="erp.textMuted"
                textTransform="uppercase"
                letterSpacing="0.06em"
                mb={1}
              >
                Produtos da compra
              </Text>
              {transaction.items.map((item, index) => (
                <Flex key={index} justify="space-between" py={1}>
                  <Text fontSize="12px" noOfLines={1}>
                    {item.produto}
                  </Text>
                  <Text textStyle="numeric" fontSize="12px" fontWeight="600">
                    {formatCurrency(item.valor_total)}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button
            leftIcon={<Receipt size={16} />}
            onClick={() => onReceipt(transaction)}
          >
            Comprovante
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
