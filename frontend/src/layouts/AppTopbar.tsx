import { Avatar, Box, Flex, HStack, Icon, Text } from '@chakra-ui/react';
import { FiBell } from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../shared/auth/AuthContext';
import { brand } from '../shared/brand/brand';

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/companies': 'Empresas',
  '/branches': 'Filiais',
  '/users': 'Usuarios',
  '/permissions': 'Permissoes',
  '/customers': 'Clientes',
  '/suppliers': 'Fornecedores',
  '/products': 'Produtos',
  '/inventory': 'Estoque',
  '/sales': 'Vendas',
  '/purchases': 'Compras',
  '/finance': 'Financeiro',
  '/reports': 'Relatorios',
  '/cashier': 'Caixa',
  '/settings': 'Configuracoes',
};

export default function AppTopbar() {
  const location = useLocation();
  const { user } = useAuth();
  const title = routeLabels[location.pathname] ?? 'NovaWave Business';
  const userName = user?.nome ?? user?.email ?? 'Usuario';

  return (
    <Flex
      as="header"
      h="64px"
      align="center"
      justify="space-between"
      px={{ base: 4, lg: 6 }}
      bg="rgba(11,18,32,0.86)"
      borderBottom="1px solid"
      borderColor={brand.colors.border}
      position="sticky"
      top={0}
      zIndex={10}
      backdropFilter="blur(14px)"
    >
      <Box>
        <Text
          color={brand.colors.textMuted}
          fontSize="xs"
          fontWeight="800"
          textTransform="uppercase"
        >
          NovaWave Business ERP
        </Text>
        <Text color={brand.colors.textPrimary} fontSize="lg" fontWeight="800">
          {title}
        </Text>
      </Box>

      <HStack spacing={4}>
        <Flex
          align="center"
          justify="center"
          w={9}
          h={9}
          borderRadius="md"
          bg={brand.colors.surface}
          border="1px solid"
          borderColor={brand.colors.border}
        >
          <Icon as={FiBell} color={brand.colors.textSecondary} />
        </Flex>
        <HStack spacing={3}>
          <Avatar size="sm" name={userName} bg={brand.colors.secondary} />
          <Box display={{ base: 'none', md: 'block' }}>
            <Text
              color={brand.colors.textPrimary}
              fontSize="sm"
              fontWeight="700"
              lineHeight="1.1"
            >
              {userName}
            </Text>
            <Text color={brand.colors.textMuted} fontSize="xs">
              Ambiente ERP
            </Text>
          </Box>
        </HStack>
      </HStack>
    </Flex>
  );
}
