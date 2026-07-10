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

        $rows = $this->all(
            "SELECT cr.idconta_receber, cr.idvenda, cr.descricao, cr.valor, cr.data_vencimento,
                    cr.data_recebimento, cr.situacao, cr.forma_pagamento, cr.parcela_numero,
                    cr.parcelas_total, cr.juros, cr.multa, cr.desconto, cr.observacoes,
                    f.nome AS filial, f.idfilial,
                    COALESCE(v.juros_atraso, 0) AS juros_atraso,
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
        $totalOpen = 0.0;
        $totalOverdue = 0.0;
        $totalPaid = 0.0;
        foreach ($rows as $row) {
            $title = $this->normalizeTitle($row, $itemsBySale);
            if ((int) $row['situacao'] === 2) {
                $totalPaid += $title['valor_pago'];
                $paid[] = $title;
            } elseif ((int) $row['situacao'] === 1) {
                $totalOpen += $title['valor_com_juros'];
                if ($title['dias_atraso'] > 0) {
                    $totalOverdue += $title['valor_com_juros'];
                }
                $open[] = $title;
            }
        }

        return [
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
            'summary' => [
                'total_aberto' => round($totalOpen, 2),
                'total_vencido' => round($totalOverdue, 2),
                'total_pago' => round($totalPaid, 2),
                'abertos' => count($open),
                'pagos' => count($paid),
            ],
        ];
    }

    /**
     * Baixa (recebe) um titulo: situacao 2, data_recebimento hoje, forma de
     * pagamento escolhida e eventuais juros/multa/desconto aplicados.
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
                'SELECT situacao, valor FROM conta_receber WHERE idempresa = :company_id AND idconta_receber = :id FOR UPDATE',
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
            $this->audit($companyId, $actorId, $id, 'receber', null, [
                'forma_pagamento' => $payment,
                'juros' => $interest,
                'multa' => $fine,
                'desconto' => $discount,
            ], $ip, $agent);
        });
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
