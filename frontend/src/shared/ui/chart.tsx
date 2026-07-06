import { Box, Flex, Text, useColorModeValue } from '@chakra-ui/react';
import { chartColors } from './chartTheme';

/**
 * Defs de gradiente para preenchimento de areas.
 * Renderize dentro do grafico e referencie via url(#id).
 */
export function ChartAreaGradient({
  id,
  color,
  opacity = 0.32,
}: {
  id: string;
  color: string;
  opacity?: number;
}) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={color} stopOpacity={opacity} />
        <stop offset="100%" stopColor={color} stopOpacity={0} />
      </linearGradient>
    </defs>
  );
}

type TooltipEntry = {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
};

/**
 * Tooltip premium e theme-aware para recharts.
 * Use como `content={<PremiumTooltip ... />}`.
 */
export function PremiumTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number) => string;
}) {
  const bg = useColorModeValue('#FFFFFF', '#1A1F2B');
  const border = useColorModeValue('#E2E8F0', '#2B3445');
  const labelColor = useColorModeValue('#64748B', '#A1A1AA');
  const textColor = useColorModeValue('#0F172A', '#F8FAFC');

  if (!active || !payload?.length) return null;

  return (
    <Box
      bg={bg}
      border="1px solid"
      borderColor={border}
      borderRadius="10px"
      boxShadow="0 12px 32px rgba(15,23,42,.16)"
      px={3}
      py={2.5}
      minW="150px"
    >
      {label !== undefined && (
        <Text
          fontSize="10px"
          fontWeight="600"
          color={labelColor}
          textTransform="uppercase"
          mb={1.5}
        >
          {labelFormatter ? labelFormatter(label) : label}
        </Text>
      )}
      <Flex direction="column" gap={1}>
        {payload.map((entry, index) => (
          <Flex
            key={`${entry.dataKey ?? entry.name ?? index}`}
            align="center"
            justify="space-between"
            gap={4}
          >
            <Flex align="center" gap={2} minW={0}>
              <Box
                w="8px"
                h="8px"
                borderRadius="full"
                bg={entry.color || chartColors.primary}
                flexShrink={0}
              />
              <Text fontSize="11px" color={labelColor} noOfLines={1}>
                {entry.name}
              </Text>
            </Flex>
            <Text
              fontSize="12px"
              fontWeight="700"
              color={textColor}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {valueFormatter && typeof entry.value === 'number'
                ? valueFormatter(entry.value)
                : entry.value}
            </Text>
          </Flex>
        ))}
      </Flex>
    </Box>
  );
}
