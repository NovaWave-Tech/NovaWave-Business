<?php

namespace App\Modules\Sales\Controllers;

use App\Modules\Sales\Services\SalesService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class SalesController extends ApiController
{
    private readonly SalesService $service;

    public function __construct(?SalesService $service = null)
    {
        $this->service = $service ?? new SalesService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId, $request->getQueryParams())
        );
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->show($context->companyId, (int) $args['id'])
        );
    }

    public function store(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) => [
            'idvenda' => $this->service->create(
                $context->companyId,
                $context->userId,
                $this->body($request),
                $context->ipAddress,
                $context->userAgent
            ),
        ], 201, 'Venda registrada com sucesso');
    }

    public function status(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->setStatus(
                $context->companyId,
                $context->userId,
                (int) $args['id'],
                (int) ($this->body($request)['situacao'] ?? -1),
                $context->ipAddress,
                $context->userAgent
            );
            return [];
        }, 200, 'Situacao da venda atualizada');
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
