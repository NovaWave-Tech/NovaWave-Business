<?php

namespace App\Infrastructure\Middleware;

use App\Infrastructure\Security\PlatformJwtService;
use App\Infrastructures\Config\Database;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Psr7\Response as SlimResponse;

final class PlatformAuthMiddleware implements MiddlewareInterface
{
    public function process(Request $request, RequestHandlerInterface $handler): Response
    {
        $header = $request->getHeaderLine('Authorization');

        if (!preg_match('/Bearer\s+(\S+)/', $header, $matches)) {
            return $this->unauthorized('Token da plataforma nao informado');
        }

        try {
            $claims = PlatformJwtService::decode($matches[1]);
            $statement = Database::getInstance()->prepare(
                'SELECT nivel_acesso FROM public.platform_usuario
                 WHERE idplatform_usuario = :id AND situacao = 1'
            );
            $statement->execute(['id' => (int) ($claims->sub ?? 0)]);
            $accessLevel = $statement->fetchColumn();

            if (!$accessLevel) {
                return $this->unauthorized('Usuario da plataforma inativo ou inexistente');
            }

            $request = $request
                ->withAttribute('platform_user_id', isset($claims->sub) ? (int) $claims->sub : null)
                ->withAttribute('platform_access_level', $accessLevel);
        } catch (Exception) {
            return $this->unauthorized('Token da plataforma invalido ou expirado');
        }

        return $handler->handle($request);
    }

    private function unauthorized(string $message): Response
    {
        $response = new SlimResponse();
        $response->getBody()->write(json_encode([
            'success' => false,
            'error' => $message,
        ], JSON_UNESCAPED_UNICODE));

        return $response->withHeader('Content-Type', 'application/json')->withStatus(401);
    }
}
