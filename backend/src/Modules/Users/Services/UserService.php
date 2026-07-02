<?php

namespace App\Modules\Users\Services;

use App\Modules\Users\Repositories\UserRepository;
use InvalidArgumentException;

final class UserService
{
    public function __construct(private readonly UserRepository $repository = new UserRepository())
    {
    }

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $userId): array
    {
        $user = $this->repository->show($companyId, $userId);
        if (!$user) throw new InvalidArgumentException('Usuario nao encontrado');
        return $user;
    }

    public function create(
        int $companyId,
        int $actorId,
        array $data,
        ?string $ip,
        ?string $userAgent
    ): int {
        $this->validate($data, true);
        return $this->repository->create($companyId, $actorId, $data, $ip, $userAgent);
    }

    public function update(
        int $companyId,
        int $actorId,
        int $userId,
        array $data,
        ?string $ip,
        ?string $userAgent
    ): void {
        $this->validate($data, false);
        $this->repository->update($companyId, $actorId, $userId, $data, $ip, $userAgent);
    }

    public function setStatus(
        int $companyId,
        int $actorId,
        int $userId,
        int $status,
        ?string $ip,
        ?string $userAgent
    ): void {
        if (!in_array($status, [0, 1], true)) throw new InvalidArgumentException('Situacao invalida');
        if ($actorId === $userId && $status === 0) throw new InvalidArgumentException('Voce nao pode bloquear seu proprio usuario');
        $this->repository->setStatus($companyId, $actorId, $userId, $status, $ip, $userAgent);
    }

    public function resetPassword(
        int $companyId,
        int $actorId,
        int $userId,
        string $password,
        ?string $ip,
        ?string $userAgent
    ): void {
        if (strlen($password) < 10) throw new InvalidArgumentException('A senha deve possuir ao menos 10 caracteres');
        $this->repository->resetPassword($companyId, $actorId, $userId, $password, $ip, $userAgent);
    }

    public function revokeSession(
        int $companyId,
        int $actorId,
        int $userId,
        int $sessionId,
        ?string $ip,
        ?string $userAgent
    ): void {
        $this->repository->revokeSession($companyId, $actorId, $userId, $sessionId, $ip, $userAgent);
    }

    private function validate(array $data, bool $creating): void
    {
        foreach (['nome', 'email', 'idfilial'] as $field) {
            if (empty($data[$field])) throw new InvalidArgumentException("Campo {$field} e obrigatorio");
        }
        if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('E-mail invalido');
        if ($creating && strlen((string) ($data['senha'] ?? '')) < 10) {
            throw new InvalidArgumentException('A senha temporaria deve possuir ao menos 10 caracteres');
        }
    }
}
