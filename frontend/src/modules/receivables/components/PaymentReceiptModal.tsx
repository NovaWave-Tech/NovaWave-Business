import {
  Box,
  Button,
  Flex,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from '@chakra-ui/react';
import { Printer, ReceiptText } from 'lucide-react';
import {
  formatCurrency,
  formatDateTime,
  formatDocument,
  formatPaymentMethod,
} from '../../../shared/utils/formatters';

export type PaymentReceiptData = {
  contrato: string;
  parcela_numero: number;
  parcelas_total: number;
  valor_base: number;
  juros: number;
  multa: number;
  desconto: number;
  valor_pago: number;
  meio: string | null;
  data: string;
};

/** Monta o HTML autocontido do recibo (usado no preview e na impressao). */
function buildReceiptHtml({
  company,
  customer,
  payment,
}: {
  company: {
    nome_fantasia?: string | null;
    razao_social?: string | null;
    cnpj?: string | null;
  };
  customer: { nome: string; documento?: string | null };
  payment: PaymentReceiptData;
}): string {
  const store = company.nome_fantasia || company.razao_social || 'Loja';
  const rows: Array<[string, string]> = [
    ['Valor da parcela', formatCurrency(payment.valor_base)],
  ];
  if (payment.juros > 0) rows.push(['Juros', formatCurrency(payment.juros)]);
  if (payment.multa > 0) rows.push(['Multa', formatCurrency(payment.multa)]);
  if (payment.desconto > 0)
    rows.push(['Desconto', '- ' + formatCurrency(payment.desconto)]);

  const detailRows = rows
    .map(
      ([label, value]) =>
        `<div class="row"><span>${label}</span><span>${value}</span></div>`
    )
    .join('');

  return `
    <div class="receipt">
      <div class="head">
        <div class="store">${store.toUpperCase()}</div>
        ${company.cnpj ? `<div class="muted">CNPJ ${formatDocument(company.cnpj)}</div>` : ''}
      </div>
      <div class="title">RECIBO DE PAGAMENTO</div>
      <div class="dashes"></div>
      <p class="statement">
        Recebemos de <strong>${customer.nome}</strong>${
          customer.documento ? ` (${formatDocument(customer.documento)})` : ''
        } a importancia de <strong>${formatCurrency(payment.valor_pago)}</strong>,
        referente ao contrato <strong>${payment.contrato}</strong> — parcela
        ${payment.parcela_numero}/${payment.parcelas_total}.
      </p>
      <div class="dashes"></div>
      ${detailRows}
      <div class="row total"><span>Total pago</span><span>${formatCurrency(payment.valor_pago)}</span></div>
      <div class="dashes"></div>
      <div class="row"><span>Forma de pagamento</span><span>${formatPaymentMethod(payment.meio)}</span></div>
      <div class="row"><span>Data / hora</span><span>${formatDateTime(payment.data)}</span></div>
      <div class="sign">
        <div class="line"></div>
        <div class="muted">${store}</div>
      </div>
      <div class="foot">Documento sem valor fiscal · NovaWave Business</div>
    </div>
  `;
}

const RECEIPT_CSS = `
  .receipt { font-family: 'Courier New', monospace; color: #111; max-width: 320px; margin: 0 auto; font-size: 12px; line-height: 1.5; }
  .receipt .head { text-align: center; }
  .receipt .store { font-weight: 700; font-size: 15px; }
  .receipt .muted { color: #666; font-size: 11px; }
  .receipt .title { text-align: center; font-weight: 700; margin-top: 8px; letter-spacing: 1px; }
  .receipt .dashes { border-top: 1px dashed #999; margin: 8px 0; }
  .receipt .statement { margin: 8px 0; }
  .receipt .row { display: flex; justify-content: space-between; gap: 12px; padding: 2px 0; }
  .receipt .total { font-weight: 700; font-size: 14px; border-top: 1px solid #111; margin-top: 4px; padding-top: 6px; }
  .receipt .sign { margin-top: 28px; text-align: center; }
  .receipt .sign .line { border-top: 1px solid #111; width: 70%; margin: 0 auto 4px; }
  .receipt .foot { text-align: center; color: #888; font-size: 10px; margin-top: 14px; }
`;

export function PaymentReceiptModal({
  isOpen,
  onClose,
  company,
  customer,
  payment,
}: {
  isOpen: boolean;
  onClose: () => void;
  company: {
    nome_fantasia?: string | null;
    razao_social?: string | null;
    cnpj?: string | null;
  };
  customer: { nome: string; documento?: string | null };
  payment: PaymentReceiptData | null;
}) {
  if (!payment) return null;
  const html = buildReceiptHtml({ company, customer, payment });

  const print = () => {
    const win = window.open('', '_blank', 'width=420,height=640');
    if (!win) return;
    win.document.write(
      `<!doctype html><html><head><title>Recibo ${payment.contrato}</title>` +
        `<style>@page{size:80mm auto;margin:6mm}body{margin:0}${RECEIPT_CSS}</style>` +
        `</head><body>${html}` +
        `<scr` +
        `ipt>window.onload=function(){window.print();setTimeout(function(){window.close()},300)}</scr` +
        `ipt></body></html>`
    );
    win.document.close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      isCentered
      motionPreset="slideInBottom"
    >
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent borderRadius="16px" overflow="hidden">
        <ModalHeader p={5} borderBottom="1px solid" borderColor="erp.border">
          <Flex align="center" gap={3}>
            <Flex
              w="40px"
              h="40px"
              align="center"
              justify="center"
              borderRadius="11px"
              bg="erp.brandSoft"
              border="1px solid"
              borderColor="erp.brandBorder"
              color="brand.500"
              flexShrink={0}
            >
              <Icon as={ReceiptText} boxSize="20px" />
            </Flex>
            <Text textStyle="h5">Comprovante de pagamento</Text>
          </Flex>
        </ModalHeader>
        <ModalCloseButton top={4} />
        <ModalBody>
          <Box
            bg="white"
            color="black"
            borderRadius="10px"
            border="1px solid"
            borderColor="gray.200"
            p={5}
            sx={{ '& *': { fontFamily: "'Courier New', monospace" } }}
          >
            <style>{RECEIPT_CSS}</style>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </Box>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button leftIcon={<Printer size={16} />} onClick={print}>
            Imprimir
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
