<?php

namespace App\Modules\Cashier\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class CashierRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        $branchId = (int) ($filters['branch'] ?? 0);
        $branches = $this->all(
            'SELECT idfilial id, nome FROM filial WHERE idempresa = :company_id AND situacao = 1 ORDER BY matriz DESC, nome',
            ['company_id' => $companyId]
        );
        if ($branchId <= 0 && count($branches) > 0) {
            $branchId = (int) $branches[0]['id'];
        }

        $current = null;
        $open = $this->one(
            "SELECT c.idcaixa, c.idfilial, c.aberto_em, c.saldo_inicial, u.nome operador
             FROM caixa c JOIN usuario u ON u.idempresa = c.idempresa AND u.idusuario = c.idusuario_abertura
             WHERE c.idempresa = :company_id AND c.idfilial = :branch AND c.situacao = 1
             ORDER BY c.aberto_em DESC LIMIT 1",
            ['company_id' => $companyId, 'branch' => $branchId]
        );
        if ($open) {
            $cashId = (int) $open['idcaixa'];
            $totals = $this->totals($companyId, $cashId);
            $movements = $this->all(
                "SELECT m.idmovimentacao_caixa, m.tipo, m.descricao, m.valor, m.criado_em, COALESCE(u.nome, '-') usuario
                 FROM movimentacao_caixa m
                 LEFT JOIN usuario u ON u.idempresa = m.idempresa AND u.idusuario = m.idusuario
                 WHERE m.idempresa = :company_id AND m.idcaixa = :cash AND m.situacao = 1
                 ORDER BY m.criado_em DESC LIMIT 100",
                ['company_id' => $companyId, 'cash' => $cashId]
            );
            $current = [
                'idcaixa' => $cashId,
                'idfilial' => (int) $open['idfilial'],
                'aberto_em' => $open['aberto_em'],
                'operador' => $open['operador'],
                'saldo_inicial' => (float) $open['saldo_inicial'],
                'entradas' => $totals['in'],
                'saidas' => $totals['out'],
                'saldo_atual' => (float) $open['saldo_inicial'] + $totals['in'] - $totals['out'],
                'movements' => array_map(fn ($movement) => [
                    ...$movement,
                    'idmovimentacao_caixa' => (int) $movement['idmovimentacao_caixa'],
                    'tipo' => (int) $movement['tipo'],
                    'valor' => (float) $movement['valor'],
                ], $movements),
            ];
        }

        $history = $this->all(
            "SELECT c.idcaixa, c.idfilial, f.nome filial, c.aberto_em, c.fechado_em, c.saldo_inicial, c.saldo_final, u.nome operador,
                    COALESCE(mi.total_in, 0) entradas, COALESCE(mo.total_out, 0) saidas
             FROM caixa c
             JOIN filial f ON f.idempresa = c.idempresa AND f.idfilial = c.idfilial
             JOIN usuario u ON u.idempresa = c.idempresa AND u.idusuario = c.idusuario_abertura
             LEFT JOIN (SELECT idempresa, idcaixa, SUM(valor) total_in FROM movimentacao_caixa WHERE situacao = 1 AND tipo IN (1, 3) GROUP BY idempresa, idcaixa) mi
                    ON mi.idempresa = c.idempresa AND mi.idcaixa = c.idcaixa
             LEFT JOIN (SELECT idempresa, idcaixa, SUM(valor) total_out FROM movimentacao_caixa WHERE situacao = 1 AND tipo IN (2, 4) GROUP BY idempresa, idcaixa) mo
                    ON mo.idempresa = c.idempresa AND mo.idcaixa = c.idcaixa
             WHERE c.idempresa = :company_id AND c.idfilial = :branch AND c.situacao = 2
             ORDER BY c.fechado_em DESC LIMIT 30",
            ['company_id' => $companyId, 'branch' => $branchId]
        );

        $openCount = $this->one(
            'SELECT COUNT(*) total FROM caixa WHERE idempresa = :company_id AND situacao = 1',
            ['company_id' => $companyId]
        );

        // Relatorio do dia: vendas de hoje por forma de pagamento. Somente
        // dinheiro passa pelo caixa fisico; as demais formas aparecem aqui.
        $dayReport = $this->all(
            "SELECT CASE WHEN v.a_prazo THEN 'prazo' ELSE COALESCE(v.forma_pagamento, 'outros') END forma,
                    COUNT(*) vendas, COALESCE(SUM(v.valor_total), 0) total
             FROM venda v
             WHERE v.idempresa = :company_id AND v.idfilial = :branch AND v.situacao <> 4
               AND v.data_venda::date = CURRENT_DATE
             GROUP BY 1
             ORDER BY total DESC",
            ['company_id' => $companyId, 'branch' => $branchId]
        );

        return [
            'branch' => $branchId,
            'current' => $current,
            'history' => array_map(fn ($row) => [
                ...$row,
                'idcaixa' => (int) $row['idcaixa'],
                'saldo_inicial' => (float) $row['saldo_inicial'],
                'saldo_final' => $row['saldo_final'] !== null ? (float) $row['saldo_final'] : null,
                'entradas' => (float) $row['entradas'],
                'saidas' => (float) $row['saidas'],
            ], $history),
            'metrics' => [
                'open_company' => (int) ($openCount['total'] ?? 0),
            ],
            'day_report' => array_map(fn ($row) => [
                'forma' => (string) $row['forma'],
                'vendas' => (int) $row['vendas'],
                'total' => (float) $row['total'],
            ], $dayReport),
            'options' => ['branches' => $branches],
        ];
    }

    public function open(int $companyId, int $actorId, int $branchId, float $openingBalance, ?string $ip, ?string $agent): int
    {
        return $this->transaction(function () use ($companyId, $actorId, $branchId, $openingBalance, $ip, $agent) {
            if (!$this->one('SELECT 1 FROM filial WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1', ['company_id' => $companyId, 'branch' => $branchId])) {
                throw new InvalidArgumentException('Filial invalida');
            }
            $open = $this->one(
                'SELECT idcaixa FROM caixa WHERE idempresa = :company_id AND idfilial = :branch AND situacao = 1 FOR UPDATE',
                ['company_id' => $companyId, 'branch' => $branchId]
            );
            if ($open) {
                throw new InvalidArgumentException('Ja existe um caixa aberto nesta filial');
            }
            $statement = $this->pdo->prepare(
                'INSERT INTO caixa (idempresa, idfilial, idusuario_abertura, saldo_inicial, situacao)
                 VALUES (:company_id, :branch, :actor, :balance, 1) RETURNING idcaixa'
            );
            $statement->execute(['company_id' => $companyId, 'branch' => $branchId, 'actor' => $actorId, 'balance' => $openingBalance]);
            $cashId = (int) $statement->fetchColumn();
            $this->audit($companyId, $actorId, $cashId, 'abrir_caixa', null, ['saldo_inicial' => $openingBalance], $ip, $agent);
            return $cashId;
        });
    }

    public function addMovement(int $companyId, int $actorId, int $cashId, int $type, string $description, float $value, ?string $ip, ?string $agent): void
    {
        $this->transaction(function () use ($companyId, $actorId, $cashId, $type, $description, $value, $ip, $agent) {
            $cash = $this->one(
                'SELECT idfilial, situacao FROM caixa WHERE idempresa = :company_id AND idcaixa = :cash FOR UPDATE',
                ['company_id' => $companyId, 'cash' => $cashId]
            );
            if (!$cash) {
                throw new InvalidArgumentException('Caixa nao encontrado');
            }
            if ((int) $cash['situacao'] !== 1) {
                throw new InvalidArgumentException('O caixa ja esta fechado');
            }
            $this->pdo->prepare(
                'INSERT INTO movimentacao_caixa (idempresa, idfilial, idcaixa, idusuario, tipo, descricao, valor, situacao)
                 VALUES (:company_id, :branch, :cash, :actor, :type, :description, :value, 1)'
            )->execute([
                'company_id' => $companyId,
                'branch' => (int) $cash['idfilial'],
                'cash' => $cashId,
                'actor' => $actorId,
                'type' => $type,
                'description' => $description,
                'value' => $value,
            ]);
            $this->audit($companyId, $actorId, $cashId, $type === 1 ? 'suprimento' : 'sangria', null, ['descricao' => $description, 'valor' => $value], $ip, $agent);
        });
    }

    public function close(int $companyId, int $actorId, int $cashId, ?float $countedBalance, ?string $ip, ?string $agent): array
    {
        return $this->transaction(function () use ($companyId, $actorId, $cashId, $countedBalance, $ip, $agent) {
            $cash = $this->one(
                'SELECT saldo_inicial, situacao FROM caixa WHERE idempresa = :company_id AND idcaixa = :cash FOR UPDATE',
                ['company_id' => $companyId, 'cash' => $cashId]
            );
            if (!$cash) {
                throw new InvalidArgumentException('Caixa nao encontrado');
            }
            if ((int) $cash['situacao'] !== 1) {
                throw new InvalidArgumentException('O caixa ja esta fechado');
            }
            $totals = $this->totals($companyId, $cashId);
            $expected = (float) $cash['saldo_inicial'] + $totals['in'] - $totals['out'];
            $final = $countedBalance !== null ? $countedBalance : $expected;
            $this->pdo->prepare(
                'UPDATE caixa SET situacao = 2, fechado_em = CURRENT_TIMESTAMP, saldo_final = :final, atualizado_em = CURRENT_TIMESTAMP
                 WHERE idempresa = :company_id AND idcaixa = :cash'
            )->execute(['final' => $final, 'company_id' => $companyId, 'cash' => $cashId]);
            $this->audit($companyId, $actorId, $cashId, 'fechar_caixa', ['saldo_esperado' => $expected], ['saldo_final' => $final, 'diferenca' => $final - $expected], $ip, $agent);
            return ['saldo_esperado' => $expected, 'saldo_final' => $final, 'diferenca' => $final - $expected];
        });
    }

    private function totals(int $companyId, int $cashId): array
    {
        $row = $this->one(
            'SELECT COALESCE(SUM(valor) FILTER (WHERE tipo IN (1, 3)), 0) total_in,
                    COALESCE(SUM(valor) FILTER (WHERE tipo IN (2, 4)), 0) total_out
             FROM movimentacao_caixa WHERE idempresa = :company_id AND idcaixa = :cash AND situacao = 1',
            ['company_id' => $companyId, 'cash' => $cashId]
        );
        return ['in' => (float) ($row['total_in'] ?? 0), 'out' => (float) ($row['total_out'] ?? 0)];
    }

    private function audit(int $companyId, int $actorId, int $cashId, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'caixa', :id, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'id' => $cashId,
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
