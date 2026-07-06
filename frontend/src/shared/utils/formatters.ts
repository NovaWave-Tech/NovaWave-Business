const ptBR = 'pt-BR';

export const digitsOnly = (value: unknown) =>
  String(value ?? '').replace(/\D/g, '');

export const formatCurrency = (
  value: string | number | null | undefined,
  options: { currency?: string; compact?: boolean } = {}
) => {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat(ptBR, {
    style: 'currency',
    currency: options.currency ?? 'BRL',
    notation: options.compact ? 'compact' : 'standard',
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: options.compact ? 1 : 2,
  }).format(Number.isFinite(amount) ? amount : 0);
};

export const formatNumber = (value: string | number | null | undefined) =>
  new Intl.NumberFormat(ptBR).format(Number(value ?? 0) || 0);

export const formatCompactNumber = (
  value: string | number | null | undefined
) =>
  new Intl.NumberFormat(ptBR, {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0) || 0);

export const formatQuantity = (
  value: string | number | null | undefined,
  maximumFractionDigits = 3
) =>
  new Intl.NumberFormat(ptBR, { maximumFractionDigits }).format(
    Number(value ?? 0) || 0
  );

export const formatBarcode = (value?: string | null) =>
  digitsOnly(value)
    .replace(/(.{4})/g, '$1 ')
    .trim() || '-';

export const formatWeight = (value?: string | number | null) =>
  value === null || value === undefined || value === ''
    ? '-'
    : `${formatQuantity(value)} kg`;

export const formatDimensions = (
  height?: string | number | null,
  width?: string | number | null,
  length?: string | number | null
) =>
  [height, width, length].every(
    value => value === null || value === undefined || value === ''
  )
    ? '-'
    : `${formatQuantity(height)} x ${formatQuantity(width)} x ${formatQuantity(length)} cm`;

export const formatPercent = (
  value: string | number | null | undefined,
  fractionDigits = 1
) =>
  new Intl.NumberFormat(ptBR, {
    style: 'percent',
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format((Number(value ?? 0) || 0) / 100);

/**
 * Variacao ja expressa em pontos percentuais (ex.: 12.5 -> "+12,5%").
 * Use para deltas/tendencias, nao para uma fracao (0-1).
 */
export const formatDelta = (
  value: string | number | null | undefined,
  fractionDigits = 1
) => {
  const amount = Number(value ?? 0) || 0;
  const sign = amount > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat(ptBR, {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  }).format(amount)}%`;
};

const parseDate = (value: string | Date) => {
  if (value instanceof Date) return value;
  return new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  );
};

export const formatDate = (value?: string | Date | null, fallback = '-') => {
  if (!value) return fallback;
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString(ptBR);
};

export const formatDateTime = (
  value?: string | Date | null,
  fallback = '-'
) => {
  if (!value) return fallback;
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleString(ptBR, { dateStyle: 'short', timeStyle: 'short' });
};

export const formatShortDate = (
  value?: string | Date | null,
  fallback = '-'
) => {
  if (!value) return fallback;
  const date = parseDate(value);
  return Number.isNaN(date.getTime())
    ? fallback
    : date.toLocaleDateString(ptBR, { day: '2-digit', month: '2-digit' });
};

/** Data local no formato ISO (YYYY-MM-DD), sem deslocamento de fuso. */
export const toISODate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/** ISO de hoje. */
export const isoToday = () => toISODate(new Date());

/** ISO de N dias atras a partir de hoje. */
export const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return toISODate(date);
};

/** Rotulo curto de um intervalo, ex.: "01/07 a 06/07/2026". */
export const formatDateRange = (start?: string, end?: string) => {
  if (!start || !end) return '-';
  return `${formatShortDate(start)} a ${formatDate(end)}`;
};

/** Competencia por extenso, ex.: "Julho de 2026". Sem valor usa o mes atual. */
export const formatMonthYear = (value?: string | Date | null) => {
  const date = value ? parseDate(value) : new Date();
  if (Number.isNaN(date.getTime())) return '';
  const label = date.toLocaleDateString(ptBR, {
    month: 'long',
    year: 'numeric',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
};

export const formatCnpj = (value?: string | null) => {
  const digits = digitsOnly(value).slice(0, 14);
  if (!digits) return '-';
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const formatCpf = (value?: string | null) => {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return '-';
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/\.(\d{3})(\d)/, '.$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
};

export const formatDocument = (value?: string | null) =>
  digitsOnly(value).length <= 11 ? formatCpf(value) : formatCnpj(value);

export const isValidCpf = (value?: string | null) => {
  const digits = digitsOnly(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  for (let position = 9; position < 11; position += 1) {
    let sum = 0;
    for (let index = 0; index < position; index += 1) {
      sum += Number(digits[index]) * (position + 1 - index);
    }
    const remainder = (sum * 10) % 11;
    const checkDigit = remainder === 10 ? 0 : remainder;
    if (checkDigit !== Number(digits[position])) return false;
  }
  return true;
};

export const isValidCnpj = (value?: string | null) => {
  const digits = digitsOnly(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  for (const length of [12, 13]) {
    let sum = 0;
    let weight = length - 7;
    for (let index = 0; index < length; index += 1) {
      sum += Number(digits[index]) * weight;
      weight -= 1;
      if (weight < 2) weight = 9;
    }
    const remainder = sum % 11;
    const checkDigit = remainder < 2 ? 0 : 11 - remainder;
    if (checkDigit !== Number(digits[length])) return false;
  }
  return true;
};

export const formatPhone = (value?: string | null) => {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return '-';
  return digits.length > 10
    ? digits.replace(/^(\d{2})(\d{5})(\d{0,4}).*/, '($1) $2-$3')
    : digits.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
};

export const formatCep = (value?: string | null) => {
  const digits = digitsOnly(value).slice(0, 8);
  return digits ? digits.replace(/^(\d{5})(\d{0,3}).*/, '$1-$2') : '-';
};

export const formatPaymentMethod = (value?: string | null) => {
  const labels: Record<string, string> = {
    pix: 'PIX',
    cartao: 'Cartao',
    boleto: 'Boleto',
    transferencia: 'Transferencia',
    dinheiro: 'Dinheiro',
  };
  return value ? (labels[value.toLowerCase()] ?? value) : '-';
};

export const maskValue = (
  value: string,
  mask: 'cnpj' | 'cpf' | 'document' | 'phone' | 'cep'
) => {
  const formatted = {
    cnpj: formatCnpj,
    cpf: formatCpf,
    document: formatDocument,
    phone: formatPhone,
    cep: formatCep,
  }[mask](value);
  return formatted === '-' ? '' : formatted;
};
