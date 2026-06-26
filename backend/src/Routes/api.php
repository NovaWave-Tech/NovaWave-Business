<?php

use App\Infrastructure\Middleware\JwtAuthMiddleware;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Branches\Controllers\BranchController;
use App\Modules\Companies\Controllers\CompanyController;
use App\Modules\Dashboard\Controllers\DashboardController;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

$app->get('/health', function (Request $request, Response $response): Response {
    $response->getBody()->write(json_encode([
        'success' => true,
        'service' => 'NovaWave Business API',
        'status' => 'ok',
    ], JSON_UNESCAPED_UNICODE));

    return $response->withHeader('Content-Type', 'application/json');
});

$app->post('/auth/login', AuthController::class . ':login');
$app->post('/login', AuthController::class . ':login');

$app->group('', function ($group): void {
    $group->get('/auth/me', AuthController::class . ':me');
    $group->get('/dashboard', DashboardController::class . ':index');
    $group->get('/companies', CompanyController::class . ':index');
    $group->get('/branches', BranchController::class . ':index');
})->add(new JwtAuthMiddleware());

$app->options('/{routes:.+}', function (Request $request, Response $response): Response {
    return $response->withHeader('Content-Type', 'application/json');
});
