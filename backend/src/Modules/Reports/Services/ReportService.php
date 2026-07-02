<?php

namespace App\Modules\Reports\Services;

use App\Modules\Reports\Repositories\ReportRepository;

final class ReportService
{
    public function __construct(private readonly ReportRepository $repository = new ReportRepository()) {}

    public function catalog(int $companyId): array
    {
        return $this->repository->catalog($companyId);
    }

    public function preview(int $companyId, int $userId, string $slug, array $filters): array
    {
        $allowed = ['executive', 'sales', 'finance', 'customers', 'products', 'stock', 'purchases'];
        if (!in_array($slug, $allowed, true)) throw new \InvalidArgumentException('Relatorio nao encontrado');
        return $this->repository->preview($companyId, $userId, $slug, $filters);
    }
}
