import {
  Box,
  Flex,
  Grid,
  GridItem,
  Heading,
  Icon,
  SimpleGrid,
  Text,
} from '@chakra-ui/react';
import {
  FiAlertTriangle,
  FiDollarSign,
  FiShoppingCart,
  FiTrendingUp,
} from 'react-icons/fi';
import { brand } from '../../../shared/brand/brand';

const indicators = [
  {
    label: 'Faturamento',
    value: 'R$ 0,00',
    icon: FiTrendingUp,
    hint: 'Mes atual',
    color: brand.colors.primary,
  },
  {
    label: 'Contas a receber',
    value: 'R$ 0,00',
    icon: FiDollarSign,
    hint: 'Em aberto',
    color: brand.colors.secondary,
  },
  {
    label: 'Vendas',
    value: '0',
    icon: FiShoppingCart,
    hint: 'Hoje',
    color: brand.colors.primary,
  },
  {
    label: 'Estoque critico',
    value: '0',
    icon: FiAlertTriangle,
    hint: 'Produtos',
    color: brand.colors.warning,
  },
];

export default function DashboardPage() {
  return (
    <Box>
      <Flex
        justify="space-between"
        align={{ base: 'start', md: 'center' }}
        gap={4}
        mb={5}
        direction={{ base: 'column', md: 'row' }}
      >
        <Box>
          <Text
            color={brand.colors.secondary}
            fontSize="xs"
            fontWeight="800"
            textTransform="uppercase"
          >
            Command center
          </Text>
          <Heading mt={1} size="lg" color={brand.colors.textPrimary}>
            Visao geral
          </Heading>
          <Text color={brand.colors.textSecondary} mt={1}>
            Indicadores essenciais por empresa, filial e periodo operacional.
          </Text>
        </Box>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacing={4} mb={5}>
        {indicators.map(item => (
          <Box
            key={item.label}
            bg={brand.colors.surface}
            border="1px solid"
            borderColor={brand.colors.border}
            borderRadius="md"
            p={5}
            boxShadow={brand.shadows.level1}
            _hover={{ borderColor: brand.colors.borderStrong }}
          >
            <Flex justify="space-between" align="start">
              <Box>
                <Text
                  color={brand.colors.textSecondary}
                  fontSize="sm"
                  fontWeight="700"
                >
                  {item.label}
                </Text>
                <Text
                  color={brand.colors.textPrimary}
                  fontSize="2xl"
                  fontWeight="800"
                  mt={2}
                >
                  {item.value}
                </Text>
                <Text color={brand.colors.textMuted} fontSize="xs" mt={1}>
                  {item.hint}
                </Text>
              </Box>
              <Flex
                align="center"
                justify="center"
                w={10}
                h={10}
                borderRadius="md"
                bg="rgba(255,255,255,0.04)"
                border="1px solid"
                borderColor={brand.colors.border}
              >
                <Icon as={item.icon} color={item.color} />
              </Flex>
            </Flex>
          </Box>
        ))}
      </SimpleGrid>

      <Grid templateColumns={{ base: '1fr', xl: '1.4fr 1fr' }} gap={4}>
        <GridItem
          bg={brand.colors.surface}
          border="1px solid"
          borderColor={brand.colors.border}
          borderRadius="md"
          p={5}
          minH="280px"
          boxShadow={brand.shadows.level1}
        >
          <Heading size="sm" color={brand.colors.textPrimary} mb={2}>
            Fluxo financeiro
          </Heading>
          <Text color={brand.colors.textSecondary} fontSize="sm">
            Area reservada para graficos de faturamento, lucro, caixa, contas a
            pagar e contas a receber.
          </Text>
        </GridItem>
        <GridItem
          bg={brand.colors.surface}
          border="1px solid"
          borderColor={brand.colors.border}
          borderRadius="md"
          p={5}
          minH="280px"
          boxShadow={brand.shadows.level1}
        >
          <Heading size="sm" color={brand.colors.textPrimary} mb={2}>
            Atividades recentes
          </Heading>
          <Text color={brand.colors.textSecondary} fontSize="sm">
            Vendas, compras, clientes e alertas criticos serao listados aqui
            conforme os modulos forem criados.
          </Text>
        </GridItem>
      </Grid>
    </Box>
  );
}
