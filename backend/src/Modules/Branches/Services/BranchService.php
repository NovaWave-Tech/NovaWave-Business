<?php

namespace App\Modules\Branches\Services;

use App\Modules\Branches\Repositories\BranchRepository;
use InvalidArgumentException;

final class BranchService
{
    public function __construct(private readonly BranchRepository $repository = new BranchRepository()) {}

    public function index(int $companyId, array $filters): array { return $this->repository->index($companyId, $filters); }

    public function show(int $companyId, int $branchId): array
    {
        $branch = $this->repository->show($companyId, $branchId);
        if (!$branch) throw new InvalidArgumentException('Filial nao encontrada');
        return $branch;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->validate($data);
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function update(int $companyId, int $actorId, int $branchId, array $data, ?string $ip, ?string $agent): void
    {
        $this->validate($data);
        $this->repository->update($companyId, $actorId, $branchId, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $branchId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [0, 1], true)) throw new InvalidArgumentException('Situacao invalida');
        $this->repository->setStatus($companyId, $actorId, $branchId, $status, $ip, $agent);
    }

    public function setMatrix(int $companyId, int $actorId, int $branchId, ?string $ip, ?string $agent): void
    {
        $this->repository->setMatrix($companyId, $actorId, $branchId, $ip, $agent);
    }

    private function validate(array $data): void
    {
        foreach (['nome', 'codigo', 'cidade', 'estado'] as $field) {
            if (empty(trim((string) ($data[$field] ?? '')))) throw new InvalidArgumentException("Campo {$field} e obrigatorio");
        }
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('E-mail invalido');
        if (strlen((string) $data['estado']) !== 2) throw new InvalidArgumentException('Estado deve usar a sigla com 2 letras');
    }
}
