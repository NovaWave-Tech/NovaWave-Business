<?php

namespace App\Modules\Inventory\Repositories;

use App\Infrastructures\Config\Database;
use PDO;

final class InventoryRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        $where = ['e.idempresa = :company_id'];
        $params = ['company_id' => $companyId];
        if (($filters['branch'] ?? '') !== '') {
            $where[] = 'e.idfilial = :branch';
            $params['branch'] = (int) $filters['branch'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(p.nome ILIKE :q OR p.sku ILIKE :q OR p.codigo_barras ILIKE :q)';
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
        }
        if (($filters['status'] ?? '') === 'critical') {
            $where[] = 'e.quantidade > 0 AND e.quantidade <= p.estoque_minimo';
        } elseif (($filters['status'] ?? '') === 'zero') {
            $where[] = 'e.quantidade <= 0';
        } elseif (($filters['status'] ?? '') === 'ok') {
            $where[] = 'e.quantidade > p.estoque_minimo';
        }
        if (($filters['category'] ?? '') !== '') {
            $where[] = 'p.idcategoria = :category';
            $params['category'] = (int) $filters['category'];
        }

        $rows = $this->all(
            "SELECT e.idestoque, e.idproduto, e.idfilial, p.nome produto, p.sku, p.codigo_barras,
                    p.unidade, p.preco_custo, p.preco_venda, p.estoque_minimo minimo, p.estoque_maximo maximo,
                    f.nome filial, e.quantidade, e.quantidade_reservada reservado,
                    (e.quantidade - e.quantidade_reservada) disponivel,
                    (e.quantidade * p.preco_custo) valor,
                    (SELECT MAX(me.criado_em) FROM movimentacao_estoque me
                     WHERE me.idempresa = e.idempresa AND me.idfilial = e.idfilial AND me.idproduto = e.idproduto
                    ) ultima_movimentacao
             FROM estoque e
             JOIN produto p ON p.idempresa = e.idempresa AND p.idproduto = e.idproduto
             JOIN filial f ON f.idempresa = e.idempresa AND f.idfilial = e.idfilial
             WHERE " . implode(' AND ', $where) . "
             ORDER BY (e.quantidade <= 0) DESC, (e.quantidade <= p.estoque_minimo) DESC, p.nome, f.nome
             LIMIT 500",
            $params
        );

        return [
            'items' => array_map(fn ($row) => $this->normalize($row), $rows),
            'metrics' => $this->metrics($companyId, $filters),
            'options' => $this->options($companyId),
        ];
    }

    private function metrics(int $companyId, array $filters): array
    {
        $where = ['e.idempresa = :company_id'];
        $params = ['company_id' => $companyId];
        if (($filters['branch'] ?? '') !== '') {
            $where[] = 'e.idfilial = :branch';
            $params['branch'] = (int) $filters['branch'];
        }
        $base = $this->one(
            "SELECT COUNT(DISTINCT e.idproduto) FILTER (WHERE e.quantidade > 0) skus,
                    COALESCE(SUM(e.quantidade), 0) items,
                    COALESCE(SUM(e.quantidade * p.preco_custo), 0) value,
                    COUNT(*) FILTER (WHERE e.quantidade > 0 AND e.quantidade <= p.estoque_minimo) critical,
                    COUNT(*) FILTER (WHERE e.quantidade <= 0) ruptures,
                    COUNT(DISTINCT e.idfilial) FILTER (WHERE e.quantidade > 0) branches
             FROM estoque e
             JOIN produto p ON p.idempresa = e.idempresa AND p.idproduto = e.idproduto
             WHERE " . implode(' AND ', $where),
            $params
        );
        return [
            'skus' => (int) ($base['skus'] ?? 0),
            'items' => (float) ($base['items'] ?? 0),
            'value' => (float) ($base['value'] ?? 0),
            'critical' => (int) ($base['critical'] ?? 0),
            'ruptures' => (int) ($base['ruptures'] ?? 0),
            'branches' => (int) ($base['branches'] ?? 0),
        ];
    }

    private function options(int $companyId): array
    {
        return [
            'branches' => $this->all(
                'SELECT idfilial id, nome FROM filial WHERE idempresa = :company_id AND situacao = 1 ORDER BY matriz DESC, nome',
                ['company_id' => $companyId]
            ),
            'categories' => $this->all(
                'SELECT idcategoria id, nome FROM categoria_produto WHERE idempresa = :company_id ORDER BY nome',
                ['company_id' => $companyId]
            ),
            'products' => array_map(fn ($product) => [
                'id' => (int) $product['id'],
                'nome' => $product['nome'],
                'sku' => $product['sku'],
                'unidade' => $product['unidade'],
            ], $this->all(
                'SELECT idproduto id, nome, sku, unidade FROM produto WHERE idempresa = :company_id AND situacao = 1 ORDER BY nome LIMIT 1000',
                ['company_id' => $companyId]
            )),
        ];
    }

    private function normalize(array $row): array
    {
        $quantity = (float) $row['quantidade'];
        $minimum = (float) $row['minimo'];
        $status = $quantity <= 0 ? 'ruptura' : ($quantity <= $minimum ? 'critico' : 'ok');
        return [
            'idestoque' => (int) $row['idestoque'],
            'idproduto' => (int) $row['idproduto'],
            'idfilial' => (int) $row['idfilial'],
            'produto' => $row['produto'],
            'sku' => $row['sku'],
            'codigo_barras' => $row['codigo_barras'],
            'unidade' => $row['unidade'],
            'filial' => $row['filial'],
            'quantidade' => $quantity,
            'reservado' => (float) $row['reservado'],
            'disponivel' => (float) $row['disponivel'],
            'minimo' => $minimum,
            'maximo' => (float) $row['maximo'],
            'preco_custo' => (float) $row['preco_custo'],
            'preco_venda' => (float) $row['preco_venda'],
            'valor' => (float) $row['valor'],
            'status' => $status,
            'ultima_movimentacao' => $row['ultima_movimentacao'],
        ];
    }

    private function one(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function all(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
