import http from '../../../shared/services/http';

export type DashboardPeriod = 'today' | '7d' | '30d' | '90d' | 'year';

export type MatrixDashboardData = {
  period: DashboardPeriod;
  summary: {
    company_name: string;
    branches_total: number;
    branches_with_activity: number;
    branches_without_activity: number;
    last_sync: string;
  };
  kpis: {
    revenue_today: number;
    revenue_month: number;
    profit_month: number;
    average_ticket: number;
    orders: number;
    customers: number;
    profit_margin: number;
    revenue_change: number;
    profit_change: number;
    orders_change: number;
  };
  goal: {
    target: number;
    sold: number;
    percentage: number;
    remaining: number;
    projection: number;
    projection_percentage: number;
    days_remaining: number;
    daily_required: number;
    configured: boolean;
    previous_month: number;
    same_month_last_year: number;
    expected_pace_percentage: number;
  };
  branches: Array<{
    id: number;
    name: string;
    revenue: number;
    growth: number;
    target: number;
    target_percentage: number;
    status: 'above' | 'on_track' | 'below' | 'unconfigured';
  }>;
  evolution: Array<{
    date: string;
    revenue: number;
    previous_revenue: number;
  }>;
  alerts: Array<{
    type: 'info' | 'warning' | 'danger' | 'success';
    title: string;
    description: string;
    occurred_at: string;
  }>;
  activities: Array<{
    type: 'sale' | 'purchase' | 'customer' | 'product' | 'cash';
    title: string;
    branch?: string | null;
    value?: number | null;
    occurred_at: string;
  }>;
};

export async function getDashboard(period: DashboardPeriod) {
  const response = await http.get<{ data: MatrixDashboardData }>('/dashboard', {
    params: { period },
  });
  return response.data.data;
}
