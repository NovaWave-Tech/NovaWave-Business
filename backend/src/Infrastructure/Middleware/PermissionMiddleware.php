<?php

namespace App\Infrastructure\Middleware;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

/**
 * Autorizacao por permissao ("modulo:acao") lida do JWT ja validado pelo
 * JwtAuthMiddleware. Usuarios admin_empresa carregam o curinga "*".
 *
 * Uso nas rotas: ->add(PermissionMiddleware::check('venda:criar'))
 */
final class PermissionMiddleware implements MiddlewareInterface
{
    public function __construct(private readonly string $permission)
    {
    }

    public static function check(string $permission): self
    {
        return new self($permission);
    }

    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $granted = array_map(strval(...), (array) $request->getAttribute('permissions', []));

        if (in_array('*', $granted, true) || in_array($this->permission, $granted, true)) {
            return $handler->handle($request);
        }

        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => 'Acesso negado: seu perfil nao possui a permissao necessaria (' . $this->permission . ')',
        ], JSON_UNESCAPED_UNICODE));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus(403);
    }
}
