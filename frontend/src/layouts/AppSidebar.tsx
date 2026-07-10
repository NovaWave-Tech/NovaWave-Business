import {
  Avatar,
  Box,
  Divider,
  Flex,
  IconButton,
  Text,
  Tooltip,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { LogOut, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';
import BrandLogo from '../shared/brand/BrandLogo';
import { erpNavigation } from './erpNavigation';

type AppSidebarProps = {
  collapsed?: boolean;
  onToggle?: () => void;
  mobile?: boolean;
  onClose?: () => void;
};

export default function AppSidebar({
  collapsed = false,
  onToggle,
  mobile = false,
  onClose,
}: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, can } = useAuth();
  const logoTone = useColorModeValue('dark', 'light');
  const userName = user?.nome || user?.email || 'Usuario';
  const go = (path: string) => {
    navigate(path);
    onClose?.();
  };
  // Esconde itens (e grupos inteiros) sem permissao de visualizacao.
  const visibleNavigation = erpNavigation
    .map(group => ({
      ...group,
      items: group.items.filter(
        item => !item.permission || can(item.permission)
      ),
    }))
    .filter(group => group.items.length > 0);

  return (
    <Flex
      direction="column"
      h="100%"
      bg="erp.sidebar"
      color="erp.text"
      borderRight="1px solid"
      borderColor="erp.border"
      px={collapsed ? 2 : 3}
      py={4}
      overflow="hidden"
    >
      <Flex h="44px" px={1} align="center" mb={5} gap={2}>
        <BrandLogo compact={collapsed} tone={logoTone} flex="1" minW={0} />
        {mobile ? (
          <IconButton
            aria-label="Fechar menu"
            icon={<X size={18} />}
            size="sm"
            variant="ghost"
            onClick={onClose}
          />
        ) : (
          <Tooltip
            label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            placement="right"
          >
            <IconButton
              aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              icon={
                collapsed ? (
                  <PanelLeftOpen size={17} />
                ) : (
                  <PanelLeftClose size={17} />
                )
              }
              size="sm"
              variant="ghost"
              onClick={onToggle}
            />
          </Tooltip>
        )}
      </Flex>
      <VStack
        align="stretch"
        spacing={5}
        flex="1"
        overflowY="auto"
        overflowX="hidden"
        sx={{ scrollbarWidth: 'thin' }}
      >
        {visibleNavigation.map(group => (
          <Box key={group.label}>
            {!collapsed && (
              <Text
                px={3}
                mb={1.5}
                color="erp.textMuted"
                fontSize="10px"
                fontWeight="600"
                textTransform="uppercase"
              >
                {group.label}
              </Text>
            )}
            <VStack align="stretch" spacing={1}>
              {group.items.map(item => {
                const active = location.pathname === item.path;
                const content = (
                  <Flex
                    as="button"
                    key={item.path}
                    type="button"
                    align="center"
                    justify={collapsed ? 'center' : 'flex-start'}
                    gap={3}
                    w="full"
                    h="40px"
                    px={collapsed ? 0 : 3}
                    borderRadius="8px"
                    color={active ? 'erp.text' : 'erp.textSecondary'}
                    bg={active ? 'erp.hover' : 'transparent'}
                    borderLeft="2px solid"
                    borderLeftColor={active ? 'brand.500' : 'transparent'}
                    fontSize="14px"
                    fontWeight={active ? '600' : '500'}
                    transition="background-color 180ms ease, color 180ms ease"
                    onClick={() => go(item.path)}
                    _hover={{ bg: 'erp.hover', color: 'erp.text' }}
                  >
                    <item.icon
                      size={18}
                      color={active ? '#2F80FF' : 'currentColor'}
                    />
                    {!collapsed && <Text noOfLines={1}>{item.label}</Text>}
                  </Flex>
                );
                return collapsed ? (
                  <Tooltip
                    key={item.path}
                    label={item.label}
                    placement="right"
                    hasArrow
                  >
                    {content}
                  </Tooltip>
                ) : (
                  content
                );
              })}
            </VStack>
          </Box>
        ))}
      </VStack>
      <Divider borderColor="erp.border" my={3} />
      <Flex
        align="center"
        gap={2.5}
        px={collapsed ? 0 : 2}
        minH="44px"
        justify={collapsed ? 'center' : 'flex-start'}
      >
        <Avatar size="sm" name={userName} bg="brand.700" />
        {!collapsed && (
          <Box minW={0} flex="1">
            <Text fontSize="13px" fontWeight="600" noOfLines={1}>
              {userName}
            </Text>
            <Text fontSize="11px" color="erp.textMuted" noOfLines={1}>
              {user?.email}
            </Text>
          </Box>
        )}
        <Tooltip label="Sair" placement="right">
          <IconButton
            aria-label="Sair"
            icon={<LogOut size={17} />}
            size="sm"
            variant="ghost"
            color="erp.textSecondary"
            onClick={signOut}
            _hover={{ color: 'erp.danger', bg: 'erp.hover' }}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
}
