<?php

namespace App\Modules\Purchases\Services;

use App\Modules\Purchases\Repositories\PurchasesRepository;
use InvalidArgumentException;

final class PurchasesService
{
    public function __construct(private readonly PurchasesRepository $repository = new PurchasesRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $purchaseId): array
    {
        $purchase = $this->repository->show($companyId, $purchaseId);
        if (!$purchase) {
            throw new InvalidArgumentException('Compra nao encontrada');
        }
        return $purchase;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        if ((int) ($data['idfilial'] ?? 0) <= 0) {
            throw new InvalidArgumentException('Selecione a filial da compra');
        }
        if (empty($data['items']) || !is_array($data['items'])) {
            throw new InvalidArgumentException('Adicione ao menos um produto a compra');
        }
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $purchaseId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [1, 4], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
        $this->repository->setStatus($companyId, $actorId, $purchaseId, $status, $ip, $agent);
    }
}
