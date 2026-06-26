<?php

namespace App\Modules\Auth\Controllers;

use App\Modules\Auth\Services\AuthService;
use App\Shared\Http\ApiController;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class AuthController extends ApiController
{
    private readonly AuthService $service;

    public function __construct(?AuthService $service = null)
    {
        $this->service = $service ?? new AuthService();
    }

    public function login(Request $request, Response $response): Response
    {
        $body = $this->body($request);
        $email = $body['email'] ?? $body['login'] ?? null;
        $password = $body['senha'] ?? $body['password'] ?? null;

        if (!$email || !$password) {
            return $this->error($response, 'Email e senha sao obrigatorios', 422);
        }

        try {
            return $this->success(
                $response,
                $this->service->login((string) $email, (string) $password),
                'Login realizado com sucesso'
            );
        } catch (Exception $exception) {
            return $this->error($response, $exception->getMessage(), 401);
        }
    }

    public function me(Request $request, Response $response): Response
    {
        return $this->success($response, [
            'user_id' => $request->getAttribute('user_id'),
            'company_id' => $request->getAttribute('company_id'),
            'branch_id' => $request->getAttribute('branch_id'),
            'permissions' => $request->getAttribute('permissions') ?? [],
        ]);
    }
}
