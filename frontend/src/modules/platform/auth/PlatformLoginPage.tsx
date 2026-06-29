import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  VStack,
  useColorMode,
} from '@chakra-ui/react';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  apiError,
  platformLogin,
  platformSession,
} from '../services/platformApi';
import { platformTokens } from '../theme/platformTokens';
import { usePlatformToast } from '../hooks/usePlatformToast';

const schema = z.object({
  email: z.string().email('Informe um e-mail valido.'),
  senha: z.string().min(1, 'Informe sua senha.'),
});
type FormData = z.infer<typeof schema>;

export default function PlatformLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const toast = usePlatformToast();
  const { setColorMode } = useColorMode();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    setColorMode('light');
    if (platformSession.token() && platformSession.valid())
      navigate('/platform/dashboard', { replace: true });
  }, [navigate, setColorMode]);

  const submit = async (values: FormData) => {
    try {
      await platformLogin(values.email, values.senha);
      navigate('/platform/dashboard', { replace: true });
    } catch (error) {
      toast({
        title: 'Acesso nao autorizado',
        description: apiError(error),
        status: 'error',
        position: 'top-right',
      });
    }
  };

  return (
    <Flex minH="100vh" bg={platformTokens.colors.loginCanvas}>
      <Flex
        display={{ base: 'none', lg: 'flex' }}
        w="48%"
        bg={platformTokens.colors.sidebar}
        color="white"
        p={12}
        direction="column"
        justify="space-between"
        position="relative"
        overflow="hidden"
      >
        <Flex align="center" gap={3} zIndex={1}>
          <Image
            src="/logobusiness.png"
            boxSize="48px"
            borderRadius="8px"
            objectFit="cover"
            alt="NovaWave"
          />
          <Box>
            <Text fontWeight="800" fontSize="lg">
              NovaWave Platform
            </Text>
            <Text color={platformTokens.colors.placeholder} fontSize="sm">
              Administração do SaaS
            </Text>
          </Box>
        </Flex>
        <Box zIndex={1} maxW="520px">
          <Text
            color={platformTokens.colors.brandLight}
            fontSize="sm"
            fontWeight="700"
            mb={4}
          >
            CONTROLE CENTRAL
          </Text>
          <Heading fontSize="38px" lineHeight="1.2" letterSpacing="0">
            Gerencie toda a operação NovaWave em um só lugar.
          </Heading>
          <Text
            color={platformTokens.colors.sidebarTextStrong}
            mt={5}
            fontSize="md"
          >
            Empresas, assinaturas, segurança e crescimento com visão completa da
            plataforma.
          </Text>
        </Box>
        <Flex
          align="center"
          gap={2}
          color={platformTokens.colors.placeholder}
          zIndex={1}
        >
          <ShieldCheck size={17} />
          <Text fontSize="sm">Ambiente exclusivo NovaWave Tech</Text>
        </Flex>
        <Box
          position="absolute"
          right="-90px"
          bottom="-180px"
          w="520px"
          h="520px"
          border="1px solid rgba(47,128,255,.22)"
          transform="rotate(38deg)"
          borderRadius="8px"
        />
        <Box
          position="absolute"
          right="70px"
          bottom="-250px"
          w="520px"
          h="520px"
          border="1px solid rgba(79,70,229,.18)"
          transform="rotate(38deg)"
          borderRadius="8px"
        />
      </Flex>
      <Flex flex="1" align="center" justify="center" px={6} py={10}>
        <Box
          as={motion.div}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          w="full"
          maxW={{ base: 'calc(100vw - 48px)', lg: '410px' }}
        >
          <Flex
            display={{ base: 'flex', lg: 'none' }}
            align="center"
            gap={3}
            mb={8}
          >
            <Image
              src="/logobusiness.png"
              boxSize="44px"
              borderRadius="8px"
              alt="NovaWave"
            />
            <Text fontWeight="800">NovaWave Platform</Text>
          </Flex>
          <Heading size="lg" color={platformTokens.colors.text}>
            Bem-vindo
          </Heading>
          <Text color={platformTokens.colors.textSecondary} mt={2} mb={8}>
            Acesse o painel administrativo do SaaS.
          </Text>
          <form onSubmit={handleSubmit(submit)}>
            <VStack spacing={5} align="stretch">
              <FormControl isInvalid={Boolean(errors.email)}>
                <FormLabel fontSize="sm">E-mail</FormLabel>
                <Input
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  bg="white"
                  h="44px"
                  placeholder="admin@novawave.com"
                />
                <FormErrorMessage>{errors.email?.message}</FormErrorMessage>
              </FormControl>
              <FormControl isInvalid={Boolean(errors.senha)}>
                <FormLabel fontSize="sm">Senha</FormLabel>
                <InputGroup>
                  <Input
                    {...register('senha')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    bg="white"
                    h="44px"
                    pr={11}
                    placeholder="Sua senha"
                  />
                  <InputRightElement h="44px">
                    <IconButton
                      aria-label={
                        showPassword ? 'Ocultar senha' : 'Mostrar senha'
                      }
                      icon={
                        showPassword ? <EyeOff size={18} /> : <Eye size={18} />
                      }
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPassword(v => !v)}
                    />
                  </InputRightElement>
                </InputGroup>
                <FormErrorMessage>{errors.senha?.message}</FormErrorMessage>
              </FormControl>
              <Button
                type="submit"
                h="44px"
                isLoading={isSubmitting}
                loadingText="Autenticando"
                leftIcon={<LockKeyhole size={17} />}
                bg={`linear-gradient(135deg,${platformTokens.colors.primaryLight},${platformTokens.colors.primary} 52%,${platformTokens.colors.indigo})`}
                _hover={{ opacity: 0.92 }}
                color="white"
              >
                Entrar
              </Button>
            </VStack>
          </form>
          <Text
            textAlign="center"
            color={platformTokens.colors.placeholder}
            fontSize="xs"
            mt={8}
          >
            © 2026 NovaWave Tech · Acesso restrito
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
}
