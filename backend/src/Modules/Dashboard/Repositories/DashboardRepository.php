<?php

namespace App\Modules\Dashboard\Repositories;

use App\Infrastructures\Config\Database;
use PDO;

final class DashboardRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function get(int $companyId, string $period): array
    {
        $range = $this->periodRange($period);
        $params = [
            'company_id' => $companyId,
            'start_date' => $range['start'],
            'end_date' => $range['end'],
            'previous_start' => $range['previous_start'],
            'previous_end' => $range['previous_end'],
        ];

        $kpis = $this->fetchOne(
            "WITH sales AS (
               SELECT v.*, COALESCE((SELECT SUM(vi.quantidade * p.preco_custo)
                 FROM venda_item vi JOIN produto p ON p.idempresa = vi.idempresa AND p.idproduto = vi.idproduto
                 WHERE vi.idempresa = v.idempresa AND vi.idvenda = v.idvenda AND vi.situacao = 1), 0) AS custo
               FROM venda v WHERE v.idempresa = :company_id AND v.situacao <> 4
             )
             SELECT
               COALESCE(SUM(valor_total) FILTER (WHERE data_venda::date = CURRENT_DATE), 0) AS receita_dia,
               COALESCE(SUM(valor_total) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE)), 0) AS receita_mes,
               COALESCE(SUM(valor_total) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month' AND data_venda < date_trunc('month', CURRENT_DATE)), 0) AS receita_mes_anterior,
               COALESCE(SUM(valor_total) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 year' AND data_venda < date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'), 0) AS receita_mes_ano_anterior,
               COALESCE(SUM(valor_total - custo) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE)), 0) AS lucro_mes,
               COALESCE(AVG(valor_total) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE)), 0) AS ticket_medio,
               COUNT(*) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE)) AS pedidos,
               COUNT(DISTINCT idcliente) FILTER (WHERE data_venda >= date_trunc('month', CURRENT_DATE) AND idcliente IS NOT NULL) AS clientes,
               COALESCE(SUM(valor_total) FILTER (WHERE data_venda >= :start_date AND data_venda < :end_date), 0) AS receita_periodo,
               COALESCE(SUM(valor_total) FILTER (WHERE data_venda >= :previous_start AND data_venda < :previous_end), 0) AS receita_anterior,
               COALESCE(SUM(valor_total - custo) FILTER (WHERE data_venda >= :start_date AND data_venda < :end_date), 0) AS lucro_periodo,
               COALESCE(SUM(valor_total - custo) FILTER (WHERE data_venda >= :previous_start AND data_venda < :previous_end), 0) AS lucro_anterior,
               COUNT(*) FILTER (WHERE data_venda >= :start_date AND data_venda < :end_date) AS pedidos_periodo,
               COUNT(*) FILTER (WHERE data_venda >= :previous_start AND data_venda < :previous_end) AS pedidos_anterior
             FROM sales",
            $params
        );

        $goal = $this->fetchOne(
            "SELECT COALESCE(
               (SELECT valor_meta FROM meta_venda
                WHERE idempresa = :company_id AND idfilial IS NULL
                  AND competencia = date_trunc('month', CURRENT_DATE)::date),
               (SELECT SUM(valor_meta) FROM meta_venda
                WHERE idempresa = :company_id AND idfilial IS NOT NULL
                  AND competencia = date_trunc('month', CURRENT_DATE)::date), 0
             ) AS valor_meta",
            ['company_id' => $companyId]
        );

        $branches = $this->fetchAll(
            "WITH current_sales AS (
               SELECT idfilial, SUM(valor_total) AS vendido
               FROM venda WHERE idempresa = :company_id AND situacao <> 4
                 AND data_venda >= date_trunc('month', CURRENT_DATE)
               GROUP BY idfilial
             ), previous_sales AS (
               SELECT idfilial, SUM(valor_total) AS vendido
               FROM venda WHERE idempresa = :company_id AND situacao <> 4
                 AND data_venda >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                 AND data_venda < date_trunc('month', CURRENT_DATE)
               GROUP BY idfilial
             )
             SELECT f.idfilial, f.nome,
                    COALESCE(cs.vendido, 0) AS receita,
                    COALESCE(ps.vendido, 0) AS receita_anterior,
                    COALESCE(m.valor_meta, 0) AS meta
             FROM filial f
             LEFT JOIN current_sales cs ON cs.idfilial = f.idfilial
             LEFT JOIN previous_sales ps ON ps.idfilial = f.idfilial
             LEFT JOIN meta_venda m ON m.idempresa = f.idempresa AND m.idfilial = f.idfilial
               AND m.competencia = date_trunc('month', CURRENT_DATE)::date
             WHERE f.idempresa = :company_id AND f.situacao = 1
             ORDER BY COALESCE(cs.vendido, 0) DESC, f.nome
             LIMIT 10",
            ['company_id' => $companyId]
        );

        $evolution = $this->fetchAll(
            "WITH days AS (
               SELECT generate_series(:start_date::date, (:end_date::date - 1), INTERVAL '1 day')::date AS dia
             ), current_sales AS (
               SELECT data_venda::date AS dia, SUM(valor_total) AS receita
               FROM venda WHERE idempresa = :company_id AND situacao <> 4
                 AND data_venda >= :start_date AND data_venda < :end_date
               GROUP BY data_venda::date
             ), previous_sales AS (
               SELECT (data_venda::date + (:start_date::date - :previous_start::date)) AS dia,
                      SUM(valor_total) AS receita
               FROM venda WHERE idempresa = :company_id AND situacao <> 4
                 AND data_venda >= :previous_start AND data_venda < :previous_end
               GROUP BY data_venda::date
             )
             SELECT d.dia, COALESCE(c.receita, 0) AS receita,
                    COALESCE(p.receita, 0) AS receita_anterior
             FROM days d LEFT JOIN current_sales c ON c.dia = d.dia
             LEFT JOIN previous_sales p ON p.dia = d.dia ORDER BY d.dia",
            $params
        );

        return [
            'kpis' => $kpis,
            'goal' => $goal,
            'summary' => $this->summary($companyId, $range),
            'branches' => $branches,
            'evolution' => $evolution,
            'alerts' => $this->alerts($companyId, $branches),
            'activities' => $this->activities($companyId),
            'period' => $period,
        ];
    }

    private function summary(int $companyId, array $range): array
    {
        return $this->fetchOne(
            "SELECT e.nome_fantasia AS company_name,
               COUNT(f.idfilial) FILTER (WHERE f.situacao = 1) AS branches_total,
               COUNT(f.idfilial) FILTER (WHERE f.situacao = 1 AND EXISTS (
                 SELECT 1 FROM venda v WHERE v.idempresa=e.idempresa AND v.idfilial=f.idfilial
                   AND v.situacao<>4 AND v.data_venda>=:start_date AND v.data_venda<:end_date
               )) AS branches_with_activity,
               COUNT(f.idfilial) FILTER (WHERE f.situacao = 1 AND NOT EXISTS (
                 SELECT 1 FROM venda v WHERE v.idempresa=e.idempresa AND v.idfilial=f.idfilial
                   AND v.situacao<>4 AND v.data_venda>=:start_date AND v.data_venda<:end_date
               )) AS branches_without_activity,
               CURRENT_TIMESTAMP AS last_sync
             FROM empresa e LEFT JOIN filial f ON f.idempresa=e.idempresa
             WHERE e.idempresa=:company_id
             GROUP BY e.idempresa, e.nome_fantasia",
            [
                'company_id' => $companyId,
                'start_date' => $range['start'],
                'end_date' => $range['end'],
            ]
        );
    }

    private function alerts(int $companyId, array $branches): array
    {
        $alerts = [];
        foreach ($branches as $branch) {
            $goal = (float) $branch['meta'];
            $sold = (float) $branch['receita'];
            if ($goal > 0 && $sold / $goal < 0.6) {
                $alerts[] = ['type' => 'warning', 'title' => 'Filial abaixo da meta', 'description' => $branch['nome'] . ' atingiu menos de 60% da meta mensal.', 'occurred_at' => date(DATE_ATOM)];
            }
        }

        $operational = $this->fetchOne(
            "SELECT
               (SELECT COUNT(*) FROM estoque e JOIN produto p ON p.idempresa=e.idempresa AND p.idproduto=e.idproduto
                WHERE e.idempresa=:company_id AND e.situacao=1 AND e.quantidade <= p.estoque_minimo) AS estoque_critico,
               (SELECT COUNT(*) FROM conta_pagar WHERE idempresa=:company_id AND situacao=1 AND data_vencimento <= CURRENT_DATE) AS contas_vencendo,
               (SELECT COUNT(*) FROM caixa WHERE idempresa=:company_id AND situacao=1) AS caixas_abertos",
            ['company_id' => $companyId]
        );
        if ((int) $operational['estoque_critico'] > 0) {
            $alerts[] = ['type' => 'danger', 'title' => 'Estoque critico', 'description' => $operational['estoque_critico'] . ' produtos exigem reposicao.', 'occurred_at' => date(DATE_ATOM)];
        }
        if ((int) $operational['contas_vencendo'] > 0) {
            $alerts[] = ['type' => 'warning', 'title' => 'Contas vencendo', 'description' => $operational['contas_vencendo'] . ' contas vencidas ou com vencimento hoje.', 'occurred_at' => date(DATE_ATOM)];
        }
        return array_slice($alerts, 0, 8);
    }

    private function activities(int $companyId): array
    {
        return $this->fetchAll(
            "SELECT * FROM (
               SELECT 'sale' AS type, 'Venda registrada' AS title, f.nome AS branch,
                      v.valor_total AS value, v.criado_em AS occurred_at
               FROM venda v JOIN filial f ON f.idempresa=v.idempresa AND f.idfilial=v.idfilial
               WHERE v.idempresa=:company_id AND v.situacao<>4
               UNION ALL
               SELECT 'purchase', 'Compra realizada', f.nome, c.valor_total, c.criado_em
               FROM compra c JOIN filial f ON f.idempresa=c.idempresa AND f.idfilial=c.idfilial
               WHERE c.idempresa=:company_id AND c.situacao<>4
               UNION ALL
               SELECT 'customer', 'Novo cliente', NULL, NULL, criado_em FROM cliente WHERE idempresa=:company_id
               UNION ALL
               SELECT 'product', 'Produto criado', NULL, NULL, criado_em FROM produto WHERE idempresa=:company_id
               UNION ALL
               SELECT 'cash', 'Caixa aberto', f.nome, c.saldo_inicial, c.criado_em
               FROM caixa c JOIN filial f ON f.idempresa=c.idempresa AND f.idfilial=c.idfilial
               WHERE c.idempresa=:company_id
             ) activity ORDER BY occurred_at DESC LIMIT 12",
            ['company_id' => $companyId]
        );
    }

    private function periodRange(string $period): array
    {
        $end = new \DateTimeImmutable('tomorrow midnight');
        $days = match ($period) {
            'today' => 1,
            '7d' => 7,
            '90d' => 90,
            'year' => max(1, (int) (new \DateTimeImmutable('first day of january'))->diff($end)->days),
            default => 30,
        };
        $start = $period === 'year'
            ? new \DateTimeImmutable('first day of january midnight')
            : $end->modify('-' . $days . ' days');
        $previousEnd = $start;
        $previousStart = $previousEnd->modify('-' . $days . ' days');
        return [
            'start' => $start->format('Y-m-d H:i:s'),
            'end' => $end->format('Y-m-d H:i:s'),
            'previous_start' => $previousStart->format('Y-m-d H:i:s'),
            'previous_end' => $previousEnd->format('Y-m-d H:i:s'),
        ];
    }

    private function fetchOne(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function fetchAll(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
