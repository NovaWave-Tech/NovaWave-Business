# NovaWave Business ERP - Backend

API REST do NovaWave Business ERP, construída em PHP 8+, Slim Framework, PostgreSQL e JWT.

Esta base foi reestruturada para servir como fundação de um ERP SaaS multiempresa e multifilial. A organização principal agora separa módulos de negócio, infraestrutura e recursos compartilhados.

## Estrutura Atual

```txt
src/
  Modules/
    Auth/
      Controllers/
      Services/
      Repositories/
    Dashboard/
      Controllers/
    Companies/
      Controllers/
    Branches/
      Controllers/
  Shared/
    Exceptions/
    Http/
    Support/
  Infrastructure/
    Middleware/
    Security/
  Infrastructures/
    Config/
  Domains/
    SQL/
  Routes/
    api.php
```

## Camadas

O padrão para novos módulos deve seguir:

```txt
Controller
Service
Repository
Database
```

Regras:

- Controllers recebem requisições e retornam respostas.
- Services concentram regras de negócio.
- Repositories fazem acesso ao banco.
- Queries devem respeitar `company_id` e, quando aplicável, `branch_id`.
- Ações sensíveis devem preparar registro de auditoria.
- Respostas JSON devem usar os helpers de `Shared/Http/ApiController`.

## Rotas Ativas

### Públicas

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/health` | Status básico da API |
| POST | `/auth/login` | Login com JWT |
| POST | `/login` | Alias temporário para compatibilidade |

### Protegidas

Requerem `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
| --- | --- | --- |
| GET | `/auth/me` | Dados do contexto autenticado |
| GET | `/dashboard` | Dashboard base |
| GET | `/companies` | Placeholder do módulo Empresas |
| GET | `/branches` | Placeholder do módulo Filiais |

## Alterações da Reestruturação

- Criado `src/Modules` para módulos do ERP.
- Criado módulo `Auth` com controller, service e repository.
- Criado módulo `Dashboard` com endpoint base.
- Criados placeholders técnicos para `Companies` e `Branches`.
- Criado `src/Shared` com `ApiController`, exceções e `RequestContext`.
- Criado `src/Infrastructure` com `JwtService` e novo `JwtAuthMiddleware`.
- Criado `src/Routes/api.php` como novo arquivo principal de rotas.
- Atualizado `public/index.php` para carregar `src/Routes/api.php`.
- Mantida apenas a query de login em `Domains/SQL/login` enquanto o banco definitivo do ERP é modelado.
- Removidos controllers, services, repositories, rotas e SQLs legados que pertenciam à base anterior.

## Autenticação

O login usa `/auth/login` e retorna:

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "token": "...",
    "expires_in": 86400,
    "auth_user": {}
  }
}
```

O `JwtAuthMiddleware` injeta no request:

- `user_id`
- `company_id`
- `branch_id`
- `permissions`

O serviço ainda aceita senha legada em texto puro para compatibilidade com a base atual, mas já suporta senha com `password_hash`. O próximo passo recomendado é migrar todas as senhas para hash.

## Como Criar Novos Módulos

Use tambem o guia de fluxo em `CODEX-INSTRUCTIONS.md`.

Exemplo para `Products`:

```txt
src/Modules/Products/
  Controllers/ProductController.php
  Services/ProductService.php
  Repositories/ProductRepository.php
  DTOs/
  Validators/
```

Depois, registrar rotas em `src/Routes/api.php`.

## Estrutura Legada Removida

Foram removidos da base ativa:

- `src/Controllers`
- `src/Domains/Services`
- `src/Domains/Repositories`
- `src/Domains/SQL/usuario`
- `src/routes.php`
- `src/Infrastructures/Middleware`

Com isso, o backend passa a carregar somente a estrutura modular nova.

## Como Executar

```bash
cd backend
composer install
docker compose up -d
```

A API fica disponível em:

```txt
http://localhost:8085
```

O schema definitivo do ERP ainda deve ser modelado antes do uso com dados reais.

Para recriar os containers do zero:

```bash
docker compose down -v
docker compose up -d --build
```

## Próximos Passos Técnicos

- Modelar tabelas base: `companies`, `branches`, `users`, `roles`, `permissions`, `audit_logs`.
- Migrar autenticação para senhas com `password_hash`.
- Implementar refresh token.
- Criar middleware de tenant para obrigar `company_id`.
- Criar auditoria centralizada.
- Criar exceptions de domínio e handler global de erros.
- Modularizar queries por domínio definitivo do ERP.
