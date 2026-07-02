<?php

namespace App\Modules\Customers\Controllers;

use App\Modules\Customers\Services\CustomerService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class CustomerController extends ApiController
{
    private readonly CustomerService $service;

    public function __construct(?CustomerService $service = null)
    {
        $this->service = $service ?? new CustomerService();
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
            'idcliente' => $this->service->create(
                $context->companyId,
                $context->userId,
                $this->body($request),
                $context->ipAddress,
                $context->userAgent
            ),
        ], 201, 'Cliente criado com sucesso');
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->update($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Cliente atualizado com sucesso');
    }

    public function status(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->setStatus($context->companyId, $context->userId, (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Situacao do cliente atualizada');
    }

    public function note(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->addNote($context->companyId, $context->userId, (int) $args['id'], (string) ($this->body($request)['observacao'] ?? ''), $context->ipAddress, $context->userAgent);
            return [];
        }, 201, 'Observacao adicionada');
    }

    private function run(Request $request, Response $response, callable $callback, int $status = 200, string $message = 'OK'): Response
    {
        try {
            $context = RequestContext::fromRequest($request);
            if (!$context->companyId || !$context->userId) return $this->error($response, 'Contexto de autenticacao invalido', 403);
            return $this->success($response, $callback($context), $message, $status);
        } catch (InvalidArgumentException $exception) {
            return $this->error($response, $exception->getMessage(), 422);
        } catch (Throwable) {
            return $this->error($response, 'Nao foi possivel concluir a operacao', 500);
        }
    }
}
