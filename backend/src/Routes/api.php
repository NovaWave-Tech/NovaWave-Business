<?php

use App\Infrastructure\Middleware\JwtAuthMiddleware;
use App\Infrastructure\Middleware\PermissionMiddleware;
use App\Infrastructure\Middleware\PlatformAuthMiddleware;
use App\Infrastructure\Middleware\PlatformRoleMiddleware;
use App\Modules\Auth\Controllers\AuthController;
use App\Modules\Branches\Controllers\BranchController;
use App\Modules\Cashier\Controllers\CashierController;
use App\Modules\Catalog\Controllers\CatalogController;
use App\Modules\Companies\Controllers\CompanyController;
use App\Modules\Customers\Controllers\CustomerController;
use App\Modules\Dashboard\Controllers\DashboardController;
use App\Modules\Finance\Controllers\FinanceController;
use App\Modules\Inventory\Controllers\InventoryController;
use App\Modules\Notifications\Controllers\NotificationController;
use App\Modules\Permissions\Controllers\PermissionController;
use App\Modules\Platform\Controllers\PlatformAuthController;
use App\Modules\Platform\Controllers\PlatformController;
use App\Modules\Products\Controllers\ProductController;
use App\Modules\Purchases\Controllers\PurchasesController;
use App\Modules\Receivables\Controllers\ReceivableController;
use App\Modules\Reports\Controllers\ReportController;
use App\Modules\Sales\Controllers\SalesController;
use App\Modules\Settings\Controllers\SettingsController;
use App\Modules\Suppliers\Controllers\SupplierController;
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
    $group->get('/dashboard', DashboardController::class . ':index')->add(PermissionMiddleware::check('dashboard:visualizar'));
    $group->get('/companies', CompanyController::class . ':index')->add(PermissionMiddleware::check('empresa:visualizar'));
    $group->put('/companies', CompanyController::class . ':update')->add(PermissionMiddleware::check('empresa:editar'));
    $group->get('/suppliers', SupplierController::class . ':index')->add(PermissionMiddleware::check('fornecedor:visualizar'));
    $group->post('/suppliers', SupplierController::class . ':store')->add(PermissionMiddleware::check('fornecedor:criar'));
    $group->get('/suppliers/{id:[0-9]+}', SupplierController::class . ':show')->add(PermissionMiddleware::check('fornecedor:visualizar'));
    $group->put('/suppliers/{id:[0-9]+}', SupplierController::class . ':update')->add(PermissionMiddleware::check('fornecedor:editar'));
    $group->patch('/suppliers/{id:[0-9]+}/status', SupplierController::class . ':status')->add(PermissionMiddleware::check('fornecedor:editar'));
    $group->get('/cashier', CashierController::class . ':index')->add(PermissionMiddleware::check('financeiro:visualizar'));
    $group->post('/cashier/open', CashierController::class . ':open')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->post('/cashier/{id:[0-9]+}/movements', CashierController::class . ':movement')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->post('/cashier/{id:[0-9]+}/close', CashierController::class . ':close')->add(PermissionMiddleware::check('financeiro:gerenciar'));
    // Notificacoes sao pessoais (derivadas do estado da empresa para o
    // usuario logado), como as preferencias: nao exigem permissao de modulo.
    $group->get('/notifications', NotificationController::class . ':index');
    $group->post('/notifications/read-all', NotificationController::class . ':readAll');
    $group->post('/notifications/{id:[0-9]+}/read', NotificationController::class . ':read');
    $group->get('/settings', SettingsController::class . ':index');
    $group->put('/settings/preferences', SettingsController::class . ':savePreferences');
    $group->put('/settings/finance', SettingsController::class . ':saveFinance')->add(PermissionMiddleware::check('configuracao:editar'));
    $group->get('/branches', BranchController::class . ':index')->add(PermissionMiddleware::check('filial:visualizar'));
    $group->post('/branches', BranchController::class . ':store')->add(PermissionMiddleware::check('filial:criar'));
    $group->get('/branches/{id:[0-9]+}', BranchController::class . ':show')->add(PermissionMiddleware::check('filial:visualizar'));
    $group->put('/branches/{id:[0-9]+}', BranchController::class . ':update')->add(PermissionMiddleware::check('filial:editar'));
    $group->patch('/branches/{id:[0-9]+}/status', BranchController::class . ':status')->add(PermissionMiddleware::check('filial:editar'));
    $group->patch('/branches/{id:[0-9]+}/matrix', BranchController::class . ':matrix')->add(PermissionMiddleware::check('filial:gerenciar'));
    $group->get('/users', UserController::class . ':index')->add(PermissionMiddleware::check('usuario:visualizar'));
    $group->post('/users', UserController::class . ':store')->add(PermissionMiddleware::check('usuario:criar'));
    $group->get('/users/{id:[0-9]+}', UserController::class . ':show')->add(PermissionMiddleware::check('usuario:visualizar'));
    $group->put('/users/{id:[0-9]+}', UserController::class . ':update')->add(PermissionMiddleware::check('usuario:editar'));
    $group->patch('/users/{id:[0-9]+}/status', UserController::class . ':status')->add(PermissionMiddleware::check('usuario:editar'));
    $group->post('/users/{id:[0-9]+}/reset-password', UserController::class . ':resetPassword')->add(PermissionMiddleware::check('usuario:gerenciar'));
    $group->delete('/users/{id:[0-9]+}/sessions/{sessionId:[0-9]+}', UserController::class . ':revokeSession')->add(PermissionMiddleware::check('usuario:gerenciar'));
    $group->get('/customers', CustomerController::class . ':index')->add(PermissionMiddleware::check('cliente:visualizar'));
    $group->get('/customers/search', CustomerController::class . ':search')->add(PermissionMiddleware::check('cliente:visualizar'));
    $group->post('/customers', CustomerController::class . ':store')->add(PermissionMiddleware::check('cliente:criar'));
    $group->get('/customers/{id:[0-9]+}', CustomerController::class . ':show')->add(PermissionMiddleware::check('cliente:visualizar'));
    $group->put('/customers/{id:[0-9]+}', CustomerController::class . ':update')->add(PermissionMiddleware::check('cliente:editar'));
    $group->patch('/customers/{id:[0-9]+}/status', CustomerController::class . ':status')->add(PermissionMiddleware::check('cliente:editar'));
    $group->post('/customers/{id:[0-9]+}/notes', CustomerController::class . ':note')->add(PermissionMiddleware::check('cliente:editar'));
    $group->get('/products', ProductController::class . ':index')->add(PermissionMiddleware::check('produto:visualizar'));
    $group->post('/products', ProductController::class . ':store')->add(PermissionMiddleware::check('produto:criar'));
    $group->get('/products/{id:[0-9]+}', ProductController::class . ':show')->add(PermissionMiddleware::check('produto:visualizar'));
    $group->put('/products/{id:[0-9]+}', ProductController::class . ':update')->add(PermissionMiddleware::check('produto:editar'));
    $group->patch('/products/{id:[0-9]+}/status', ProductController::class . ':status')->add(PermissionMiddleware::check('produto:editar'));
    $group->post('/products/{id:[0-9]+}/duplicate', ProductController::class . ':duplicate')->add(PermissionMiddleware::check('produto:criar'));
    $group->post('/products/{id:[0-9]+}/movements', ProductController::class . ':movement')->add(PermissionMiddleware::check('estoque:movimentar'));
    $group->get('/catalog', CatalogController::class . ':index')->add(PermissionMiddleware::check('produto:visualizar'));
    $group->post('/catalog/categories', CatalogController::class . ':createCategory')->add(PermissionMiddleware::check('produto:editar'));
    $group->put('/catalog/categories/{id:[0-9]+}', CatalogController::class . ':updateCategory')->add(PermissionMiddleware::check('produto:editar'));
    $group->patch('/catalog/categories/{id:[0-9]+}/status', CatalogController::class . ':categoryStatus')->add(PermissionMiddleware::check('produto:editar'));
    $group->post('/catalog/brands', CatalogController::class . ':createBrand')->add(PermissionMiddleware::check('produto:editar'));
    $group->put('/catalog/brands/{id:[0-9]+}', CatalogController::class . ':updateBrand')->add(PermissionMiddleware::check('produto:editar'));
    $group->patch('/catalog/brands/{id:[0-9]+}/status', CatalogController::class . ':brandStatus')->add(PermissionMiddleware::check('produto:editar'));
    $group->get('/finance', FinanceController::class . ':index')->add(PermissionMiddleware::check('financeiro:visualizar'));
    // Infraestrutura financeira e cartoes. Declarados antes de /finance/{type}
    // para nao colidir com o padrao de lancamento (revenue|expense).
    $group->get('/finance/infra', FinanceController::class . ':infra')->add(PermissionMiddleware::check('financeiro:visualizar'));
    $group->post('/finance/banks', FinanceController::class . ':storeBank')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->put('/finance/banks/{id:[0-9]+}', FinanceController::class . ':updateBank')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->post('/finance/categories', FinanceController::class . ':storeCategory')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->put('/finance/categories/{id:[0-9]+}', FinanceController::class . ':updateCategory')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->post('/finance/cost-centers', FinanceController::class . ':storeCostCenter')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->put('/finance/cost-centers/{id:[0-9]+}', FinanceController::class . ':updateCostCenter')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->patch('/finance/{entity:banks|categories|cost-centers}/{id:[0-9]+}/status', FinanceController::class . ':infraStatus')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->post('/finance/cards', FinanceController::class . ':storeCard')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->put('/finance/cards/{id:[0-9]+}', FinanceController::class . ':updateCard')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->patch('/finance/cards/{id:[0-9]+}/status', FinanceController::class . ':cardStatus')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->get('/finance/{type:revenue|expense}/{id:[0-9]+}', FinanceController::class . ':show')->add(PermissionMiddleware::check('financeiro:visualizar'));
    $group->post('/finance/{type:revenue|expense}', FinanceController::class . ':store')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->put('/finance/{type:revenue|expense}/{id:[0-9]+}', FinanceController::class . ':update')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->patch('/finance/{type:revenue|expense}/{id:[0-9]+}/status', FinanceController::class . ':status')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->post('/finance/{type:revenue|expense}/{id:[0-9]+}/duplicate', FinanceController::class . ':duplicate')->add(PermissionMiddleware::check('financeiro:criar'));
    $group->post('/finance/{type:revenue|expense}/{id:[0-9]+}/attachments', FinanceController::class . ':storeAttachment')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->get('/finance/{type:revenue|expense}/{id:[0-9]+}/attachments/{attachment:[0-9]+}', FinanceController::class . ':downloadAttachment')->add(PermissionMiddleware::check('financeiro:visualizar'));
    $group->delete('/finance/{type:revenue|expense}/{id:[0-9]+}/attachments/{attachment:[0-9]+}', FinanceController::class . ':deleteAttachment')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->get('/receivables/customers', ReceivableController::class . ':customers')->add(PermissionMiddleware::check('financeiro:visualizar'));
    $group->get('/receivables', ReceivableController::class . ':index')->add(PermissionMiddleware::check('financeiro:visualizar'));
    $group->post('/receivables/{id:[0-9]+}/settle', ReceivableController::class . ':settle')->add(PermissionMiddleware::check('financeiro:editar'));
    $group->get('/reports', ReportController::class . ':index')->add(PermissionMiddleware::check('relatorio:visualizar'));
    $group->get('/reports/{slug:[a-z-]+}', ReportController::class . ':preview')->add(PermissionMiddleware::check('relatorio:visualizar'));
    $group->get('/sales', SalesController::class . ':index')->add(PermissionMiddleware::check('venda:visualizar'));
    $group->post('/sales', SalesController::class . ':store')->add(PermissionMiddleware::check('venda:criar'));
    $group->get('/sales/{id:[0-9]+}', SalesController::class . ':show')->add(PermissionMiddleware::check('venda:visualizar'));
    $group->get('/sales/{id:[0-9]+}/receipt', SalesController::class . ':receipt')->add(PermissionMiddleware::check('venda:visualizar'));
    $group->patch('/sales/{id:[0-9]+}/status', SalesController::class . ':status')->add(PermissionMiddleware::check('venda:cancelar'));
    $group->get('/inventory', InventoryController::class . ':index')->add(PermissionMiddleware::check('estoque:visualizar'));
    $group->get('/purchases', PurchasesController::class . ':index')->add(PermissionMiddleware::check('compra:visualizar'));
    $group->post('/purchases', PurchasesController::class . ':store')->add(PermissionMiddleware::check('compra:criar'));
    $group->get('/purchases/{id:[0-9]+}', PurchasesController::class . ':show')->add(PermissionMiddleware::check('compra:visualizar'));
    $group->patch('/purchases/{id:[0-9]+}/status', PurchasesController::class . ':status')->add(PermissionMiddleware::check('compra:cancelar'));
    $group->get('/permissions', PermissionController::class . ':index')->add(PermissionMiddleware::check('usuario:administrar'));
    $group->post('/permissions', PermissionController::class . ':store')->add(PermissionMiddleware::check('usuario:administrar'));
    $group->get('/permissions/{id:[0-9]+}', PermissionController::class . ':show')->add(PermissionMiddleware::check('usuario:administrar'));
    $group->put('/permissions/{id:[0-9]+}', PermissionController::class . ':update')->add(PermissionMiddleware::check('usuario:administrar'));
    $group->patch('/permissions/{id:[0-9]+}/status', PermissionController::class . ':status')->add(PermissionMiddleware::check('usuario:administrar'));
    $group->post('/permissions/{id:[0-9]+}/duplicate', PermissionController::class . ':duplicate')->add(PermissionMiddleware::check('usuario:administrar'));
})->add(new JwtAuthMiddleware());

$app->options('/{routes:.+}', function (Request $request, Response $response): Response {
    return $response->withHeader('Content-Type', 'application/json');
});
