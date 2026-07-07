<?php

namespace App\Modules\Suppliers\Controllers;

use App\Modules\Suppliers\Services\SupplierService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class SupplierController extends ApiController
{
    private readonly SupplierService $service;

    public function __construct(?SupplierService $service = null)
    {
        $this->service = $service ?? new SupplierService();
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
            'idfornecedor' => $this->service->create($context->companyId, $context->userId, $this->body($request), $context->ipAddress, $context->userAgent),
        ], 201, 'Fornecedor criado com sucesso');
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->update($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Fornecedor atualizado');
    }

    public function status(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->setStatus($context->companyId, $context->userId, (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Situacao do fornecedor atualizada');
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
