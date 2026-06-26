<?php

namespace App\Infrastructure\Security;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use stdClass;

class JwtService
{
    private const ALGORITHM = 'HS256';

    public static function encode(array $claims, int $ttlSeconds): string
    {
        $now = time();

        return JWT::encode(array_merge([
            'iss' => $_ENV['APP_NAME'] ?? 'NovaWave Business API',
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
        ], $claims), self::secret(), self::ALGORITHM);
    }

    public static function decode(string $token): stdClass
    {
        return JWT::decode($token, new Key(self::secret(), self::ALGORITHM));
    }

    private static function secret(): string
    {
        $secret = $_ENV['JWT_SECRET'] ?? '';

        if ($secret === '') {
            throw new RuntimeException('JWT_SECRET nao configurado');
        }

        return $secret;
    }
}
