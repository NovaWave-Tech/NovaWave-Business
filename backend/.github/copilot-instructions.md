# NovaWave Business ERP - Copilot Instructions

Este projeto foi reestruturado para o NovaWave Business ERP.

Use o guia principal do backend em:

```txt
../CODEX-INSTRUCTIONS.md
```

Resumo rapido:

- Backend em PHP 8+, Slim Framework, PostgreSQL e JWT.
- Modulos ficam em `src/Modules/{Module}`.
- Rotas ficam em `src/Routes/api.php`.
- Controllers recebem request e retornam response.
- Services concentram regra de negocio.
- Repositories acessam banco.
- Respostas JSON usam `App\Shared\Http\ApiController`.
- Rotas protegidas usam `App\Infrastructure\Middleware\JwtAuthMiddleware`.
- Toda funcionalidade deve considerar `company_id` e `branch_id` quando aplicavel.

Nao usar a estrutura antiga:

- `src/routes.php`
- `src/Controllers`
- `src/Domains/Services`
- `src/Domains/Repositories`
- `src/pages`, `src/service` ou nomes da base Arena

Fluxo de login atual:

```txt
POST /auth/login
AuthController -> AuthService -> AuthRepository -> Database
JwtService gera token
JwtAuthMiddleware protege rotas privadas
```
