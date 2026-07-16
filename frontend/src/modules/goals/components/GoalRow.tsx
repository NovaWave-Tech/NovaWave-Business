import {
  Badge,
  Box,
  Flex,
  IconButton,
  Progress,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CurrencyInput } from '../../../shared/ui/FormattedInput';
import { formatCurrency } from '../../../shared/utils/formatters';

/**
 * Linha de meta (filial ou vendedor): nome, meta editavel, realizado e a
 * barra de progresso. Salva so quando o valor muda; zerar remove a meta.
 */
export function GoalRow({
  nome,
  meta,
  realizado,
  canEdit,
  saving,
  onSave,
}: {
  nome: string;
  meta: number;
  realizado: number;
  canEdit: boolean;
  saving: boolean;
  onSave: (valor_meta: number) => void;
}) {
  const [value, setValue] = useState(meta.toFixed(2));

  // Reflete o valor vindo do servidor (troca de mes, refetch apos salvar).
  useEffect(() => {
    setValue(meta.toFixed(2));
  }, [meta]);

  const percent = meta > 0 ? Math.min(100, (realizado / meta) * 100) : 0;
  const dirty = Number(value) !== meta;
  const reached = meta > 0 && realizado >= meta;

  return (
    <Flex
      align="center"
      gap={3}
      py={3}
      borderBottom="1px solid"
      borderColor="erp.border"
      wrap="wrap"
    >
      <Box flex="1" minW="150px">
        <Text fontSize="13px" fontWeight="600" noOfLines={1}>
          {nome}
        </Text>
        <Flex align="center" gap={2} mt={1}>
          <Progress
            w="120px"
            value={percent}
            size="xs"
            borderRadius="full"
            colorScheme={reached ? 'green' : 'blue'}
          />
          <Text fontSize="11px" color="erp.textMuted">
            {formatCurrency(realizado)}
            {meta > 0 ? ` · ${percent.toFixed(0)}%` : ''}
          </Text>
          {reached && (
            <Badge colorScheme="green" fontSize="9px">
              Batida
            </Badge>
          )}
        </Flex>
      </Box>

      {canEdit ? (
        <Flex align="center" gap={2} flexShrink={0}>
          <Box w="140px">
            <CurrencyInput value={value} onValueChange={setValue} />
          </Box>
          <Tooltip label={dirty ? 'Salvar meta' : 'Sem alteracoes'}>
            <IconButton
              aria-label="Salvar meta"
              icon={<Check size={15} />}
              size="sm"
              colorScheme="blue"
              variant={dirty ? 'solid' : 'ghost'}
              isDisabled={!dirty}
              isLoading={saving}
              onClick={() => onSave(Number(value) || 0)}
            />
          </Tooltip>
        </Flex>
      ) : (
        <Text
          textStyle="numeric"
          fontSize="14px"
          fontWeight="700"
          flexShrink={0}
        >
          {meta > 0 ? formatCurrency(meta) : 'Sem meta'}
        </Text>
      )}
    </Flex>
  );
}
