import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { CalendarClock, CheckCircle2, Receipt } from 'lucide-react';
import { MotionBox } from '../../../shared/ui/motion';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPaymentMethod,
} from '../../../shared/utils/formatters';
import type { ReceivableTransaction } from '../types/receivableTypes';

function TimelineStep({
  icon,
  title,
  when,
  detail,
  tone,
  last,
}: {
  icon: typeof Receipt;
  title: string;
  when: string;
  detail?: string;
  tone: 'muted' | 'success';
  last?: boolean;
}) {
  return (
    <Flex gap={3}>
      <Flex direction="column" align="center">
        <Flex
          w="30px"
          h="30px"
          align="center"
          justify="center"
          borderRadius="full"
          bg={tone === 'success' ? 'erp.brandSoft' : 'erp.surfaceSubtle'}
          border="1px solid"
          borderColor={tone === 'success' ? 'erp.brandBorder' : 'erp.border'}
          color={tone === 'success' ? 'erp.success' : 'erp.textMuted'}
          flexShrink={0}
        >
          <Icon as={icon} boxSize="15px" />
        </Flex>
        {!last && <Box flex="1" w="2px" bg="erp.border" my={1} minH="16px" />}
      </Flex>
      <Box pb={last ? 0 : 4}>
        <Text fontSize="13px" fontWeight="600">
          {title}
        </Text>
        <Text fontSize="12px" color="erp.textSecondary">
          {when}
        </Text>
        {detail && (
          <Text fontSize="12px" color="erp.textMuted">
            {detail}
          </Text>
        )}
      </Box>
    </Flex>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap={4} py={1}>
      <Text fontSize="13px" color="erp.textSecondary">
        {label}
      </Text>
      <Text textStyle="numeric" fontSize="13px" fontWeight="600">
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
              <Icon as={Receipt} boxSize="22px" />
            </Flex>
            <Box flex="1" minW={0}>
              <Text textStyle="h5">Detalhes da transacao</Text>
              <Text fontSize="12px" fontWeight="400" color="erp.textSecondary">
                Grupo {transaction.grupo} · {transaction.origem}
              </Text>
            </Box>
            <Badge
              colorScheme="green"
              textTransform="none"
              borderRadius="full"
              px={2.5}
              py={1}
            >
              {transaction.status}
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
            <Text textStyle="overline" color="erp.textMuted" mb={3}>
              Linha do tempo
            </Text>
            <Box mb={5}>
              <TimelineStep
                icon={CalendarClock}
                tone="muted"
                title="Vencimento"
                when={formatDate(transaction.data_vencimento)}
                detail={`Parcela ${transaction.parcela_numero}/${transaction.parcelas_total}`}
              />
              <TimelineStep
                icon={CheckCircle2}
                tone="success"
                title="Pagamento confirmado"
                when={formatDateTime(transaction.data_hora)}
                detail={`Via ${formatPaymentMethod(transaction.meio)}${
                  transaction.filial ? ` · ${transaction.filial}` : ''
                }`}
                last
              />
            </Box>

            <Box
              p={4}
              borderRadius="12px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
            >
              <Row
                label="Valor da parcela"
                value={formatCurrency(transaction.valor_base)}
              />
              {transaction.juros > 0 && (
                <Row
                  label="Juros"
                  value={`+ ${formatCurrency(transaction.juros)}`}
                />
              )}
              {transaction.multa > 0 && (
                <Row
                  label="Multa"
                  value={`+ ${formatCurrency(transaction.multa)}`}
                />
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
                pt={3}
                borderTop="1px dashed"
                borderColor="erp.brandBorder"
              >
                <Text fontSize="14px" fontWeight="700" color="erp.brandText">
                  Valor pago
                </Text>
                <Text
                  textStyle="numeric"
                  fontSize="24px"
                  fontWeight="800"
                  color="erp.brandText"
                >
                  {formatCurrency(transaction.valor)}
                </Text>
              </Flex>
            </Box>

            {transaction.items.length > 0 && (
              <Box mt={5}>
                <Text textStyle="overline" color="erp.textMuted" mb={2}>
                  Produtos da compra
                </Text>
                {transaction.items.map((item, index) => (
                  <Flex
                    key={index}
                    justify="space-between"
                    py={1.5}
                    borderBottom={
                      index < transaction.items.length - 1
                        ? '1px solid'
                        : undefined
                    }
                    borderColor="erp.border"
                  >
                    <Text fontSize="13px" noOfLines={1}>
                      {item.produto}
                    </Text>
                    <Text textStyle="numeric" fontSize="13px" fontWeight="600">
                      {formatCurrency(item.valor_total)}
                    </Text>
                  </Flex>
                ))}
              </Box>
            )}
          </MotionBox>
        </ModalBody>
        <ModalFooter p={5} pt={0} gap={2}>
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
