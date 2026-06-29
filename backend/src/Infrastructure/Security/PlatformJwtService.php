<?php

namespace App\Infrastructure\Security;

use App\Infrastructures\Config\Config;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use RuntimeException;
use stdClass;

final class PlatformJwtService
{
    private const ALGORITHM = 'HS256';

    public static function encode(array $claims, int $ttlSeconds): string
    {
        $now = time();

        return JWT::encode(array_merge([
            'iss' => ($_ENV['APP_NAME'] ?? 'NovaWave Business API') . '/platform',
            'iat' => $now,
            'exp' => $now + $ttlSeconds,
            'guard' => 'platform',
        ], $claims), self::secret(), self::ALGORITHM);
    }

    public static function decode(string $token): stdClass
    {
        $decoded = JWT::decode($token, new Key(self::secret(), self::ALGORITHM));

        if (($decoded->guard ?? null) !== 'platform') {
            throw new RuntimeException('Token nao pertence a plataforma');
        }

        return $decoded;
    }

    private static function secret(): string
    {
        $secret = (string) Config::get('PLATFORM_JWT_SECRET', '');

        if (strlen($secret) < 32) {
            throw new RuntimeException('PLATFORM_JWT_SECRET deve possuir ao menos 32 caracteres');
        }

        return $secret;
    }
}
