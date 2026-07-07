<?php

namespace App\Modules\Reports\Controllers;

use App\Modules\Reports\Services\ReportService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class ReportController extends ApiController
{
    private readonly ReportService $service;

    public function __construct(?ReportService $service = null)
    {
        $this->service = $service ?? new ReportService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->catalog($context->companyId)
        );
    }

    public function preview(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->preview($context->companyId, $context->userId, $args['slug'], $request->getQueryParams())
        );
    }

    private function run(Request $request, Response $response, callable $callback): Response
    {
        try {
            $context = RequestContext::fromRequest($request);
            if (!$context->companyId || !$context->userId) return $this->error($response, 'Contexto de autenticacao invalido', 403);
            return $this->success($response, $callback($context));
        } catch (\InvalidArgumentException $exception) {
            return $this->error($response, $exception->getMessage(), 422);
        } catch (Throwable) {
            return $this->error($response, 'Nao foi possivel gerar o relatorio', 500);
        }
    }
}
