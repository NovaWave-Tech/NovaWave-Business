import {
  Avatar,
  Box,
  Flex,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorMode,
} from '@chakra-ui/react';
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Search,
  Settings,
  Sun,
  User,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';
import { erpNavItems } from './erpNavigation';

export default function AppTopbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, can } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const [search, setSearch] = useState('');
  const current =
    erpNavItems.find(item => item.path === location.pathname)?.label ||
    'NovaWave Business';
  const match = useMemo(
    () =>
      erpNavItems.find(
        item =>
          (!item.permission || can(item.permission)) &&
          item.label.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search, can]
  );
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (match) {
      navigate(match.path);
      setSearch('');
    }
  };
  const userName = user?.nome || user?.email || 'Usuario';

  return (
    <Flex
      as="header"
      h="64px"
      align="center"
      justify="space-between"
      gap={4}
      px={{ base: 4, lg: 6 }}
      bg="erp.sidebar"
      borderBottom="1px solid"
      borderColor="erp.border"
      position="sticky"
      top={0}
      zIndex={20}
    >
      <Flex align="center" gap={3} minW={0}>
        <IconButton
          display={{ lg: 'none' }}
          aria-label="Abrir menu"
          icon={<MenuIcon size={20} />}
          variant="ghost"
          onClick={onMenuOpen}
        />
        <Box minW={0}>
          <Text
            display={{ base: 'none', sm: 'block' }}
            fontSize="10px"
            textStyle="overline"
            color="erp.textMuted"
            noOfLines={1}
          >
            NovaWave Business
          </Text>
          <Text
            fontSize="13px"
            fontWeight="600"
            color="erp.text"
            lineHeight="1.3"
            noOfLines={1}
          >
            {current}
          </Text>
        </Box>
      </Flex>
      <Box
        as="form"
        onSubmit={submit}
        flex="1"
        maxW="420px"
        display={{ base: 'none', md: 'block' }}
      >
        <InputGroup size="sm">
          <InputLeftElement pointerEvents="none">
            <Search size={15} />
          </InputLeftElement>
          <Input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Buscar no ERP"
            bg="erp.surfaceSubtle"
            borderColor="transparent"
            _hover={{ borderColor: 'erp.border' }}
          />
        </InputGroup>
      </Box>
      <Flex align="center" gap={1}>
        <Tooltip
          label={colorMode === 'dark' ? 'Usar tema claro' : 'Usar tema escuro'}
        >
          <IconButton
            aria-label="Alternar tema"
            icon={colorMode === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            variant="ghost"
            onClick={toggleColorMode}
          />
        </Tooltip>
        <Menu>
          <Tooltip label="Notificacoes">
            <MenuButton
              as={IconButton}
              aria-label="Notificacoes"
              icon={<Bell size={18} />}
              variant="ghost"
            />
          </Tooltip>
          <MenuList>
            <Text px={3} py={2} fontSize="sm" fontWeight="600">
              Notificacoes
            </Text>
            <MenuDivider />
            <Box px={4} py={5} textAlign="center">
              <Text color="erp.textSecondary" fontSize="sm">
                Nenhuma notificacao nova
              </Text>
            </Box>
          </MenuList>
        </Menu>
        <Menu>
          <MenuButton
            ml={1}
            px={2}
            h="44px"
            borderRadius="8px"
            cursor="pointer"
            transition="background 140ms ease"
            _hover={{ bg: 'erp.hover' }}
            aria-label="Menu do usuario"
          >
            <Flex align="center" gap={2.5}>
              <Avatar size="sm" name={userName} bg="brand.700" />
              <Box
                display={{ base: 'none', lg: 'block' }}
                textAlign="left"
                maxW="160px"
                minW={0}
              >
                <Text
                  fontSize="13px"
                  fontWeight="600"
                  lineHeight="1.25"
                  noOfLines={1}
                >
                  {userName}
                </Text>
                <Text
                  fontSize="11px"
                  lineHeight="1.25"
                  color="erp.textMuted"
                  noOfLines={1}
                >
                  Ambiente ERP
                </Text>
              </Box>
              <Box
                color="erp.textMuted"
                display={{ base: 'none', lg: 'block' }}
              >
                <ChevronDown size={14} />
              </Box>
            </Flex>
          </MenuButton>
          <MenuList>
            <MenuItem icon={<User size={16} />}>Meu perfil</MenuItem>
            <MenuItem
              icon={<Settings size={16} />}
              onClick={() => navigate('/settings')}
            >
              Preferencias
            </MenuItem>
            <MenuDivider />
            <MenuItem
              icon={<LogOut size={16} />}
              color="erp.danger"
              onClick={signOut}
            >
              Sair
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  );
}
