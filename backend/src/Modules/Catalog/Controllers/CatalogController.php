<?php

namespace App\Modules\Catalog\Controllers;

use App\Modules\Catalog\Services\CatalogService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class CatalogController extends ApiController
{
    private readonly CatalogService $service;

    public function __construct(?CatalogService $service = null)
    {
        $this->service = $service ?? new CatalogService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId)
        );
    }

    public function createCategory(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) => [
            'idcategoria' => $this->service->createCategory($context->companyId, $context->userId, $this->body($request), $context->ipAddress, $context->userAgent),
        ], 201, 'Categoria criada com sucesso');
    }

    public function updateCategory(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->updateCategory($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Categoria atualizada');
    }

    public function categoryStatus(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->setCategoryStatus($context->companyId, $context->userId, (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Situacao da categoria atualizada');
    }

    public function createBrand(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) => [
            'idmarca' => $this->service->createBrand($context->companyId, $context->userId, $this->body($request), $context->ipAddress, $context->userAgent),
        ], 201, 'Marca criada com sucesso');
    }

    public function updateBrand(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->updateBrand($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Marca atualizada');
    }

    public function brandStatus(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->setBrandStatus($context->companyId, $context->userId, (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1), $context->ipAddress, $context->userAgent);
            return [];
        }, 200, 'Situacao da marca atualizada');
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
