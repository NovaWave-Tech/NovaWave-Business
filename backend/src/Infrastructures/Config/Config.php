<?php

namespace App\Infrastructures\Config;

class Config
{
    public static function get(string $key, $default = null)
    {
        $value = $_ENV[$key] ?? getenv($key);

        if ($value === false || $value === null || $value === '') {
            return $default;
        }

        return is_array($value) ? $default : $value;
    }

    // Database Configuration
    public static function getDbHost(): string
    {
        return self::get('DB_HOST', 'localhost');
    }

    public static function getDbUser(): string
    {
        return self::get('DB_USER', 'root');
    }

    public static function getDbPassword(): string
    {
        return self::get('DB_PASSWORD', '');
    }

    public static function getDbName(): string
    {
        return self::get('DB_NAME', 'db');
    }

    public static function getDbPort(): int
    {
        return (int) self::get('DB_PORT', 5432);
    }

    public static function getDbDriver(): string
    {
        return self::get('DB_DRIVER', 'pgsql');
    }

    // Application Configuration
    public static function getAppName(): string
    {
        return self::get('APP_NAME', 'API');
    }

    public static function getAppEnv(): string
    {
        return self::get('APP_ENV', 'production');
    }

    public static function getTimezone(): string
    {
        return self::get('APP_TIMEZONE', 'America/Sao_Paulo');
    }

    // CORS Configuration
    public static function getCorsAllowedOrigins(): array
    {
        $origins = self::get('CORS_ALLOWED_ORIGINS', '*');

        if ($origins === '*') {
            return ['*'];
        }

        return array_values(array_filter(array_map('trim', explode(',', $origins))));
    }
}
