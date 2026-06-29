<?php

namespace App\Modules\Platform\Services;

use App\Modules\Platform\Repositories\PlatformRepository;
use InvalidArgumentException;
use RuntimeException;

final class PlatformService
{
    public function __construct(private readonly PlatformRepository $repository = new PlatformRepository())
    {
    }

    public function dashboard(): array { return $this->repository->dashboard(); }
    public function companies(array $filters): array { return $this->repository->companies($filters); }
    public function company(int $id): array
    {
        return $this->repository->company($id) ?? throw new RuntimeException('Empresa nao encontrada');
    }
    public function createCompany(array $data, int $userId): int
    {
        $required = ['razao_social', 'nome_fantasia', 'assinatura', 'filial', 'administrador'];
        foreach ($required as $field) {
            if (empty($data[$field])) throw new InvalidArgumentException("Campo obrigatorio: $field");
        }
        if (empty($data['assinatura']['idplano'])) throw new InvalidArgumentException('Plano obrigatorio');
        if (strlen((string) ($data['administrador']['senha'] ?? '')) < 8) {
            throw new InvalidArgumentException('A senha temporaria deve possuir ao menos 8 caracteres');
        }
        return $this->repository->createCompany($data, $userId);
    }
    public function setCompanyStatus(int $id, int $status, int $userId): void
    {
        if (!in_array($status, [0, 1, 2], true)) throw new InvalidArgumentException('Situacao invalida');
        if (!$this->repository->setCompanyStatus($id, $status, $userId)) {
            throw new RuntimeException('Empresa nao encontrada');
        }
    }
    public function plans(): array { return $this->repository->plans(); }
    public function savePlan(array $data, ?int $id = null): int
    {
        foreach (['nome', 'valor_mensal', 'valor_anual'] as $field) {
            if (!isset($data[$field]) || $data[$field] === '') throw new InvalidArgumentException("Campo obrigatorio: $field");
        }
        return $this->repository->savePlan($data, $id);
    }
    public function subscriptions(): array { return $this->repository->subscriptions(); }
    public function users(): array { return $this->repository->platformUsers(); }
    public function createUser(array $data): int
    {
        foreach (['nome', 'email', 'senha'] as $field) {
            if (empty($data[$field])) throw new InvalidArgumentException("Campo obrigatorio: $field");
        }
        if (strlen((string) $data['senha']) < 10) throw new InvalidArgumentException('A senha deve possuir ao menos 10 caracteres');
        return $this->repository->createPlatformUser($data);
    }
    public function audit(array $filters): array { return $this->repository->audit($filters); }
    public function configurations(): array { return $this->repository->configurations(); }
    public function saveConfigurations(array $items, int $userId): void
    {
        if ($items === []) throw new InvalidArgumentException('Nenhuma configuracao informada');
        $this->repository->saveConfigurations($items, $userId);
    }
}
