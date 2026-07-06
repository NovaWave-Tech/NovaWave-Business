import { Flex, Input, Text, type FlexProps } from '@chakra-ui/react';

export type DateRange = { start: string; end: string };

/**
 * Selecao de intervalo de datas (De -> Ate) com dois campos nativos.
 * Substitui os antigos selects de periodo. Datas em formato ISO (YYYY-MM-DD).
 */
export function DateRangeField({
  value,
  onChange,
  size = 'md',
  ...props
}: Omit<FlexProps, 'onChange'> & {
  value: DateRange;
  onChange: (range: DateRange) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <Flex align="center" gap={2} {...props}>
      <Input
        type="date"
        size={size}
        aria-label="Data inicial"
        value={value.start}
        max={value.end || undefined}
        onChange={event => onChange({ ...value, start: event.target.value })}
        w={{ base: 'full', md: size === 'sm' ? '150px' : '160px' }}
      />
      <Text fontSize="xs" color="erp.textMuted" flexShrink={0}>
        ate
      </Text>
      <Input
        type="date"
        size={size}
        aria-label="Data final"
        value={value.end}
        min={value.start || undefined}
        onChange={event => onChange({ ...value, end: event.target.value })}
        w={{ base: 'full', md: size === 'sm' ? '150px' : '160px' }}
      />
    </Flex>
  );
}
