import {
  Box,
  Flex,
  Heading,
  Icon,
  Image,
  Text,
  VStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { FiCpu, FiDatabase, FiLock, FiZap } from 'react-icons/fi';
import { brand } from '../shared/brand/brand';

const MotionFlex = motion(Flex);
const MotionBox = motion(Box);

const pillars = [
  { icon: FiDatabase, title: 'Gestao integrada' },
  { icon: FiLock, title: 'Seguranca empresarial' },
  { icon: FiZap, title: 'Alto desempenho' },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Flex
      minH="100vh"
      bg={brand.colors.bgMain}
      color={brand.colors.textPrimary}
      position="relative"
      overflow="hidden"
    >
      <MotionFlex
        flex="1"
        display={{ base: 'none', lg: 'flex' }}
        direction="column"
        justify="space-between"
        p={{ lg: 10, xl: 14 }}
        bg={`linear-gradient(135deg, ${brand.colors.sidebar} 0%, ${brand.colors.bgSecondary} 52%, #0C1022 100%)`}
        borderRight="1px solid"
        borderColor={brand.colors.border}
        position="relative"
        overflow="hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <Box
          position="absolute"
          inset="auto -18% -20% auto"
          w="520px"
          h="520px"
          bg={`radial-gradient(circle, rgba(47,128,255,0.22) 0%, rgba(79,70,229,0.08) 42%, transparent 70%)`}
          pointerEvents="none"
        />
        <Box
          position="absolute"
          inset="10% auto auto 18%"
          w="360px"
          h="360px"
          bg="radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 68%)"
          pointerEvents="none"
        />

        <Flex align="center" gap={4} position="relative" zIndex={1}>
          <Image
            src={brand.assets.logo}
            alt="NovaWave Business"
            boxSize="56px"
            borderRadius="lg"
            objectFit="cover"
            boxShadow={brand.shadows.glow}
          />
          <Box>
            <Text fontWeight="800" fontSize="lg" lineHeight="1">
              NovaWave Business
            </Text>
            <Text color={brand.colors.textSecondary} fontSize="sm" mt={1}>
              Sistema de Gestao Empresarial
            </Text>
          </Box>
        </Flex>

        <VStack
          align="stretch"
          spacing={8}
          maxW="620px"
          position="relative"
          zIndex={1}
        >
          <Box>
            <Text
              color={brand.colors.primary}
              fontSize="xs"
              fontWeight="800"
              textTransform="uppercase"
            >
              ERP SaaS Premium
            </Text>
            <Heading
              mt={4}
              fontSize={{ lg: '42px', xl: '50px' }}
              lineHeight="1.04"
            >
              Gerencie sua empresa com inteligencia, velocidade e seguranca.
            </Heading>
            <Text
              mt={5}
              color={brand.colors.textSecondary}
              fontSize="md"
              maxW="540px"
            >
              Uma plataforma moderna para centralizar operacao, financeiro,
              estoque, clientes e vendas com clareza e performance.
            </Text>
          </Box>

          <VStack align="stretch" spacing={3}>
            {pillars.map((item, index) => (
              <MotionFlex
                key={item.title}
                align="center"
                gap={3}
                p={3}
                border="1px solid"
                borderColor={brand.colors.border}
                borderRadius="md"
                bg="rgba(255,255,255,0.035)"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.1 + index * 0.08 }}
              >
                <Flex
                  w={10}
                  h={10}
                  align="center"
                  justify="center"
                  borderRadius="md"
                  bg={brand.colors.hover}
                >
                  <Icon as={item.icon} color={brand.colors.primary} />
                </Flex>
                <Text color={brand.colors.textSecondary} fontWeight="700">
                  {item.title}
                </Text>
              </MotionFlex>
            ))}
          </VStack>
        </VStack>

        <MotionBox
          position="relative"
          zIndex={1}
          border="1px solid"
          borderColor={brand.colors.border}
          borderRadius="lg"
          p={5}
          bg="rgba(255,255,255,0.035)"
          maxW="560px"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <Flex align="center" gap={3}>
            <Flex
              w={10}
              h={10}
              align="center"
              justify="center"
              borderRadius="md"
              bg="rgba(47,128,255,0.12)"
            >
              <Icon as={FiCpu} color={brand.colors.primary} />
            </Flex>
            <Box>
              <Text fontWeight="800">Arquitetura modular</Text>
              <Text color={brand.colors.textMuted} fontSize="sm">
                Preparado para crescer com novos modulos e inteligencia
                empresarial.
              </Text>
            </Box>
          </Flex>
        </MotionBox>
      </MotionFlex>

      <Flex
        flex="1"
        align="center"
        justify="center"
        px={{ base: 5, md: 8 }}
        py={{ base: 8, md: 10 }}
        position="relative"
      >
        {children}
      </Flex>
    </Flex>
  );
}
