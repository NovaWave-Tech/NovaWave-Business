import http from '../../../shared/services/http';
import type { ReportFilters } from '../schemas/reportSchema';

export type ReportCatalogData = {
  company: string;
  branches: Array<{ id: number; name: string }>;
  generated_at: string;
};

export type ReportPreviewData = {
  meta: {
    company: string;
    branch: string;
    user: string;
    start: string;
    end: string;
    generated_at: string;
  };
  kpis: {
    revenue: number;
    orders: number;
    average_ticket: number;
    customers: number;
    received: number;
    paid: number;
  };
  chart: Array<{ date: string; value: number }>;
  rows: Array<Record<string, string | number | null>>;
  summary: string;
};

export async function getReportCatalog() {
  const { data } = await http.get<{ data: ReportCatalogData }>('/reports');
  return data.data;
}

export async function getReportPreview(slug: string, filters: ReportFilters) {
  const { data } = await http.get<{ data: ReportPreviewData }>(
    `/reports/${slug}`,
    { params: filters }
  );
  return data.data;
}
