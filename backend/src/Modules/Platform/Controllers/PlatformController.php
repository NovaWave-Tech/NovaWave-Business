<?php

namespace App\Modules\Platform\Controllers;

use App\Modules\Platform\Services\PlatformService;
use App\Shared\Http\ApiController;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class PlatformController extends ApiController
{
    private readonly PlatformService $service;

    public function __construct(?PlatformService $service = null)
    {
        $this->service = $service ?? new PlatformService();
    }

    public function dashboard(Request $request, Response $response): Response
    { return $this->success($response, $this->service->dashboard()); }

    public function companies(Request $request, Response $response): Response
    { return $this->success($response, $this->service->companies($request->getQueryParams())); }

    public function company(Request $request, Response $response, array $args): Response
    { return $this->run($response, fn() => $this->service->company((int) $args['id'])); }

    public function createCompany(Request $request, Response $response): Response
    {
        return $this->run($response, fn() => [
            'idempresa' => $this->service->createCompany(
                $this->body($request), (int) $request->getAttribute('platform_user_id')
            ),
        ], 201, 'Empresa provisionada com sucesso');
    }

    public function setCompanyStatus(Request $request, Response $response, array $args): Response
    {
        return $this->run($response, function () use ($request, $args) {
            $this->service->setCompanyStatus(
                (int) $args['id'], (int) ($this->body($request)['situacao'] ?? -1),
                (int) $request->getAttribute('platform_user_id')
            );
            return [];
        }, 200, 'Situacao da empresa atualizada');
    }

    public function plans(Request $request, Response $response): Response
    { return $this->success($response, $this->service->plans()); }

    public function createPlan(Request $request, Response $response): Response
    { return $this->run($response, fn() => ['idplano' => $this->service->savePlan($this->body($request))], 201, 'Plano criado'); }

    public function updatePlan(Request $request, Response $response, array $args): Response
    { return $this->run($response, fn() => ['idplano' => $this->service->savePlan($this->body($request), (int) $args['id'])], 200, 'Plano atualizado'); }

    public function subscriptions(Request $request, Response $response): Response
    { return $this->success($response, $this->service->subscriptions()); }

    public function users(Request $request, Response $response): Response
    { return $this->success($response, $this->service->users()); }

    public function createUser(Request $request, Response $response): Response
    { return $this->run($response, fn() => ['idplatform_usuario' => $this->service->createUser($this->body($request))], 201, 'Administrador criado'); }

    public function audit(Request $request, Response $response): Response
    { return $this->success($response, $this->service->audit($request->getQueryParams())); }

    public function configurations(Request $request, Response $response): Response
    { return $this->success($response, $this->service->configurations()); }

    public function saveConfigurations(Request $request, Response $response): Response
    {
        return $this->run($response, function () use ($request) {
            $this->service->saveConfigurations(
                $this->body($request)['items'] ?? [],
                (int) $request->getAttribute('platform_user_id')
            );
            return [];
        }, 200, 'Configuracoes salvas');
    }

    private function run(Response $response, callable $callback, int $status = 200, string $message = 'OK'): Response
    {
        try {
            return $this->success($response, $callback(), $message, $status);
        } catch (InvalidArgumentException $exception) {
            return $this->error($response, $exception->getMessage(), 422);
        } catch (Throwable $exception) {
            return $this->error($response, $exception->getMessage(), 400);
        }
    }
}
