import { Box, CloseButton, Flex, Text, useToast } from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { useCallback } from 'react';
import { platformTokens } from '../theme/platformTokens';

type ToastStatus = 'success' | 'error' | 'warning' | 'info';
type PlatformToastOptions = {
  title: string;
  description?: string;
  status?: ToastStatus;
  position?: 'top-right' | 'top' | 'bottom-right';
};
const progress = keyframes`from { transform: scaleX(1); } to { transform: scaleX(0); }`;

export function usePlatformToast() {
  const toast = useToast();

  return useCallback(
    (options: PlatformToastOptions) => {
      const status = options.status || 'info';
      const styles = {
        success: [
          platformTokens.colors.success,
          platformTokens.colors.successSubtle,
          CheckCircle2,
        ],
        error: [
          platformTokens.colors.danger,
          platformTokens.colors.dangerSubtle,
          AlertCircle,
        ],
        warning: [
          platformTokens.colors.warning,
          platformTokens.colors.warningSubtle,
          AlertCircle,
        ],
        info: [
          platformTokens.colors.primary,
          platformTokens.colors.primarySubtle,
          Info,
        ],
      } as const;
      const [color, subtle, ToastIcon] = styles[status];
      const duration = 4500;

      toast({
        duration,
        position: options.position || 'top-right',
        render: ({ onClose }) => (
          <Box
            role="alert"
            w={{ base: 'calc(100vw - 32px)', sm: '360px' }}
            maxW="360px"
            bg="white"
            border="1px solid"
            borderColor={platformTokens.colors.border}
            borderRadius={platformTokens.radii.surface}
            boxShadow={platformTokens.shadows.floating}
            overflow="hidden"
          >
            <Flex p={4} gap={3} align="start">
              <Flex
                w="32px"
                h="32px"
                borderRadius={platformTokens.radii.control}
                align="center"
                justify="center"
                color={color}
                bg={subtle}
                flexShrink={0}
              >
                <ToastIcon size={17} />
              </Flex>
              <Box flex="1" minW={0}>
                <Text
                  color={platformTokens.colors.text}
                  fontSize="sm"
                  fontWeight="700"
                >
                  {options.title}
                </Text>
                {options.description && (
                  <Text
                    color={platformTokens.colors.textSecondary}
                    fontSize="xs"
                    mt={1}
                  >
                    {options.description}
                  </Text>
                )}
              </Box>
              <CloseButton
                size="sm"
                color={platformTokens.colors.muted}
                onClick={onClose}
              />
            </Flex>
            <Box h="2px" bg={subtle}>
              <Box
                h="full"
                bg={color}
                transformOrigin="left"
                animation={`${progress} ${duration}ms linear forwards`}
              />
            </Box>
          </Box>
        ),
      });
    },
    [toast]
  );
}
