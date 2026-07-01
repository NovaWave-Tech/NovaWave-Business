<?php

namespace App\Modules\Dashboard\Services;

use App\Modules\Dashboard\Repositories\DashboardRepository;

final class DashboardService
{
    public function __construct(private readonly DashboardRepository $repository = new DashboardRepository())
    {
    }

    public function get(int $companyId, string $period): array
    {
        $data = $this->repository->get($companyId, $period);
        $kpis = $data['kpis'];
        $revenueMonth = (float) ($kpis['receita_mes'] ?? 0);
        $profitMonth = (float) ($kpis['lucro_mes'] ?? 0);
        $goalValue = (float) ($data['goal']['valor_meta'] ?? 0);
        $day = (int) date('j');
        $daysInMonth = (int) date('t');
        $daysRemaining = max(0, $daysInMonth - $day);
        $projection = $day > 0 ? ($revenueMonth / $day) * $daysInMonth : 0;

        $data['kpis'] = [
            'revenue_today' => (float) ($kpis['receita_dia'] ?? 0),
            'revenue_month' => $revenueMonth,
            'profit_month' => $profitMonth,
            'average_ticket' => (float) ($kpis['ticket_medio'] ?? 0),
            'orders' => (int) ($kpis['pedidos'] ?? 0),
            'customers' => (int) ($kpis['clientes'] ?? 0),
            'profit_margin' => $revenueMonth > 0 ? ($profitMonth / $revenueMonth) * 100 : 0,
            'revenue_change' => $this->change((float) ($kpis['receita_periodo'] ?? 0), (float) ($kpis['receita_anterior'] ?? 0)),
            'profit_change' => $this->change((float) ($kpis['lucro_periodo'] ?? 0), (float) ($kpis['lucro_anterior'] ?? 0)),
            'orders_change' => $this->change((float) ($kpis['pedidos_periodo'] ?? 0), (float) ($kpis['pedidos_anterior'] ?? 0)),
        ];
        $data['goal'] = [
            'target' => $goalValue,
            'sold' => $revenueMonth,
            'percentage' => $goalValue > 0 ? ($revenueMonth / $goalValue) * 100 : 0,
            'remaining' => max(0, $goalValue - $revenueMonth),
            'projection' => $projection,
            'projection_percentage' => $goalValue > 0 ? ($projection / $goalValue) * 100 : 0,
            'days_remaining' => $daysRemaining,
            'daily_required' => $daysRemaining > 0 ? max(0, $goalValue - $revenueMonth) / $daysRemaining : 0,
            'configured' => $goalValue > 0,
            'previous_month' => (float) ($kpis['receita_mes_anterior'] ?? 0),
            'same_month_last_year' => (float) ($kpis['receita_mes_ano_anterior'] ?? 0),
            'expected_pace_percentage' => ($day / $daysInMonth) * 100,
        ];
        $data['branches'] = array_map(function (array $branch): array {
            $revenue = (float) $branch['receita'];
            $previous = (float) $branch['receita_anterior'];
            $goal = (float) $branch['meta'];
            $percentage = $goal > 0 ? ($revenue / $goal) * 100 : 0;
            return [
                'id' => (int) $branch['idfilial'],
                'name' => $branch['nome'],
                'revenue' => $revenue,
                'growth' => $this->change($revenue, $previous),
                'target' => $goal,
                'target_percentage' => $percentage,
                'status' => $goal <= 0 ? 'unconfigured' : ($percentage >= 100 ? 'above' : ($percentage >= 70 ? 'on_track' : 'below')),
            ];
        }, $data['branches']);
        $data['evolution'] = array_map(fn (array $item): array => [
            'date' => $item['dia'],
            'revenue' => (float) $item['receita'],
            'previous_revenue' => (float) $item['receita_anterior'],
        ], $data['evolution']);
        $data['summary'] = [
            'company_name' => (string) ($data['summary']['company_name'] ?? 'Empresa'),
            'branches_total' => (int) ($data['summary']['branches_total'] ?? 0),
            'branches_with_activity' => (int) ($data['summary']['branches_with_activity'] ?? 0),
            'branches_without_activity' => (int) ($data['summary']['branches_without_activity'] ?? 0),
            'last_sync' => (string) ($data['summary']['last_sync'] ?? date(DATE_ATOM)),
        ];

        return $data;
    }

    private function change(float $current, float $previous): float
    {
        if ($previous <= 0) return $current > 0 ? 100 : 0;
        return (($current - $previous) / $previous) * 100;
    }
}
