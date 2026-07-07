<?php

namespace App\Modules\Settings\Controllers;

use App\Modules\Settings\Services\SettingsService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class SettingsController extends ApiController
{
    private readonly SettingsService $service;

    public function __construct(?SettingsService $service = null)
    {
        $this->service = $service ?? new SettingsService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId, $context->userId)
        );
    }

    public function savePreferences(Request $request, Response $response): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request) {
            $this->service->savePreferences($context->companyId, $context->userId, $this->body($request));
            return [];
        }, 200, 'Preferencias salvas');
    }

    public function saveFinance(Request $request, Response $response): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request) {
            $this->service->saveFinance($context->companyId, $context->userId, $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Configuracao financeira salva');
    }

    private function run(Request $request, Response $response, callable $callback, int $status = 200, string $message = 'OK'): Response
    {
        try {
            $context = RequestContext::fromRequest($request);
            if (!$context->companyId || !$context->userId) {
                return $this->error($response, 'Contexto de autenticacao invalido', 403);
            }
            return $this->success($response, $callback($context), $message, $status);
        } catch (InvalidArgumentException $exception) {
            return $this->error($response, $exception->getMessage(), 422);
        } catch (Throwable) {
            return $this->error($response, 'Nao foi possivel concluir a operacao', 500);
        }
    }
}
