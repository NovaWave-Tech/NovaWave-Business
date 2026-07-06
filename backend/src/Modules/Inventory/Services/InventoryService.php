<?php

namespace App\Modules\Inventory\Services;

use App\Modules\Inventory\Repositories\InventoryRepository;

final class InventoryService
{
    public function __construct(private readonly InventoryRepository $repository = new InventoryRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }
}
