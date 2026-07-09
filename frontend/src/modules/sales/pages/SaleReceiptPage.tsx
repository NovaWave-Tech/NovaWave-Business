import {
  Badge,
  Box,
  Button,
  Divider,
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
  Store,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ErrorState } from '../../../shared/ui/ErpUI';
import {
  formatCurrency,
  formatDateTime,
  formatDocument,
  formatPhone,
  formatQuantity,
} from '../../../shared/utils/formatters';
import { saleService } from '../services/saleService';
import type { SaleReceiptData } from '../types/saleTypes';

const receiptNumber = (id: number) => String(id).padStart(6, '0');

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

function buildShareText(receipt: SaleReceiptData) {
  const { sale, company, branch, customer } = receipt;
  const store = company.nome_fantasia || company.razao_social || 'Loja';
  const branchLabel = branch
    ? branch.matriz
      ? 'Matriz'
      : `Filial #${branch.idfilial} - ${branch.nome}`
    : '';
  const lines = [
    `*${store}*${branchLabel ? ` (${branchLabel})` : ''}`,
    `Comprovante de venda Nº ${receiptNumber(sale.idvenda)}`,
    `Data: ${formatDateTime(sale.data_venda)}`,
    `Cliente: ${customer?.nome ?? 'Consumidor final'}`,
    '',
    ...sale.items.map(
      item =>
        `${formatQuantity(item.quantidade)}x ${item.produto} — ${formatCurrency(item.valor_total)}`
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

export default function SaleReceiptPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

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
        scale: 2,
        backgroundColor: '#FFFFFF',
      });
      const width = 320;
      const height = (canvas.height / canvas.width) * width;
      const pdf = new jsPDF({
        unit: 'pt',
        format: [width + 40, height + 40],
      });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 20, 20, width, height);
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

  return (
    <Box
      minH="100vh"
      bg="erp.canvas"
      py={{ base: 4, md: 8 }}
      px={4}
      sx={{ '@media print': { bg: 'white', py: 0, px: 0 } }}
    >
      <Flex
        maxW="420px"
        mx="auto"
        mb={4}
        gap={2}
        justify="space-between"
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
        <Flex gap={2}>
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
        position="relative"
        maxW="420px"
        mx="auto"
        bg="white"
        color="gray.800"
        borderRadius="12px"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 10px 32px rgba(15,23,42,.10)"
        overflow="hidden"
        sx={{
          '@media print': {
            boxShadow: 'none',
            border: 'none',
            borderRadius: 0,
            maxW: 'full',
          },
        }}
      >
        <Box h="4px" bg="#2F80FF" />
        {cancelled && (
          <Text
            position="absolute"
            top="42%"
            left="50%"
            transform="translate(-50%,-50%) rotate(-18deg)"
            fontSize="44px"
            fontWeight="900"
            color="red.500"
            opacity={0.16}
            letterSpacing="8px"
            pointerEvents="none"
          >
            CANCELADA
          </Text>
        )}

        <Box px={6} pt={6} pb={5} textAlign="center">
          <Flex
            w="44px"
            h="44px"
            mx="auto"
            mb={2}
            align="center"
            justify="center"
            borderRadius="12px"
            bg="#F3F6FF"
            border="1px solid #C9D7FF"
            color="#1D4ED8"
          >
            <Store size={21} />
          </Flex>
          <Text fontSize="18px" fontWeight="800" lineHeight="1.2">
            {store}
          </Text>
          {company.razao_social && company.razao_social !== store && (
            <Text fontSize="11px" color="gray.500">
              {company.razao_social}
            </Text>
          )}
          {documentNumber && (
            <Text fontSize="11px" color="gray.500">
              CNPJ {formatDocument(documentNumber)}
            </Text>
          )}
          <Flex justify="center" mt={2}>
            <Badge
              colorScheme={branch?.matriz ? 'blue' : 'purple'}
              textTransform="none"
              borderRadius="full"
              px={2.5}
            >
              {branch
                ? branch.matriz
                  ? 'Matriz'
                  : `Filial #${branch.idfilial} · ${branch.nome}`
                : 'Loja'}
            </Badge>
          </Flex>
          {(address.endereco || phone) && (
            <Text mt={2} fontSize="10px" color="gray.500">
              {[
                address.endereco &&
                  `${address.endereco}${address.numero ? `, ${address.numero}` : ''}`,
                address.cidade && `${address.cidade}/${address.estado}`,
                phone && formatPhone(phone),
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
          )}
        </Box>

        <Divider borderStyle="dashed" borderColor="gray.300" />

        <Box px={6} py={4}>
          <Flex justify="space-between" align="center">
            <Box>
              <Text
                fontSize="10px"
                fontWeight="700"
                color="gray.500"
                textTransform="uppercase"
                letterSpacing=".06em"
              >
                Comprovante de venda
              </Text>
              <Text
                fontSize="20px"
                fontWeight="800"
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                Nº {receiptNumber(sale.idvenda)}
              </Text>
            </Box>
            <Box textAlign="right">
              <Text fontSize="10px" color="gray.500">
                Emitido em
              </Text>
              <Text fontSize="12px" fontWeight="600">
                {formatDateTime(new Date())}
              </Text>
              <Text fontSize="10px" color="gray.500" mt={1}>
                Venda em {formatDateTime(sale.data_venda)}
              </Text>
            </Box>
          </Flex>

          <Box
            mt={4}
            p={3}
            bg="gray.50"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="8px"
          >
            <Text
              fontSize="9px"
              fontWeight="700"
              color="gray.500"
              textTransform="uppercase"
              letterSpacing=".06em"
            >
              Cliente
            </Text>
            <Text fontSize="13px" fontWeight="700">
              {customer?.nome ?? 'Consumidor final'}
            </Text>
            {customer?.documento && (
              <Text fontSize="11px" color="gray.500">
                {formatDocument(customer.documento)}
              </Text>
            )}
            {customer?.telefone && (
              <Text fontSize="11px" color="gray.500">
                {formatPhone(customer.telefone)}
              </Text>
            )}
          </Box>
        </Box>

        <Divider borderStyle="dashed" borderColor="gray.300" />

        <Box px={6} py={4}>
          <Flex
            justify="space-between"
            fontSize="9px"
            fontWeight="700"
            color="gray.500"
            textTransform="uppercase"
            letterSpacing=".06em"
            mb={2}
          >
            <Text>Item</Text>
            <Text>Total</Text>
          </Flex>
          {sale.items.map(item => (
            <Flex
              key={item.idvenda_item}
              justify="space-between"
              gap={3}
              py={1.5}
            >
              <Box minW={0}>
                <Text fontSize="12px" fontWeight="600" noOfLines={2}>
                  {item.produto}
                </Text>
                <Text
                  fontSize="10px"
                  color="gray.500"
                  sx={{ fontVariantNumeric: 'tabular-nums' }}
                >
                  {formatQuantity(item.quantidade)} {item.unidade} x{' '}
                  {formatCurrency(item.valor_unitario)}
                </Text>
              </Box>
              <Text
                fontSize="12px"
                fontWeight="700"
                flexShrink={0}
                sx={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {formatCurrency(item.valor_total)}
              </Text>
            </Flex>
          ))}
        </Box>

        <Divider borderStyle="dashed" borderColor="gray.300" />

        <Box px={6} py={4}>
          <Flex
            justify="space-between"
            fontSize="12px"
            color="gray.600"
            py={0.5}
          >
            <Text>Subtotal</Text>
            <Text sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatCurrency(sale.valor_bruto)}
            </Text>
          </Flex>
          {sale.valor_desconto > 0 && (
            <Flex
              justify="space-between"
              fontSize="12px"
              color="gray.600"
              py={0.5}
            >
              <Text>Desconto{discountPercentLabel(sale)}</Text>
              <Text sx={{ fontVariantNumeric: 'tabular-nums' }}>
                -{formatCurrency(sale.valor_desconto)}
              </Text>
            </Flex>
          )}
          <Flex
            justify="space-between"
            align="baseline"
            mt={2}
            pt={2}
            borderTop="2px solid"
            borderColor="gray.800"
          >
            <Text fontSize="14px" fontWeight="800">
              TOTAL
            </Text>
            <Text
              fontSize="22px"
              fontWeight="900"
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatCurrency(sale.valor_total)}
            </Text>
          </Flex>
        </Box>

        <Box px={6} pb={6} textAlign="center">
          <Text fontSize="10px" color="gray.500">
            Operador: {sale.usuario} · {sale.items.length}{' '}
            {sale.items.length === 1 ? 'item' : 'itens'}
          </Text>
          <Text mt={3} fontSize="10px" fontWeight="700" color="gray.600">
            *** DOCUMENTO SEM VALOR FISCAL ***
          </Text>
          <Text mt={1} fontSize="9px" color="gray.400">
            Comprovante gerado pelo NovaWave Business
          </Text>
        </Box>
      </Box>
    </Box>
  );
}
