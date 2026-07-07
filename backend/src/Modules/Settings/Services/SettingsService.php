<?php

namespace App\Modules\Settings\Services;

use App\Modules\Settings\Repositories\SettingsRepository;
use InvalidArgumentException;

final class SettingsService
{
    public function __construct(private readonly SettingsRepository $repository = new SettingsRepository()) {}

    public function index(int $companyId, int $userId): array
    {
        return $this->repository->index($companyId, $userId);
    }

    public function savePreferences(int $companyId, int $userId, array $data): void
    {
        $theme = (string) ($data['tema'] ?? 'system');
        if (!in_array($theme, ['light', 'dark', 'system'], true)) {
            throw new InvalidArgumentException('Tema invalido');
        }
        $scope = (string) ($data['dashboard_escopo_padrao'] ?? 'empresa');
        if (!in_array($scope, ['empresa', 'filial'], true)) {
            throw new InvalidArgumentException('Escopo de dashboard invalido');
        }
        $this->repository->savePreferences($companyId, $userId, [
            'tema' => $theme,
            'idioma' => trim((string) ($data['idioma'] ?? 'pt-BR')) ?: 'pt-BR',
            'timezone' => trim((string) ($data['timezone'] ?? 'America/Sao_Paulo')) ?: 'America/Sao_Paulo',
            'idfilial_padrao' => $data['idfilial_padrao'] ?? null,
            'dashboard_escopo_padrao' => $scope,
            'sidebar_recolhida' => !empty($data['sidebar_recolhida']),
        ]);
    }

    public function saveFinance(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): void
    {
        $goal = (float) ($data['meta_mensal'] ?? 0);
        if ($goal < 0) {
            throw new InvalidArgumentException('A meta mensal nao pode ser negativa');
        }
        $this->repository->saveFinance($companyId, $actorId, $goal, $ip, $agent);
    }
}
