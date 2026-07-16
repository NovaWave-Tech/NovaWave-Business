<?php

namespace App\Modules\Goals\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;

/**
 * Metas de venda por competencia (mes). Uma meta pode ser da empresa
 * (idfilial/idusuario nulos), de uma filial ou de um vendedor. O realizado
 * de cada escopo sai da soma das vendas nao canceladas do mes.
 */
final class GoalRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, string $competencia): array
    {
        $params = ['company_id' => $companyId, 'competencia' => $competencia];

        // Meta geral da empresa: a explicita do mes (meta_venda) tem
        // precedencia; senao cai na meta unica de configuracao_financeira.
        $company = $this->one(
            "SELECT COALESCE(
               (SELECT valor_meta FROM meta_venda WHERE idempresa=:company_id AND idfilial IS NULL AND idusuario IS NULL AND competencia=:competencia),
               (SELECT meta_mensal FROM configuracao_financeira WHERE idempresa=:company_id), 0) AS meta,
             COALESCE((SELECT SUM(valor_total) FROM venda WHERE idempresa=:company_id AND situacao<>4 AND data_venda>=:competencia::date AND data_venda < (:competencia::date + INTERVAL '1 month')),0) AS realizado",
            $params
        );

        $branches = $this->all(
            "SELECT f.idfilial, f.nome,
                    COALESCE(m.valor_meta,0) AS meta,
                    COALESCE(v.realizado,0) AS realizado
             FROM filial f
             LEFT JOIN meta_venda m ON m.idempresa=f.idempresa AND m.idfilial=f.idfilial AND m.idusuario IS NULL AND m.competencia=:competencia
             LEFT JOIN (SELECT idfilial, SUM(valor_total) realizado FROM venda
                        WHERE idempresa=:company_id AND situacao<>4 AND data_venda>=:competencia::date AND data_venda < (:competencia::date + INTERVAL '1 month')
                        GROUP BY idfilial) v ON v.idfilial=f.idfilial
             WHERE f.idempresa=:company_id AND f.situacao=1
             ORDER BY f.matriz DESC, f.nome",
            $params
        );

        $sellers = $this->all(
            "SELECT u.idusuario, u.nome,
                    COALESCE(m.valor_meta,0) AS meta,
                    COALESCE(v.realizado,0) AS realizado
             FROM usuario u
             LEFT JOIN meta_venda m ON m.idempresa=u.idempresa AND m.idusuario=u.idusuario AND m.idfilial IS NULL AND m.competencia=:competencia
             LEFT JOIN (SELECT idusuario, SUM(valor_total) realizado FROM venda
                        WHERE idempresa=:company_id AND situacao<>4 AND data_venda>=:competencia::date AND data_venda < (:competencia::date + INTERVAL '1 month')
                        GROUP BY idusuario) v ON v.idusuario=u.idusuario
             WHERE u.idempresa=:company_id AND u.situacao=1
             ORDER BY u.nome",
            $params
        );

        return [
            'competencia' => $competencia,
            'company' => [
                'meta' => (float) $company['meta'],
                'realizado' => (float) $company['realizado'],
            ],
            'branches' => array_map(fn ($row) => [
                'idfilial' => (int) $row['idfilial'],
                'nome' => $row['nome'],
                'meta' => (float) $row['meta'],
                'realizado' => (float) $row['realizado'],
            ], $branches),
            'sellers' => array_map(fn ($row) => [
                'idusuario' => (int) $row['idusuario'],
                'nome' => $row['nome'],
                'meta' => (float) $row['meta'],
                'realizado' => (float) $row['realizado'],
            ], $sellers),
        ];
    }

    /**
     * Define a meta de um escopo. valor_meta 0 remove a linha (limpa a meta),
     * evitando lixo de metas zeradas.
     */
    public function save(int $companyId, int $actorId, string $scope, ?int $targetId, string $competencia, float $value, ?string $ip, ?string $agent): void
    {
        [$branchId, $userId] = $this->resolveScope($companyId, $scope, $targetId);

        if ($value <= 0) {
            $stmt = $this->pdo->prepare(
                'DELETE FROM meta_venda WHERE idempresa=:company_id AND competencia=:competencia
                 AND idfilial IS NOT DISTINCT FROM :branch AND idusuario IS NOT DISTINCT FROM :user'
            );
            $stmt->execute(['company_id' => $companyId, 'competencia' => $competencia, 'branch' => $branchId, 'user' => $userId]);
            $this->audit($companyId, $actorId, 'remover_meta', $scope, $targetId, $competencia, 0.0, $ip, $agent);
            return;
        }

        $this->pdo->prepare(
            'INSERT INTO meta_venda (idempresa, idfilial, idusuario, competencia, valor_meta)
             VALUES (:company_id, :branch, :user, :competencia, :value)
             ON CONFLICT ON CONSTRAINT uq_meta_venda_escopo
             DO UPDATE SET valor_meta=EXCLUDED.valor_meta, atualizado_em=CURRENT_TIMESTAMP'
        )->execute(['company_id' => $companyId, 'branch' => $branchId, 'user' => $userId, 'competencia' => $competencia, 'value' => $value]);
        $this->audit($companyId, $actorId, 'definir_meta', $scope, $targetId, $competencia, $value, $ip, $agent);
    }

    /** Valida o escopo e garante que a filial/vendedor pertence a empresa. */
    private function resolveScope(int $companyId, string $scope, ?int $targetId): array
    {
        if ($scope === 'company') {
            return [null, null];
        }
        if ($targetId === null || $targetId <= 0) {
            throw new InvalidArgumentException('Informe a filial ou o vendedor da meta');
        }
        if ($scope === 'branch') {
            if (!$this->one('SELECT 1 FROM filial WHERE idempresa=:company_id AND idfilial=:id', ['company_id' => $companyId, 'id' => $targetId])) {
                throw new InvalidArgumentException('Filial invalida');
            }
            return [$targetId, null];
        }
        if ($scope === 'seller') {
            if (!$this->one('SELECT 1 FROM usuario WHERE idempresa=:company_id AND idusuario=:id', ['company_id' => $companyId, 'id' => $targetId])) {
                throw new InvalidArgumentException('Vendedor invalido');
            }
            return [null, $targetId];
        }
        throw new InvalidArgumentException('Escopo de meta invalido');
    }

    private function audit(int $companyId, int $actorId, string $action, string $scope, ?int $targetId, string $competencia, float $value, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'meta_venda', :registro, :action, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'registro' => $targetId ?? 0,
            'action' => $action,
            'after' => json_encode(['escopo' => $scope, 'competencia' => $competencia, 'valor_meta' => $value]),
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
