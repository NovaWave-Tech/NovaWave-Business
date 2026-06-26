import { Divider, Flex, Icon, Text, Tooltip, VStack } from '@chakra-ui/react';
import {
  FiBarChart2,
  FiBox,
  FiBriefcase,
  FiCreditCard,
  FiDollarSign,
  FiGitBranch,
  FiHome,
  FiLayers,
  FiLogOut,
  FiSettings,
  FiShield,
  FiShoppingBag,
  FiShoppingCart,
  FiTruck,
  FiUsers,
} from 'react-icons/fi';
import { useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from '../shared/brand/BrandLogo';
import { brand } from '../shared/brand/brand';
import { useAuth } from '../shared/auth/AuthContext';

type NavItem = {
  label: string;
  icon: React.ElementType;
  path: string;
};

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: FiHome, path: '/dashboard' },
  { label: 'Empresas', icon: FiBriefcase, path: '/companies' },
  { label: 'Filiais', icon: FiGitBranch, path: '/branches' },
  { label: 'Usuarios', icon: FiUsers, path: '/users' },
  { label: 'Permissoes', icon: FiShield, path: '/permissions' },
  { label: 'Clientes', icon: FiUsers, path: '/customers' },
  { label: 'Fornecedores', icon: FiTruck, path: '/suppliers' },
  { label: 'Produtos', icon: FiBox, path: '/products' },
  { label: 'Estoque', icon: FiLayers, path: '/inventory' },
  { label: 'Vendas', icon: FiShoppingCart, path: '/sales' },
  { label: 'Compras', icon: FiShoppingBag, path: '/purchases' },
  { label: 'Financeiro', icon: FiDollarSign, path: '/finance' },
  { label: 'Relatorios', icon: FiBarChart2, path: '/reports' },
];

const secondaryNav: NavItem[] = [
  { label: 'Caixa', icon: FiCreditCard, path: '/cashier' },
  { label: 'Configuracoes', icon: FiSettings, path: '/settings' },
];

export default function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const renderItem = (item: NavItem) => {
    const active = location.pathname === item.path;

    return (
      <Tooltip key={item.path} label={item.label} placement="right" hasArrow>
        <Flex
          as="button"
          type="button"
          align="center"
          gap={3}
          w="full"
          px={3}
          h="40px"
          borderRadius="md"
          color={active ? brand.colors.textPrimary : brand.colors.textSecondary}
          bg={active ? brand.colors.hover : 'transparent'}
          border="1px solid"
          borderColor={active ? brand.colors.borderStrong : 'transparent'}
          fontWeight={active ? '750' : '600'}
          onClick={() => navigate(item.path)}
          _hover={{
            bg: brand.colors.hover,
            color: brand.colors.textPrimary,
            borderColor: brand.colors.border,
          }}
        >
          <Icon
            as={item.icon}
            boxSize={5}
            color={active ? brand.colors.primary : undefined}
          />
          <Text display={{ base: 'none', xl: 'block' }} fontSize="sm">
            {item.label}
          </Text>
        </Flex>
      </Tooltip>
    );
  };

  return (
    <Flex
      as="aside"
      direction="column"
      position="fixed"
      insetY={0}
      left={0}
      w={{ base: '72px', xl: '260px' }}
      bg={brand.colors.sidebar}
      borderRight="1px solid"
      borderColor={brand.colors.border}
      px={{ base: 2, xl: 4 }}
      py={4}
      zIndex={20}
    >
      <Flex align="center" minH="48px" px={2} mb={4}>
        <BrandLogo compact={false} display={{ base: 'none', xl: 'flex' }} />
        <BrandLogo compact display={{ base: 'flex', xl: 'none' }} />
      </Flex>

      <VStack align="stretch" spacing={1} overflowY="auto" flex="1">
        {mainNav.map(renderItem)}
        <Divider borderColor={brand.colors.separator} my={2} />
        {secondaryNav.map(renderItem)}
      </VStack>

      <Divider borderColor={brand.colors.separator} my={3} />
      <Flex
        as="button"
        type="button"
        align="center"
        gap={3}
        px={3}
        h="40px"
        borderRadius="md"
        color={brand.colors.textSecondary}
        onClick={signOut}
        _hover={{ bg: 'rgba(249,112,102,0.12)', color: brand.colors.error }}
      >
        <Icon as={FiLogOut} boxSize={5} />
        <Text
          display={{ base: 'none', xl: 'block' }}
          fontSize="sm"
          fontWeight="700"
        >
          Sair
        </Text>
      </Flex>
    </Flex>
  );
}
