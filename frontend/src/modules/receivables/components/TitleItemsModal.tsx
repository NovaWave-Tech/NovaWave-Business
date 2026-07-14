import {
  Box,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { Package, ShoppingBag } from 'lucide-react';
import { MotionBox } from '../../../shared/ui/motion';
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
  const total = title.items.reduce((sum, item) => sum + item.valor_total, 0);
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
              <Icon as={ShoppingBag} boxSize="22px" />
            </Flex>
            <Box>
              <Text textStyle="h5">Produtos da compra</Text>
              <Text fontSize="12px" fontWeight="400" color="erp.textSecondary">
                Contrato {title.contrato}
                {title.idvenda ? ` · Venda #${title.idvenda}` : ''}
              </Text>
            </Box>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody p={5}>
          {title.items.length === 0 ? (
            <Flex direction="column" align="center" py={6} gap={2}>
              <Icon as={Package} boxSize="28px" color="erp.textMuted" />
              <Text fontSize="13px" color="erp.textMuted">
                Nenhum produto vinculado a este titulo.
              </Text>
            </Flex>
          ) : (
            <MotionBox
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
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
              <Flex
                justify="space-between"
                align="baseline"
                mt={3}
                pt={3}
                borderTop="2px solid"
                borderColor="erp.borderStrong"
              >
                <Text fontSize="14px" fontWeight="700">
                  Total da compra
                </Text>
                <Text textStyle="numeric" fontSize="18px" fontWeight="800">
                  {formatCurrency(total)}
                </Text>
              </Flex>
            </MotionBox>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
