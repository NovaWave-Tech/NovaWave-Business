<?php

namespace App\Modules\Auth\Repositories;

use App\Infrastructures\Config\Database;

class AuthRepository
{
    public function findUserByEmail(string $email): ?object
    {
        $result = Database::switchParams(
            ['email' => $email],
            'login/logar',
            true,
            false,
            '',
            1
        );

        if (($result['error'] ?? false) || !($result['retorno'] ?? null)) {
            return null;
        }

        return $result['retorno'];
    }

    /**
     * Permissoes efetivas do usuario ("modulo:acao"), unificando todos os
     * perfis ativos vinculados a ele. Usuarios admin_empresa nao passam por
     * aqui (recebem o curinga "*" no login).
     */
    public function loadPermissions(int $companyId, int $userId): array
    {
        $statement = Database::getInstance()->prepare(
            "SELECT DISTINCT p.modulo || ':' || p.acao AS permission
             FROM usuario_perfil up
             JOIN perfil_acesso pa ON pa.idempresa = up.idempresa AND pa.idperfil = up.idperfil AND pa.situacao = 1
             JOIN perfil_permissao pp ON pp.idempresa = up.idempresa AND pp.idperfil = up.idperfil
             JOIN permissao p ON p.idpermissao = pp.idpermissao
             WHERE up.idempresa = :company_id AND up.idusuario = :user_id
             ORDER BY 1"
        );
        $statement->execute(['company_id' => $companyId, 'user_id' => $userId]);
        return array_map(
            static fn (array $row): string => (string) $row['permission'],
            $statement->fetchAll(\PDO::FETCH_ASSOC)
        );
    }
}
