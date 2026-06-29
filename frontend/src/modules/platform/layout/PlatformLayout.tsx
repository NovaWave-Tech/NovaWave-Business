import {
  Avatar,
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Image,
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
  useColorMode,
  useDisclosure,
} from '@chakra-ui/react';
import {
  BarChart3,
  Bell,
  Building2,
  ChevronDown,
  CircleHelp,
  CreditCard,
  FileClock,
  LogOut,
  Menu as MenuIcon,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Users,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePlatformAuth } from '../auth/PlatformAuthContext';
import { platformTokens } from '../theme/platformTokens';

type NavItem = readonly [string, string, LucideIcon];
type NavSection = { group: string; items: readonly NavItem[] };

const navigation: readonly NavSection[] = [
  {
    group: 'Visao geral',
    items: [['Dashboard', '/platform/dashboard', BarChart3]],
  },
  {
    group: 'Gestao',
    items: [
      ['Empresas', '/platform/empresas', Building2],
      ['Planos', '/platform/planos', WalletCards],
      ['Assinaturas', '/platform/assinaturas', CreditCard],
    ],
  },
  {
    group: 'Sistema',
    items: [
      ['Usuarios', '/platform/usuarios', Users],
      ['Auditoria', '/platform/auditoria', FileClock],
      ['Configuracoes', '/platform/configuracoes', Settings],
    ],
  },
] as const;
const flatNavigation = navigation.flatMap(group => group.items);

function Sidebar({
  collapsed = false,
  close,
  toggle,
}: {
  collapsed?: boolean;
  close?: () => void;
  toggle?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = usePlatformAuth();
  return (
    <Flex
      direction="column"
      h="100%"
      bg={platformTokens.colors.sidebar}
      color="white"
      px={collapsed ? 2.5 : 3}
      py={4}
      overflow="hidden"
    >
      <Flex align="center" h="44px" px={1.5} mb={5} gap={3}>
        <Image
          src="/logobusiness.png"
          boxSize="36px"
          borderRadius="8px"
          objectFit="cover"
          alt="NovaWave"
          flexShrink={0}
        />
        {!collapsed && (
          <Box minW={0}>
            <Text fontWeight="750" lineHeight="1.1" whiteSpace="nowrap">
              NovaWave
            </Text>
            <Text fontSize="xs" color={platformTokens.colors.sidebarText}>
              Platform
            </Text>
          </Box>
        )}
        {close ? (
          <IconButton
            ml="auto"
            aria-label="Fechar menu"
            icon={<X size={18} />}
            variant="ghost"
            color="white"
            size="sm"
            onClick={close}
          />
        ) : (
          <Tooltip
            label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
            placement="right"
          >
            <IconButton
              ml={collapsed ? 0 : 'auto'}
              aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
              icon={
                collapsed ? (
                  <PanelLeftOpen size={17} />
                ) : (
                  <PanelLeftClose size={17} />
                )
              }
              variant="ghost"
              color={platformTokens.colors.sidebarText}
              size="sm"
              onClick={toggle}
            />
          </Tooltip>
        )}
      </Flex>
      <VStack spacing={5} align="stretch" flex="1">
        {navigation.map(section => (
          <Box key={section.group}>
            {!collapsed && (
              <Text
                px={3}
                mb={1.5}
                color={platformTokens.colors.sidebarMuted}
                fontSize="10px"
                fontWeight="700"
                textTransform="uppercase"
              >
                {section.group}
              </Text>
            )}
            <VStack spacing={1} align="stretch">
              {section.items.map(([label, path, ItemIcon]) => {
                const active =
                  location.pathname === path ||
                  (path !== '/platform/dashboard' &&
                    location.pathname.startsWith(path));
                const button = (
                  <Button
                    key={path}
                    justifyContent={collapsed ? 'center' : 'flex-start'}
                    leftIcon={collapsed ? undefined : <ItemIcon size={17} />}
                    variant="ghost"
                    h="40px"
                    px={collapsed ? 0 : 3}
                    color={active ? 'white' : platformTokens.colors.sidebarText}
                    bg={active ? 'rgba(47,128,255,.17)' : 'transparent'}
                    position="relative"
                    _hover={{
                      bg: platformTokens.colors.sidebarHover,
                      color: 'white',
                    }}
                    onClick={() => {
                      navigate(path);
                      close?.();
                    }}
                  >
                    {collapsed ? <ItemIcon size={18} /> : label}
                    {active && (
                      <Box
                        position="absolute"
                        left={0}
                        top="10px"
                        bottom="10px"
                        w="2px"
                        bg={platformTokens.colors.primaryLight}
                        borderRadius="full"
                      />
                    )}
                  </Button>
                );
                return collapsed ? (
                  <Tooltip key={path} label={label} placement="right" hasArrow>
                    {button}
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </VStack>
          </Box>
        ))}
      </VStack>
      <Divider borderColor="rgba(255,255,255,.08)" mb={3} />
      <Tooltip label={collapsed ? 'Sair' : ''} placement="right">
        <Button
          justifyContent={collapsed ? 'center' : 'flex-start'}
          leftIcon={collapsed ? undefined : <LogOut size={17} />}
          variant="ghost"
          h="40px"
          px={collapsed ? 0 : 3}
          color={platformTokens.colors.sidebarText}
          _hover={{
            bg: 'rgba(196,50,59,.13)',
            color: platformTokens.colors.dangerTextHover,
          }}
          onClick={() => void signOut()}
        >
          {collapsed ? <LogOut size={18} /> : 'Sair'}
        </Button>
      </Tooltip>
    </Flex>
  );
}

export default function PlatformLayout() {
  const drawer = useDisclosure();
  const { setColorMode } = useColorMode();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = usePlatformAuth();
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem('platform_sidebar_collapsed') === 'true'
  );
  const [search, setSearch] = useState('');
  const current =
    flatNavigation.find(
      ([, path]) =>
        location.pathname === path ||
        (path !== '/platform/dashboard' && location.pathname.startsWith(path))
    )?.[0] || 'Platform';
  const sidebarWidth = collapsed ? '76px' : '248px';
  useEffect(() => setColorMode('light'), [setColorMode]);
  const toggle = () =>
    setCollapsed(value => {
      localStorage.setItem('platform_sidebar_collapsed', String(!value));
      return !value;
    });
  const searchMatch = useMemo(
    () =>
      flatNavigation.find(([label]) =>
        label.toLowerCase().includes(search.trim().toLowerCase())
      ),
    [search]
  );
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (searchMatch) {
      navigate(searchMatch[1]);
      setSearch('');
    }
  };

  return (
    <Flex
      minH="100vh"
      w="full"
      maxW="100vw"
      overflowX="hidden"
      bg={platformTokens.colors.canvas}
      color={platformTokens.colors.text}
    >
      <Box
        as="aside"
        display={{ base: 'none', lg: 'block' }}
        position="fixed"
        insetY={0}
        left={0}
        w={sidebarWidth}
        transition={`width ${platformTokens.transition}`}
        zIndex={30}
      >
        <Sidebar collapsed={collapsed} toggle={toggle} />
      </Box>
      <Drawer isOpen={drawer.isOpen} placement="left" onClose={drawer.onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="280px">
          <DrawerBody p={0}>
            <Sidebar close={drawer.onClose} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
      <Box
        flex="1"
        w={{ base: '100%', lg: 'auto' }}
        maxW={{ base: '100vw', lg: 'none' }}
        ml={{ base: 0, lg: sidebarWidth }}
        minW={0}
        overflowX="clip"
        transition={`margin-left ${platformTokens.transition}`}
      >
        <Flex
          as="header"
          h="64px"
          px={{ base: 4, md: 6 }}
          align="center"
          justify="space-between"
          gap={4}
          bg="rgba(255,255,255,.94)"
          borderBottom="1px solid"
          borderColor={platformTokens.colors.border}
          position="sticky"
          top={0}
          zIndex={20}
          backdropFilter="blur(12px)"
        >
          <Flex align="center" gap={3} minW={0}>
            <IconButton
              display={{ lg: 'none' }}
              aria-label="Abrir menu"
              icon={<MenuIcon size={20} />}
              variant="ghost"
              onClick={drawer.onOpen}
            />
            <Box minW={0}>
              <HStack
                spacing={1.5}
                fontSize="xs"
                color={platformTokens.colors.muted}
              >
                <Text display={{ base: 'none', sm: 'block' }}>Platform</Text>
                <Text display={{ base: 'none', sm: 'block' }}>/</Text>
                <Text
                  color={platformTokens.colors.textSecondary}
                  fontWeight="650"
                  noOfLines={1}
                >
                  {current}
                </Text>
              </HStack>
              <Text
                display={{ base: 'block', md: 'none' }}
                fontWeight="750"
                noOfLines={1}
              >
                {current}
              </Text>
            </Box>
          </Flex>
          <Box
            as="form"
            onSubmit={submitSearch}
            flex="1"
            maxW="420px"
            display={{ base: 'none', md: 'block' }}
          >
            <InputGroup size="sm">
              <InputLeftElement pointerEvents="none">
                <Search size={15} color={platformTokens.colors.muted} />
              </InputLeftElement>
              <Input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar na plataforma"
                bg={platformTokens.colors.surfaceSubtle}
                borderColor="transparent"
                _hover={{ borderColor: platformTokens.colors.border }}
              />
            </InputGroup>
          </Box>
          <Flex align="center" gap={1.5}>
            <Badge
              display={{ base: 'none', xl: 'inline-flex' }}
              alignItems="center"
              gap={1.5}
              color={platformTokens.colors.success}
              bg={platformTokens.colors.successSubtle}
              borderRadius="full"
              px={2.5}
              py={1}
              textTransform="none"
            >
              <Box boxSize="6px" borderRadius="full" bg="currentColor" />
              Produção
            </Badge>
            <Menu>
              <Tooltip label="Acoes rapidas">
                <MenuButton
                  as={IconButton}
                  aria-label="Acoes rapidas"
                  icon={<Plus size={18} />}
                  variant="ghost"
                />
              </Tooltip>
              <MenuList>
                <MenuItem
                  icon={<Building2 size={16} />}
                  onClick={() => navigate('/platform/empresas/nova')}
                >
                  Nova empresa
                </MenuItem>
                <MenuItem
                  icon={<WalletCards size={16} />}
                  onClick={() => navigate('/platform/planos')}
                >
                  Novo plano
                </MenuItem>
                <MenuItem
                  icon={<Users size={16} />}
                  onClick={() => navigate('/platform/usuarios')}
                >
                  Novo administrador
                </MenuItem>
              </MenuList>
            </Menu>
            <Menu>
              <Tooltip label="Notificacoes">
                <MenuButton
                  as={IconButton}
                  aria-label="Notificacoes"
                  icon={<Bell size={18} />}
                  variant="ghost"
                  position="relative"
                  _after={{
                    content: '""',
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    boxSize: '6px',
                    bg: platformTokens.colors.danger,
                    borderRadius: 'full',
                    border: '1px solid white',
                  }}
                />
              </Tooltip>
              <MenuList>
                <Text px={3} py={2} fontSize="sm" fontWeight="700">
                  Notificacoes
                </Text>
                <MenuDivider />
                <Box px={3} py={4} textAlign="center">
                  <Text fontSize="sm" color={platformTokens.colors.muted}>
                    Nenhuma notificacao nova
                  </Text>
                </Box>
              </MenuList>
            </Menu>
            <Menu>
              <MenuButton
                as={Button}
                display={{ base: 'none', sm: 'inline-flex' }}
                variant="ghost"
                px={2}
                h="44px"
                rightIcon={<ChevronDown size={14} />}
              >
                <Flex align="center" gap={2.5}>
                  <Avatar
                    size="sm"
                    name={user?.nome}
                    bg={platformTokens.colors.indigo}
                  />
                  <Box display={{ base: 'none', xl: 'block' }} textAlign="left">
                    <Text
                      fontSize="sm"
                      fontWeight="700"
                      lineHeight="1.2"
                      maxW="140px"
                      noOfLines={1}
                    >
                      {user?.nome}
                    </Text>
                    <Text
                      fontSize="10px"
                      color={platformTokens.colors.muted}
                      textTransform="capitalize"
                    >
                      {user?.nivel_acesso?.replace('_', ' ')}
                    </Text>
                  </Box>
                </Flex>
              </MenuButton>
              <MenuList>
                <Flex px={3} py={2} gap={2.5} align="center">
                  <Avatar
                    size="sm"
                    name={user?.nome}
                    bg={platformTokens.colors.indigo}
                  />
                  <Box minW={0}>
                    <Text fontSize="sm" fontWeight="700" noOfLines={1}>
                      {user?.nome}
                    </Text>
                    <Text
                      fontSize="xs"
                      color={platformTokens.colors.muted}
                      noOfLines={1}
                    >
                      {user?.email}
                    </Text>
                  </Box>
                </Flex>
                <MenuDivider />
                <MenuItem icon={<ShieldCheck size={16} />}>
                  Minha conta
                </MenuItem>
                <MenuItem icon={<CircleHelp size={16} />}>
                  Central de ajuda
                </MenuItem>
                <MenuDivider />
                <MenuItem
                  icon={<LogOut size={16} />}
                  color={platformTokens.colors.danger}
                  onClick={() => void signOut()}
                >
                  Sair
                </MenuItem>
              </MenuList>
            </Menu>
          </Flex>
        </Flex>
        <Box
          as="main"
          w="full"
          minW={0}
          px={{ base: 4, md: 6, xl: 8 }}
          py={{ base: 5, md: 7 }}
          maxW="1600px"
          mx="auto"
        >
          <Outlet />
        </Box>
      </Box>
    </Flex>
  );
}
