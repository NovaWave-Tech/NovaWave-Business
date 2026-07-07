<?php

namespace App\Modules\Settings\Repositories;

use App\Infrastructures\Config\Database;
use PDO;

final class SettingsRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, int $userId): array
    {
        $preferences = $this->one(
            'SELECT tema, idioma, timezone, idfilial_padrao, dashboard_escopo_padrao, sidebar_recolhida
             FROM usuario_preferencia WHERE idempresa = :company_id AND idusuario = :user_id',
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        $finance = $this->one(
            'SELECT meta_mensal FROM configuracao_financeira WHERE idempresa = :company_id',
            ['company_id' => $companyId]
        );
        return [
            'preferences' => [
                'tema' => $preferences['tema'] ?? 'system',
                'idioma' => $preferences['idioma'] ?? 'pt-BR',
                'timezone' => $preferences['timezone'] ?? 'America/Sao_Paulo',
                'idfilial_padrao' => isset($preferences['idfilial_padrao']) && $preferences['idfilial_padrao'] !== null
                    ? (int) $preferences['idfilial_padrao']
                    : null,
                'dashboard_escopo_padrao' => $preferences['dashboard_escopo_padrao'] ?? 'empresa',
                'sidebar_recolhida' => (bool) ($preferences['sidebar_recolhida'] ?? false),
            ],
            'finance' => [
                'meta_mensal' => (float) ($finance['meta_mensal'] ?? 0),
            ],
            'options' => [
                'branches' => $this->all(
                    'SELECT idfilial id, nome FROM filial WHERE idempresa = :company_id AND situacao = 1 ORDER BY matriz DESC, nome',
                    ['company_id' => $companyId]
                ),
            ],
        ];
    }

    public function savePreferences(int $companyId, int $userId, array $data): void
    {
        $this->pdo->prepare(
            'INSERT INTO usuario_preferencia (idempresa, idusuario, tema, idioma, timezone, idfilial_padrao, dashboard_escopo_padrao, sidebar_recolhida)
             VALUES (:company_id, :user_id, :theme, :language, :timezone, :default_branch, :dashboard_scope, :sidebar)
             ON CONFLICT (idempresa, idusuario)
             DO UPDATE SET tema = EXCLUDED.tema, idioma = EXCLUDED.idioma, timezone = EXCLUDED.timezone,
                           idfilial_padrao = EXCLUDED.idfilial_padrao,
                           dashboard_escopo_padrao = EXCLUDED.dashboard_escopo_padrao,
                           sidebar_recolhida = EXCLUDED.sidebar_recolhida,
                           atualizado_em = CURRENT_TIMESTAMP'
        )->execute([
            'company_id' => $companyId,
            'user_id' => $userId,
            'theme' => $data['tema'],
            'language' => $data['idioma'],
            'timezone' => $data['timezone'],
            'default_branch' => !empty($data['idfilial_padrao']) ? (int) $data['idfilial_padrao'] : null,
            'dashboard_scope' => $data['dashboard_escopo_padrao'],
            'sidebar' => !empty($data['sidebar_recolhida']) ? 'true' : 'false',
        ]);
    }

    public function saveFinance(int $companyId, int $actorId, float $monthlyGoal, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            'INSERT INTO configuracao_financeira (idempresa, meta_mensal, atualizado_em)
             VALUES (:company_id, :goal, CURRENT_TIMESTAMP)
             ON CONFLICT (idempresa)
             DO UPDATE SET meta_mensal = EXCLUDED.meta_mensal, atualizado_em = CURRENT_TIMESTAMP'
        )->execute(['company_id' => $companyId, 'goal' => $monthlyGoal]);
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'configuracao_financeira', :company_id, 'editar', :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'after' => json_encode(['meta_mensal' => $monthlyGoal]),
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
