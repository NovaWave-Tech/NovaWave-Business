import {
  Input,
  InputGroup,
  InputLeftAddon,
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
  ...props
}: Omit<InputProps, 'value' | 'onChange' | 'type'> & {
  value: string;
  onValueChange: (value: string) => void;
  currency?: string;
}) {
  return (
    <InputGroup>
      <InputLeftAddon>{currency}</InputLeftAddon>
      <Input
        {...props}
        type="number"
        inputMode="decimal"
        min={0}
        step="0.01"
        value={value}
        onChange={event => onValueChange(event.target.value)}
      />
    </InputGroup>
  );
}
