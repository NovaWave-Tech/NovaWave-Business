<?php

namespace App\Infrastructure\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

final class PlatformRoleMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly array $allowedLevels)
    {
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        if (!in_array($request->getAttribute('platform_access_level'), $this->allowedLevels, true)) {
            $response = new SlimResponse();
            $response->getBody()->write(json_encode([
                'success' => false,
                'error' => 'Nivel de acesso insuficiente para esta operacao',
            ], JSON_UNESCAPED_UNICODE));

            return $response->withHeader('Content-Type', 'application/json')->withStatus(403);
        }

        return $handler->handle($request);
    }
}
