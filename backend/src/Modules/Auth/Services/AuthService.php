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

        // Admin da empresa recebe o curinga "*"; os demais carregam as
        // permissoes reais dos perfis de acesso vinculados.
        $isAdmin = in_array($user->admin_empresa ?? false, [true, 't', 'true', 1, '1'], true);
        $permissions = $isAdmin
            ? ['*']
            : $this->repository->loadPermissions((int) $user->company_id, (int) $user->idusuario);

        $authUser = [
            'idusuario' => (int) $user->idusuario,
            'nome' => $user->nome,
            'email' => $user->email,
            'situacao' => (int) $user->situacao,
            'company_id' => isset($user->company_id) ? (int) $user->company_id : null,
            'branch_id' => isset($user->branch_id) ? (int) $user->branch_id : null,
            'admin_empresa' => $isAdmin,
            'permissions' => $permissions,
        ];

        $token = JwtService::encode([
            'sub' => $authUser['idusuario'],
            'email' => $authUser['email'],
            'nome' => $authUser['nome'],
            'company_id' => $authUser['company_id'],
            'branch_id' => $authUser['branch_id'],
            'permissions' => $permissions,
            // Versao do payload de permissoes: tokens sem esta claim sao
            // anteriores ao enforcement e recebem 401 (forca novo login).
            'pv' => 1,
        ], self::ACCESS_TOKEN_TTL);

        return [
            'token' => $token,
            'expires_in' => self::ACCESS_TOKEN_TTL,
            'auth_user' => $authUser,
        ];
    }

}
