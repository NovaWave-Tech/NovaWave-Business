<?php

namespace App\Modules\Goals\Services;

use App\Modules\Goals\Repositories\GoalRepository;
use InvalidArgumentException;

final class GoalService
{
    private readonly GoalRepository $repository;

    public function __construct(?GoalRepository $repository = null)
    {
        $this->repository = $repository ?? new GoalRepository();
    }

    public function index(int $companyId, ?string $competencia): array
    {
        return $this->repository->index($companyId, $this->normalizeCompetencia($competencia));
    }

    public function save(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): void
    {
        $scope = (string) ($data['escopo'] ?? '');
        if (!in_array($scope, ['company', 'branch', 'seller'], true)) {
            throw new InvalidArgumentException('Escopo de meta invalido');
        }
        $value = (float) ($data['valor_meta'] ?? 0);
        if ($value < 0) {
            throw new InvalidArgumentException('A meta nao pode ser negativa');
        }
        $targetId = isset($data['id']) ? (int) $data['id'] : null;
        $competencia = $this->normalizeCompetencia($data['competencia'] ?? null);
        $this->repository->save($companyId, $actorId, $scope, $targetId, $competencia, $value, $ip, $agent);
    }

    /** Normaliza a competencia para o primeiro dia do mes (YYYY-MM-01). */
    private function normalizeCompetencia(?string $competencia): string
    {
        $raw = $competencia && trim($competencia) !== '' ? trim($competencia) : date('Y-m');
        if (!preg_match('/^\d{4}-\d{2}(-\d{2})?$/', $raw)) {
            throw new InvalidArgumentException('Competencia invalida (use AAAA-MM)');
        }
        return substr($raw, 0, 7) . '-01';
    }
}
