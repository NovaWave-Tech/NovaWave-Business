import {
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormErrorMessage,
  FormLabel,
  Heading,
  Icon,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Link,
  Text,
  VStack,
  useToast,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../../../layouts/AuthLayout';
import { brand } from '../../../shared/brand/brand';
import { getToken, isTokenValid } from '../../../shared/services/http';
import { login } from '../services/authService';

const MotionBox = motion(Box);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [authError, setAuthError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();

  const emailError = useMemo(() => {
    if (!submitAttempted) {
      return '';
    }

    if (!email) {
      return 'Informe seu e-mail.';
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return 'Informe um e-mail valido.';
    }

    return '';
  }, [email, submitAttempted]);

  const passwordError =
    submitAttempted && !password ? 'Informe sua senha.' : '';
  const isSubmitDisabled = isLoading || !email || !password;

  useEffect(() => {
    if (getToken() && isTokenValid()) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitAttempted(true);
    setAuthError('');

    if (!email || !password || emailError) {
      return;
    }

    setIsLoading(true);

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Credenciais invalidas.';
      setAuthError(message);
      toast({
        title: 'Erro ao fazer login',
        description: message,
        status: 'error',
        position: 'top-right',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout>
      <MotionBox
        w="full"
        maxW="430px"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
      >
        <Flex display={{ base: 'flex', lg: 'none' }} justify="center" mb={6}>
          <Image
            src={brand.assets.logo}
            alt="NovaWave Business"
            boxSize="72px"
            borderRadius="xl"
            objectFit="cover"
            boxShadow={brand.shadows.glow}
          />
        </Flex>

        <Box
          bg={brand.colors.surface}
          border="1px solid"
          borderColor={brand.colors.border}
          borderRadius="lg"
          p={{ base: 6, md: 8 }}
          boxShadow={brand.shadows.level2}
        >
          <VStack align="stretch" spacing={6}>
            <Box>
              <Heading size="lg" color={brand.colors.textPrimary}>
                Entrar
              </Heading>
              <Text mt={2} color={brand.colors.textSecondary} fontSize="sm">
                Faca login para acessar sua empresa.
              </Text>
            </Box>

            {authError && (
              <Box
                role="alert"
                border="1px solid"
                borderColor="rgba(249,112,102,0.35)"
                bg="rgba(249,112,102,0.08)"
                color={brand.colors.error}
                borderRadius="md"
                px={4}
                py={3}
                fontSize="sm"
                fontWeight="600"
              >
                {authError}
              </Box>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <VStack spacing={4}>
                <FormControl isInvalid={Boolean(emailError)} isRequired>
                  <FormLabel color={brand.colors.textSecondary} fontSize="sm">
                    E-mail
                  </FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiMail} color={brand.colors.textMuted} />
                    </InputLeftElement>
                    <Input
                      id="email"
                      name="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      type="email"
                      autoComplete={rememberMe ? 'email' : 'off'}
                      bg={brand.colors.bgSecondary}
                      borderColor={brand.colors.border}
                      color={brand.colors.textPrimary}
                      placeholder="admin@empresa.com"
                      _placeholder={{ color: brand.colors.textMuted }}
                      _hover={{ borderColor: brand.colors.borderStrong }}
                      _focus={{
                        borderColor: brand.colors.primary,
                        boxShadow: brand.shadows.focus,
                      }}
                    />
                  </InputGroup>
                  <FormErrorMessage>{emailError}</FormErrorMessage>
                </FormControl>

                <FormControl isInvalid={Boolean(passwordError)} isRequired>
                  <FormLabel color={brand.colors.textSecondary} fontSize="sm">
                    Senha
                  </FormLabel>
                  <InputGroup>
                    <InputLeftElement pointerEvents="none">
                      <Icon as={FiLock} color={brand.colors.textMuted} />
                    </InputLeftElement>
                    <Input
                      id="password"
                      name="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      type={showPassword ? 'text' : 'password'}
                      autoComplete={rememberMe ? 'current-password' : 'off'}
                      bg={brand.colors.bgSecondary}
                      borderColor={brand.colors.border}
                      color={brand.colors.textPrimary}
                      placeholder="Digite sua senha"
                      _placeholder={{ color: brand.colors.textMuted }}
                      _hover={{ borderColor: brand.colors.borderStrong }}
                      _focus={{
                        borderColor: brand.colors.primary,
                        boxShadow: brand.shadows.focus,
                      }}
                    />
                    <InputRightElement>
                      <IconButton
                        aria-label={
                          showPassword ? 'Ocultar senha' : 'Mostrar senha'
                        }
                        icon={showPassword ? <FiEyeOff /> : <FiEye />}
                        size="sm"
                        variant="ghost"
                        color={brand.colors.textSecondary}
                        onClick={() => setShowPassword(current => !current)}
                      />
                    </InputRightElement>
                  </InputGroup>
                  <FormErrorMessage>{passwordError}</FormErrorMessage>
                </FormControl>

                <Flex w="full" align="center" justify="space-between" gap={3}>
                  <Checkbox
                    isChecked={rememberMe}
                    onChange={event => setRememberMe(event.target.checked)}
                    colorScheme="brand"
                    color={brand.colors.textSecondary}
                    size="sm"
                  >
                    Lembrar de mim
                  </Checkbox>
                  <Link
                    color={brand.colors.primary}
                    fontSize="sm"
                    fontWeight="700"
                    href="#"
                    _hover={{ color: brand.colors.primaryHover }}
                  >
                    Esqueceu sua senha?
                  </Link>
                </Flex>

                <Button
                  type="submit"
                  w="full"
                  h="44px"
                  rightIcon={<FiArrowRight />}
                  isLoading={isLoading}
                  loadingText="Entrando"
                  isDisabled={isSubmitDisabled}
                  bg={`linear-gradient(135deg, ${brand.logo.gradientTop}, ${brand.logo.gradientMiddle} 52%, ${brand.logo.gradientBottom})`}
                  color="white"
                  _hover={{
                    transform: 'translateY(-1px)',
                    boxShadow: brand.shadows.glow,
                  }}
                  _active={{ transform: 'translateY(0)' }}
                >
                  Entrar
                </Button>

                <Text
                  color={brand.colors.textMuted}
                  fontSize="xs"
                  textAlign="center"
                >
                  Acesso protegido por autenticacao segura.
                </Text>
              </VStack>
            </form>
          </VStack>
        </Box>

        <VStack spacing={1} mt={6} color={brand.colors.textMuted} fontSize="xs">
          <Text>© 2026 NovaWave Tech</Text>
          <Text>NovaWave Business ERP · Versao 1.0</Text>
        </VStack>
      </MotionBox>
    </AuthLayout>
  );
}
