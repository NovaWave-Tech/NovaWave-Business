<?php

namespace App\Modules\Catalog\Services;

use App\Modules\Catalog\Repositories\CatalogRepository;
use InvalidArgumentException;

final class CatalogService
{
    public function __construct(private readonly CatalogRepository $repository = new CatalogRepository()) {}

    public function index(int $companyId): array
    {
        return $this->repository->index($companyId);
    }

    public function createCategory(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->assertName($data);
        return $this->repository->createCategory($companyId, $actorId, $data, $ip, $agent);
    }

    public function updateCategory(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        $this->assertName($data);
        $this->repository->updateCategory($companyId, $actorId, $id, $data, $ip, $agent);
    }

    public function setCategoryStatus(int $companyId, int $actorId, int $id, int $status, ?string $ip, ?string $agent): void
    {
        $this->assertStatus($status);
        $this->repository->setCategoryStatus($companyId, $actorId, $id, $status, $ip, $agent);
    }

    public function createBrand(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->assertName($data);
        return $this->repository->createBrand($companyId, $actorId, $data, $ip, $agent);
    }

    public function updateBrand(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        $this->assertName($data);
        $this->repository->updateBrand($companyId, $actorId, $id, $data, $ip, $agent);
    }

    public function setBrandStatus(int $companyId, int $actorId, int $id, int $status, ?string $ip, ?string $agent): void
    {
        $this->assertStatus($status);
        $this->repository->setBrandStatus($companyId, $actorId, $id, $status, $ip, $agent);
    }

    private function assertName(array $data): void
    {
        if (strlen(trim((string) ($data['nome'] ?? ''))) < 2) {
            throw new InvalidArgumentException('Informe um nome valido');
        }
    }

    private function assertStatus(int $status): void
    {
        if (!in_array($status, [0, 1], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
    }
}
