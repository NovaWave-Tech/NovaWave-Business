<?php

namespace App\Modules\Goals\Controllers;

use App\Modules\Goals\Services\GoalService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class GoalController extends ApiController
{
    private readonly GoalService $service;

    public function __construct(?GoalService $service = null)
    {
        $this->service = $service ?? new GoalService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId, $request->getQueryParams()['competencia'] ?? null)
        );
    }

    public function save(Request $request, Response $response): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request) {
            $this->service->save($context->companyId, $context->userId, $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Meta salva');
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
