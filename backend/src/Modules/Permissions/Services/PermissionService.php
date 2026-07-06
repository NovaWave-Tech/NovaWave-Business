<?php

namespace App\Modules\Permissions\Services;

use App\Modules\Permissions\Repositories\PermissionRepository;
use InvalidArgumentException;

final class PermissionService
{
    public function __construct(private readonly PermissionRepository $repository = new PermissionRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $profileId): array
    {
        $profile = $this->repository->show($companyId, $profileId);
        if (!$profile) throw new InvalidArgumentException('Perfil nao encontrado');
        return $profile;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->validate($data);
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function update(int $companyId, int $actorId, int $profileId, array $data, ?string $ip, ?string $agent): void
    {
        $this->validate($data);
        $this->repository->update($companyId, $actorId, $profileId, $data, $ip, $agent);
    }

    public function duplicate(int $companyId, int $actorId, int $profileId, array $data, ?string $ip, ?string $agent): int
    {
        return $this->repository->duplicate($companyId, $actorId, $profileId, trim((string) ($data['nome'] ?? '')), $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $profileId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [0, 1], true)) throw new InvalidArgumentException('Situacao invalida');
        $this->repository->setStatus($companyId, $actorId, $profileId, $status, $ip, $agent);
    }

    private function validate(array $data): void
    {
        if (strlen(trim((string) ($data['nome'] ?? ''))) < 3) throw new InvalidArgumentException('Nome do perfil e obrigatorio');
        $permissions = $data['permissions'] ?? [];
        if (!is_array($permissions) || count($permissions) === 0) throw new InvalidArgumentException('Selecione pelo menos uma permissao');
    }
}
