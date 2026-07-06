<?php

namespace App\Modules\Catalog\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class CatalogRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId): array
    {
        $categories = $this->all(
            "SELECT c.idcategoria, c.nome, c.descricao, c.situacao,
                    COUNT(p.idproduto) produtos
             FROM categoria_produto c
             LEFT JOIN produto p ON p.idempresa = c.idempresa AND p.idcategoria = c.idcategoria
             WHERE c.idempresa = :company_id
             GROUP BY c.idcategoria
             ORDER BY c.nome",
            ['company_id' => $companyId]
        );
        $brands = $this->all(
            "SELECT m.idmarca, m.nome, m.situacao,
                    COUNT(p.idproduto) produtos
             FROM marca m
             LEFT JOIN produto p ON p.idempresa = m.idempresa AND p.idmarca = m.idmarca
             WHERE m.idempresa = :company_id
             GROUP BY m.idmarca
             ORDER BY m.nome",
            ['company_id' => $companyId]
        );
        return [
            'categories' => array_map(fn ($row) => [
                'idcategoria' => (int) $row['idcategoria'],
                'nome' => $row['nome'],
                'descricao' => $row['descricao'],
                'situacao' => (int) $row['situacao'],
                'produtos' => (int) $row['produtos'],
            ], $categories),
            'brands' => array_map(fn ($row) => [
                'idmarca' => (int) $row['idmarca'],
                'nome' => $row['nome'],
                'situacao' => (int) $row['situacao'],
                'produtos' => (int) $row['produtos'],
            ], $brands),
        ];
    }

    public function createCategory(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO categoria_produto (idempresa, nome, descricao, situacao)
                 VALUES (:company_id, :name, :description, 1) RETURNING idcategoria'
            );
            $statement->execute([
                'company_id' => $companyId,
                'name' => trim((string) $data['nome']),
                'description' => $this->nullable($data['descricao'] ?? null),
            ]);
            $id = (int) $statement->fetchColumn();
            $this->audit($companyId, $actorId, 'categoria_produto', $id, 'criar', null, ['nome' => $data['nome']], $ip, $agent);
            return $id;
        } catch (Throwable $exception) {
            throw $this->translate($exception, 'categoria');
        }
    }

    public function updateCategory(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        try {
            $statement = $this->pdo->prepare(
                'UPDATE categoria_produto SET nome = :name, descricao = :description, atualizado_em = CURRENT_TIMESTAMP
                 WHERE idempresa = :company_id AND idcategoria = :id'
            );
            $statement->execute([
                'name' => trim((string) $data['nome']),
                'description' => $this->nullable($data['descricao'] ?? null),
                'company_id' => $companyId,
                'id' => $id,
            ]);
            if (!$statement->rowCount()) {
                throw new InvalidArgumentException('Categoria nao encontrada');
            }
            $this->audit($companyId, $actorId, 'categoria_produto', $id, 'editar', null, ['nome' => $data['nome']], $ip, $agent);
        } catch (Throwable $exception) {
            throw $this->translate($exception, 'categoria');
        }
    }

    public function setCategoryStatus(int $companyId, int $actorId, int $id, int $status, ?string $ip, ?string $agent): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE categoria_produto SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP
             WHERE idempresa = :company_id AND idcategoria = :id'
        );
        $statement->execute(['status' => $status, 'company_id' => $companyId, 'id' => $id]);
        if (!$statement->rowCount()) {
            throw new InvalidArgumentException('Categoria nao encontrada');
        }
        $this->audit($companyId, $actorId, 'categoria_produto', $id, $status ? 'ativar' : 'desativar', null, ['situacao' => $status], $ip, $agent);
    }

    public function createBrand(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO marca (idempresa, nome, situacao) VALUES (:company_id, :name, 1) RETURNING idmarca'
            );
            $statement->execute(['company_id' => $companyId, 'name' => trim((string) $data['nome'])]);
            $id = (int) $statement->fetchColumn();
            $this->audit($companyId, $actorId, 'marca', $id, 'criar', null, ['nome' => $data['nome']], $ip, $agent);
            return $id;
        } catch (Throwable $exception) {
            throw $this->translate($exception, 'marca');
        }
    }

    public function updateBrand(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        try {
            $statement = $this->pdo->prepare(
                'UPDATE marca SET nome = :name, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idmarca = :id'
            );
            $statement->execute(['name' => trim((string) $data['nome']), 'company_id' => $companyId, 'id' => $id]);
            if (!$statement->rowCount()) {
                throw new InvalidArgumentException('Marca nao encontrada');
            }
            $this->audit($companyId, $actorId, 'marca', $id, 'editar', null, ['nome' => $data['nome']], $ip, $agent);
        } catch (Throwable $exception) {
            throw $this->translate($exception, 'marca');
        }
    }

    public function setBrandStatus(int $companyId, int $actorId, int $id, int $status, ?string $ip, ?string $agent): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE marca SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idmarca = :id'
        );
        $statement->execute(['status' => $status, 'company_id' => $companyId, 'id' => $id]);
        if (!$statement->rowCount()) {
            throw new InvalidArgumentException('Marca nao encontrada');
        }
        $this->audit($companyId, $actorId, 'marca', $id, $status ? 'ativar' : 'desativar', null, ['situacao' => $status], $ip, $agent);
    }

    private function translate(Throwable $exception, string $entity): Throwable
    {
        if ($exception instanceof InvalidArgumentException) {
            return $exception;
        }
        if ($exception->getCode() === '23505') {
            return new InvalidArgumentException("Ja existe uma {$entity} com este nome");
        }
        return $exception;
    }

    private function nullable(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;
        return $value === '' || $value === null ? null : (string) $value;
    }

    private function audit(int $companyId, int $actorId, string $table, int $id, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', :table, :id, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'table' => $table,
            'id' => $id,
            'action' => $action,
            'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null,
            'ip' => $ip,
            'device' => $agent ? substr($agent, 0, 150) : null,
        ]);
    }

    private function all(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
