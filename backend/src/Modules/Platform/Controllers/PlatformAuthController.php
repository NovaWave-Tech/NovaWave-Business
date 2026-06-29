<?php

namespace App\Modules\Platform\Controllers;

use App\Modules\Platform\Services\PlatformAuthService;
use App\Shared\Http\ApiController;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class PlatformAuthController extends ApiController
{
    private readonly PlatformAuthService $service;

    public function __construct(?PlatformAuthService $service = null)
    {
        $this->service = $service ?? new PlatformAuthService();
    }

    public function login(Request $request, Response $response): Response
    {
        $body = $this->body($request);

        if (empty($body['email']) || empty($body['senha'])) {
            return $this->error($response, 'Email e senha sao obrigatorios', 422);
        }

        try {
            return $this->success($response, $this->service->login(
                (string) $body['email'],
                (string) $body['senha'],
                $request->getServerParams()['REMOTE_ADDR'] ?? null,
                $request->getHeaderLine('User-Agent') ?: null
            ), 'Login da plataforma realizado');
        } catch (Exception $exception) {
            return $this->error($response, $exception->getMessage(), 401);
        }
    }

    public function refresh(Request $request, Response $response): Response
    {
        $token = $this->body($request)['refresh_token'] ?? null;

        if (!$token) {
            return $this->error($response, 'Refresh token obrigatorio', 422);
        }

        try {
            return $this->success($response, $this->service->refresh(
                (string) $token,
                $request->getServerParams()['REMOTE_ADDR'] ?? null,
                $request->getHeaderLine('User-Agent') ?: null
            ));
        } catch (Exception $exception) {
            return $this->error($response, $exception->getMessage(), 401);
        }
    }

    public function logout(Request $request, Response $response): Response
    {
        $token = $this->body($request)['refresh_token'] ?? '';
        $this->service->logout((string) $token);

        return $this->success($response, [], 'Sessao encerrada');
    }

    public function me(Request $request, Response $response): Response
    {
        return $this->success($response, [
            'idplatform_usuario' => $request->getAttribute('platform_user_id'),
            'nivel_acesso' => $request->getAttribute('platform_access_level'),
        ]);
    }
}
