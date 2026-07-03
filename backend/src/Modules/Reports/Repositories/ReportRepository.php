<?php

namespace App\Modules\Reports\Repositories;

use App\Infrastructures\Config\Database;
use PDO;

final class ReportRepository
{
    private PDO $pdo;
    public function __construct() { $this->pdo = Database::getInstance(); }

    public function catalog(int $companyId): array
    {
        $company = $this->one('SELECT nome_fantasia name FROM empresa WHERE idempresa=:company', ['company' => $companyId]);
        $branches = $this->all('SELECT idfilial id,nome name FROM filial WHERE idempresa=:company AND situacao=1 ORDER BY matriz DESC,nome', ['company' => $companyId]);
        return [
            'company' => $company['name'] ?? 'Empresa',
            'branches' => $branches,
            'reports' => $this->reportCatalog($companyId),
            'generated_at' => date(DATE_ATOM),
        ];
    }

    public function preview(int $companyId, int $userId, string $slug, array $filters): array
    {
        $end = $this->date($filters['end'] ?? date('Y-m-d'));
        $start = $this->date($filters['start'] ?? date('Y-m-d', strtotime('-29 days')));
        if ($start > $end) [$start, $end] = [$end, $start];
        $branch = !empty($filters['branch']) ? (int) $filters['branch'] : null;
        $params = ['company' => $companyId, 'start' => $start, 'end' => $end];
        $branchSale = $branch ? ' AND v.idfilial=:branch' : '';
        if ($branch) $params['branch'] = $branch;

        $meta = $this->one("SELECT e.nome_fantasia company,u.nome user_name FROM empresa e LEFT JOIN usuario u ON u.idempresa=e.idempresa AND u.idusuario=:user WHERE e.idempresa=:company", ['company' => $companyId, 'user' => $userId]);
        $sales = $this->one("SELECT COALESCE(SUM(v.valor_total),0) revenue,COUNT(*) orders,COALESCE(AVG(v.valor_total),0) average_ticket,COUNT(DISTINCT v.idcliente) customers FROM venda v WHERE v.idempresa=:company AND v.situacao<>4 AND v.data_venda::date BETWEEN :start AND :end{$branchSale}", $params);
        $finance = $this->one("SELECT COALESCE((SELECT SUM(valor+juros+multa-desconto) FROM conta_receber WHERE idempresa=:company AND situacao=2 AND data_recebimento BETWEEN :start AND :end),0) received,COALESCE((SELECT SUM(valor+juros+multa-desconto) FROM conta_pagar WHERE idempresa=:company AND situacao=2 AND data_pagamento BETWEEN :start AND :end),0) paid", ['company' => $companyId, 'start' => $start, 'end' => $end]);
        $rows = $this->rows($slug, $params, $branchSale);
        $chart = $this->all("SELECT v.data_venda::date date,ROUND(SUM(v.valor_total),2) value FROM venda v WHERE v.idempresa=:company AND v.situacao<>4 AND v.data_venda::date BETWEEN :start AND :end{$branchSale} GROUP BY 1 ORDER BY 1", $params);
        $branchName = $branch ? ($this->one('SELECT nome FROM filial WHERE idempresa=:company AND idfilial=:branch', ['company' => $companyId, 'branch' => $branch])['nome'] ?? 'Filial') : 'Todas as filiais';
        return [
            'meta' => ['company' => $meta['company'] ?? 'Empresa', 'branch' => $branchName, 'user' => $meta['user_name'] ?? 'Usuario', 'start' => $start, 'end' => $end, 'generated_at' => date(DATE_ATOM)],
            'kpis' => ['revenue' => (float) $sales['revenue'], 'orders' => (int) $sales['orders'], 'average_ticket' => (float) $sales['average_ticket'], 'customers' => (int) $sales['customers'], 'received' => (float) $finance['received'], 'paid' => (float) $finance['paid']],
            'chart' => $chart, 'rows' => $rows,
            'summary' => $this->summary($slug, $sales, $finance),
        ];
    }

    private function rows(string $slug, array $params, string $branchSale): array
    {
        return match ($slug) {
            'customers' => $this->all("SELECT c.nome name,c.documento document,c.cidade city,c.estado state,COUNT(v.idvenda) orders,COALESCE(SUM(v.valor_total),0) total FROM cliente c LEFT JOIN venda v ON v.idempresa=c.idempresa AND v.idcliente=c.idcliente AND v.situacao<>4 AND v.data_venda::date BETWEEN :start AND :end WHERE c.idempresa=:company GROUP BY c.idcliente ORDER BY total DESC LIMIT 100", array_diff_key($params, ['branch' => true])),
            'products', 'stock' => $this->all("SELECT p.sku,p.nome name,p.preco_venda price,COALESCE(SUM(e.quantidade),0) stock,COALESCE(SUM(e.quantidade*p.preco_custo),0) stock_value FROM produto p LEFT JOIN estoque e ON e.idempresa=p.idempresa AND e.idproduto=p.idproduto WHERE p.idempresa=:company GROUP BY p.idproduto ORDER BY stock_value DESC LIMIT 100", ['company' => $params['company']]),
            'finance' => $this->all("SELECT type,description,due_date,status,total FROM (SELECT 'Receita' type,descricao description,data_vencimento due_date,situacao status,valor+juros+multa-desconto total FROM conta_receber WHERE idempresa=:company UNION ALL SELECT 'Despesa',descricao,data_vencimento,situacao,valor+juros+multa-desconto FROM conta_pagar WHERE idempresa=:company) x WHERE due_date BETWEEN :start AND :end ORDER BY due_date DESC LIMIT 100", array_diff_key($params, ['branch' => true])),
            'purchases' => $this->all("SELECT c.idcompra id,c.data_compra date,f.nome branch,c.valor_total total,c.situacao status FROM compra c JOIN filial f ON f.idempresa=c.idempresa AND f.idfilial=c.idfilial WHERE c.idempresa=:company AND c.data_compra::date BETWEEN :start AND :end ORDER BY c.data_compra DESC LIMIT 100", array_diff_key($params, ['branch' => true])),
            default => $this->all("SELECT v.idvenda id,v.data_venda date,f.nome branch,COALESCE(c.nome,'Consumidor') customer,v.valor_total total,v.situacao status FROM venda v JOIN filial f ON f.idempresa=v.idempresa AND f.idfilial=v.idfilial LEFT JOIN cliente c ON c.idempresa=v.idempresa AND c.idcliente=v.idcliente WHERE v.idempresa=:company AND v.situacao<>4 AND v.data_venda::date BETWEEN :start AND :end{$branchSale} ORDER BY v.data_venda DESC LIMIT 100", $params),
        };
    }

    private function summary(string $slug, array $sales, array $finance): string
    {
        $balance = (float) $finance['received'] - (float) $finance['paid'];
        return sprintf('No periodo selecionado, o relatorio %s consolidou %d operacoes comerciais. O saldo financeiro realizado foi de R$ %s.', ucfirst($slug), (int) $sales['orders'], number_format($balance, 2, ',', '.'));
    }

    private function reportCatalog(int $companyId): array
    {
        $definitions = [
            ['slug' => 'executive', 'name' => 'Resumo executivo', 'description' => 'Visao consolidada dos principais indicadores da empresa.', 'category' => 'Executivo', 'metric' => 'sales'],
            ['slug' => 'finance', 'name' => 'DRE gerencial', 'description' => 'Receitas, despesas e resultado financeiro realizado.', 'category' => 'Financeiro', 'metric' => 'finance'],
            ['slug' => 'sales', 'name' => 'Vendas por filial', 'description' => 'Desempenho comercial detalhado por unidade e periodo.', 'category' => 'Vendas', 'metric' => 'sales'],
            ['slug' => 'customers', 'name' => 'Analise de clientes', 'description' => 'Compras, recorrencia e valor movimentado por cliente.', 'category' => 'Clientes', 'metric' => 'customers'],
            ['slug' => 'products', 'name' => 'Performance de produtos', 'description' => 'Catalogo, precificacao e valor de estoque.', 'category' => 'Produtos', 'metric' => 'products'],
            ['slug' => 'stock', 'name' => 'Posicao de estoque', 'description' => 'Saldo, cobertura e capital imobilizado em produtos.', 'category' => 'Estoque', 'metric' => 'products'],
            ['slug' => 'purchases', 'name' => 'Compras e fornecedores', 'description' => 'Evolucao de compras e compromissos com fornecedores.', 'category' => 'Compras', 'metric' => 'purchases'],
        ];
        $metrics = $this->catalogMetrics($companyId);
        return array_map(function (array $report) use ($metrics): array {
            $metric = $metrics[$report['metric']] ?? ['uses' => 0, 'last' => null];
            unset($report['metric']);
            return [
                ...$report,
                'uses' => (int) ($metric['uses'] ?? 0),
                'last' => $metric['last'] ?? null,
            ];
        }, $definitions);
    }

    private function catalogMetrics(int $companyId): array
    {
        return [
            'sales' => $this->one("SELECT COUNT(*) uses,MAX(data_venda)::date last FROM venda WHERE idempresa=:company AND situacao<>4", ['company' => $companyId]),
            'finance' => $this->one("SELECT COUNT(*) uses,MAX(due_date)::date last FROM (SELECT data_vencimento due_date FROM conta_receber WHERE idempresa=:company UNION ALL SELECT data_vencimento FROM conta_pagar WHERE idempresa=:company) x", ['company' => $companyId]),
            'customers' => $this->one('SELECT COUNT(*) uses,NULL last FROM cliente WHERE idempresa=:company', ['company' => $companyId]),
            'products' => $this->one('SELECT COUNT(*) uses,NULL last FROM produto WHERE idempresa=:company', ['company' => $companyId]),
            'purchases' => $this->one("SELECT COUNT(*) uses,MAX(data_compra)::date last FROM compra WHERE idempresa=:company", ['company' => $companyId]),
        ];
    }

    private function date(string $value): string { $date = \DateTimeImmutable::createFromFormat('Y-m-d', $value); return $date ? $date->format('Y-m-d') : date('Y-m-d'); }
    private function one(string $sql, array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetch(PDO::FETCH_ASSOC)?:[]; }
    private function all(string $sql, array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetchAll(PDO::FETCH_ASSOC); }
}
