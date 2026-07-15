<?php

namespace App\Modules\Purchases\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class PurchasesRepository
{
    /** Formas de pagamento aceitas na compra. */
    private const PAYMENTS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia'];

    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        [$start, $end] = $this->range($filters);
        $where = ['c.idempresa = :company_id', 'c.data_compra::date BETWEEN :start AND :end'];
        $params = ['company_id' => $companyId, 'start' => $start, 'end' => $end];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'c.situacao = :status';
            $params['status'] = (int) $filters['status'];
        }
        if (($filters['branch'] ?? '') !== '') {
            $where[] = 'c.idfilial = :branch';
            $params['branch'] = (int) $filters['branch'];
        }
        if (($filters['supplier'] ?? '') !== '') {
            $where[] = 'c.idfornecedor = :supplier';
            $params['supplier'] = (int) $filters['supplier'];
        }
        if (!empty($filters['q'])) {
            $where[] = "(COALESCE(fo.nome_fantasia, fo.razao_social) ILIKE :q OR CAST(c.idcompra AS TEXT) = :raw)";
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
            $params['raw'] = preg_replace('/\D/', '', (string) $filters['q']) ?: '-1';
        }

        $purchases = $this->all(
            "SELECT c.idcompra, c.data_compra, c.valor_total, c.situacao, c.idfornecedor,
                    c.forma_pagamento, c.a_prazo, c.parcelas,
                    COALESCE(fo.nome_fantasia, fo.razao_social, 'Sem fornecedor') fornecedor,
                    f.nome filial, COALESCE(u.nome, '-') usuario,
                    COALESCE(i.itens, 0) itens, COALESCE(i.quantidade, 0) quantidade
             FROM compra c
             JOIN filial f ON f.idempresa = c.idempresa AND f.idfilial = c.idfilial
             LEFT JOIN fornecedor fo ON fo.idempresa = c.idempresa AND fo.idfornecedor = c.idfornecedor
             LEFT JOIN usuario u ON u.idempresa = c.idempresa AND u.idusuario = c.idusuario
             LEFT JOIN (
                SELECT idempresa, idcompra, COUNT(*) itens, SUM(quantidade) quantidade
                FROM compra_item WHERE situacao = 1 GROUP BY idempresa, idcompra
             ) i ON i.idempresa = c.idempresa AND i.idcompra = c.idcompra
             WHERE " . implode(' AND ', $where) . "
             ORDER BY c.data_compra DESC, c.idcompra DESC
             LIMIT 300",
            $params
        );

        return [
            'purchases' => array_map(fn ($purchase) => $this->normalize($purchase), $purchases),
            'metrics' => $this->metrics($companyId, $start, $end),
            'options' => $this->options($companyId),
        ];
    }

    public function show(int $companyId, int $purchaseId): ?array
    {
        $purchase = $this->one(
            "SELECT c.idcompra, c.data_compra, c.valor_total, c.situacao, c.idfornecedor, c.idfilial,
                    c.forma_pagamento, c.a_prazo, c.parcelas,
                    COALESCE(fo.nome_fantasia, fo.razao_social, 'Sem fornecedor') fornecedor,
                    f.nome filial, COALESCE(u.nome, '-') usuario, c.criado_em
             FROM compra c
             JOIN filial f ON f.idempresa = c.idempresa AND f.idfilial = c.idfilial
             LEFT JOIN fornecedor fo ON fo.idempresa = c.idempresa AND fo.idfornecedor = c.idfornecedor
             LEFT JOIN usuario u ON u.idempresa = c.idempresa AND u.idusuario = c.idusuario
             WHERE c.idempresa = :company_id AND c.idcompra = :purchase_id",
            ['company_id' => $companyId, 'purchase_id' => $purchaseId]
        );
        if (!$purchase) {
            return null;
        }
        $items = $this->all(
            "SELECT ci.idcompra_item, ci.idproduto, p.nome produto, p.unidade, p.sku,
                    ci.quantidade, ci.valor_unitario, ci.valor_total
             FROM compra_item ci
             JOIN produto p ON p.idempresa = ci.idempresa AND p.idproduto = ci.idproduto
             WHERE ci.idempresa = :company_id AND ci.idcompra = :purchase_id AND ci.situacao = 1
             ORDER BY ci.idcompra_item",
            ['company_id' => $companyId, 'purchase_id' => $purchaseId]
        );
        $history = $this->all(
            "SELECT a.idauditoria, a.acao, a.criado_em, COALESCE(u.nome, 'Sistema') usuario
             FROM auditoria a
             LEFT JOIN usuario u ON u.idempresa = a.idempresa AND u.idusuario = a.idusuario
             WHERE a.idempresa = :company_id AND a.tabela = 'compra' AND a.registro_id = :purchase_id
             ORDER BY a.criado_em DESC LIMIT 20",
            ['company_id' => $companyId, 'purchase_id' => $purchaseId]
        );
        return [
            ...$this->normalize($purchase),
            'items' => array_map(fn ($item) => [
                ...$item,
                'idproduto' => (int) $item['idproduto'],
                'quantidade' => (float) $item['quantidade'],
                'valor_unitario' => (float) $item['valor_unitario'],
                'valor_total' => (float) $item['valor_total'],
            ], $items),
            'history' => $history,
        ];
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        return $this->transaction(function () use ($companyId, $actorId, $data, $ip, $agent) {
            $branchId = (int) $data['idfilial'];
            if (!$this->one('SELECT 1 FROM filial WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1', ['company_id' => $companyId, 'branch' => $branchId])) {
                throw new InvalidArgumentException('Filial invalida');
            }
            $supplierId = !empty($data['idfornecedor']) ? (int) $data['idfornecedor'] : null;
            if ($supplierId !== null && !$this->one('SELECT 1 FROM fornecedor WHERE idempresa = :company_id AND idfornecedor = :supplier', ['company_id' => $companyId, 'supplier' => $supplierId])) {
                throw new InvalidArgumentException('Fornecedor invalido');
            }

            $payment = (string) ($data['forma_pagamento'] ?? 'dinheiro');
            if (!in_array($payment, self::PAYMENTS, true)) {
                throw new InvalidArgumentException('Forma de pagamento invalida');
            }
            $onCredit = !empty($data['a_prazo']);
            $installments = $onCredit ? max(1, min(24, (int) ($data['parcelas'] ?? 1))) : 1;

            $lines = $this->normalizeItems($companyId, $data['items'] ?? []);
            $total = 0.0;
            foreach ($lines as $line) {
                $total += $line['quantidade'] * $line['valor_unitario'];
            }

            $statement = $this->pdo->prepare(
                'INSERT INTO compra (idempresa, idfilial, idfornecedor, idusuario, valor_total, situacao, forma_pagamento, a_prazo, parcelas)
                 VALUES (:company_id, :branch, :supplier, :actor, :total, 1, :payment, :on_credit, :installments) RETURNING idcompra'
            );
            $statement->execute([
                'company_id' => $companyId,
                'branch' => $branchId,
                'supplier' => $supplierId,
                'actor' => $actorId,
                'total' => $total,
                'payment' => $payment,
                'on_credit' => $onCredit ? 'true' : 'false',
                'installments' => $installments,
            ]);
            $purchaseId = (int) $statement->fetchColumn();

            foreach ($lines as $line) {
                $lineTotal = $line['quantidade'] * $line['valor_unitario'];
                $this->pdo->prepare(
                    'INSERT INTO compra_item (idempresa, idfilial, idcompra, idproduto, quantidade, valor_unitario, valor_total, situacao)
                     VALUES (:company_id, :branch, :purchase, :product, :quantity, :unit, :total, 1)'
                )->execute([
                    'company_id' => $companyId,
                    'branch' => $branchId,
                    'purchase' => $purchaseId,
                    'product' => $line['idproduto'],
                    'quantity' => $line['quantidade'],
                    'unit' => $line['valor_unitario'],
                    'total' => $lineTotal,
                ]);
                $this->moveStock($companyId, $actorId, $branchId, $line['idproduto'], $line['quantidade'], 1, "Compra #{$purchaseId}", true);
            }

            // Toda compra concluida vira obrigacao no Financeiro: a prazo gera
            // as parcelas em aberto; a vista gera uma conta ja quitada.
            if ($total > 0) {
                $this->createPayables($companyId, $branchId, $supplierId, $purchaseId, $total, $installments, $payment, $onCredit);
            }

            $this->audit($companyId, $actorId, $purchaseId, 'criar', null, [
                'valor_total' => $total,
                'itens' => count($lines),
                'forma_pagamento' => $payment,
                'a_prazo' => $onCredit,
                'parcelas' => $installments,
            ], $ip, $agent);
            return $purchaseId;
        });
    }

    /**
     * Gera as contas a pagar da compra. A prazo: parcelas iguais (ajuste de
     * centavos na ultima) com vencimentos mensais a partir de +30 dias. A
     * vista: uma unica conta ja quitada na data da compra.
     */
    private function createPayables(int $companyId, int $branchId, ?int $supplierId, int $purchaseId, float $total, int $installments, string $payment, bool $onCredit): void
    {
        $today = new \DateTimeImmutable('today');
        if (!$onCredit) {
            $this->pdo->prepare(
                'INSERT INTO conta_pagar (idempresa, idfilial, idfornecedor, idcompra, descricao, valor, data_vencimento, data_pagamento, situacao, forma_pagamento, parcela_numero, parcelas_total)
                 VALUES (:company_id, :branch, :supplier, :purchase, :description, :amount, :date, :date, 2, :payment, 1, 1)'
            )->execute([
                'company_id' => $companyId,
                'branch' => $branchId,
                'supplier' => $supplierId,
                'purchase' => $purchaseId,
                'description' => "Compra #{$purchaseId}",
                'amount' => $total,
                'date' => $today->format('Y-m-d'),
                'payment' => $payment,
            ]);
            return;
        }

        $base = floor(($total / $installments) * 100) / 100;
        $statement = $this->pdo->prepare(
            'INSERT INTO conta_pagar (idempresa, idfilial, idfornecedor, idcompra, descricao, valor, data_vencimento, situacao, forma_pagamento, parcela_numero, parcelas_total)
             VALUES (:company_id, :branch, :supplier, :purchase, :description, :amount, :due_date, 1, :payment, :number, :total_installments)'
        );
        for ($number = 1; $number <= $installments; $number++) {
            $amount = $number === $installments
                ? round($total - $base * ($installments - 1), 2)
                : $base;
            $statement->execute([
                'company_id' => $companyId,
                'branch' => $branchId,
                'supplier' => $supplierId,
                'purchase' => $purchaseId,
                'description' => "Compra #{$purchaseId} - parcela {$number}/{$installments}",
                'amount' => $amount,
                'due_date' => $today->modify("+{$number} month")->format('Y-m-d'),
                'payment' => $payment,
                'number' => $number,
                'total_installments' => $installments,
            ]);
        }
    }

    public function setStatus(int $companyId, int $actorId, int $purchaseId, int $status, ?string $ip, ?string $agent): void
    {
        $this->transaction(function () use ($companyId, $actorId, $purchaseId, $status, $ip, $agent) {
            $purchase = $this->one(
                'SELECT idfilial, situacao FROM compra WHERE idempresa = :company_id AND idcompra = :purchase FOR UPDATE',
                ['company_id' => $companyId, 'purchase' => $purchaseId]
            );
            if (!$purchase) {
                throw new InvalidArgumentException('Compra nao encontrada');
            }
            if ((int) $purchase['situacao'] === $status) {
                return;
            }
            $this->pdo->prepare(
                'UPDATE compra SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idcompra = :purchase'
            )->execute(['status' => $status, 'company_id' => $companyId, 'purchase' => $purchaseId]);

            if ($status === 4 && (int) $purchase['situacao'] !== 4) {
                $items = $this->all(
                    'SELECT idproduto, quantidade FROM compra_item WHERE idempresa = :company_id AND idcompra = :purchase AND situacao = 1',
                    ['company_id' => $companyId, 'purchase' => $purchaseId]
                );
                foreach ($items as $item) {
                    $this->moveStock($companyId, $actorId, (int) $purchase['idfilial'], (int) $item['idproduto'], (float) $item['quantidade'], 2, "Cancelamento compra #{$purchaseId}", true);
                }

                // Estorna a obrigacao no Financeiro: parcelas em aberto (a
                // prazo) e a conta ja quitada (a vista) sao canceladas.
                $this->pdo->prepare(
                    'UPDATE conta_pagar SET situacao = 3, data_pagamento = NULL, atualizado_em = CURRENT_TIMESTAMP
                     WHERE idempresa = :company_id AND idcompra = :purchase AND situacao IN (1, 2)'
                )->execute(['company_id' => $companyId, 'purchase' => $purchaseId]);
            }

            $this->audit($companyId, $actorId, $purchaseId, $status === 4 ? 'cancelar' : 'atualizar', ['situacao' => (int) $purchase['situacao']], ['situacao' => $status], $ip, $agent);
        });
    }

    private function normalizeItems(int $companyId, array $items): array
    {
        if (!is_array($items) || count($items) === 0) {
            throw new InvalidArgumentException('Adicione ao menos um produto a compra');
        }
        $lines = [];
        foreach ($items as $item) {
            $productId = (int) ($item['idproduto'] ?? 0);
            $quantity = (float) ($item['quantidade'] ?? 0);
            if ($productId <= 0 || $quantity <= 0) {
                continue;
            }
            $product = $this->one(
                'SELECT preco_custo FROM produto WHERE idempresa = :company_id AND idproduto = :product AND situacao = 1',
                ['company_id' => $companyId, 'product' => $productId]
            );
            if (!$product) {
                throw new InvalidArgumentException('Produto invalido na compra');
            }
            $unit = isset($item['valor_unitario']) && $item['valor_unitario'] !== ''
                ? max(0.0, (float) $item['valor_unitario'])
                : (float) $product['preco_custo'];
            $lines[] = [
                'idproduto' => $productId,
                'quantidade' => $quantity,
                'valor_unitario' => $unit,
            ];
        }
        if (count($lines) === 0) {
            throw new InvalidArgumentException('Adicione ao menos um produto a compra');
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
            throw new InvalidArgumentException('Estoque insuficiente para a operacao');
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
            "SELECT COUNT(*) FILTER (WHERE situacao = 1) purchases,
                    COUNT(*) FILTER (WHERE situacao = 4) cancelled,
                    COALESCE(SUM(valor_total) FILTER (WHERE situacao = 1), 0) total,
                    COALESCE(AVG(valor_total) FILTER (WHERE situacao = 1), 0) average_ticket,
                    COUNT(DISTINCT idfornecedor) FILTER (WHERE situacao = 1 AND idfornecedor IS NOT NULL) suppliers
             FROM compra WHERE idempresa = :company_id AND data_compra::date BETWEEN :start AND :end",
            ['company_id' => $companyId, 'start' => $start, 'end' => $end]
        );
        $items = $this->one(
            "SELECT COALESCE(SUM(ci.quantidade), 0) quantity
             FROM compra_item ci JOIN compra c ON c.idempresa = ci.idempresa AND c.idcompra = ci.idcompra
             WHERE ci.idempresa = :company_id AND ci.situacao = 1 AND c.situacao = 1
               AND c.data_compra::date BETWEEN :start AND :end",
            ['company_id' => $companyId, 'start' => $start, 'end' => $end]
        );
        return [
            'purchases' => (int) ($base['purchases'] ?? 0),
            'cancelled' => (int) ($base['cancelled'] ?? 0),
            'total' => (float) ($base['total'] ?? 0),
            'average_ticket' => (float) ($base['average_ticket'] ?? 0),
            'suppliers' => (int) ($base['suppliers'] ?? 0),
            'items_bought' => (float) ($items['quantity'] ?? 0),
        ];
    }

    private function options(int $companyId): array
    {
        return [
            'branches' => $this->all(
                'SELECT idfilial id, nome FROM filial WHERE idempresa = :company_id AND situacao = 1 ORDER BY matriz DESC, nome',
                ['company_id' => $companyId]
            ),
            'suppliers' => $this->all(
                "SELECT idfornecedor id, COALESCE(nome_fantasia, razao_social) nome FROM fornecedor WHERE idempresa = :company_id AND situacao = 1 ORDER BY nome LIMIT 500",
                ['company_id' => $companyId]
            ),
            // Categorias para o cadastro rapido de produto direto na compra.
            'categories' => $this->all(
                'SELECT idcategoria id, nome FROM categoria_produto WHERE idempresa = :company_id AND situacao = 1 ORDER BY nome',
                ['company_id' => $companyId]
            ),
            'products' => array_map(fn ($product) => [
                'id' => (int) $product['id'],
                'nome' => $product['nome'],
                'sku' => $product['sku'],
                'codigo_barras' => $product['codigo_barras'],
                'unidade' => $product['unidade'],
                'preco_custo' => (float) $product['preco_custo'],
                'estoque' => (float) $product['estoque'],
            ], $this->all(
                "SELECT p.idproduto id, p.nome, p.sku, p.codigo_barras, p.unidade, p.preco_custo,
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

    private function normalize(array $purchase): array
    {
        return [
            ...$purchase,
            'idcompra' => (int) $purchase['idcompra'],
            'situacao' => (int) $purchase['situacao'],
            'idfornecedor' => $purchase['idfornecedor'] !== null ? (int) $purchase['idfornecedor'] : null,
            'valor_total' => (float) $purchase['valor_total'],
            'itens' => (int) ($purchase['itens'] ?? 0),
            'quantidade' => (float) ($purchase['quantidade'] ?? 0),
            'forma_pagamento' => $purchase['forma_pagamento'] ?? null,
            'a_prazo' => in_array($purchase['a_prazo'] ?? false, [true, 't', 'true', 1, '1'], true),
            'parcelas' => (int) ($purchase['parcelas'] ?? 1),
        ];
    }

    private function audit(int $companyId, int $actorId, int $purchaseId, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'compra', :purchase, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'purchase' => $purchaseId,
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
