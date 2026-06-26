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
}
