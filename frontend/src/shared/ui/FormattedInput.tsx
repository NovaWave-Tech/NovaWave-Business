import {
  Input,
  InputGroup,
  InputLeftElement,
  type InputProps,
} from '@chakra-ui/react';
import { maskValue } from '../utils/formatters';

type FormattedInputProps = Omit<InputProps, 'value' | 'onChange'> & {
  value: string;
  mask: 'cnpj' | 'cpf' | 'document' | 'phone' | 'cep';
  onValueChange: (value: string) => void;
};

export default function FormattedInput({
  value,
  mask,
  onValueChange,
  ...props
}: FormattedInputProps) {
  return (
    <Input
      {...props}
      value={maskValue(value, mask)}
      inputMode="numeric"
      onChange={event => onValueChange(maskValue(event.target.value, mask))}
    />
  );
}

export function CurrencyInput({
  value,
  onValueChange,
  currency = 'R$',
  size,
  ...props
}: Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  value: string;
  onValueChange: (value: string) => void;
  currency?: string;
}) {
  const formattedValue = value
    ? new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(Number(value) || 0)
    : '';

  const handleChange = (input: string) => {
    const digits = input.replace(/\D/g, '');

    if (!digits) {
      onValueChange('');
      return;
    }

    onValueChange((Number(digits) / 100).toFixed(2));
  };

  return (
    <InputGroup size={size}>
      <InputLeftElement
        pointerEvents="none"
        color="erp.textMuted"
        fontSize={size === 'sm' ? '12px' : '13px'}
        fontWeight="500"
      >
        {currency}
      </InputLeftElement>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        value={formattedValue}
        placeholder="0,00"
        sx={{ fontVariantNumeric: 'tabular-nums', ...props.sx }}
        onChange={event => handleChange(event.target.value)}
      />
    </InputGroup>
  );
}
