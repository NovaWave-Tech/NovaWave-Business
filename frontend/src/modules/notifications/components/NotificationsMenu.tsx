import {
  Badge,
  Box,
  Button,
  Flex,
  Icon,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bell,
  BellOff,
  CheckCheck,
  PackageX,
  Receipt,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { notificationService } from '../services/notificationService';
import type { AppNotification } from '../types/notificationTypes';

/** Icone e cor por tipo de alerta. */
const TYPE_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  receber_vencido: { icon: Wallet, color: 'erp.danger' },
  receber_vencendo: { icon: Wallet, color: 'erp.warning' },
  pagar_vencido: { icon: Receipt, color: 'erp.danger' },
  pagar_vencendo: { icon: Receipt, color: 'erp.warning' },
  estoque_baixo: { icon: PackageX, color: 'erp.warning' },
};

/** "agora", "ha 3h", "ha 2d" — tempo relativo curto para a lista. */
function timeAgo(value: string): string {
  const date = new Date(value.includes('T') ? value : value.replace(' ', 'T'));
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (Number.isNaN(minutes) || minutes < 1) return 'agora';
  if (minutes < 60) return `ha ${minutes}min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `ha ${hours}h`;
  return `ha ${Math.floor(hours / 24)}d`;
}

export function NotificationsMenu() {
  const navigate = useNavigate();
  const client = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
    // Alertas derivados do estado atual: revalida sozinho de tempos em tempos.
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const data = query.data;
  const unread = data?.unread ?? 0;
  const items = data?.notifications ?? [];

  const invalidate = () =>
    client.invalidateQueries({ queryKey: ['notifications'] });
  const read = useMutation({
    mutationFn: (id: number) => notificationService.markRead(id),
    onSuccess: invalidate,
  });
  const readAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: invalidate,
  });

  const open = (notification: AppNotification) => {
    if (!notification.lida) read.mutate(notification.idnotificacao);
    if (notification.link) navigate(notification.link);
  };

  return (
    <Menu>
      <Tooltip label="Notificacoes">
        <MenuButton
          as={IconButton}
          aria-label={
            unread > 0 ? `Notificacoes (${unread} nao lidas)` : 'Notificacoes'
          }
          icon={
            <Box position="relative">
              <Bell size={18} />
              {unread > 0 && (
                <Flex
                  position="absolute"
                  top="-6px"
                  right="-7px"
                  minW="16px"
                  h="16px"
                  px="4px"
                  align="center"
                  justify="center"
                  borderRadius="full"
                  bg="erp.danger"
                  color="white"
                  fontSize="9px"
                  fontWeight="700"
                >
                  {unread > 9 ? '9+' : unread}
                </Flex>
              )}
            </Box>
          }
          variant="ghost"
        />
      </Tooltip>
      <MenuList maxW="360px" minW="320px" py={0} overflow="hidden">
        <Flex
          align="center"
          justify="space-between"
          px={3}
          py={2.5}
          borderBottom="1px solid"
          borderColor="erp.border"
        >
          <Text fontSize="sm" fontWeight="700">
            Notificacoes
            {unread > 0 && (
              <Badge ml={2} colorScheme="red" borderRadius="full">
                {unread}
              </Badge>
            )}
          </Text>
          {unread > 0 && (
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<CheckCheck size={13} />}
              isLoading={readAll.isPending}
              onClick={() => readAll.mutate()}
            >
              Marcar lidas
            </Button>
          )}
        </Flex>

        {items.length === 0 ? (
          <Flex direction="column" align="center" gap={2} px={4} py={7}>
            <Icon as={BellOff} boxSize="22px" color="erp.textMuted" />
            <Text color="erp.textSecondary" fontSize="sm">
              Nenhuma notificacao
            </Text>
            <Text color="erp.textMuted" fontSize="11px" textAlign="center">
              Avisamos aqui sobre titulos e contas vencendo e estoque baixo.
            </Text>
          </Flex>
        ) : (
          <Box maxH="380px" overflowY="auto">
            {items.map(notification => {
              const style = TYPE_STYLE[String(notification.tipo)] ?? {
                icon: Bell,
                color: 'erp.textMuted',
              };
              return (
                <Flex
                  key={notification.idnotificacao}
                  as="button"
                  w="full"
                  textAlign="left"
                  gap={2.5}
                  px={3}
                  py={2.5}
                  borderBottom="1px solid"
                  borderColor="erp.border"
                  bg={notification.lida ? 'transparent' : 'erp.brandSoft'}
                  transition="background 120ms ease"
                  _hover={{ bg: 'erp.hover' }}
                  onClick={() => open(notification)}
                >
                  <Icon
                    as={style.icon}
                    boxSize="16px"
                    color={style.color}
                    mt="2px"
                    flexShrink={0}
                  />
                  <Box flex="1" minW={0}>
                    <Flex align="center" gap={2}>
                      <Text
                        fontSize="12.5px"
                        fontWeight={notification.lida ? '500' : '700'}
                        noOfLines={1}
                      >
                        {notification.titulo}
                      </Text>
                      {!notification.lida && (
                        <Box
                          w="6px"
                          h="6px"
                          borderRadius="full"
                          bg="erp.danger"
                          flexShrink={0}
                        />
                      )}
                    </Flex>
                    <Text
                      fontSize="11.5px"
                      color="erp.textSecondary"
                      noOfLines={2}
                    >
                      {notification.mensagem}
                    </Text>
                    <Text fontSize="10px" color="erp.textMuted" mt={0.5}>
                      {timeAgo(notification.criado_em)}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
          </Box>
        )}
      </MenuList>
    </Menu>
  );
}
