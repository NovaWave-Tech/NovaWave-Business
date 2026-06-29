<?php

namespace App\Modules\Auth\Services;

use App\Infrastructure\Security\JwtService;
use App\Modules\Auth\Repositories\AuthRepository;
use RuntimeException;

class AuthService
{
    private const ACCESS_TOKEN_TTL = 86400;

    private readonly AuthRepository $repository;

    public function __construct(?AuthRepository $repository = null)
    {
        $this->repository = $repository ?? new AuthRepository();
    }

    public function login(string $email, string $password): array
    {
        $user = $this->repository->findUserByEmail(trim($email));

        if (!$user || !password_verify($password, (string) $user->senha_hash)) {
            throw new RuntimeException('Email ou senha invalidos');
        }

        if ((int) $user->situacao !== 1) {
            throw new RuntimeException('Usuario inativo');
        }

        if ((int) $user->empresa_situacao !== 1) {
            throw new RuntimeException('Empresa inativa ou bloqueada');
        }

        $authUser = [
            'idusuario' => (int) $user->idusuario,
            'nome' => $user->nome,
            'email' => $user->email,
            'situacao' => (int) $user->situacao,
            'company_id' => isset($user->company_id) ? (int) $user->company_id : null,
            'branch_id' => isset($user->branch_id) ? (int) $user->branch_id : null,
        ];

        $token = JwtService::encode([
            'sub' => $authUser['idusuario'],
            'email' => $authUser['email'],
            'nome' => $authUser['nome'],
            'company_id' => $authUser['company_id'],
            'branch_id' => $authUser['branch_id'],
            'permissions' => [],
        ], self::ACCESS_TOKEN_TTL);

        return [
            'token' => $token,
            'expires_in' => self::ACCESS_TOKEN_TTL,
            'auth_user' => $authUser,
        ];
    }

}
