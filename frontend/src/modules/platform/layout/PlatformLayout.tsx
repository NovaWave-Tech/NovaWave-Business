import {
  Avatar,
  Box,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
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
  VStack,
  useBreakpointValue,
  useColorMode,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  CreditCard,
  FileClock,
  LogOut,
  Menu as MenuIcon,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  User,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../../../shared/brand/BrandLogo';
import { usePlatformAuth } from '../auth/PlatformAuthContext';

type NavItem = { label: string; path: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const navigation: NavGroup[] = [
  {
    label: 'Visao geral',
    items: [
      { label: 'Dashboard', path: '/platform/dashboard', icon: BarChart3 },
    ],
  },
  {
    label: 'Gestao',
    items: [
      { label: 'Empresas', path: '/platform/empresas', icon: Building2 },
      { label: 'Planos', path: '/platform/planos', icon: WalletCards },
      {
        label: 'Assinaturas',
        path: '/platform/assinaturas',
        icon: CreditCard,
      },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { label: 'Usuarios', path: '/platform/usuarios', icon: Users },
      { label: 'Auditoria', path: '/platform/auditoria', icon: FileClock },
      {
        label: 'Configuracoes',
        path: '/platform/configuracoes',
        icon: Settings,
      },
    ],
  },
];

const navItems = navigation.flatMap(group => group.items);

function PlatformSidebar({
  collapsed = false,
  mobile = false,
  onToggle,
  onClose,
}: {
  collapsed?: boolean;
  mobile?: boolean;
  onToggle?: () => void;
  onClose?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = usePlatformAuth();
  const logoTone = useColorModeValue('dark', 'light') as 'dark' | 'light';
  const userName = user?.nome || user?.email || 'Administrador';
  const go = (path: string) => {
    navigate(path);
    onClose?.();
  };

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
        {navigation.map(group => (
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
                const active =
                  location.pathname === item.path ||
                  (item.path !== '/platform/dashboard' &&
                    location.pathname.startsWith(item.path));
                const content = (
                  <Flex
                    as="button"
                    key={item.path}
                    type="button"
                    align="center"
                    justify={collapsed ? 'center' : 'flex-start'}
                    gap={3}
                    w="full"
                    h={mobile ? '44px' : '40px'}
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
            onClick={() => void signOut()}
            _hover={{ color: 'erp.danger', bg: 'erp.hover' }}
          />
        </Tooltip>
      </Flex>
    </Flex>
  );
}

function PlatformTopbar({ onMenuOpen }: { onMenuOpen: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = usePlatformAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const [search, setSearch] = useState('');
  const current =
    navItems.find(
      item =>
        location.pathname === item.path ||
        (item.path !== '/platform/dashboard' &&
          location.pathname.startsWith(item.path))
    )?.label || 'NovaWave Platform';
  const match = useMemo(
    () =>
      navItems.find(item =>
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
  const userName = user?.nome || user?.email || 'Administrador';

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
        <Flex gap={1.5} align="center" fontSize="11px" color="erp.textMuted">
          <Text display={{ base: 'none', sm: 'block' }}>NovaWave Platform</Text>
          <Text display={{ base: 'none', sm: 'block' }}>/</Text>
          <Text color="erp.textSecondary" fontWeight="600" noOfLines={1}>
            {current}
          </Text>
        </Flex>
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
            placeholder="Buscar na plataforma"
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
                Super Admin
              </Text>
            </Box>
            <ChevronDown size={14} />
          </MenuButton>
          <MenuList>
            <MenuItem icon={<User size={16} />}>Minha conta</MenuItem>
            <MenuItem
              icon={<ShieldCheck size={16} />}
              onClick={() => navigate('/platform/configuracoes')}
            >
              Configuracoes
            </MenuItem>
            <MenuDivider />
            <MenuItem
              icon={<LogOut size={16} />}
              color="erp.danger"
              onClick={() => void signOut()}
            >
              Sair
            </MenuItem>
          </MenuList>
        </Menu>
      </Flex>
    </Flex>
  );
}

export default function PlatformLayout() {
  const drawer = useDisclosure();
  const [userCollapsed, setUserCollapsed] = useState(
    () => localStorage.getItem('platform_sidebar_collapsed') === 'true'
  );
  const collapsed =
    useBreakpointValue({ base: true, xl: userCollapsed }) ?? true;
  const sidebarWidth = collapsed ? '72px' : '260px';
  const toggle = () =>
    setUserCollapsed(value => {
      localStorage.setItem('platform_sidebar_collapsed', String(!value));
      return !value;
    });

  return (
    <Flex minH="100vh" w="full" maxW="100vw" overflowX="hidden" bg="erp.canvas">
      <Box
        as="aside"
        display={{ base: 'none', lg: 'block' }}
        position="fixed"
        insetY={0}
        left={0}
        w={sidebarWidth}
        transition="width 200ms ease"
        zIndex={30}
      >
        <PlatformSidebar collapsed={collapsed} onToggle={toggle} />
      </Box>
      <Drawer isOpen={drawer.isOpen} placement="left" onClose={drawer.onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="290px">
          <DrawerBody p={0}>
            <PlatformSidebar mobile onClose={drawer.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <Box
        flex="1"
        w={{ base: '100%', lg: 'auto' }}
        maxW={{ base: '100vw', lg: 'none' }}
        minW={0}
        ml={{ base: 0, lg: sidebarWidth }}
        transition="margin-left 200ms ease"
      >
        <PlatformTopbar onMenuOpen={drawer.onOpen} />
        <Box
          as="main"
          w="full"
          minW={0}
          px={{ base: 4, md: 6 }}
          py={6}
          maxW="1600px"
          mx="auto"
        >
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
