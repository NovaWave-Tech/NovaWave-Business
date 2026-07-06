<?php

namespace App\Modules\Sales\Services;

use App\Modules\Sales\Repositories\SalesRepository;
use InvalidArgumentException;

final class SalesService
{
    public function __construct(private readonly SalesRepository $repository = new SalesRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $saleId): array
    {
        $sale = $this->repository->show($companyId, $saleId);
        if (!$sale) {
            throw new InvalidArgumentException('Venda nao encontrada');
        }
        return $sale;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        if ((int) ($data['idfilial'] ?? 0) <= 0) {
            throw new InvalidArgumentException('Selecione a filial da venda');
        }
        if (empty($data['items']) || !is_array($data['items'])) {
            throw new InvalidArgumentException('Adicione ao menos um produto a venda');
        }
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $saleId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [1, 4], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
        $this->repository->setStatus($companyId, $actorId, $saleId, $status, $ip, $agent);
    }
}
