import {
  Box,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import {
  formatCurrency,
  formatQuantity,
} from '../../../shared/utils/formatters';
import type { ReceivableItem } from '../types/receivableTypes';

export type ItemsSource = {
  contrato: string;
  idvenda: number | null;
  items: ReceivableItem[];
};

/** Mostra os produtos da venda que originou o titulo/pedido (botao lupa). */
export function TitleItemsModal({
  title,
  isOpen,
  onClose,
}: {
  title: ItemsSource | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!title) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          Produtos da compra
          <Text
            mt={1}
            fontSize="12px"
            fontWeight="400"
            color="erp.textSecondary"
          >
            Contrato {title.contrato}
            {title.idvenda ? ` · Venda #${title.idvenda}` : ''}
          </Text>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {title.items.length === 0 ? (
            <Text fontSize="13px" color="erp.textMuted">
              Nenhum produto vinculado a este titulo.
            </Text>
          ) : (
            <Box>
              {title.items.map((item, index) => (
                <Flex
                  key={index}
                  justify="space-between"
                  gap={3}
                  py={2.5}
                  borderBottom={
                    index < title.items.length - 1 ? '1px solid' : undefined
                  }
                  borderColor="erp.border"
                >
                  <Box minW={0}>
                    <Text fontSize="13px" fontWeight="600" noOfLines={2}>
                      {item.produto}
                    </Text>
                    <Text
                      textStyle="numeric"
                      fontSize="11px"
                      color="erp.textMuted"
                    >
                      {formatQuantity(item.quantidade)} {item.unidade} ×{' '}
                      {formatCurrency(item.valor_unitario)}
                    </Text>
                  </Box>
                  <Text
                    textStyle="numeric"
                    fontSize="13px"
                    fontWeight="700"
                    flexShrink={0}
                  >
                    {formatCurrency(item.valor_total)}
                  </Text>
                </Flex>
              ))}
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
