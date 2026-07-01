import http from '../../../shared/services/http';

export type FinancialHistoryPoint = {
  label: string;
  revenue: number;
  profit: number;
};
export type DashboardData = {
  company_id: number | null;
  branch_id: number | null;
  indicators: {
    revenue: number;
    profit: number;
    payables: number;
    receivables: number;
    critical_stock: number;
  };
  recent_sales: {
    id?: number;
    description?: string;
    value?: number;
    date?: string;
  }[];
  recent_purchases: {
    id?: number;
    description?: string;
    value?: number;
    date?: string;
  }[];
  financial_history?: FinancialHistoryPoint[];
};

export async function getDashboard(period: string): Promise<DashboardData> {
  const response = await http.get<{ data: DashboardData }>('/dashboard', {
    params: { period },
  });
  return response.data.data;
}
