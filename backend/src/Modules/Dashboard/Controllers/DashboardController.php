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
        $params = $request->getQueryParams();
        $period = (string) ($params['period'] ?? '30d');
        if (!in_array($period, ['today', '7d', '30d', '90d', 'year'], true)) {
            $period = '30d';
        }
        $datePattern = '/^\d{4}-\d{2}-\d{2}$/';
        $start = isset($params['start']) && preg_match($datePattern, (string) $params['start'])
            ? (string) $params['start']
            : null;
        $end = isset($params['end']) && preg_match($datePattern, (string) $params['end'])
            ? (string) $params['end']
            : null;

        return $this->success(
            $response,
            $this->service->get($context->companyId, $period, $start, $end),
            'Dashboard da matriz carregado'
        );
    }
}
