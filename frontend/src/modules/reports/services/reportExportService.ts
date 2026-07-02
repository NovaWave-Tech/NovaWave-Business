import type { ReportPreviewData } from './reportService';

const labels: Record<string, string> = {
  id: 'Codigo',
  date: 'Data',
  branch: 'Filial',
  customer: 'Cliente',
  total: 'Total',
  status: 'Status',
  name: 'Nome',
  document: 'Documento',
  city: 'Cidade',
  state: 'UF',
  orders: 'Operacoes',
  sku: 'SKU',
  price: 'Preco',
  stock: 'Estoque',
  stock_value: 'Valor em estoque',
  type: 'Tipo',
  description: 'Descricao',
  due_date: 'Vencimento',
};
const moneyKeys = new Set(['total', 'price', 'stock_value']);

export async function exportReportExcel(
  title: string,
  data: ReportPreviewData
) {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'NovaWave Business ERP';
  const sheet = workbook.addWorksheet('Relatorio', {
    views: [{ state: 'frozen', ySplit: 9 }],
  });
  const columns = Object.keys(data.rows[0] ?? { message: '' });
  const logo = await loadBrandLogo();
  if (logo) {
    const imageId = workbook.addImage({ base64: logo, extension: 'png' });
    sheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 28, height: 28 },
    });
  }
  sheet.mergeCells(
    'A1',
    `${String.fromCharCode(65 + Math.max(columns.length - 1, 3))}1`
  );
  sheet.getCell('A1').value = 'NOVAWAVE BUSINESS ERP';
  sheet.getCell('A1').font = {
    bold: true,
    size: 18,
    color: { argb: 'FFFFFFFF' },
  };
  sheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563FF' },
  };
  sheet.getCell('A3').value = title;
  sheet.getCell('A3').font = { bold: true, size: 16 };
  sheet.getCell('A4').value = `${data.meta.company} | ${data.meta.branch}`;
  sheet.getCell('A5').value = `Periodo: ${data.meta.start} a ${data.meta.end}`;
  sheet.getCell('A6').value =
    `Gerado por ${data.meta.user} em ${new Date(data.meta.generated_at).toLocaleString('pt-BR')}`;
  sheet.getCell('A8').value = data.summary;
  sheet.mergeCells(
    'A8',
    `${String.fromCharCode(65 + Math.max(columns.length - 1, 3))}8`
  );
  columns.forEach((key, index) => {
    const cell = sheet.getCell(10, index + 1);
    cell.value = labels[key] ?? key;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF334155' },
    };
  });
  data.rows.forEach((row, rowIndex) =>
    columns.forEach((key, columnIndex) => {
      const cell = sheet.getCell(rowIndex + 11, columnIndex + 1);
      cell.value = row[key] ?? '';
      if (moneyKeys.has(key)) cell.numFmt = 'R$ #,##0.00';
      if (rowIndex % 2)
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF4F7FB' },
        };
    })
  );
  columns.forEach((key, index) => {
    sheet.getColumn(index + 1).width = Math.min(
      36,
      Math.max(
        14,
        labels[key]?.length ?? key.length,
        ...data.rows.map(row => String(row[key] ?? '').length + 2)
      )
    );
  });
  sheet.autoFilter = {
    from: { row: 10, column: 1 },
    to: { row: Math.max(10, data.rows.length + 10), column: columns.length },
  };
  const buffer = await workbook.xlsx.writeBuffer();
  download(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `${slug(title)}.xlsx`
  );
}

export async function exportReportPdf(
  title: string,
  data: ReportPreviewData,
  landscape = true
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);
  const doc = new jsPDF({
    orientation: landscape ? 'landscape' : 'portrait',
    unit: 'mm',
    format: 'a4',
  });
  const autoTable = autoTableModule.default;
  const logo = await loadBrandLogo();
  doc.setFillColor(37, 99, 255);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 24, 'F');
  doc.setTextColor(255, 255, 255);
  if (logo) doc.addImage(logo, 'PNG', 14, 4, 16, 16);
  doc.setFontSize(16);
  doc.text('NovaWave Business ERP', logo ? 34 : 14, 15);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(17);
  doc.text(title, 14, 35);
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `${data.meta.company} | ${data.meta.branch} | ${data.meta.start} a ${data.meta.end}`,
    14,
    42
  );
  doc.setFontSize(10);
  doc.text(data.summary, 14, 51, {
    maxWidth: doc.internal.pageSize.getWidth() - 28,
  });
  const columns = Object.keys(data.rows[0] ?? { message: '' });
  autoTable(doc, {
    startY: 62,
    head: [columns.map(key => labels[key] ?? key)],
    body: data.rows.map(row =>
      columns.map(key =>
        moneyKeys.has(key)
          ? Number(row[key] ?? 0).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            })
          : String(row[key] ?? '')
      )
    ),
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    alternateRowStyles: { fillColor: [244, 247, 251] },
    margin: { bottom: 18 },
    didDrawPage: hook => {
      const page = doc.getNumberOfPages();
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `NovaWave Business ERP | Pagina ${page}`,
        14,
        doc.internal.pageSize.getHeight() - 8
      );
      doc.text(
        new Date(data.meta.generated_at).toLocaleString('pt-BR'),
        doc.internal.pageSize.getWidth() - 55,
        doc.internal.pageSize.getHeight() - 8
      );
      void hook;
    },
  });
  doc.save(`${slug(title)}.pdf`);
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
function slug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function loadBrandLogo() {
  try {
    const response = await fetch('/logobusiness.png');
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
