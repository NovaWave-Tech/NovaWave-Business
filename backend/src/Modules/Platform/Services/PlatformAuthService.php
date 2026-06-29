<?php

namespace App\Modules\Platform\Services;

use App\Infrastructure\Security\PlatformJwtService;
use App\Modules\Platform\Repositories\PlatformAuthRepository;
use RuntimeException;

final class PlatformAuthService
{
    private const ACCESS_TOKEN_TTL = 3600;
    private const REFRESH_TOKEN_TTL = 2592000;
    private const MAX_ATTEMPTS = 5;

    public function __construct(private readonly PlatformAuthRepository $repository = new PlatformAuthRepository())
    {
    }

    public function login(string $email, string $password, ?string $ip, ?string $userAgent): array
    {
        $email = trim($email);

        if ($this->repository->failedAttempts($email, $ip) >= self::MAX_ATTEMPTS) {
            throw new RuntimeException('Muitas tentativas. Aguarde 15 minutos e tente novamente.');
        }

        $user = $this->repository->findByEmail($email);
        $valid = $user && password_verify($password, (string) $user['senha_hash']);
        $this->repository->recordAttempt($email, $ip, (bool) $valid);

        if (!$valid) {
            throw new RuntimeException('Email ou senha invalidos');
        }

        if ((int) $user['situacao'] !== 1) {
            throw new RuntimeException('Usuario da plataforma inativo');
        }

        $this->repository->markLogin((int) $user['idplatform_usuario']);

        return $this->issueTokens($user, $ip, $userAgent);
    }

    public function refresh(string $refreshToken, ?string $ip, ?string $userAgent): array
    {
        $session = $this->repository->findSession(hash('sha256', $refreshToken));

        if (!$session || (int) $session['situacao'] !== 1) {
            throw new RuntimeException('Refresh token invalido ou expirado');
        }

        $this->repository->revokeSession((int) $session['idsessao_platform']);

        return $this->issueTokens($session, $ip, $userAgent);
    }

    public function logout(string $refreshToken): void
    {
        $session = $this->repository->findSession(hash('sha256', $refreshToken));

        if ($session) {
            $this->repository->revokeSession((int) $session['idsessao_platform']);
        }
    }

    private function issueTokens(array $user, ?string $ip, ?string $userAgent): array
    {
        $userId = (int) $user['idplatform_usuario'];
        $refreshToken = bin2hex(random_bytes(48));
        $expiresAt = date('Y-m-d H:i:s', time() + self::REFRESH_TOKEN_TTL);
        $sessionId = $this->repository->createSession(
            $userId,
            hash('sha256', $refreshToken),
            $ip,
            $userAgent,
            $expiresAt
        );

        $authUser = [
            'idplatform_usuario' => $userId,
            'nome' => $user['nome'],
            'email' => $user['email'],
            'telefone' => $user['telefone'] ?? null,
            'cargo' => $user['cargo'] ?? null,
            'nivel_acesso' => $user['nivel_acesso'],
        ];

        return [
            'access_token' => PlatformJwtService::encode([
                'sub' => $userId,
                'sid' => $sessionId,
                'email' => $user['email'],
                'nome' => $user['nome'],
                'nivel_acesso' => $user['nivel_acesso'],
            ], self::ACCESS_TOKEN_TTL),
            'refresh_token' => $refreshToken,
            'expires_in' => self::ACCESS_TOKEN_TTL,
            'auth_user' => $authUser,
        ];
    }
}
