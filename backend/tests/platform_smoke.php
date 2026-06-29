<?php

require dirname(__DIR__) . '/vendor/autoload.php';

use App\Modules\Platform\Services\PlatformAuthService;
use App\Modules\Platform\Services\PlatformService;

function ensure(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

$auth = new PlatformAuthService();
$login = $auth->login('admin@novawave.local', 'Teste-Forte-2026!', '127.0.0.1', 'smoke-test');
ensure(($login['auth_user']['nivel_acesso'] ?? null) === 'super_admin', 'Login nao retornou Super Admin');
ensure(($login['access_token'] ?? '') !== '', 'Access token nao emitido');
ensure(($login['refresh_token'] ?? '') !== '', 'Refresh token nao emitido');

$platform = new PlatformService();
$planId = $platform->savePlan([
    'nome' => 'Starter',
    'descricao' => 'Plano inicial',
    'valor_mensal' => 149.90,
    'valor_anual' => 1499.00,
    'limite_usuarios' => 10,
    'limite_filiais' => 2,
    'limite_produtos' => 5000,
    'limite_armazenamento_mb' => 2048,
    'modulos' => ['financeiro', 'estoque', 'crm', 'vendas'],
    'situacao' => 1,
]);
ensure($planId > 0, 'Plano nao criado');

$companyId = $platform->createCompany([
    'razao_social' => 'Empresa Teste LTDA',
    'nome_fantasia' => 'Empresa Teste',
    'cnpj' => '00.000.000/0001-00',
    'email' => 'contato@empresa.local',
    'telefone' => '11999999999',
    'timezone' => 'America/Sao_Paulo',
    'moeda' => 'BRL',
    'idioma' => 'pt-BR',
    'assinatura' => [
        'idplano' => $planId,
        'data_inicio' => date('Y-m-d'),
        'data_proxima_cobranca' => date('Y-m-d', strtotime('+30 days')),
        'status' => 2,
        'forma_pagamento' => 'pix',
        'valor_atual' => 149.90,
    ],
    'filial' => ['nome' => 'Matriz', 'codigo' => 'MATRIZ'],
    'administrador' => [
        'nome' => 'Admin Empresa',
        'email' => 'admin@empresa.local',
        'senha' => 'Senha-Temporaria-2026!',
    ],
], (int) $login['auth_user']['idplatform_usuario']);

$company = $platform->company($companyId);
ensure(count($company['filiais']) === 1, 'Filial matriz nao criada');
ensure(count($company['usuarios']) === 1, 'Administrador da empresa nao criado');
ensure(count($platform->audit([])) >= 1, 'Auditoria nao registrada');
ensure((int) $platform->dashboard()['metrics']['empresas_ativas'] === 1, 'Dashboard inconsistente');

$refreshed = $auth->refresh($login['refresh_token'], '127.0.0.1', 'smoke-test');
ensure($refreshed['refresh_token'] !== $login['refresh_token'], 'Refresh token nao foi rotacionado');
$auth->logout($refreshed['refresh_token']);

echo "PLATFORM_SMOKE_OK\n";
