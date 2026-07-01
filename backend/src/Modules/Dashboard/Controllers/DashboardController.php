<?php

namespace App\Modules\Dashboard\Controllers;

use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use App\Modules\Dashboard\Services\DashboardService;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DashboardController extends ApiController
{
    private readonly DashboardService $service;

    public function __construct(?DashboardService $service = null)
    {
        $this->service = $service ?? new DashboardService();
    }

    public function index(Request $request, Response $response): Response
    {
        $context = RequestContext::fromRequest($request);
        if (!$context->companyId) {
            return $this->error($response, 'Empresa nao identificada', 403);
        }
        $period = (string) (($request->getQueryParams()['period'] ?? '30d'));
        if (!in_array($period, ['today', '7d', '30d', '90d', 'year'], true)) {
            return $this->error($response, 'Periodo invalido', 422);
        }

        return $this->success(
            $response,
            $this->service->get($context->companyId, $period),
            'Dashboard da matriz carregado'
        );
    }
}
