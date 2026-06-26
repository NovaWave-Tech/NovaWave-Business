<?php

namespace App\Shared\Support;

use Psr\Http\Message\ServerRequestInterface as Request;

final class RequestContext
{
    public function __construct(
        public readonly ?int $userId,
        public readonly ?int $companyId,
        public readonly ?int $branchId,
        public readonly ?string $ipAddress,
        public readonly ?string $userAgent,
    ) {
    }

    public static function fromRequest(Request $request): self
    {
        $serverParams = $request->getServerParams();

        return new self(
            userId: self::nullableInt($request->getAttribute('user_id')),
            companyId: self::nullableInt($request->getAttribute('company_id')),
            branchId: self::nullableInt($request->getAttribute('branch_id')),
            ipAddress: $serverParams['REMOTE_ADDR'] ?? null,
            userAgent: $request->getHeaderLine('User-Agent') ?: null,
        );
    }

    private static function nullableInt(mixed $value): ?int
    {
        return is_numeric($value) ? (int) $value : null;
    }
}
