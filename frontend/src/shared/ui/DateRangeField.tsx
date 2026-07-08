import {
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Icon,
  Input,
  Popover,
  PopoverBody,
  PopoverContent,
  PopoverTrigger,
  Portal,
  Text,
  useDisclosure,
  type FlexProps,
} from '@chakra-ui/react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import {
  formatDateRange,
  isoDaysAgo,
  isoToday,
  toISODate,
} from '../utils/formatters';

export type DateRange = { start: string; end: string };

const presets: { label: string; range: () => DateRange }[] = [
  { label: 'Hoje', range: () => ({ start: isoToday(), end: isoToday() }) },
  {
    label: 'Ultimos 7 dias',
    range: () => ({ start: isoDaysAgo(7), end: isoToday() }),
  },
  {
    label: 'Ultimos 30 dias',
    range: () => ({ start: isoDaysAgo(30), end: isoToday() }),
  },
  {
    label: 'Ultimos 90 dias',
    range: () => ({ start: isoDaysAgo(90), end: isoToday() }),
  },
  {
    label: 'Este mes',
    range: () => {
      const now = new Date();
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: isoToday(),
      };
    },
  },
  {
    label: 'Mes passado',
    range: () => {
      const now = new Date();
      return {
        start: toISODate(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
        end: toISODate(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    },
  },
];

/**
 * Selecao de intervalo de datas (De -> Ate) em popover, com atalhos de
 * periodo e campos manuais. Os atalhos apenas preenchem start/end; a API
 * continua recebendo o intervalo. Datas em formato ISO (YYYY-MM-DD).
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
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [draft, setDraft] = useState<DateRange>(value);
  const draftInvalid = !draft.start || !draft.end || draft.start > draft.end;
  const activePreset = presets.find(preset => {
    const range = preset.range();
    return range.start === value.start && range.end === value.end;
  })?.label;

  const apply = (range: DateRange) => {
    onChange(range);
    onClose();
  };

  return (
    <Flex {...props}>
      <Popover
        isOpen={isOpen}
        onOpen={() => {
          setDraft(value);
          onOpen();
        }}
        onClose={onClose}
        placement="bottom-start"
        closeOnBlur={false}
        isLazy
      >
        <PopoverTrigger>
          <Button
            variant="outline"
            h={size === 'sm' ? '32px' : '40px'}
            px={3}
            w={{ base: 'full', md: 'auto' }}
            fontWeight="500"
            aria-label="Selecionar periodo"
            leftIcon={
              <Icon as={CalendarDays} boxSize="15px" color="brand.500" />
            }
            rightIcon={
              <Icon as={ChevronDown} boxSize="14px" color="erp.textMuted" />
            }
          >
            <Text
              as="span"
              fontSize={size === 'sm' ? '12px' : '13px'}
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {activePreset ?? formatDateRange(value.start, value.end)}
            </Text>
          </Button>
        </PopoverTrigger>
        {/* Portal: evita corte pelo overflow hidden das barras de filtro. */}
        <Portal>
          <PopoverContent
            w="auto"
            maxW="none"
            boxShadow="platformFloating"
            zIndex={1500}
          >
            <PopoverBody p={0}>
              <Flex direction={{ base: 'column', sm: 'row' }}>
                <Flex
                  direction="column"
                  gap={0.5}
                  p={2}
                  minW="150px"
                  borderRight={{ base: 'none', sm: '1px solid' }}
                  borderBottom={{ base: '1px solid', sm: 'none' }}
                  borderColor={{ base: 'erp.border', sm: 'erp.border' }}
                >
                  {presets.map(preset => (
                    <Button
                      key={preset.label}
                      variant="ghost"
                      size="sm"
                      justifyContent="flex-start"
                      fontWeight={activePreset === preset.label ? '600' : '500'}
                      bg={
                        activePreset === preset.label
                          ? 'erp.brandSoft'
                          : undefined
                      }
                      color={
                        activePreset === preset.label
                          ? 'erp.brandText'
                          : undefined
                      }
                      onClick={() => apply(preset.range())}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </Flex>
                <Box p={4} minW="220px">
                  <Text textStyle="overline" color="erp.textMuted" mb={3}>
                    Periodo personalizado
                  </Text>
                  <FormControl>
                    <FormLabel fontSize="12px" mb={1}>
                      De
                    </FormLabel>
                    <Input
                      type="date"
                      size="sm"
                      borderRadius="md"
                      aria-label="Data inicial"
                      value={draft.start}
                      max={draft.end || undefined}
                      onChange={event =>
                        setDraft({ ...draft, start: event.target.value })
                      }
                    />
                  </FormControl>
                  <FormControl mt={3}>
                    <FormLabel fontSize="12px" mb={1}>
                      Ate
                    </FormLabel>
                    <Input
                      type="date"
                      size="sm"
                      borderRadius="md"
                      aria-label="Data final"
                      value={draft.end}
                      min={draft.start || undefined}
                      onChange={event =>
                        setDraft({ ...draft, end: event.target.value })
                      }
                    />
                  </FormControl>
                  <Button
                    mt={4}
                    size="sm"
                    w="full"
                    isDisabled={draftInvalid}
                    onClick={() => apply(draft)}
                  >
                    Aplicar periodo
                  </Button>
                </Box>
              </Flex>
            </PopoverBody>
          </PopoverContent>
        </Portal>
      </Popover>
    </Flex>
  );
}
