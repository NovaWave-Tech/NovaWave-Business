import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  IconButton,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Spinner,
  Text,
  Tooltip,
  useToast,
} from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  MessageCircle,
  Printer,
  Share2,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../../shared/ui/ErpUI';
import {
  formatCurrency,
  formatDateTime,
  formatDocument,
  formatPaymentMethod,
  formatPhone,
  formatQuantity,
} from '../../../shared/utils/formatters';
import { saleService } from '../services/saleService';
import type { SaleReceiptData } from '../types/saleTypes';

type PaperWidth = 58 | 80;

const MONO = "'Courier New', 'Roboto Mono', monospace";

const receiptNumber = (id: number) => String(id).padStart(6, '0');

/** Rotulo da forma de pagamento, ex.: "PIX a vista" ou "Boleto 3x". */
function paymentLabel(sale: {
  forma_pagamento: string | null;
  a_prazo: boolean;
  parcelas: number;
  juros_atraso: number;
}): string {
  if (!sale.forma_pagamento) return '-';
  const method = formatPaymentMethod(sale.forma_pagamento);
  if (sale.a_prazo) {
    const fee =
      sale.juros_atraso > 0 ? ` (juros ${sale.juros_atraso}% a.m.)` : '';
    return `${method} a prazo ${sale.parcelas}x${fee}`;
  }
  return sale.parcelas > 1
    ? `${method} ${sale.parcelas}x`
    : `${method} a vista`;
}

/** Rotulo do percentual de desconto, ex.: " (10%)". Vazio quando nao ha base. */
function discountPercentLabel(sale: {
  valor_bruto: number;
  valor_desconto: number;
}): string {
  if (!(Number(sale.valor_bruto) > 0) || !(Number(sale.valor_desconto) > 0)) {
    return '';
  }
  const percent =
    (Number(sale.valor_desconto) / Number(sale.valor_bruto)) * 100;
  const rounded = Math.round(percent * 10) / 10;
  return ` (${String(rounded).replace('.', ',')}%)`;
}

function branchLine(branch: SaleReceiptData['branch']): string {
  if (!branch) return 'Loja';
  return branch.matriz
    ? 'Matriz'
    : `Filial #${branch.idfilial} - ${branch.nome}`;
}

function buildShareText(receipt: SaleReceiptData) {
  const { sale, company, branch, customer } = receipt;
  const store = company.nome_fantasia || company.razao_social || 'Loja';
  const lines = [
    `*${store}* (${branchLine(branch)})`,
    `Comprovante de venda No ${receiptNumber(sale.idvenda)}`,
    `Data: ${formatDateTime(sale.data_venda)}`,
    `Cliente: ${customer?.nome ?? 'Consumidor final'}`,
    ...(sale.forma_pagamento ? [`Pagamento: ${paymentLabel(sale)}`] : []),
    '',
    ...sale.items.map(
      item =>
        `${formatQuantity(item.quantidade)}x ${item.produto} - ${formatCurrency(item.valor_total)}`
    ),
    '',
    `Subtotal: ${formatCurrency(sale.valor_bruto)}`,
    ...(sale.valor_desconto > 0
      ? [
          `Desconto${discountPercentLabel(sale)}: -${formatCurrency(sale.valor_desconto)}`,
        ]
      : []),
    `*Total: ${formatCurrency(sale.valor_total)}*`,
    '',
    'Documento sem valor fiscal.',
  ];
  return lines.join('\n');
}

/** Linha rotulo/valor do cupom (label a esquerda, valor a direita). */
function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Flex justify="space-between" gap="2mm" lineHeight="1.45">
      <Text as="span" flexShrink={0}>
        {label}
      </Text>
      <Text as="span" textAlign="right" wordBreak="break-word">
        {value}
      </Text>
    </Flex>
  );
}

/** Separador tracejado de largura total, como o corte da bobina. */
function Dashes() {
  return (
    <Box
      borderBottom="1px dashed #000"
      my="2mm"
      aria-hidden
      sx={{ '@media print': { borderColor: '#000' } }}
    />
  );
}

export default function SaleReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paper, setPaper] = useState<PaperWidth>(58);

  const receipt = useQuery({
    queryKey: ['sale-receipt', id],
    queryFn: () => saleService.receipt(Number(id)),
    enabled: Boolean(id),
  });
  const data = receipt.data;

  const downloadPdf = async () => {
    if (!receiptRef.current || !data) return;
    setExporting(true);
    try {
      const [html2canvas, { jsPDF }] = await Promise.all([
        import('html2canvas').then(module => module.default),
        import('jspdf'),
      ]);
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: '#FFFFFF',
      });
      const widthMm = paper;
      const heightMm = (canvas.height / canvas.width) * widthMm;
      const pdf = new jsPDF({
        unit: 'mm',
        format: [widthMm, heightMm],
      });
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        0,
        0,
        widthMm,
        heightMm
      );
      pdf.save(`comprovante-venda-${receiptNumber(data.sale.idvenda)}.pdf`);
    } catch {
      toast({
        title: 'Nao foi possivel gerar o PDF',
        status: 'error',
        position: 'top-right',
      });
    } finally {
      setExporting(false);
    }
  };

  const copyText = async () => {
    if (!data) return;
    await navigator.clipboard.writeText(buildShareText(data));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Comprovante copiado', status: 'success' });
  };

  const nativeShare = async () => {
    if (!data) return;
    const text = buildShareText(data);
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Comprovante de venda #${receiptNumber(data.sale.idvenda)}`,
          text,
        });
      } catch {
        /* usuario cancelou o compartilhamento */
      }
    } else {
      await copyText();
    }
  };

  const shareWhatsApp = () => {
    if (!data) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(buildShareText(data))}`,
      '_blank'
    );
  };

  if (receipt.isError) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="erp.canvas">
        <ErrorState
          title="Comprovante nao encontrado"
          description="Verifique se a venda existe e tente novamente."
          retry={() => void receipt.refetch()}
        />
      </Flex>
    );
  }

  if (receipt.isLoading || !data) {
    return (
      <Flex minH="100vh" align="center" justify="center" bg="erp.canvas">
        <Spinner color="brand.500" size="lg" />
      </Flex>
    );
  }

  const { sale, company, branch, customer } = data;
  const store = company.nome_fantasia || company.razao_social || 'Loja';
  const documentNumber = branch?.cnpj || company.cnpj;
  const address = branch?.endereco ? branch : company;
  const phone = branch?.telefone || company.telefone;
  const cancelled = sale.situacao === 4;
  const addressText = [
    address.endereco &&
      `${address.endereco}${address.numero ? `, ${address.numero}` : ''}`,
    address.bairro,
    address.cidade && `${address.cidade}/${address.estado}`,
  ]
    .filter(Boolean)
    .join(' - ');

  return (
    <Box
      minH="100vh"
      bg="erp.canvas"
      py={{ base: 4, md: 8 }}
      px={4}
      sx={{ '@media print': { bg: 'white', p: 0, minH: 'auto' } }}
    >
      {/* Configura a pagina de impressao para a largura da bobina termica. */}
      <style>{`@media print { @page { size: ${paper}mm auto; margin: 0; } html, body { background: #fff !important; } }`}</style>

      <Flex
        maxW={`${paper === 58 ? 300 : 360}px`}
        mx="auto"
        mb={4}
        gap={2}
        wrap="wrap"
        justify="space-between"
        align="center"
        sx={{ '@media print': { display: 'none' } }}
      >
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<ArrowLeft size={15} />}
          onClick={() => navigate('/sales')}
        >
          Vendas
        </Button>
        <Flex gap={2} align="center">
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button
              onClick={() => setPaper(58)}
              bg={paper === 58 ? 'erp.brandSoft' : undefined}
              color={paper === 58 ? 'erp.brand' : undefined}
              borderColor={paper === 58 ? 'erp.brand' : undefined}
            >
              58mm
            </Button>
            <Button
              onClick={() => setPaper(80)}
              bg={paper === 80 ? 'erp.brandSoft' : undefined}
              color={paper === 80 ? 'erp.brand' : undefined}
              borderColor={paper === 80 ? 'erp.brand' : undefined}
            >
              80mm
            </Button>
          </ButtonGroup>
          <Menu>
            <Tooltip label="Encaminhar comprovante">
              <MenuButton
                as={IconButton}
                aria-label="Encaminhar comprovante"
                icon={<Share2 size={16} />}
                variant="outline"
                size="sm"
              />
            </Tooltip>
            <MenuList>
              <MenuItem
                icon={<MessageCircle size={15} />}
                onClick={shareWhatsApp}
              >
                Enviar por WhatsApp
              </MenuItem>
              <MenuItem
                icon={copied ? <Check size={15} /> : <Copy size={15} />}
                onClick={() => void copyText()}
              >
                Copiar texto
              </MenuItem>
              <MenuItem
                icon={<Share2 size={15} />}
                onClick={() => void nativeShare()}
              >
                Compartilhar...
              </MenuItem>
            </MenuList>
          </Menu>
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Download size={15} />}
            isLoading={exporting}
            onClick={() => void downloadPdf()}
          >
            PDF
          </Button>
          <Button
            size="sm"
            leftIcon={<Printer size={15} />}
            onClick={() => window.print()}
          >
            Imprimir
          </Button>
        </Flex>
      </Flex>

      <Box
        ref={receiptRef}
        mx="auto"
        bg="white"
        color="#000"
        width={`${paper}mm`}
        fontFamily={MONO}
        fontSize={paper === 58 ? '10.5px' : '12px'}
        lineHeight="1.4"
        px={paper === 58 ? '3mm' : '4mm'}
        py="4mm"
        boxShadow="0 8px 28px rgba(15,23,42,.14)"
        sx={{
          fontVariantNumeric: 'tabular-nums',
          '@media print': {
            boxShadow: 'none',
            width: `${paper}mm`,
            px: paper === 58 ? '3mm' : '4mm',
          },
        }}
      >
        {/* Cabecalho: loja centralizada */}
        <Box textAlign="center">
          <Text fontWeight="700" fontSize={paper === 58 ? '13px' : '15px'}>
            {store.toUpperCase()}
          </Text>
          {company.razao_social && company.razao_social !== store && (
            <Text>{company.razao_social}</Text>
          )}
          {documentNumber && <Text>CNPJ {formatDocument(documentNumber)}</Text>}
          <Text>{branchLine(branch)}</Text>
          {addressText && <Text>{addressText}</Text>}
          {phone && <Text>Tel {formatPhone(phone)}</Text>}
        </Box>

        <Dashes />

        <Box textAlign="center">
          <Text fontWeight="700">COMPROVANTE DE VENDA</Text>
          <Text>SEM VALOR FISCAL</Text>
        </Box>

        {cancelled && (
          <Text mt="1mm" textAlign="center" fontWeight="700">
            *** VENDA CANCELADA ***
          </Text>
        )}

        <Dashes />

        {/* Dados da venda */}
        <MetaRow label="Venda No" value={receiptNumber(sale.idvenda)} />
        <MetaRow label="Emissao" value={formatDateTime(new Date())} />
        <MetaRow label="Data venda" value={formatDateTime(sale.data_venda)} />
        <MetaRow label="Operador" value={sale.usuario} />
        <MetaRow label="Cliente" value={customer?.nome ?? 'Consumidor final'} />
        {customer?.documento && (
          <MetaRow
            label="Documento"
            value={formatDocument(customer.documento)}
          />
        )}
        {sale.forma_pagamento && (
          <MetaRow label="Pagamento" value={paymentLabel(sale)} />
        )}

        <Dashes />

        {/* Itens */}
        <Flex justify="space-between" fontWeight="700">
          <Text as="span">ITEM</Text>
          <Text as="span">VALOR</Text>
        </Flex>
        <Box mt="1mm">
          {sale.items.map((item, index) => (
            <Box key={item.idvenda_item} mt={index === 0 ? 0 : '1.5mm'}>
              <Text wordBreak="break-word">
                {String(index + 1).padStart(2, '0')} {item.produto}
              </Text>
              <Flex justify="space-between" gap="2mm">
                <Text as="span">
                  {formatQuantity(item.quantidade)} {item.unidade} x{' '}
                  {formatCurrency(item.valor_unitario)}
                </Text>
                <Text as="span" fontWeight="700">
                  {formatCurrency(item.valor_total)}
                </Text>
              </Flex>
            </Box>
          ))}
        </Box>

        <Dashes />

        {/* Totais */}
        <MetaRow label="Subtotal" value={formatCurrency(sale.valor_bruto)} />
        {sale.valor_desconto > 0 && (
          <MetaRow
            label={`Desconto${discountPercentLabel(sale)}`}
            value={`-${formatCurrency(sale.valor_desconto)}`}
          />
        )}
        <Flex
          justify="space-between"
          align="center"
          mt="1.5mm"
          pt="1.5mm"
          borderTop="1px solid #000"
          fontWeight="700"
          fontSize={paper === 58 ? '14px' : '16px'}
        >
          <Text as="span">TOTAL</Text>
          <Text as="span">{formatCurrency(sale.valor_total)}</Text>
        </Flex>

        <Dashes />

        {/* Rodape */}
        <Box textAlign="center">
          <Text>
            {sale.items.length} {sale.items.length === 1 ? 'item' : 'itens'}{' '}
            nesta venda
          </Text>
          <Text mt="2mm" fontWeight="700">
            *** DOCUMENTO SEM VALOR FISCAL ***
          </Text>
          <Text mt="1mm">NovaWave Business</Text>
          <Text>.</Text>
        </Box>
      </Box>
    </Box>
  );
}
