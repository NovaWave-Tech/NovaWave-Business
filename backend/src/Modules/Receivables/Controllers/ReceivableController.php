<?php

namespace App\Modules\Receivables\Controllers;

use App\Modules\Receivables\Services\ReceivableService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class ReceivableController extends ApiController
{
    private readonly ReceivableService $service;

    public function __construct(?ReceivableService $service = null)
    {
        $this->service = $service ?? new ReceivableService();
    }

    public function customers(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->customers($context->companyId, (string) ($request->getQueryParams()['q'] ?? ''))
        );
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId, (int) ($request->getQueryParams()['idcliente'] ?? 0))
        );
    }

    public function settle(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->settle($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Titulo recebido com sucesso');
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
