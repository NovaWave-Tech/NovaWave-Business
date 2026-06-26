<?php

namespace App\Infrastructure\Middleware;

use App\Infrastructure\Security\JwtService;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

class JwtAuthMiddleware implements MiddlewareInterface
{
    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $token = $this->extractToken($request);

        if ($token === null) {
            return $this->unauthorized('Token nao informado');
        }

        try {
            $decoded = JwtService::decode($token);

            $request = $request
                ->withAttribute('user_id', $decoded->sub ?? null)
                ->withAttribute('company_id', $decoded->company_id ?? null)
                ->withAttribute('branch_id', $decoded->branch_id ?? null)
                ->withAttribute('permissions', $decoded->permissions ?? []);
        } catch (Exception) {
            return $this->unauthorized('Token invalido ou expirado');
        }

        return $handler->handle($request);
    }

    private function extractToken(Request $request): ?string
    {
        $authHeader = $request->getHeaderLine('Authorization');

        if (preg_match('/Bearer\s+(\S+)/', $authHeader, $matches)) {
            return $matches[1];
        }

        return null;
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message,
        ], JSON_UNESCAPED_UNICODE));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(401);
    }
}
