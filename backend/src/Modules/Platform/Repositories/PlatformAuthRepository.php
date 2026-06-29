<?php

namespace App\Modules\Platform\Repositories;

use App\Infrastructures\Config\Database;
use PDO;

final class PlatformAuthRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function findByEmail(string $email): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT idplatform_usuario, nome, email, senha_hash, telefone, cargo, nivel_acesso, situacao
             FROM public.platform_usuario
             WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))
             LIMIT 1'
        );
        $statement->execute(['email' => $email]);
        $user = $statement->fetch(PDO::FETCH_ASSOC);

        return $user ?: null;
    }

    public function failedAttempts(string $email, ?string $ip): int
    {
        $statement = $this->pdo->prepare(
            "SELECT COUNT(*) FROM public.platform_login_tentativa
             WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:email))
               AND COALESCE(ip, '') = COALESCE(:ip, '')
               AND sucesso = false
               AND criado_em >= CURRENT_TIMESTAMP - INTERVAL '15 minutes'"
        );
        $statement->execute(['email' => $email, 'ip' => $ip]);

        return (int) $statement->fetchColumn();
    }

    public function recordAttempt(string $email, ?string $ip, bool $success): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO public.platform_login_tentativa (email, ip, sucesso)
            VALUES (:email, :ip, :sucesso)'
        );

        $statement->bindValue(':email', $email, PDO::PARAM_STR);

        if ($ip === null) {
            $statement->bindValue(':ip', null, PDO::PARAM_NULL);
        } else {
            $statement->bindValue(':ip', $ip, PDO::PARAM_STR);
        }

        $statement->bindValue(':sucesso', $success, PDO::PARAM_BOOL);

        $statement->execute();
    }

    public function markLogin(int $userId): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE public.platform_usuario SET ultimo_login = CURRENT_TIMESTAMP WHERE idplatform_usuario = :id'
        );
        $statement->execute(['id' => $userId]);
    }

    public function createSession(int $userId, string $refreshHash, ?string $ip, ?string $userAgent, string $expiresAt): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO public.sessao_platform_usuario
             (idplatform_usuario, refresh_token_hash, ip, navegador, expira_em)
             VALUES (:user_id, :token_hash, :ip, :user_agent, :expires_at)
             RETURNING idsessao_platform'
        );
        $statement->execute([
            'user_id' => $userId,
            'token_hash' => $refreshHash,
            'ip' => $ip,
            'user_agent' => $userAgent,
            'expires_at' => $expiresAt,
        ]);

        return (int) $statement->fetchColumn();
    }

    public function findSession(string $refreshHash): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT s.idsessao_platform, u.idplatform_usuario, u.nome, u.email,
                    u.telefone, u.cargo, u.nivel_acesso, u.situacao
             FROM public.sessao_platform_usuario s
             INNER JOIN public.platform_usuario u
               ON u.idplatform_usuario = s.idplatform_usuario
             WHERE s.refresh_token_hash = :token_hash
               AND s.revogado_em IS NULL
               AND s.expira_em > CURRENT_TIMESTAMP
             LIMIT 1'
        );
        $statement->execute(['token_hash' => $refreshHash]);
        $session = $statement->fetch(PDO::FETCH_ASSOC);

        return $session ?: null;
    }

    public function revokeSession(int $sessionId): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE public.sessao_platform_usuario
             SET revogado_em = CURRENT_TIMESTAMP
             WHERE idsessao_platform = :id AND revogado_em IS NULL'
        );
        $statement->execute(['id' => $sessionId]);
    }
}
