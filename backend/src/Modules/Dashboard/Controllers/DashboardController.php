<?php

namespace App\Modules\Dashboard\Controllers;

use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class DashboardController extends ApiController
{
    public function index(Request $request, Response $response): Response
    {
        $context = RequestContext::fromRequest($request);

        return $this->success($response, [
            'company_id' => $context->companyId,
            'branch_id' => $context->branchId,
            'indicators' => [
                'revenue' => 0,
                'profit' => 0,
                'payables' => 0,
                'receivables' => 0,
                'critical_stock' => 0,
            ],
            'recent_sales' => [],
            'recent_purchases' => [],
        ], 'Dashboard base carregado');
    }
}
