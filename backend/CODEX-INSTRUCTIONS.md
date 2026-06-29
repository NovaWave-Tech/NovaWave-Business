# NovaWave Business ERP - Backend Flow Guide

Este arquivo define o fluxo oficial para criar partes novas no backend do ERP.
Use este guia antes de criar qualquer modulo, endpoint, regra de negocio ou acesso ao banco.

## Principios Obrigatorios

- O backend usa PHP 8+, Slim Framework, API REST, PostgreSQL e JWT.
- Todo modulo deve ficar em `src/Modules/{ModuleName}`.
- Todo endpoint deve ser registrado em `src/Routes/api.php`.
- Controllers nao acessam banco e nao guardam regra de negocio.
- Services concentram regra de negocio.
- Repositories concentram acesso ao banco.
- Respostas JSON devem usar `App\Shared\Http\ApiController`.
- Toda funcionalidade futura deve considerar `company_id` e, quando aplicavel, `branch_id`.
- Toda acao sensivel deve nascer preparada para auditoria.

## Estrutura Padrao de Modulo

```txt
src/Modules/Products/
  Controllers/
    ProductController.php
  Services/
    ProductService.php
  Repositories/
    ProductRepository.php
  DTOs/
  Validators/
```

Crie `DTOs` e `Validators` quando o modulo tiver entrada complexa ou contratos reutilizaveis.

## Fluxo Para Criar Um Endpoint

1. Entenda o modulo e o escopo do ERP.
2. Crie ou atualize o controller em `src/Modules/{Module}/Controllers`.
3. Crie ou atualize o service em `src/Modules/{Module}/Services`.
4. Crie ou atualize o repository em `src/Modules/{Module}/Repositories`.
5. Registre a rota em `src/Routes/api.php`.
6. Garanta resposta padronizada com `success`, `message`, `data` ou `error`.
7. Garanta que queries usem `company_id` e `branch_id` quando necessario.
8. Atualize o README se criar um modulo novo.

## Controller

Responsabilidades:

- Ler `Request`.
- Fazer validacao basica de campos obrigatorios.
- Chamar o service.
- Retornar `Response`.

Padrao:

```php
<?php

namespace App\Modules\Products\Controllers;

use App\Modules\Products\Services\ProductService;
use App\Shared\Http\ApiController;
use Exception;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class ProductController extends ApiController
{
    private readonly ProductService $service;

    public function __construct(?ProductService $service = null)
    {
        $this->service = $service ?? new ProductService();
    }

    public function index(Request $request, Response $response): Response
    {
        try {
            return $this->success($response, $this->service->list());
        } catch (Exception $exception) {
            return $this->error($response, $exception->getMessage(), 400);
        }
    }
}
```

## Service

Responsabilidades:

- Aplicar regra de negocio.
- Validar regras do dominio.
- Preparar dados para o controller.
- Chamar repositories.

Nao retorne objeto bruto do banco se a API precisar de contrato claro.

## Repository

Responsabilidades:

- Executar queries.
- Aplicar filtros obrigatorios de tenant.
- Nunca conhecer regra de negocio de UI.

Enquanto o projeto usa `Database::switchParams`, mantenha as queries dentro de repositories.

## Rotas

Rotas publicas ficam fora do grupo autenticado.
Rotas protegidas ficam dentro do grupo com `JwtAuthMiddleware`.

```php
$app->post('/auth/login', AuthController::class . ':login');

$app->group('', function ($group): void {
    $group->get('/dashboard', DashboardController::class . ':index');
})->add(new JwtAuthMiddleware());
```

## Fluxo de Login Implementado

Arquivos envolvidos:

```txt
src/Routes/api.php
src/Modules/Auth/Controllers/AuthController.php
src/Modules/Auth/Services/AuthService.php
src/Modules/Auth/Repositories/AuthRepository.php
src/Infrastructure/Security/JwtService.php
src/Infrastructure/Middleware/JwtAuthMiddleware.php
src/Domains/SQL/login/logar.sql
```

### 1. Requisicao

Frontend envia:

```http
POST /auth/login
Content-Type: application/json

{
  "email": "admin@empresa.com",
  "password": "senha"
}
```

Tambem sao aceitos os campos legados `login` e `senha`.

### 2. Controller

`AuthController::login`:

- le o body;
- valida email e senha;
- chama `AuthService::login`;
- retorna JSON padronizado;
- retorna `401` em credenciais invalidas.

### 3. Service

`AuthService::login`:

- busca usuario por email;
- valida exclusivamente hashes seguros com `password_verify`;
- valida usuario ativo;
- monta `auth_user`;
- gera JWT com `JwtService`.

### 4. Repository

`AuthRepository::findUserByEmail`:

- executa `Domains/SQL/login/logar.sql`;
- retorna usuario ou `null`.

### 5. JWT

`JwtService::encode` gera token com:

```txt
iss
iat
exp
sub
email
nome
company_id
branch_id
permissions
```

### 6. Resposta

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "...",
    "expires_in": 86400,
    "auth_user": {
      "idusuario": 1,
      "nome": "Administrador",
      "email": "admin@empresa.com",
      "situacao": 1,
      "company_id": null,
      "branch_id": null
    }
  }
}
```

### 7. Rotas Protegidas

Frontend envia:

```http
Authorization: Bearer {token}
```

`JwtAuthMiddleware`:

- extrai o bearer token;
- decodifica o JWT;
- injeta `user_id`, `company_id`, `branch_id` e `permissions` no request;
- bloqueia requisicoes sem token, invalido ou expirado.

## Checklist Para Novos Modulos

- [ ] Pasta criada em `src/Modules/{Module}`.
- [ ] Controller sem regra de negocio.
- [ ] Service com regra de negocio.
- [ ] Repository com acesso ao banco.
- [ ] Rotas registradas em `src/Routes/api.php`.
- [ ] Respostas usando `ApiController`.
- [ ] Tenant considerado com `company_id`.
- [ ] Filial considerada com `branch_id` quando necessario.
- [ ] Erros tratados com status HTTP correto.
- [ ] README atualizado quando houver modulo novo.

## O Que Nao Fazer

- Nao criar regra de negocio dentro de controller.
- Nao acessar banco fora de repository.
- Nao criar rotas antigas em `src/routes.php`.
- Nao criar arquivos fora de `src/Modules`, `src/Shared`, `src/Infrastructure` ou `src/Routes` sem motivo forte.
- Nao misturar dados de empresas.
- Nao confiar em permissao vinda apenas do frontend.

## Fluxo Exclusivo da NovaWave Platform

A administracao do SaaS vive em `src/Modules/Platform` e nunca reutiliza o guard do ERP:

```txt
PlatformAuthController -> PlatformAuthService -> PlatformAuthRepository
PlatformController -> PlatformService -> PlatformRepository
PlatformJwtService -> PlatformAuthMiddleware
```

- Login somente em `platform_usuario` por `POST /api/platform/auth/login`.
- Tokens usam `PLATFORM_JWT_SECRET` e o claim `guard=platform`.
- Refresh tokens ficam com hash em `sessao_platform_usuario` e sao rotacionados.
- Rotas `/api/platform/*` usam exclusivamente `PlatformAuthMiddleware`.
- Acoes criticas gravam auditoria com `origem_usuario=platform`.
- Empresa, matriz, assinatura e admin sao provisionados na mesma transacao.
- Um JWT do ERP nunca pode acessar as rotas da plataforma.

O teste `tests/platform_smoke.php` valida login, tokens, plano, empresa, auditoria e dashboard em um PostgreSQL preparado com o schema e o seed.
