<?php

namespace App\Modules\Inventory\Controllers;

use App\Modules\Inventory\Services\InventoryService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use Throwable;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

final class InventoryController extends ApiController
{
    private readonly InventoryService $service;

    public function __construct(?InventoryService $service = null)
    {
        $this->service = $service ?? new InventoryService();
    }

    public function index(Request $request, Response $response): Response
    {
        try {
            $context = RequestContext::fromRequest($request);
            if (!$context->companyId) {
                return $this->error($response, 'Empresa nao identificada', 403);
            }
            return $this->success(
                $response,
                $this->service->index($context->companyId, $request->getQueryParams()),
                'Estoque carregado'
            );
        } catch (Throwable) {
            return $this->error($response, 'Nao foi possivel carregar o estoque', 500);
        }
    }
}
