<?php

namespace App\Modules\Notifications\Controllers;

use App\Modules\Notifications\Services\NotificationService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class NotificationController extends ApiController
{
    private readonly NotificationService $service;

    public function __construct(?NotificationService $service = null)
    {
        $this->service = $service ?? new NotificationService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId, $context->userId)
        );
    }

    public function read(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($args) {
            $this->service->markRead($context->companyId, $context->userId, (int) $args['id']);
            return [];
        }, 200, 'Notificacao lida');
    }

    public function readAll(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->markAllRead($context->companyId, $context->userId), 200, 'Notificacoes lidas');
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
