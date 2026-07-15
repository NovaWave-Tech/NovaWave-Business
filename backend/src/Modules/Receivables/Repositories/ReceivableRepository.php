<?php

namespace App\Modules\Receivables\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class ReceivableRepository
{
    /** Formas de pagamento aceitas na baixa de um titulo. */
    private const PAYMENTS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia'];

    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    /**
     * Busca clientes para o autocomplete, priorizando quem tem titulos em
     * aberto. Retorna resumo de titulos (abertos/total) por cliente.
     */
    public function customers(int $companyId, string $term, int $limit = 8): array
    {
        $digits = preg_replace('/\D/', '', $term);
        $clauses = ['c.nome ILIKE :q', 'c.email ILIKE :q'];
        $params = ['company_id' => $companyId, 'q' => '%' . $term . '%', 'limit' => $limit];
        if ($digits !== '') {
            $clauses[] = 'c.documento LIKE :digits';
            $clauses[] = 'c.telefone LIKE :digits';
            $params['digits'] = '%' . $digits . '%';
        }
        $rows = $this->all(
            'SELECT c.idcliente, c.nome, c.documento, c.telefone,
                    COALESCE(cr.abertos, 0) AS titulos_abertos,
                    COALESCE(cr.total_aberto, 0) AS total_aberto
             FROM cliente c
             LEFT JOIN (SELECT idempresa, idcliente,
                               COUNT(*) FILTER (WHERE situacao = 1) AS abertos,
                               COALESCE(SUM(valor + juros + multa - desconto) FILTER (WHERE situacao = 1), 0) AS total_aberto
                        FROM conta_receber GROUP BY idempresa, idcliente) cr
               ON cr.idempresa = c.idempresa AND cr.idcliente = c.idcliente
             WHERE c.idempresa = :company_id AND (' . implode(' OR ', $clauses) . ')
             ORDER BY (COALESCE(cr.abertos, 0) > 0) DESC, c.nome
             LIMIT :limit',
            $params
        );
        return array_map(fn ($row) => [
            'idcliente' => (int) $row['idcliente'],
            'nome' => $row['nome'],
            'documento' => $row['documento'],
            'telefone' => $row['telefone'],
            'titulos_abertos' => (int) $row['titulos_abertos'],
            'total_aberto' => (float) $row['total_aberto'],
        ], $rows);
    }

    /**
     * Carrega os titulos de um cliente (abertos e pagos), com as parcelas,
     * juros por atraso projetados e os itens da venda que originou cada titulo.
     */
    public function index(int $companyId, int $customerId): array
    {
        $customer = $this->one(
            'SELECT idcliente, nome, documento, telefone, email, permite_venda_prazo
             FROM cliente WHERE idempresa = :company_id AND idcliente = :customer',
            ['company_id' => $companyId, 'customer' => $customerId]
        );
        if (!$customer) {
            throw new InvalidArgumentException('Cliente nao encontrado');
        }
        $company = $this->one(
            'SELECT razao_social, nome_fantasia, cnpj FROM empresa WHERE idempresa = :company_id',
            ['company_id' => $companyId]
        );

        $rows = $this->all(
            "SELECT cr.idconta_receber, cr.idvenda, cr.descricao, cr.valor, cr.data_vencimento,
                    cr.data_recebimento, cr.situacao, cr.forma_pagamento, cr.parcela_numero,
                    cr.parcelas_total, cr.juros, cr.multa, cr.desconto, cr.observacoes,
                    cr.atualizado_em, cr.criado_em,
                    f.nome AS filial, f.idfilial,
                    COALESCE(v.juros_atraso, 0) AS juros_atraso,
                    v.data_venda, v.valor_total AS venda_total, v.forma_pagamento AS venda_pagamento,
                    v.a_prazo AS venda_a_prazo,
                    GREATEST(0, (CURRENT_DATE - cr.data_vencimento)) AS dias_atraso
             FROM conta_receber cr
             LEFT JOIN filial f ON f.idempresa = cr.idempresa AND f.idfilial = cr.idfilial
             LEFT JOIN venda v ON v.idempresa = cr.idempresa AND v.idvenda = cr.idvenda
             WHERE cr.idempresa = :company_id AND cr.idcliente = :customer
             ORDER BY cr.situacao, cr.data_vencimento, cr.parcela_numero",
            ['company_id' => $companyId, 'customer' => $customerId]
        );

        $itemsBySale = $this->itemsBySale($companyId, $customerId);

        $open = [];
        $paid = [];
        $transactions = [];
        $pedidos = [];
        $totalOpen = 0.0;
        $totalOverdue = 0.0;
        $totalPaid = 0.0;
        foreach ($rows as $row) {
            $title = $this->normalizeTitle($row, $itemsBySale);
            $situacao = (int) $row['situacao'];
            if ($situacao === 2) {
                $totalPaid += $title['valor_pago'];
                $paid[] = $title;
                $transactions[] = $this->transactionFromTitle($row, $title);
            } elseif ($situacao === 1) {
                $totalOpen += $title['valor_com_juros'];
                if ($title['dias_atraso'] > 0) {
                    $totalOverdue += $title['valor_com_juros'];
                }
                $open[] = $title;
            }
            // Agrupa por venda (pedido). Ignora titulos avulsos (sem venda).
            if ($title['idvenda'] !== null && $situacao !== 3) {
                $this->accumulatePedido($pedidos, $row, $title);
            }
        }

        // Transacoes mais recentes primeiro.
        usort($transactions, fn ($a, $b) => strcmp((string) $b['data_hora'], (string) $a['data_hora']));

        [$pedidosAbertos, $pedidosBaixados] = $this->finalizePedidos($pedidos, $itemsBySale);

        return [
            'company' => [
                'razao_social' => $company['razao_social'] ?? null,
                'nome_fantasia' => $company['nome_fantasia'] ?? null,
                'cnpj' => $company['cnpj'] ?? null,
            ],
            'customer' => [
                'idcliente' => (int) $customer['idcliente'],
                'nome' => $customer['nome'],
                'documento' => $customer['documento'],
                'telefone' => $customer['telefone'],
                'email' => $customer['email'],
                'permite_venda_prazo' => $this->truthy($customer['permite_venda_prazo']),
            ],
            'titulos' => $open,
            'titulos_pagos' => $paid,
            'pedidos' => $pedidosAbertos,
            'pedidos_baixados' => $pedidosBaixados,
            'transacoes' => $transactions,
            'summary' => [
                'total_aberto' => round($totalOpen, 2),
                'total_vencido' => round($totalOverdue, 2),
                'total_pago' => round($totalPaid, 2),
                'abertos' => count($open),
                'pagos' => count($paid),
                'pedidos_abertos' => count($pedidosAbertos),
                'pedidos_baixados' => count($pedidosBaixados),
                'transacoes' => count($transactions),
            ],
        ];
    }

    /** Monta uma transacao (evento de pagamento) a partir de um titulo pago. */
    private function transactionFromTitle(array $row, array $title): array
    {
        return [
            'idconta_receber' => $title['idconta_receber'],
            'idvenda' => $title['idvenda'],
            'grupo' => $title['contrato'],
            'status' => 'Pago',
            'data_hora' => $row['atualizado_em'] ?: $row['criado_em'],
            'valor' => $title['valor_pago'],
            'origem' => sprintf('Parcela %d/%d', $title['parcela_numero'], $title['parcelas_total']),
            'meio' => $title['forma_pagamento'],
            'filial' => $title['filial'],
            'cliente' => null,
            'valor_base' => $title['valor'],
            'juros' => (float) $row['juros'],
            'multa' => (float) $row['multa'],
            'desconto' => (float) $row['desconto'],
            'data_vencimento' => $title['data_vencimento'],
            'data_recebimento' => $title['data_recebimento'],
            'parcela_numero' => $title['parcela_numero'],
            'parcelas_total' => $title['parcelas_total'],
            'items' => $title['items'],
        ];
    }

    /** Acumula os totais de um pedido (venda) a partir de cada titulo. */
    private function accumulatePedido(array &$pedidos, array $row, array $title): void
    {
        $saleId = $title['idvenda'];
        if (!isset($pedidos[$saleId])) {
            $pedidos[$saleId] = [
                'idvenda' => $saleId,
                'contrato' => $title['contrato'],
                'data_venda' => $row['data_venda'],
                'filial' => $title['filial'],
                'idfilial' => $title['idfilial'],
                'valor_total' => (float) ($row['venda_total'] ?? 0),
                'forma_pagamento' => $row['venda_pagamento'],
                'a_prazo' => $this->truthy($row['venda_a_prazo'] ?? false),
                'titulos_total' => 0,
                'titulos_pagos' => 0,
                'titulos_abertos' => 0,
                'parcelas_total' => $title['parcelas_total'],
                'valor_pago' => 0.0,
                'valor_aberto' => 0.0,
                'proximo_vencimento' => null,
            ];
        }
        $pedidos[$saleId]['titulos_total']++;
        if ($title['situacao'] === 2) {
            $pedidos[$saleId]['titulos_pagos']++;
            $pedidos[$saleId]['valor_pago'] += $title['valor_pago'];
        } elseif ($title['situacao'] === 1) {
            $pedidos[$saleId]['titulos_abertos']++;
            $pedidos[$saleId]['valor_aberto'] += $title['valor_com_juros'];
            $due = $title['data_vencimento'];
            if ($pedidos[$saleId]['proximo_vencimento'] === null || $due < $pedidos[$saleId]['proximo_vencimento']) {
                $pedidos[$saleId]['proximo_vencimento'] = $due;
            }
        }
    }

    /** Fecha os pedidos, separando os em aberto dos baixados (tudo pago). */
    private function finalizePedidos(array $pedidos, array $itemsBySale): array
    {
        $abertos = [];
        $baixados = [];
        foreach ($pedidos as $saleId => $pedido) {
            $pedido['valor_pago'] = round($pedido['valor_pago'], 2);
            $pedido['valor_aberto'] = round($pedido['valor_aberto'], 2);
            $pedido['baixado'] = $pedido['titulos_abertos'] === 0;
            $pedido['items'] = $itemsBySale[$saleId] ?? [];
            if ($pedido['baixado']) {
                $baixados[] = $pedido;
            } else {
                $abertos[] = $pedido;
            }
        }
        return [$abertos, $baixados];
    }

    /**
     * Baixa (recebe) um titulo: situacao 2, data_recebimento hoje, forma de
     * pagamento escolhida e eventuais juros/multa/desconto aplicados.
     *
     * Recebimento em dinheiro entra no caixa fisico da filial (movimentacao
     * tipo 3), espelhando a regra da venda a vista em dinheiro: se a filial
     * exige caixa (`caixa_obrigatorio`) e nao ha caixa aberto, a baixa e
     * recusada. As demais formas nao passam pelo caixa.
     */
    public function settle(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        $payment = (string) ($data['forma_pagamento'] ?? '');
        if (!in_array($payment, self::PAYMENTS, true)) {
            throw new InvalidArgumentException('Forma de pagamento invalida');
        }
        $interest = max(0.0, (float) ($data['juros'] ?? 0));
        $fine = max(0.0, (float) ($data['multa'] ?? 0));
        $discount = max(0.0, (float) ($data['desconto'] ?? 0));

        $this->transaction(function () use ($companyId, $actorId, $id, $payment, $interest, $fine, $discount, $ip, $agent) {
            $title = $this->one(
                'SELECT situacao, valor, idfilial, idvenda, parcela_numero, parcelas_total
                 FROM conta_receber WHERE idempresa = :company_id AND idconta_receber = :id FOR UPDATE',
                ['company_id' => $companyId, 'id' => $id]
            );
            if (!$title) {
                throw new InvalidArgumentException('Titulo nao encontrado');
            }
            if ((int) $title['situacao'] === 2) {
                throw new InvalidArgumentException('Titulo ja recebido');
            }
            if ((int) $title['situacao'] === 3) {
                throw new InvalidArgumentException('Titulo cancelado nao pode ser recebido');
            }
            if ($discount > (float) $title['valor'] + $interest + $fine) {
                throw new InvalidArgumentException('Desconto maior que o valor do titulo');
            }

            $cashRegister = $payment === 'dinheiro'
                ? $this->resolveCashRegister($companyId, $title['idfilial'])
                : null;

            $this->pdo->prepare(
                'UPDATE conta_receber
                    SET situacao = 2, data_recebimento = CURRENT_DATE, forma_pagamento = :payment,
                        juros = :interest, multa = :fine, desconto = :discount, atualizado_em = CURRENT_TIMESTAMP
                  WHERE idempresa = :company_id AND idconta_receber = :id'
            )->execute([
                'payment' => $payment,
                'interest' => $interest,
                'fine' => $fine,
                'discount' => $discount,
                'company_id' => $companyId,
                'id' => $id,
            ]);
            $received = round((float) $title['valor'] + $interest + $fine - $discount, 2);
            if ($cashRegister !== null && $received > 0) {
                $this->pdo->prepare(
                    'INSERT INTO movimentacao_caixa (idempresa, idfilial, idcaixa, idusuario, tipo, descricao, valor, situacao)
                     VALUES (:company_id, :branch, :register, :actor, 3, :description, :amount, 1)'
                )->execute([
                    'company_id' => $companyId,
                    'branch' => (int) $title['idfilial'],
                    'register' => (int) $cashRegister['idcaixa'],
                    'actor' => $actorId,
                    'description' => $this->cashDescription($id, $title),
                    'amount' => $received,
                ]);
            }

            $this->audit($companyId, $actorId, $id, 'receber', null, [
                'forma_pagamento' => $payment,
                'juros' => $interest,
                'multa' => $fine,
                'desconto' => $discount,
                'caixa' => $cashRegister !== null ? (int) $cashRegister['idcaixa'] : null,
            ], $ip, $agent);
        });
    }

    /**
     * Caixa aberto da filial para receber em dinheiro. Recusa quando a filial
     * exige caixa e nao ha nenhum aberto. Titulo sem filial nao passa no caixa.
     */
    private function resolveCashRegister(int $companyId, mixed $branchId): ?array
    {
        if ($branchId === null) {
            return null;
        }
        $branch = $this->one(
            'SELECT caixa_obrigatorio FROM filial WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1',
            ['company_id' => $companyId, 'branch' => (int) $branchId]
        );
        $register = $this->one(
            'SELECT idcaixa FROM caixa WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1
             ORDER BY idcaixa DESC LIMIT 1 FOR UPDATE',
            ['company_id' => $companyId, 'branch' => (int) $branchId]
        ) ?: null;
        if (!$register && $branch && $this->truthy($branch['caixa_obrigatorio'])) {
            throw new InvalidArgumentException('Abra o caixa da filial para receber em dinheiro');
        }
        return $register;
    }

    /** Descricao da entrada no caixa, referenciando a venda/parcela de origem. */
    private function cashDescription(int $id, array $title): string
    {
        $parcel = sprintf('parcela %d/%d', (int) $title['parcela_numero'], (int) $title['parcelas_total']);
        return $title['idvenda'] !== null
            ? sprintf('Recebimento venda #%d - %s', (int) $title['idvenda'], $parcel)
            : sprintf('Recebimento titulo #%d - %s', $id, $parcel);
    }

    /** Itens (produtos) das vendas a prazo do cliente, agrupados por venda. */
    private function itemsBySale(int $companyId, int $customerId): array
    {
        $rows = $this->all(
            'SELECT vi.idvenda, p.nome AS produto, p.unidade, vi.quantidade, vi.valor_unitario, vi.valor_total
             FROM venda_item vi
             JOIN venda v ON v.idempresa = vi.idempresa AND v.idvenda = vi.idvenda
             JOIN produto p ON p.idempresa = vi.idempresa AND p.idproduto = vi.idproduto
             WHERE vi.idempresa = :company_id AND v.idcliente = :customer AND vi.situacao = 1
             ORDER BY vi.idvenda, vi.idvenda_item',
            ['company_id' => $companyId, 'customer' => $customerId]
        );
        $grouped = [];
        foreach ($rows as $row) {
            $saleId = (int) $row['idvenda'];
            $grouped[$saleId][] = [
                'produto' => $row['produto'],
                'unidade' => $row['unidade'],
                'quantidade' => (float) $row['quantidade'],
                'valor_unitario' => (float) $row['valor_unitario'],
                'valor_total' => (float) $row['valor_total'],
            ];
        }
        return $grouped;
    }

    private function normalizeTitle(array $row, array $itemsBySale): array
    {
        $valor = (float) $row['valor'];
        $rate = (float) $row['juros_atraso'];
        $daysLate = (int) $row['dias_atraso'];
        // Juros por atraso pro rata: taxa mensal aplicada aos dias em atraso.
        $projectedInterest = $daysLate > 0 && $rate > 0
            ? round($valor * ($rate / 100) * ($daysLate / 30), 2)
            : 0.0;
        $saleId = $row['idvenda'] !== null ? (int) $row['idvenda'] : null;
        return [
            'idconta_receber' => (int) $row['idconta_receber'],
            'idvenda' => $saleId,
            'contrato' => $saleId !== null ? sprintf('%06d', $saleId) : '-',
            'descricao' => $row['descricao'],
            'valor' => $valor,
            'data_vencimento' => $row['data_vencimento'],
            'data_recebimento' => $row['data_recebimento'],
            'situacao' => (int) $row['situacao'],
            'forma_pagamento' => $row['forma_pagamento'],
            'parcela_numero' => (int) $row['parcela_numero'],
            'parcelas_total' => (int) $row['parcelas_total'],
            'filial' => $row['filial'],
            'idfilial' => $row['idfilial'] !== null ? (int) $row['idfilial'] : null,
            'juros_atraso' => $rate,
            'dias_atraso' => $daysLate,
            'juros_projetado' => $projectedInterest,
            'juros' => (float) $row['juros'],
            'multa' => (float) $row['multa'],
            'desconto' => (float) $row['desconto'],
            'valor_com_juros' => round($valor + $projectedInterest, 2),
            'valor_pago' => round($valor + (float) $row['juros'] + (float) $row['multa'] - (float) $row['desconto'], 2),
            'items' => $saleId !== null ? ($itemsBySale[$saleId] ?? []) : [],
        ];
    }

    private function truthy(mixed $value): bool
    {
        return in_array($value, [true, 't', 'true', 1, '1'], true);
    }

    private function audit(int $companyId, int $actorId, int $id, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'conta_receber', :id, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'id' => $id,
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
