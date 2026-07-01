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
  const { user, signOut } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const [search, setSearch] = useState('');
  const current =
    erpNavItems.find(item => item.path === location.pathname)?.label ||
    'NovaWave Business';
  const match = useMemo(
    () =>
      erpNavItems.find(item =>
        item.label.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search]
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
          <Flex gap={1.5} align="center" fontSize="11px" color="erp.textMuted">
            <Text display={{ base: 'none', sm: 'block' }}>
              NovaWave Business
            </Text>
            <Text display={{ base: 'none', sm: 'block' }}>/</Text>
            <Text color="erp.textSecondary" fontWeight="600" noOfLines={1}>
              {current}
            </Text>
          </Flex>
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
            as={Flex}
            align="center"
            gap={2}
            ml={1}
            px={2}
            h="44px"
            borderRadius="8px"
            cursor="pointer"
            _hover={{ bg: 'erp.hover' }}
          >
            <Avatar size="sm" name={userName} bg="brand.700" />
            <Box
              display={{ base: 'none', xl: 'block' }}
              textAlign="left"
              maxW="150px"
            >
              <Text fontSize="13px" fontWeight="600" noOfLines={1}>
                {userName}
              </Text>
              <Text fontSize="11px" color="erp.textMuted" noOfLines={1}>
                Ambiente ERP
              </Text>
            </Box>
            <ChevronDown size={14} />
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
