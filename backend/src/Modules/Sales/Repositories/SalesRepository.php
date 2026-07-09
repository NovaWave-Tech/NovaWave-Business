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
                    v.forma_pagamento, v.a_prazo, v.parcelas, v.juros_atraso,
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
                    v.forma_pagamento, v.a_prazo, v.parcelas, v.juros_atraso,
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
                'SELECT permite_estoque_negativo, caixa_obrigatorio FROM filial WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1',
                ['company_id' => $companyId, 'branch' => $branchId]
            );
            if (!$branch) {
                throw new InvalidArgumentException('Filial invalida');
            }

            $payment = (string) ($data['forma_pagamento'] ?? 'dinheiro');
            $onCredit = !empty($data['a_prazo']);
            // Parcelamento: crediario (a prazo) ou cartao de credito (operadora).
            $installments = $onCredit || $payment === 'cartao_credito'
                ? max(1, min(24, (int) ($data['parcelas'] ?? 1)))
                : 1;
            $lateFee = $onCredit ? max(0.0, min(100.0, (float) ($data['juros_atraso'] ?? 0))) : 0.0;

            $customerId = !empty($data['idcliente']) ? (int) $data['idcliente'] : null;
            if ($customerId !== null) {
                $customer = $this->one(
                    'SELECT permite_venda_prazo FROM cliente WHERE idempresa = :company_id AND idcliente = :customer',
                    ['company_id' => $companyId, 'customer' => $customerId]
                );
                if (!$customer) {
                    throw new InvalidArgumentException('Cliente invalido');
                }
                if ($onCredit && !$this->truthy($customer['permite_venda_prazo'])) {
                    throw new InvalidArgumentException('Cliente nao habilitado para venda a prazo. Ajuste o cadastro do cliente.');
                }
            } else {
                if ($onCredit) {
                    throw new InvalidArgumentException('Venda a prazo exige um cliente identificado');
                }
                $customerId = $this->resolveDefaultCustomer($companyId);
            }

            // Somente dinheiro passa pelo caixa fisico (movimentacao tipo 3);
            // as demais formas entram apenas no relatorio do dia.
            $cashRegister = null;
            if (!$onCredit && $payment === 'dinheiro') {
                $cashRegister = $this->one(
                    'SELECT idcaixa FROM caixa WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1 ORDER BY idcaixa DESC LIMIT 1 FOR UPDATE',
                    ['company_id' => $companyId, 'branch' => $branchId]
                ) ?: null;
                if (!$cashRegister && $this->truthy($branch['caixa_obrigatorio'])) {
                    throw new InvalidArgumentException('Abra o caixa da filial para registrar vendas em dinheiro');
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
                'INSERT INTO venda (idempresa, idfilial, idcliente, idusuario, valor_bruto, valor_desconto, valor_total, situacao, forma_pagamento, a_prazo, parcelas, juros_atraso)
                 VALUES (:company_id, :branch, :customer, :actor, :gross, :discount, :total, 1, :payment, :on_credit, :installments, :late_fee)
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
                'payment' => $payment,
                'on_credit' => $onCredit ? 'true' : 'false',
                'installments' => $installments,
                'late_fee' => $lateFee,
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

            if (!$onCredit && $cashRegister && $total > 0) {
                $this->pdo->prepare(
                    'INSERT INTO movimentacao_caixa (idempresa, idfilial, idcaixa, idusuario, tipo, descricao, valor, situacao)
                     VALUES (:company_id, :branch, :register, :actor, 3, :description, :amount, 1)'
                )->execute([
                    'company_id' => $companyId,
                    'branch' => $branchId,
                    'register' => (int) $cashRegister['idcaixa'],
                    'actor' => $actorId,
                    'description' => "Venda #{$saleId} ({$payment})",
                    'amount' => $total,
                ]);
            }

            if ($onCredit && $total > 0) {
                $this->createReceivables($companyId, $branchId, $customerId, $saleId, $total, $installments, $payment, $lateFee);
            }

            $this->audit($companyId, $actorId, $saleId, 'criar', null, ['valor_total' => $total, 'itens' => count($lines), 'forma_pagamento' => $payment, 'a_prazo' => $onCredit, 'parcelas' => $installments, 'juros_atraso' => $lateFee], $ip, $agent);
            return $saleId;
        });
    }

    /**
     * Gera as parcelas da venda a prazo em conta_receber: valores iguais com
     * ajuste de centavos na ultima, vencimentos mensais a partir de +30 dias.
     * O percentual de juros por atraso fica registrado nas observacoes de
     * cada parcela (a cobranca efetiva e lancada no recebimento).
     */
    private function createReceivables(int $companyId, int $branchId, int $customerId, int $saleId, float $total, int $installments, string $payment, float $lateFee): void
    {
        $base = floor(($total / $installments) * 100) / 100;
        $notes = $lateFee > 0
            ? sprintf('Juros de %s%% ao mes em caso de atraso.', rtrim(rtrim(number_format($lateFee, 2, '.', ''), '0'), '.'))
            : null;
        $statement = $this->pdo->prepare(
            'INSERT INTO conta_receber (idempresa, idfilial, idcliente, idvenda, descricao, valor, data_vencimento, situacao, forma_pagamento, parcela_numero, parcelas_total, observacoes)
             VALUES (:company_id, :branch, :customer, :sale, :description, :amount, :due_date, 1, :payment, :number, :total_installments, :notes)'
        );
        for ($number = 1; $number <= $installments; $number++) {
            $amount = $number === $installments
                ? round($total - $base * ($installments - 1), 2)
                : $base;
            $statement->execute([
                'company_id' => $companyId,
                'branch' => $branchId,
                'customer' => $customerId,
                'sale' => $saleId,
                'description' => "Venda #{$saleId} - parcela {$number}/{$installments}",
                'amount' => $amount,
                'due_date' => (new \DateTimeImmutable('today'))->modify("+{$number} month")->format('Y-m-d'),
                'payment' => $payment,
                'number' => $number,
                'total_installments' => $installments,
                'notes' => $notes,
            ]);
        }
    }

    /** Normaliza booleanos vindos do PDO/pgsql (bool nativo ou 't'/'f'). */
    private function truthy(mixed $value): bool
    {
        return in_array($value, [true, 't', 'true', 1, '1'], true);
    }

    public function setStatus(int $companyId, int $actorId, int $saleId, int $status, ?string $ip, ?string $agent): void
    {
        $this->transaction(function () use ($companyId, $actorId, $saleId, $status, $ip, $agent) {
            $sale = $this->one(
                'SELECT idfilial, situacao, valor_total, forma_pagamento, a_prazo FROM venda WHERE idempresa = :company_id AND idvenda = :sale FOR UPDATE',
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

                // Estorno no caixa (tipo 4 = saida) quando a venda a vista
                // registrou entrada e ainda ha caixa aberto na filial.
                if (!$this->truthy($sale['a_prazo']) && (float) $sale['valor_total'] > 0) {
                    $register = $this->one(
                        'SELECT idcaixa FROM caixa WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1 ORDER BY idcaixa DESC LIMIT 1 FOR UPDATE',
                        ['company_id' => $companyId, 'branch' => (int) $sale['idfilial']]
                    );
                    $hadCashEntry = $this->one(
                        'SELECT 1 FROM movimentacao_caixa WHERE idempresa = :company_id AND tipo = 3 AND situacao = 1 AND descricao LIKE :document LIMIT 1',
                        ['company_id' => $companyId, 'document' => "Venda #{$saleId} (%"]
                    );
                    if ($register && $hadCashEntry) {
                        $this->pdo->prepare(
                            'INSERT INTO movimentacao_caixa (idempresa, idfilial, idcaixa, idusuario, tipo, descricao, valor, situacao)
                             VALUES (:company_id, :branch, :register, :actor, 4, :description, :amount, 1)'
                        )->execute([
                            'company_id' => $companyId,
                            'branch' => (int) $sale['idfilial'],
                            'register' => (int) $register['idcaixa'],
                            'actor' => $actorId,
                            'description' => "Estorno venda #{$saleId}",
                            'amount' => (float) $sale['valor_total'],
                        ]);
                    }
                }

                // Cancela as parcelas pendentes da venda a prazo.
                $this->pdo->prepare(
                    'UPDATE conta_receber SET situacao = 3, atualizado_em = CURRENT_TIMESTAMP
                     WHERE idempresa = :company_id AND idvenda = :sale AND situacao = 1'
                )->execute(['company_id' => $companyId, 'sale' => $saleId]);
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

    /**
     * Vendas sem cliente informado sao vinculadas ao cliente padrao da
     * empresa "CONSUMIDOR FINAL" (criado sob demanda, uma vez por empresa).
     */
    private function resolveDefaultCustomer(int $companyId): int
    {
        $existing = $this->one(
            "SELECT idcliente FROM cliente WHERE idempresa = :company_id AND nome = 'CONSUMIDOR FINAL' ORDER BY idcliente LIMIT 1",
            ['company_id' => $companyId]
        );
        if ($existing) {
            return (int) $existing['idcliente'];
        }
        $statement = $this->pdo->prepare(
            "INSERT INTO cliente (idempresa, tipo_pessoa, nome, situacao)
             VALUES (:company_id, 1, 'CONSUMIDOR FINAL', 1)
             RETURNING idcliente"
        );
        $statement->execute(['company_id' => $companyId]);
        return (int) $statement->fetchColumn();
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
            'forma_pagamento' => $sale['forma_pagamento'] ?? null,
            'a_prazo' => $this->truthy($sale['a_prazo'] ?? false),
            'parcelas' => (int) ($sale['parcelas'] ?? 1),
            'juros_atraso' => (float) ($sale['juros_atraso'] ?? 0),
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
