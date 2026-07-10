<?php

namespace App\Modules\Receivables\Services;

use App\Modules\Receivables\Repositories\ReceivableRepository;
use InvalidArgumentException;

final class ReceivableService
{
    private readonly ReceivableRepository $repository;

    public function __construct(?ReceivableRepository $repository = null)
    {
        $this->repository = $repository ?? new ReceivableRepository();
    }

    public function customers(int $companyId, string $term): array
    {
        $term = trim($term);
        if (mb_strlen($term) < 2) {
            return [];
        }
        return $this->repository->customers($companyId, $term);
    }

    public function index(int $companyId, int $customerId): array
    {
        if ($customerId <= 0) {
            throw new InvalidArgumentException('Cliente invalido');
        }
        return $this->repository->index($companyId, $customerId);
    }

    public function settle(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Titulo invalido');
        }
        $this->repository->settle($companyId, $actorId, $id, $data, $ip, $agent);
    }
}
