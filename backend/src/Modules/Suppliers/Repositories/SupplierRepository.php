<?php

namespace App\Modules\Suppliers\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class SupplierRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        $where = ['f.idempresa = :company_id'];
        $params = ['company_id' => $companyId];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'f.situacao = :status';
            $params['status'] = (int) $filters['status'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(f.razao_social ILIKE :q OR f.nome_fantasia ILIKE :q OR f.documento ILIKE :digits OR f.email ILIKE :q OR f.cidade ILIKE :q)';
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
            $params['digits'] = '%' . preg_replace('/\D/', '', (string) $filters['q']) . '%';
        }

        $suppliers = $this->all(
            "SELECT f.*, COALESCE(c.purchases, 0) compras, COALESCE(c.total, 0) total_comprado, c.last_purchase ultima_compra
             FROM fornecedor f
             LEFT JOIN (
                SELECT idempresa, idfornecedor, COUNT(*) FILTER (WHERE situacao = 1) purchases,
                       COALESCE(SUM(valor_total) FILTER (WHERE situacao = 1), 0) total,
                       MAX(data_compra) FILTER (WHERE situacao = 1) last_purchase
                FROM compra GROUP BY idempresa, idfornecedor
             ) c ON c.idempresa = f.idempresa AND c.idfornecedor = f.idfornecedor
             WHERE " . implode(' AND ', $where) . "
             ORDER BY COALESCE(f.nome_fantasia, f.razao_social)",
            $params
        );

        $metrics = $this->one(
            "SELECT COUNT(*) total,
                    COUNT(*) FILTER (WHERE situacao = 1) active,
                    COUNT(*) FILTER (WHERE situacao = 0) inactive
             FROM fornecedor WHERE idempresa = :company_id",
            ['company_id' => $companyId]
        );
        $purchases = $this->one(
            "SELECT COUNT(DISTINCT idfornecedor) with_purchases, COALESCE(SUM(valor_total), 0) volume
             FROM compra WHERE idempresa = :company_id AND situacao = 1 AND idfornecedor IS NOT NULL",
            ['company_id' => $companyId]
        );

        return [
            'suppliers' => array_map(fn ($row) => $this->normalize($row), $suppliers),
            'metrics' => [
                'total' => (int) ($metrics['total'] ?? 0),
                'active' => (int) ($metrics['active'] ?? 0),
                'inactive' => (int) ($metrics['inactive'] ?? 0),
                'with_purchases' => (int) ($purchases['with_purchases'] ?? 0),
                'volume' => (float) ($purchases['volume'] ?? 0),
            ],
        ];
    }

    public function show(int $companyId, int $supplierId): ?array
    {
        $supplier = $this->one(
            'SELECT * FROM fornecedor WHERE idempresa = :company_id AND idfornecedor = :supplier_id',
            ['company_id' => $companyId, 'supplier_id' => $supplierId]
        );
        if (!$supplier) {
            return null;
        }
        $purchases = $this->all(
            "SELECT c.idcompra, c.data_compra, c.valor_total, c.situacao, fl.nome filial
             FROM compra c JOIN filial fl ON fl.idempresa = c.idempresa AND fl.idfilial = c.idfilial
             WHERE c.idempresa = :company_id AND c.idfornecedor = :supplier_id
             ORDER BY c.data_compra DESC LIMIT 20",
            ['company_id' => $companyId, 'supplier_id' => $supplierId]
        );
        return [...$this->normalize($supplier), 'purchases' => $purchases];
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO fornecedor (idempresa, razao_social, nome_fantasia, documento, email, telefone, cep, endereco, numero, complemento, bairro, cidade, estado, situacao)
                 VALUES (:company_id, :corporate_name, :trade_name, :document, :email, :phone, :cep, :address, :number, :complement, :district, :city, :state, :status)
                 RETURNING idfornecedor'
            );
            $statement->execute($this->params($companyId, $data));
            $id = (int) $statement->fetchColumn();
            $this->audit($companyId, $actorId, $id, 'criar', null, ['razao_social' => $data['razao_social']], $ip, $agent);
            return $id;
        } catch (Throwable $exception) {
            throw $this->translate($exception);
        }
    }

    public function update(int $companyId, int $actorId, int $supplierId, array $data, ?string $ip, ?string $agent): void
    {
        try {
            $before = $this->one('SELECT razao_social, documento FROM fornecedor WHERE idempresa = :company_id AND idfornecedor = :id', ['company_id' => $companyId, 'id' => $supplierId]);
            if (!$before) {
                throw new InvalidArgumentException('Fornecedor nao encontrado');
            }
            $params = $this->params($companyId, $data);
            $params['supplier_id'] = $supplierId;
            $this->pdo->prepare(
                'UPDATE fornecedor SET razao_social = :corporate_name, nome_fantasia = :trade_name, documento = :document, email = :email,
                        telefone = :phone, cep = :cep, endereco = :address, numero = :number, complemento = :complement,
                        bairro = :district, cidade = :city, estado = :state, situacao = :status, atualizado_em = CURRENT_TIMESTAMP
                 WHERE idempresa = :company_id AND idfornecedor = :supplier_id'
            )->execute($params);
            $this->audit($companyId, $actorId, $supplierId, 'editar', $before, ['razao_social' => $data['razao_social']], $ip, $agent);
        } catch (Throwable $exception) {
            throw $this->translate($exception);
        }
    }

    public function setStatus(int $companyId, int $actorId, int $supplierId, int $status, ?string $ip, ?string $agent): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE fornecedor SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idfornecedor = :id'
        );
        $statement->execute(['status' => $status, 'company_id' => $companyId, 'id' => $supplierId]);
        if (!$statement->rowCount()) {
            throw new InvalidArgumentException('Fornecedor nao encontrado');
        }
        $this->audit($companyId, $actorId, $supplierId, $status ? 'ativar' : 'inativar', null, ['situacao' => $status], $ip, $agent);
    }

    private function params(int $companyId, array $data): array
    {
        $nullable = fn (string $key) => (isset($data[$key]) && trim((string) $data[$key]) !== '') ? trim((string) $data[$key]) : null;
        $document = preg_replace('/\D/', '', (string) ($data['documento'] ?? ''));
        return [
            'company_id' => $companyId,
            'corporate_name' => trim((string) $data['razao_social']),
            'trade_name' => $nullable('nome_fantasia'),
            'document' => $document !== '' ? $document : null,
            'email' => $nullable('email'),
            'phone' => preg_replace('/\D/', '', (string) ($data['telefone'] ?? '')) ?: null,
            'cep' => preg_replace('/\D/', '', (string) ($data['cep'] ?? '')) ?: null,
            'address' => $nullable('endereco'),
            'number' => $nullable('numero'),
            'complement' => $nullable('complemento'),
            'district' => $nullable('bairro'),
            'city' => $nullable('cidade'),
            'state' => !empty($data['estado']) ? strtoupper(trim((string) $data['estado'])) : null,
            'status' => !isset($data['situacao']) || !empty($data['situacao']) ? 1 : 0,
        ];
    }

    private function normalize(array $supplier): array
    {
        return [
            ...$supplier,
            'idfornecedor' => (int) $supplier['idfornecedor'],
            'situacao' => (int) $supplier['situacao'],
            'compras' => (int) ($supplier['compras'] ?? 0),
            'total_comprado' => (float) ($supplier['total_comprado'] ?? 0),
        ];
    }

    private function translate(Throwable $exception): Throwable
    {
        if ($exception instanceof InvalidArgumentException) {
            return $exception;
        }
        if ($exception->getCode() === '23505') {
            return new InvalidArgumentException('Ja existe um fornecedor com este documento');
        }
        return $exception;
    }

    private function audit(int $companyId, int $actorId, int $supplierId, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'fornecedor', :id, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'id' => $supplierId,
            'action' => $action,
            'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null,
            'ip' => $ip,
            'device' => $agent ? substr($agent, 0, 150) : null,
        ]);
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
