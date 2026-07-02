<?php

use App\Infrastructure\Middleware\JwtAuthMiddleware;
use App\Infrastructure\Middleware\PlatformAuthMiddleware;
use App\Infrastructure\Middleware\PlatformRoleMiddleware;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Branches\Controllers\BranchController;
use App\Modules\Companies\Controllers\CompanyController;
use App\Modules\Dashboard\Controllers\DashboardController;
use App\Modules\Platform\Controllers\PlatformAuthController;
use App\Modules\Platform\Controllers\PlatformController;
use App\Modules\Users\Controllers\UserController;
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

$app->post('/api/platform/auth/login', PlatformAuthController::class . ':login');
$app->post('/api/platform/auth/refresh', PlatformAuthController::class . ':refresh');

$app->group('/api/platform', function ($group): void {
    $group->get('/auth/me', PlatformAuthController::class . ':me');
    $group->post('/auth/logout', PlatformAuthController::class . ':logout');
    $group->get('/dashboard', PlatformController::class . ':dashboard');
    $group->get('/empresas', PlatformController::class . ':companies');
    $group->post('/empresas', PlatformController::class . ':createCompany')
        ->add(new PlatformRoleMiddleware(['super_admin']));
    $group->get('/empresas/{id:[0-9]+}', PlatformController::class . ':company');
    $group->patch('/empresas/{id:[0-9]+}/situacao', PlatformController::class . ':setCompanyStatus')
        ->add(new PlatformRoleMiddleware(['super_admin']));
    $group->get('/planos', PlatformController::class . ':plans');
    $group->post('/planos', PlatformController::class . ':createPlan')
        ->add(new PlatformRoleMiddleware(['super_admin']));
    $group->put('/planos/{id:[0-9]+}', PlatformController::class . ':updatePlan')
        ->add(new PlatformRoleMiddleware(['super_admin']));
    $group->get('/assinaturas', PlatformController::class . ':subscriptions');
    $group->get('/usuarios', PlatformController::class . ':users');
    $group->post('/usuarios', PlatformController::class . ':createUser')
        ->add(new PlatformRoleMiddleware(['super_admin']));
    $group->get('/auditoria', PlatformController::class . ':audit');
    $group->get('/configuracoes', PlatformController::class . ':configurations');
    $group->put('/configuracoes', PlatformController::class . ':saveConfigurations')
        ->add(new PlatformRoleMiddleware(['super_admin']));
})->add(new PlatformAuthMiddleware());

$app->group('', function ($group): void {
    $group->get('/auth/me', AuthController::class . ':me');
    $group->get('/dashboard', DashboardController::class . ':index');
    $group->get('/companies', CompanyController::class . ':index');
    $group->get('/branches', BranchController::class . ':index');
    $group->post('/branches', BranchController::class . ':store');
    $group->get('/branches/{id:[0-9]+}', BranchController::class . ':show');
    $group->put('/branches/{id:[0-9]+}', BranchController::class . ':update');
    $group->patch('/branches/{id:[0-9]+}/status', BranchController::class . ':status');
    $group->patch('/branches/{id:[0-9]+}/matrix', BranchController::class . ':matrix');
    $group->get('/users', UserController::class . ':index');
    $group->post('/users', UserController::class . ':store');
    $group->get('/users/{id:[0-9]+}', UserController::class . ':show');
    $group->put('/users/{id:[0-9]+}', UserController::class . ':update');
    $group->patch('/users/{id:[0-9]+}/status', UserController::class . ':status');
    $group->post('/users/{id:[0-9]+}/reset-password', UserController::class . ':resetPassword');
    $group->delete('/users/{id:[0-9]+}/sessions/{sessionId:[0-9]+}', UserController::class . ':revokeSession');
})->add(new JwtAuthMiddleware());

$app->options('/{routes:.+}', function (Request $request, Response $response): Response {
    return $response->withHeader('Content-Type', 'application/json');
});
