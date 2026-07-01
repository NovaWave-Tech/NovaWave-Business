import {
  Badge,
  Box,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Button,
  Flex,
  Heading,
  Icon,
  IconButton,
  Skeleton,
  SkeletonText,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  type BoxProps,
} from '@chakra-ui/react';
import {
  ChevronLeft,
  ChevronRight,
  Inbox,
  Plus,
  type LucideIcon,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { platformTokens } from '../theme/platformTokens';

export { ErrorState } from '../../../shared/ui/ErpUI';

// eslint-disable-next-line react-refresh/only-export-components
export const platformColors = {
  bg: platformTokens.colors.canvas,
  surface: platformTokens.colors.surface,
  border: platformTokens.colors.border,
  text: platformTokens.colors.text,
  muted: platformTokens.colors.muted,
  primary: platformTokens.colors.primary,
  indigo: platformTokens.colors.indigo,
};

export function PageHeader({
  title,
  description,
  action,
  actionLabel = 'Novo',
}: {
  title: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
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
        <Breadcrumb
          spacing={1.5}
          separator={<ChevronRight size={12} />}
          mb={2}
          fontSize="xs"
          color="erp.textMuted"
        >
          <BreadcrumbItem>
            <BreadcrumbLink>Platform</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink>{title}</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>
        <Heading
          as="h1"
          fontSize="28px"
          lineHeight="36px"
          fontWeight="700"
          letterSpacing="0"
          color={platformTokens.colors.text}
        >
          {title}
        </Heading>
        {description && (
          <Text
            mt={1}
            color={platformTokens.colors.textSecondary}
            fontSize="sm"
          >
            {description}
          </Text>
        )}
      </Box>
      {action && (
        <Button leftIcon={<Plus size={16} />} onClick={action}>
          {actionLabel}
        </Button>
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
      bg={platformTokens.colors.surface}
      border="1px solid"
      borderColor={platformTokens.colors.border}
      borderRadius={platformTokens.radii.surface}
      boxShadow={platformTokens.shadows.surface}
      transition={platformTokens.transition}
      _hover={
        interactive
          ? {
              borderColor: platformTokens.colors.borderStrong,
              boxShadow: '0 4px 12px rgba(16,24,40,.07)',
            }
          : undefined
      }
      {...props}
    >
      {children}
    </Box>
  );
}

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Surface
      display="flex"
      gap={3}
      mb={4}
      p={3}
      alignItems={{ md: 'center' }}
      flexDirection={{ base: 'column', md: 'row' }}
      boxShadow="none"
    >
      {children}
    </Surface>
  );
}

export function DetailList({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <Box>
      {items.map(item => (
        <Flex
          key={item.label}
          justify="space-between"
          gap={4}
          py={2.5}
          borderBottom="1px solid"
          borderColor={platformTokens.colors.border}
        >
          <Text color={platformTokens.colors.muted} fontSize="sm">
            {item.label}
          </Text>
          <Text
            color={platformTokens.colors.text}
            fontWeight="600"
            textAlign="right"
          >
            {item.value || '-'}
          </Text>
        </Flex>
      ))}
    </Box>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Flex
      px={5}
      py={4}
      align="center"
      justify="space-between"
      gap={3}
      borderBottom="1px solid"
      borderColor={platformTokens.colors.border}
    >
      <Box>
        <Text color={platformTokens.colors.text} fontWeight="700" fontSize="sm">
          {title}
        </Text>
        {description && (
          <Text color={platformTokens.colors.muted} fontSize="xs" mt={0.5}>
            {description}
          </Text>
        )}
      </Box>
      {action}
    </Flex>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  color,
  detail,
  loading,
}: {
  label: string;
  value: ReactNode;
  icon: LucideIcon;
  color: string;
  detail?: string;
  loading?: boolean;
}) {
  return (
    <Surface interactive p={5} minH="128px">
      <Flex justify="space-between" align="start">
        <Box minW={0}>
          <Text
            color={platformTokens.colors.textSecondary}
            fontSize="sm"
            fontWeight="600"
          >
            {label}
          </Text>
          {loading ? (
            <Skeleton h="30px" w="100px" mt={3} />
          ) : (
            <Text
              color={platformTokens.colors.text}
              fontSize="26px"
              lineHeight="34px"
              fontWeight="750"
              mt={2}
            >
              {value}
            </Text>
          )}
          {detail && (
            <Text color={platformTokens.colors.muted} fontSize="xs" mt={1}>
              {detail}
            </Text>
          )}
        </Box>
        <Flex
          w="36px"
          h="36px"
          align="center"
          justify="center"
          bg={`${color}12`}
          color={color}
          borderRadius={platformTokens.radii.control}
          flexShrink={0}
        >
          <Icon as={icon} boxSize="18px" />
        </Flex>
      </Flex>
    </Surface>
  );
}

export function StatusBadge({
  value,
  type = 'company',
}: {
  value: number | string | null | undefined;
  type?: 'company' | 'subscription' | 'user';
}) {
  const maps = {
    company: {
      0: [
        'Inativa',
        platformTokens.colors.muted,
        platformTokens.colors.neutralSubtle,
      ],
      1: [
        'Ativa',
        platformTokens.colors.success,
        platformTokens.colors.successSubtle,
      ],
      2: [
        'Bloqueada',
        platformTokens.colors.danger,
        platformTokens.colors.dangerSubtle,
      ],
    },
    subscription: {
      1: [
        'Ativa',
        platformTokens.colors.success,
        platformTokens.colors.successSubtle,
      ],
      2: [
        'Em teste',
        platformTokens.colors.primary,
        platformTokens.colors.primarySubtle,
      ],
      3: [
        'Vencida',
        platformTokens.colors.warning,
        platformTokens.colors.warningSubtle,
      ],
      4: [
        'Cancelada',
        platformTokens.colors.muted,
        platformTokens.colors.neutralSubtle,
      ],
      5: [
        'Bloqueada',
        platformTokens.colors.danger,
        platformTokens.colors.dangerSubtle,
      ],
    },
    user: {
      0: [
        'Inativo',
        platformTokens.colors.muted,
        platformTokens.colors.neutralSubtle,
      ],
      1: [
        'Ativo',
        platformTokens.colors.success,
        platformTokens.colors.successSubtle,
      ],
    },
  } as const;
  const item = maps[type][Number(value) as keyof (typeof maps)[typeof type]] as
    | readonly [string, string, string]
    | undefined;
  return (
    <Badge
      display="inline-flex"
      alignItems="center"
      gap={1.5}
      color={item?.[1] || platformTokens.colors.muted}
      bg={item?.[2] || platformTokens.colors.neutralSubtle}
      borderRadius="full"
      px={2.5}
      py={1}
      fontSize="10px"
      fontWeight="700"
      textTransform="none"
    >
      <Box boxSize="5px" borderRadius="full" bg="currentColor" />
      {item?.[0] || 'Indefinido'}
    </Badge>
  );
}

export function LoadingTable({
  columns = 6,
  rows = 6,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <Surface overflow="hidden">
      <Table variant="simple">
        <Thead>
          <Tr>
            {Array.from({ length: columns }).map((_, index) => (
              <Th key={index}>
                <Skeleton h="10px" />
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {Array.from({ length: rows }).map((_, row) => (
            <Tr key={row}>
              {Array.from({ length: columns }).map((__, column) => (
                <Td key={column}>
                  <SkeletonText noOfLines={1} skeletonHeight="3" />
                </Td>
              ))}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Surface>
  );
}

export function EmptyState({
  title = 'Nenhum registro encontrado',
  description = 'Ajuste os filtros ou adicione o primeiro registro.',
  action,
  actionLabel = 'Adicionar',
}: {
  title?: string;
  description?: string;
  action?: () => void;
  actionLabel?: string;
}) {
  return (
    <Flex
      minH="260px"
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
        bg={platformTokens.colors.primarySubtle}
        color={platformTokens.colors.primary}
        borderRadius={platformTokens.radii.surface}
      >
        <Inbox size={22} />
      </Flex>
      <Text mt={4} fontWeight="700" color={platformTokens.colors.text}>
        {title}
      </Text>
      <Text
        color={platformTokens.colors.muted}
        fontSize="sm"
        mt={1}
        maxW="340px"
      >
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

export function TablePagination({
  page,
  totalPages,
  totalItems,
  onChange,
}: {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  return (
    <Flex
      px={4}
      py={3}
      align="center"
      justify="space-between"
      borderTop="1px solid"
      borderColor={platformTokens.colors.border}
    >
      <Text fontSize="xs" color={platformTokens.colors.muted}>
        {totalItems} {totalItems === 1 ? 'registro' : 'registros'}
      </Text>
      <Flex align="center" gap={2}>
        <Text fontSize="xs" color={platformTokens.colors.textSecondary}>
          Pagina {page} de {Math.max(totalPages, 1)}
        </Text>
        <IconButton
          aria-label="Pagina anterior"
          icon={<ChevronLeft size={16} />}
          size="sm"
          variant="outline"
          isDisabled={page <= 1}
          onClick={() => onChange(page - 1)}
        />
        <IconButton
          aria-label="Proxima pagina"
          icon={<ChevronRight size={16} />}
          size="sm"
          variant="outline"
          isDisabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
        />
      </Flex>
    </Flex>
  );
}
