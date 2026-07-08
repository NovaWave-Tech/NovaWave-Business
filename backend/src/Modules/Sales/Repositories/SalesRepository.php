<?php

namespace App\Modules\Sales\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class SalesRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        [$start, $end] = $this->range($filters);
        $where = ['v.idempresa = :company_id'];
        $params = ['company_id' => $companyId, 'start' => $start, 'end' => $end];
        $where[] = 'v.data_venda::date BETWEEN :start AND :end';
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'v.situacao = :status';
            $params['status'] = (int) $filters['status'];
        }
        if (($filters['branch'] ?? '') !== '') {
            $where[] = 'v.idfilial = :branch';
            $params['branch'] = (int) $filters['branch'];
        }
        if (!empty($filters['q'])) {
            $where[] = "(c.nome ILIKE :q OR CAST(v.idvenda AS TEXT) = :raw)";
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
            $params['raw'] = preg_replace('/\D/', '', (string) $filters['q']) ?: '-1';
        }

        $sales = $this->all(
            "SELECT v.idvenda, v.data_venda, v.valor_bruto, v.valor_desconto, v.valor_total, v.situacao,
                    COALESCE(c.nome, 'Consumidor final') cliente, c.idcliente,
                    f.nome filial, COALESCE(u.nome, '-') usuario,
                    COALESCE(i.itens, 0) itens, COALESCE(i.quantidade, 0) quantidade
             FROM venda v
             JOIN filial f ON f.idempresa = v.idempresa AND f.idfilial = v.idfilial
             LEFT JOIN cliente c ON c.idempresa = v.idempresa AND c.idcliente = v.idcliente
             LEFT JOIN usuario u ON u.idempresa = v.idempresa AND u.idusuario = v.idusuario
             LEFT JOIN (
                SELECT idempresa, idvenda, COUNT(*) itens, SUM(quantidade) quantidade
                FROM venda_item WHERE situacao = 1 GROUP BY idempresa, idvenda
             ) i ON i.idempresa = v.idempresa AND i.idvenda = v.idvenda
             WHERE " . implode(' AND ', $where) . "
             ORDER BY v.data_venda DESC, v.idvenda DESC
             LIMIT 300",
            $params
        );

        return [
            'sales' => array_map(fn ($sale) => $this->normalizeSale($sale), $sales),
            'metrics' => $this->metrics($companyId, $start, $end),
            'options' => $this->options($companyId),
        ];
    }

    public function show(int $companyId, int $saleId): ?array
    {
        $sale = $this->one(
            "SELECT v.idvenda, v.data_venda, v.valor_bruto, v.valor_desconto, v.valor_total, v.situacao,
                    v.idcliente, v.idfilial, COALESCE(c.nome, 'Consumidor final') cliente,
                    c.documento cliente_documento, f.nome filial, COALESCE(u.nome, '-') usuario, v.criado_em
             FROM venda v
             JOIN filial f ON f.idempresa = v.idempresa AND f.idfilial = v.idfilial
             LEFT JOIN cliente c ON c.idempresa = v.idempresa AND c.idcliente = v.idcliente
             LEFT JOIN usuario u ON u.idempresa = v.idempresa AND u.idusuario = v.idusuario
             WHERE v.idempresa = :company_id AND v.idvenda = :sale_id",
            ['company_id' => $companyId, 'sale_id' => $saleId]
        );
        if (!$sale) {
            return null;
        }
        $items = $this->all(
            "SELECT vi.idvenda_item, vi.idproduto, p.nome produto, p.unidade, p.sku,
                    vi.quantidade, vi.valor_unitario, vi.valor_desconto, vi.valor_total
             FROM venda_item vi
             JOIN produto p ON p.idempresa = vi.idempresa AND p.idproduto = vi.idproduto
             WHERE vi.idempresa = :company_id AND vi.idvenda = :sale_id AND vi.situacao = 1
             ORDER BY vi.idvenda_item",
            ['company_id' => $companyId, 'sale_id' => $saleId]
        );
        $history = $this->all(
            "SELECT a.idauditoria, a.acao, a.criado_em, COALESCE(u.nome, 'Sistema') usuario
             FROM auditoria a
             LEFT JOIN usuario u ON u.idempresa = a.idempresa AND u.idusuario = a.idusuario
             WHERE a.idempresa = :company_id AND a.tabela = 'venda' AND a.registro_id = :sale_id
             ORDER BY a.criado_em DESC LIMIT 20",
            ['company_id' => $companyId, 'sale_id' => $saleId]
        );
        return [
            ...$this->normalizeSale($sale),
            'items' => array_map(fn ($item) => [
                ...$item,
                'idproduto' => (int) $item['idproduto'],
                'quantidade' => (float) $item['quantidade'],
                'valor_unitario' => (float) $item['valor_unitario'],
                'valor_desconto' => (float) $item['valor_desconto'],
                'valor_total' => (float) $item['valor_total'],
            ], $items),
            'history' => $history,
        ];
    }

    public function receipt(int $companyId, int $saleId): ?array
    {
        $sale = $this->show($companyId, $saleId);
        if (!$sale) {
            return null;
        }
        $company = $this->one(
            'SELECT razao_social, nome_fantasia, cnpj, email, telefone, endereco, numero, bairro, cidade, estado, cep
             FROM empresa WHERE idempresa = :company_id',
            ['company_id' => $companyId]
        );
        $branch = $this->one(
            'SELECT idfilial, nome, codigo, cnpj, matriz, email, telefone, endereco, numero, bairro, cidade, estado, cep
             FROM filial WHERE idempresa = :company_id AND idfilial = :branch',
            ['company_id' => $companyId, 'branch' => (int) $sale['idfilial']]
        );
        $customer = null;
        if (!empty($sale['idcliente'])) {
            $customer = $this->one(
                'SELECT nome, documento, email, telefone FROM cliente WHERE idempresa = :company_id AND idcliente = :customer',
                ['company_id' => $companyId, 'customer' => (int) $sale['idcliente']]
            ) ?: null;
        }
        return [
            'sale' => $sale,
            'company' => $company,
            'branch' => $branch ? [...$branch, 'idfilial' => (int) $branch['idfilial'], 'matriz' => (bool) $branch['matriz']] : null,
            'customer' => $customer,
            'issued_at' => date(DATE_ATOM),
        ];
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        return $this->transaction(function () use ($companyId, $actorId, $data, $ip, $agent) {
            $branchId = (int) $data['idfilial'];
            $branch = $this->one(
                'SELECT permite_estoque_negativo FROM filial WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1',
                ['company_id' => $companyId, 'branch' => $branchId]
            );
            if (!$branch) {
                throw new InvalidArgumentException('Filial invalida');
            }
            $customerId = !empty($data['idcliente']) ? (int) $data['idcliente'] : null;
            if ($customerId !== null) {
                $customer = $this->one(
                    'SELECT 1 FROM cliente WHERE idempresa = :company_id AND idcliente = :customer',
                    ['company_id' => $companyId, 'customer' => $customerId]
                );
                if (!$customer) {
                    throw new InvalidArgumentException('Cliente invalido');
                }
            }

            $lines = $this->normalizeItems($companyId, $data['items'] ?? []);
            $gross = 0.0;
            $itemDiscount = 0.0;
            foreach ($lines as $line) {
                $gross += $line['quantidade'] * $line['valor_unitario'];
                $itemDiscount += $line['valor_desconto'];
            }
            $headerDiscount = max(0.0, (float) ($data['valor_desconto'] ?? 0));
            $discount = $itemDiscount + $headerDiscount;
            $total = max(0.0, $gross - $discount);

            $statement = $this->pdo->prepare(
                'INSERT INTO venda (idempresa, idfilial, idcliente, idusuario, valor_bruto, valor_desconto, valor_total, situacao)
                 VALUES (:company_id, :branch, :customer, :actor, :gross, :discount, :total, 1)
                 RETURNING idvenda'
            );
            $statement->execute([
                'company_id' => $companyId,
                'branch' => $branchId,
                'customer' => $customerId,
                'actor' => $actorId,
                'gross' => $gross,
                'discount' => $discount,
                'total' => $total,
            ]);
            $saleId = (int) $statement->fetchColumn();

            foreach ($lines as $line) {
                $lineTotal = max(0.0, $line['quantidade'] * $line['valor_unitario'] - $line['valor_desconto']);
                $this->pdo->prepare(
                    'INSERT INTO venda_item (idempresa, idfilial, idvenda, idproduto, quantidade, valor_unitario, valor_desconto, valor_total, situacao)
                     VALUES (:company_id, :branch, :sale, :product, :quantity, :unit, :discount, :total, 1)'
                )->execute([
                    'company_id' => $companyId,
                    'branch' => $branchId,
                    'sale' => $saleId,
                    'product' => $line['idproduto'],
                    'quantity' => $line['quantidade'],
                    'unit' => $line['valor_unitario'],
                    'discount' => $line['valor_desconto'],
                    'total' => $lineTotal,
                ]);
                $this->moveStock($companyId, $actorId, $branchId, $line['idproduto'], $line['quantidade'], 2, "Venda #{$saleId}", (bool) $branch['permite_estoque_negativo']);
            }

            $this->audit($companyId, $actorId, $saleId, 'criar', null, ['valor_total' => $total, 'itens' => count($lines)], $ip, $agent);
            return $saleId;
        });
    }

    public function setStatus(int $companyId, int $actorId, int $saleId, int $status, ?string $ip, ?string $agent): void
    {
        $this->transaction(function () use ($companyId, $actorId, $saleId, $status, $ip, $agent) {
            $sale = $this->one(
                'SELECT idfilial, situacao FROM venda WHERE idempresa = :company_id AND idvenda = :sale FOR UPDATE',
                ['company_id' => $companyId, 'sale' => $saleId]
            );
            if (!$sale) {
                throw new InvalidArgumentException('Venda nao encontrada');
            }
            if ((int) $sale['situacao'] === $status) {
                return;
            }
            $this->pdo->prepare(
                'UPDATE venda SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idvenda = :sale'
            )->execute(['status' => $status, 'company_id' => $companyId, 'sale' => $saleId]);

            if ($status === 4 && (int) $sale['situacao'] !== 4) {
                $items = $this->all(
                    'SELECT idproduto, quantidade FROM venda_item WHERE idempresa = :company_id AND idvenda = :sale AND situacao = 1',
                    ['company_id' => $companyId, 'sale' => $saleId]
                );
                foreach ($items as $item) {
                    $this->moveStock($companyId, $actorId, (int) $sale['idfilial'], (int) $item['idproduto'], (float) $item['quantidade'], 1, "Cancelamento venda #{$saleId}", true);
                }
            }

            $this->audit($companyId, $actorId, $saleId, $status === 4 ? 'cancelar' : 'atualizar', ['situacao' => (int) $sale['situacao']], ['situacao' => $status], $ip, $agent);
        });
    }

    private function normalizeItems(int $companyId, array $items): array
    {
        if (!is_array($items) || count($items) === 0) {
            throw new InvalidArgumentException('Adicione ao menos um produto a venda');
        }
        $lines = [];
        foreach ($items as $item) {
            $productId = (int) ($item['idproduto'] ?? 0);
            $quantity = (float) ($item['quantidade'] ?? 0);
            if ($productId <= 0 || $quantity <= 0) {
                continue;
            }
            $product = $this->one(
                'SELECT preco_venda FROM produto WHERE idempresa = :company_id AND idproduto = :product AND situacao = 1',
                ['company_id' => $companyId, 'product' => $productId]
            );
            if (!$product) {
                throw new InvalidArgumentException('Produto invalido na venda');
            }
            $unit = isset($item['valor_unitario']) && $item['valor_unitario'] !== ''
                ? max(0.0, (float) $item['valor_unitario'])
                : (float) $product['preco_venda'];
            $lines[] = [
                'idproduto' => $productId,
                'quantidade' => $quantity,
                'valor_unitario' => $unit,
                'valor_desconto' => max(0.0, (float) ($item['valor_desconto'] ?? 0)),
            ];
        }
        if (count($lines) === 0) {
            throw new InvalidArgumentException('Adicione ao menos um produto a venda');
        }
        return $lines;
    }

    private function moveStock(int $companyId, int $actorId, int $branchId, int $productId, float $quantity, int $type, string $document, bool $branchAllowsNegative): void
    {
        $product = $this->one(
            'SELECT permite_estoque_negativo FROM produto WHERE idempresa = :company_id AND idproduto = :product',
            ['company_id' => $companyId, 'product' => $productId]
        );
        $current = $this->one(
            'SELECT quantidade FROM estoque WHERE idempresa = :company_id AND idfilial = :branch AND idproduto = :product FOR UPDATE',
            ['company_id' => $companyId, 'branch' => $branchId, 'product' => $productId]
        );
        $before = (float) ($current['quantidade'] ?? 0);
        $after = $type === 1 ? $before + $quantity : $before - $quantity;
        if ($after < 0 && !$branchAllowsNegative && empty($product['permite_estoque_negativo'])) {
            throw new InvalidArgumentException('Estoque insuficiente para concluir a venda');
        }
        $this->pdo->prepare(
            'INSERT INTO estoque (idempresa, idfilial, idproduto, quantidade, situacao)
             VALUES (:company_id, :branch, :product, :quantity, 1)
             ON CONFLICT (idempresa, idfilial, idproduto)
             DO UPDATE SET quantidade = EXCLUDED.quantidade, atualizado_em = CURRENT_TIMESTAMP'
        )->execute(['company_id' => $companyId, 'branch' => $branchId, 'product' => $productId, 'quantity' => $after]);
        $this->pdo->prepare(
            'INSERT INTO movimentacao_estoque (idempresa, idfilial, idproduto, idusuario, tipo, quantidade, documento_referencia, situacao)
             VALUES (:company_id, :branch, :product, :actor, :type, :quantity, :document, 1)'
        )->execute(['company_id' => $companyId, 'branch' => $branchId, 'product' => $productId, 'actor' => $actorId, 'type' => $type, 'quantity' => $quantity, 'document' => $document]);
    }

    private function metrics(int $companyId, string $start, string $end): array
    {
        $base = $this->one(
            "SELECT COUNT(*) FILTER (WHERE situacao = 1) sales,
                    COUNT(*) FILTER (WHERE situacao = 4) cancelled,
                    COALESCE(SUM(valor_total) FILTER (WHERE situacao = 1), 0) revenue,
                    COALESCE(AVG(valor_total) FILTER (WHERE situacao = 1), 0) average_ticket,
                    COALESCE(SUM(valor_desconto) FILTER (WHERE situacao = 1), 0) discount
             FROM venda WHERE idempresa = :company_id AND data_venda::date BETWEEN :start AND :end",
            ['company_id' => $companyId, 'start' => $start, 'end' => $end]
        );
        $items = $this->one(
            "SELECT COALESCE(SUM(vi.quantidade), 0) quantity
             FROM venda_item vi JOIN venda v ON v.idempresa = vi.idempresa AND v.idvenda = vi.idvenda
             WHERE vi.idempresa = :company_id AND vi.situacao = 1 AND v.situacao = 1
               AND v.data_venda::date BETWEEN :start AND :end",
            ['company_id' => $companyId, 'start' => $start, 'end' => $end]
        );
        return [
            'sales' => (int) ($base['sales'] ?? 0),
            'cancelled' => (int) ($base['cancelled'] ?? 0),
            'revenue' => (float) ($base['revenue'] ?? 0),
            'average_ticket' => (float) ($base['average_ticket'] ?? 0),
            'discount' => (float) ($base['discount'] ?? 0),
            'items_sold' => (float) ($items['quantity'] ?? 0),
        ];
    }

    private function options(int $companyId): array
    {
        return [
            'branches' => $this->all(
                'SELECT idfilial id, nome FROM filial WHERE idempresa = :company_id AND situacao = 1 ORDER BY matriz DESC, nome',
                ['company_id' => $companyId]
            ),
            'customers' => $this->all(
                'SELECT idcliente id, nome, documento FROM cliente WHERE idempresa = :company_id AND situacao = 1 ORDER BY nome LIMIT 500',
                ['company_id' => $companyId]
            ),
            'products' => array_map(fn ($product) => [
                'id' => (int) $product['id'],
                'nome' => $product['nome'],
                'sku' => $product['sku'],
                'codigo_barras' => $product['codigo_barras'],
                'unidade' => $product['unidade'],
                'preco_venda' => (float) $product['preco_venda'],
                'estoque' => (float) $product['estoque'],
            ], $this->all(
                "SELECT p.idproduto id, p.nome, p.sku, p.codigo_barras, p.unidade, p.preco_venda,
                        COALESCE(e.stock, 0) estoque
                 FROM produto p
                 LEFT JOIN (SELECT idempresa, idproduto, SUM(quantidade) stock FROM estoque GROUP BY idempresa, idproduto) e
                        ON e.idempresa = p.idempresa AND e.idproduto = p.idproduto
                 WHERE p.idempresa = :company_id AND p.situacao = 1
                 ORDER BY p.nome LIMIT 1000",
                ['company_id' => $companyId]
            )),
        ];
    }

    private function range(array $filters): array
    {
        $pattern = '/^\d{4}-\d{2}-\d{2}$/';
        $start = $filters['start'] ?? null;
        $end = $filters['end'] ?? null;
        if ($start && $end && preg_match($pattern, (string) $start) && preg_match($pattern, (string) $end)) {
            return $start <= $end ? [$start, $end] : [$end, $start];
        }
        $today = new \DateTimeImmutable('today');
        return [$today->modify('-29 days')->format('Y-m-d'), $today->format('Y-m-d')];
    }

    private function normalizeSale(array $sale): array
    {
        return [
            ...$sale,
            'idvenda' => (int) $sale['idvenda'],
            'situacao' => (int) $sale['situacao'],
            'valor_bruto' => (float) $sale['valor_bruto'],
            'valor_desconto' => (float) $sale['valor_desconto'],
            'valor_total' => (float) $sale['valor_total'],
            'itens' => (int) ($sale['itens'] ?? 0),
            'quantidade' => (float) ($sale['quantidade'] ?? 0),
        ];
    }

    private function audit(int $companyId, int $actorId, int $saleId, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'venda', :sale, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'sale' => $saleId,
            'action' => $action,
            'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null,
            'ip' => $ip,
            'device' => $agent ? substr($agent, 0, 150) : null,
        ]);
    }

    private function transaction(callable $callback): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $callback();
            $this->pdo->commit();
            return $result;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
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
