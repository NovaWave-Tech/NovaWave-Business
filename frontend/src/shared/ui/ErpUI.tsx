import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Heading,
  Icon,
  Skeleton,
  SkeletonText,
  Text,
  type BoxProps,
} from '@chakra-ui/react';
import {
  AlertCircle,
  ChevronRight,
  Inbox,
  Plus,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  actions,
  icon,
}: {
  title: string;
  description?: string;
  breadcrumbs?: { label: string; to?: string }[];
  actions?: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <Flex
      justify="space-between"
      align={{ base: 'start', md: 'end' }}
      gap={4}
      mb={6}
      direction={{ base: 'column', md: 'row' }}
    >
      <Box minW={0}>
        {breadcrumbs.length > 0 && (
          <Breadcrumb
            spacing={1.5}
            separator={<ChevronRight size={12} />}
            mb={2}
            fontSize="xs"
            color="erp.textMuted"
          >
            {breadcrumbs.map(item => (
              <BreadcrumbItem key={item.label}>
                {item.to ? (
                  <BreadcrumbLink as={RouterLink} to={item.to}>
                    {item.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbLink isCurrentPage>{item.label}</BreadcrumbLink>
                )}
              </BreadcrumbItem>
            ))}
          </Breadcrumb>
        )}
        <Flex align="center" gap={3}>
          {icon && (
            <Flex
              w="40px"
              h="40px"
              align="center"
              justify="center"
              borderRadius="10px"
              color="erp.brandText"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
              flexShrink={0}
            >
              <Icon as={icon} boxSize="19px" />
            </Flex>
          )}
          <Box>
            <Heading
              as="h1"
              fontSize="28px"
              lineHeight="36px"
              fontWeight="700"
              letterSpacing="0"
              color="erp.text"
            >
              {title}
            </Heading>
            {description && (
              <Text mt={1} color="erp.textSecondary" fontSize="sm">
                {description}
              </Text>
            )}
          </Box>
        </Flex>
      </Box>
      {actions && (
        <Flex
          gap={2}
          w={{ base: 'full', md: 'auto' }}
          sx={{ '& > button': { minH: '40px' } }}
        >
          {actions}
        </Flex>
      )}
    </Flex>
  );
}

export function Surface({
  children,
  interactive = false,
  ...props
}: BoxProps & { children: ReactNode; interactive?: boolean }) {
  return (
    <Box
      bg="erp.surface"
      border="1px solid"
      borderColor="erp.border"
      borderRadius="12px"
      boxShadow="0 1px 2px rgba(15,23,42,.04)"
      transition="border-color 180ms ease, box-shadow 180ms ease"
      _hover={
        interactive
          ? {
              borderColor: 'erp.borderStrong',
              boxShadow: '0 4px 12px rgba(15,23,42,.07)',
            }
          : undefined
      }
      {...props}
    >
      {children}
    </Box>
  );
}

export function BrandSurface({
  children,
  ...props
}: BoxProps & { children: ReactNode }) {
  return (
    <Box
      position="relative"
      bg="erp.surface"
      border="1px solid"
      borderColor="erp.brandBorder"
      borderRadius="12px"
      boxShadow="0 8px 24px rgba(37,99,255,.08)"
      overflow="hidden"
      _before={{
        content: '""',
        position: 'absolute',
        insetX: 0,
        top: 0,
        h: '3px',
        bg: 'linear-gradient(90deg, #2F80FF 0%, #2563FF 55%, #4F46E5 100%)',
      }}
      {...props}
    >
      {children}
    </Box>
  );
}

export function SectionHeader({
  title,
  description,
  action,
  icon,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  eyebrow?: string;
}) {
  return (
    <Flex
      align="center"
      justify="space-between"
      gap={3}
      px={5}
      py={4}
      borderBottom="1px solid"
      borderColor="erp.border"
    >
      <Flex align="center" gap={3}>
        {icon && (
          <Flex
            w="32px"
            h="32px"
            align="center"
            justify="center"
            borderRadius="8px"
            color="erp.brandText"
            bg="erp.brandSoft"
            border="1px solid"
            borderColor="erp.brandBorder"
            flexShrink={0}
          >
            <Icon as={icon} boxSize="15px" />
          </Flex>
        )}
        <Box>
          {eyebrow && (
            <Text
              color="erp.brandText"
              fontSize="9px"
              fontWeight="700"
              textTransform="uppercase"
            >
              {eyebrow}
            </Text>
          )}
          <Text color="erp.text" fontSize="sm" fontWeight="650">
            {title}
          </Text>
          {description && (
            <Text color="erp.textSecondary" fontSize="xs" mt={0.5}>
              {description}
            </Text>
          )}
        </Box>
      </Flex>
      {action}
    </Flex>
  );
}

export function MetricCard({
  title,
  value,
  icon,
  context,
  trend,
  trendTone = 'neutral',
  onDetails,
  loading,
}: {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  context: string;
  trend?: string;
  trendTone?: 'positive' | 'negative' | 'neutral';
  onDetails?: () => void;
  loading?: boolean;
}) {
  const trendColor =
    trendTone === 'positive'
      ? 'erp.success'
      : trendTone === 'negative'
        ? 'erp.danger'
        : 'erp.textMuted';
  return (
    <Surface p={5} minH="152px">
      <Flex justify="space-between" align="start">
        <Box minW={0}>
          <Text color="erp.textSecondary" fontSize="14px" fontWeight="500">
            {title}
          </Text>
          {loading ? (
            <Skeleton h="34px" w="120px" mt={3} />
          ) : (
            <Text
              color="erp.text"
              fontSize={{ base: '28px', xl: '32px' }}
              lineHeight="38px"
              fontWeight="700"
              mt={2}
            >
              {value}
            </Text>
          )}
          <Flex align="center" gap={2} mt={2}>
            <Text color="erp.textMuted" fontSize="12px">
              {context}
            </Text>
            {trend && (
              <Text color={trendColor} fontSize="12px" fontWeight="600">
                {trend}
              </Text>
            )}
          </Flex>
        </Box>
        <Flex
          w="36px"
          h="36px"
          align="center"
          justify="center"
          color="brand.400"
          bg="rgba(47,128,255,.1)"
          borderRadius="8px"
        >
          <Icon as={icon} boxSize="18px" />
        </Flex>
      </Flex>
      {onDetails && (
        <Button
          mt={3}
          px={0}
          h="auto"
          minH={0}
          variant="link"
          color="brand.400"
          fontSize="12px"
          fontWeight="600"
          onClick={onDetails}
        >
          Ver detalhes
        </Button>
      )}
    </Surface>
  );
}

export function StatusCard({
  title,
  value,
  tone,
  detail,
  icon,
}: {
  title: string;
  value: string | number;
  tone: 'success' | 'warning' | 'danger' | 'info';
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <Flex
      align="center"
      gap={3}
      p={4}
      bg="erp.surface"
      border="1px solid"
      borderColor="erp.border"
      borderRadius="12px"
    >
      <Flex
        w="34px"
        h="34px"
        align="center"
        justify="center"
        color={`erp.${tone}`}
        bg="erp.surfaceSubtle"
        borderRadius="8px"
      >
        <Icon as={icon} boxSize="17px" />
      </Flex>
      <Box>
        <Text color="erp.textSecondary" fontSize="12px">
          {title}
        </Text>
        <Flex align="baseline" gap={2}>
          <Text color="erp.text" fontSize="18px" fontWeight="700">
            {value}
          </Text>
          <Text color="erp.textMuted" fontSize="11px">
            {detail}
          </Text>
        </Flex>
      </Box>
    </Flex>
  );
}

export const SummaryPanel = Surface;
export const InsightCard = StatusCard;

export function EmptyState({
  title = 'Nenhum registro encontrado',
  description = 'Os dados aparecerao aqui quando estiverem disponiveis.',
  action,
  actionLabel = 'Adicionar',
  icon = Inbox,
}: {
  title?: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
  icon?: LucideIcon;
}) {
  return (
    <Flex
      minH="240px"
      px={6}
      align="center"
      justify="center"
      direction="column"
      textAlign="center"
    >
      <Flex
        w="48px"
        h="48px"
        align="center"
        justify="center"
        bg="erp.hover"
        color="brand.400"
        borderRadius="12px"
      >
        <Icon as={icon} boxSize="22px" />
      </Flex>
      <Text color="erp.text" mt={4} fontSize="14px" fontWeight="600">
        {title}
      </Text>
      <Text color="erp.textSecondary" mt={1} maxW="360px" fontSize="13px">
        {description}
      </Text>
      {action && (
        <Button mt={4} size="sm" leftIcon={<Plus size={15} />} onClick={action}>
          {actionLabel}
        </Button>
      )}
    </Flex>
  );
}

export function ErrorState({
  title = 'Nao foi possivel carregar os dados',
  description = 'Verifique sua conexao e tente novamente.',
  retry,
}: {
  title?: string;
  description?: string;
  retry?: () => void;
}) {
  return (
    <Flex
      minH="240px"
      px={6}
      align="center"
      justify="center"
      direction="column"
      textAlign="center"
    >
      <Flex
        w="48px"
        h="48px"
        align="center"
        justify="center"
        bg="erp.hover"
        color="erp.danger"
        borderRadius="12px"
      >
        <AlertCircle size={22} />
      </Flex>
      <Text color="erp.text" mt={4} fontSize="14px" fontWeight="600">
        {title}
      </Text>
      <Text color="erp.textSecondary" mt={1} maxW="360px" fontSize="13px">
        {description}
      </Text>
      {retry && (
        <Button
          mt={4}
          size="sm"
          variant="outline"
          leftIcon={<RefreshCw size={15} />}
          onClick={retry}
        >
          Tentar novamente
        </Button>
      )}
    </Flex>
  );
}

export function PageSkeleton() {
  return (
    <Box>
      <Skeleton h="28px" w="220px" mb={3} />
      <Skeleton h="14px" w="360px" mb={6} />
      <Flex gap={4} wrap="wrap">
        {Array.from({ length: 4 }).map((_, index) => (
          <Surface key={index} p={5} flex="1" minW="220px">
            <SkeletonText noOfLines={3} spacing={4} />
          </Surface>
        ))}
      </Flex>
      <Surface mt={5} p={5}>
        <Skeleton h="300px" />
      </Surface>
    </Box>
  );
}
