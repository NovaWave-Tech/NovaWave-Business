<?php

namespace App\Modules\Cashier\Services;

use App\Modules\Cashier\Repositories\CashierRepository;
use InvalidArgumentException;

final class CashierService
{
    public function __construct(private readonly CashierRepository $repository = new CashierRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function open(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $branchId = (int) ($data['idfilial'] ?? 0);
        if ($branchId <= 0) {
            throw new InvalidArgumentException('Selecione a filial do caixa');
        }
        $balance = (float) ($data['saldo_inicial'] ?? 0);
        if ($balance < 0) {
            throw new InvalidArgumentException('O saldo inicial nao pode ser negativo');
        }
        return $this->repository->open($companyId, $actorId, $branchId, $balance, $ip, $agent);
    }

    public function addMovement(int $companyId, int $actorId, int $cashId, array $data, ?string $ip, ?string $agent): void
    {
        $type = (int) ($data['tipo'] ?? 0);
        if (!in_array($type, [1, 2], true)) {
            throw new InvalidArgumentException('Tipo de movimentacao invalido');
        }
        $description = trim((string) ($data['descricao'] ?? ''));
        if (strlen($description) < 3) {
            throw new InvalidArgumentException('Informe uma descricao para a movimentacao');
        }
        $value = (float) ($data['valor'] ?? 0);
        if ($value <= 0) {
            throw new InvalidArgumentException('O valor deve ser maior que zero');
        }
        $this->repository->addMovement($companyId, $actorId, $cashId, $type, $description, $value, $ip, $agent);
    }

    public function close(int $companyId, int $actorId, int $cashId, array $data, ?string $ip, ?string $agent): array
    {
        $counted = isset($data['saldo_final']) && $data['saldo_final'] !== '' ? (float) $data['saldo_final'] : null;
        if ($counted !== null && $counted < 0) {
            throw new InvalidArgumentException('O saldo final nao pode ser negativo');
        }
        return $this->repository->close($companyId, $actorId, $cashId, $counted, $ip, $agent);
    }
}
