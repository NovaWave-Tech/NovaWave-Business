<?php

namespace App\Modules\Hr\Controllers;

use App\Modules\Hr\Services\HrService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class HrController extends ApiController
{
    private readonly HrService $service;

    public function __construct(?HrService $service = null)
    {
        $this->service = $service ?? new HrService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) =>
            $this->service->index($c->companyId, $request->getQueryParams()));
    }

    public function show(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) =>
            $this->service->show($c->companyId, (int) $args['id']));
    }

    public function store(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) => [
            'idfuncionario' => $this->service->create($c->companyId, $c->userId, $this->body($request), $c->ipAddress, $c->userAgent),
        ], 201, 'Funcionario cadastrado');
    }

    public function update(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $c) use ($request, $args) {
            $this->service->update($c->companyId, $c->userId, (int) $args['id'], $this->body($request), $c->ipAddress, $c->userAgent);
            return [];
        }, 200, 'Funcionario atualizado');
    }

    public function status(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $c) use ($request, $args) {
            $this->service->setStatus($c->companyId, $c->userId, (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1), $c->ipAddress, $c->userAgent);
            return [];
        }, 200, 'Situacao atualizada');
    }

    public function storeDepartment(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) =>
            $this->service->saveDepartment($c->companyId, $c->userId, null, $this->body($request), $c->ipAddress, $c->userAgent), 201, 'Departamento salvo');
    }

    public function updateDepartment(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) =>
            $this->service->saveDepartment($c->companyId, $c->userId, (int) $args['id'], $this->body($request), $c->ipAddress, $c->userAgent), 200, 'Departamento atualizado');
    }

    public function storePosition(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) =>
            $this->service->savePosition($c->companyId, $c->userId, null, $this->body($request), $c->ipAddress, $c->userAgent), 201, 'Cargo salvo');
    }

    public function updatePosition(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, fn (RequestContext $c) =>
            $this->service->savePosition($c->companyId, $c->userId, (int) $args['id'], $this->body($request), $c->ipAddress, $c->userAgent), 200, 'Cargo atualizado');
    }

    public function structureStatus(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $c) use ($request, $args) {
            $this->service->setStructureStatus($c->companyId, $c->userId, $args['entity'], (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1), $c->ipAddress, $c->userAgent);
            return [];
        }, 200, 'Situacao atualizada');
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
