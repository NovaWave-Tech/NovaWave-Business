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
- O schema inicial multiempresa e multifilial esta em `banco.sql` e a query de login fica em `Domains/SQL/login`.
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

O schema inicial do ERP e criado por `banco.sql` em um volume PostgreSQL novo. Alteracoes posteriores devem ser feitas por migrations versionadas, sem editar bancos existentes diretamente.

### Estrutura do banco

O schema separa os usuarios internos da NovaWave Tech (`platform_usuario`) dos usuarios de cada empresa (`usuario`). Ele inclui planos e assinaturas, empresas e filiais, funcionarios e cargos, RBAC, sessoes, preferencias, dashboards, auditoria e os cadastros operacionais iniciais do ERP.

As foreign keys compostas por `idempresa` e pelo identificador da entidade impedem relacionamentos entre tenants. Consultas operacionais tambem devem sempre filtrar `idempresa` e, quando aplicavel, `idfilial`.

### Fluxo de provisionamento

O provisionamento deve ocorrer em uma unica transacao de aplicacao:

1. Cadastrar o admin da plataforma.
2. Cadastrar o plano.
3. Criar a empresa.
4. Criar a filial matriz da empresa.
5. Criar o primeiro admin da empresa.
6. Criar perfis e vincular permissoes.
7. Cadastrar filiais adicionais.
8. Cadastrar departamentos, cargos e funcionarios.
9. Criar usuarios e seus acessos a filiais.
10. Iniciar a operacao dos modulos do ERP.

O indice parcial `uq_filial_matriz_empresa` garante no maximo uma matriz por empresa. A existencia de pelo menos uma filial deve ser garantida pela transacao de provisionamento, pois uma constraint declarativa nao consegue exigir a criacao simultanea da entidade filha.

### Primeiro Super Admin

Depois que o schema estiver criado, execute o seed informando suas proprias credenciais:

```powershell
Get-Content database/seeds/001_platform_super_admin.sql | docker exec -i backend-postgres psql -v ON_ERROR_STOP=1 -U novabusiness -d novabusiness --set=admin_nome="Seu Nome" --set=admin_email="admin@seudominio.com" --set=admin_senha="UmaSenhaLongaESegura" -f -
```

O seed gera um hash bcrypt dentro do PostgreSQL e nunca grava a senha em texto puro na tabela. Ele e idempotente: se o e-mail ja existir, nao cria outro usuario nem redefine sua senha.

Se o volume foi criado com uma versao anterior do schema, faca backup dos dados e recrie-o. O comando abaixo apaga integralmente o banco local:

```bash
docker compose down -v
docker compose up -d --build
```

## Próximos Passos Técnicos

- Adotar uma ferramenta de migrations antes da primeira alteracao incremental do schema.
- Implementar emissao, rotacao e revogacao de refresh token usando as tabelas de sessao.
- Criar middleware de tenant para obrigar `company_id`.
- Implementar o servico de gravacao na tabela de auditoria.
- Criar exceptions de domínio e handler global de erros.
- Modularizar queries por domínio definitivo do ERP.

## NovaWave Platform

O backoffice possui autenticação independente e usa `PLATFORM_JWT_SECRET`, diferente de `JWT_SECRET`.

```txt
POST /api/platform/auth/login
POST /api/platform/auth/refresh
GET  /api/platform/dashboard
GET|POST /api/platform/empresas
GET|POST|PUT /api/platform/planos
GET  /api/platform/assinaturas
GET|POST /api/platform/usuarios
GET  /api/platform/auditoria
GET|PUT /api/platform/configuracoes
```

O teste `tests/platform_smoke.php` cobre autenticação, rotação de token, plano, provisionamento de empresa, dashboard e auditoria.
