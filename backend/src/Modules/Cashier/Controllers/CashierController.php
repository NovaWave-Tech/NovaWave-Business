<?php

namespace App\Modules\Cashier\Controllers;

use App\Modules\Cashier\Services\CashierService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class CashierController extends ApiController
{
    private readonly CashierService $service;

    public function __construct(?CashierService $service = null)
    {
        $this->service = $service ?? new CashierService();
    }

    public function index(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->index($context->companyId, $request->getQueryParams())
        );
    }

    public function open(Request $request, Response $response): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) => [
            'idcaixa' => $this->service->open($context->companyId, $context->userId, $this->body($request), $context->ipAddress, $context->userAgent),
        ], 201, 'Caixa aberto com sucesso');
    }

    public function movement(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, function (RequestContext $context) use ($request, $args) {
            $this->service->addMovement($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent);
            return [];
        }, 201, 'Movimentacao registrada');
    }

    public function close(Request $request, Response $response, array $args): Response
    {
        return $this->run($request, $response, fn (RequestContext $context) =>
            $this->service->close($context->companyId, $context->userId, (int) $args['id'], $this->body($request), $context->ipAddress, $context->userAgent),
            200, 'Caixa fechado com sucesso');
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
