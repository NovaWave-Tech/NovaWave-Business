# NovaWave Business ERP - Frontend Flow Guide

Este arquivo define o fluxo oficial para criar partes novas no frontend do ERP.
Use este guia antes de criar paginas, componentes, services, hooks ou validacoes.

## Principios Obrigatorios

- O frontend usa React, TypeScript, Vite, Chakra UI, React Router e Axios.
- O primeiro nivel de negocio deve ficar em `src/modules/{module}`.
- Recursos compartilhados ficam em `src/shared`.
- Layouts globais ficam em `src/layouts`.
- Rotas ficam em `src/app/App.tsx`.
- Services fazem chamadas HTTP. Paginas nao chamam Axios diretamente.
- Formularios futuros devem usar React Hook Form + Zod.
- Dados remotos futuros devem usar React Query.
- Toda tela deve considerar loading, erro e empty state quando consumir API.

## Estrutura Padrao de Modulo

```txt
src/modules/products/
  pages/
    ProductsPage.tsx
  components/
    ProductForm.tsx
    ProductTable.tsx
  services/
    productService.ts
  schemas/
    productSchema.ts
  hooks/
    useProducts.ts
  types/
    productTypes.ts
```

Crie apenas as pastas necessarias para o modulo atual. Nao antecipe abstracoes vazias.

## Fluxo Para Criar Uma Tela

1. Crie a pagina em `src/modules/{module}/pages`.
2. Crie componentes locais em `src/modules/{module}/components`.
3. Crie service em `src/modules/{module}/services` se houver API.
4. Crie types/schemas/hooks se a tela precisar.
5. Registre a rota em `src/app/App.tsx`.
6. Adicione item na sidebar em `src/layouts/AppSidebar.tsx` se for modulo navegavel.
7. Adicione label no topbar em `src/layouts/AppTopbar.tsx`.
8. Rode `npm run lint` e `npm run build`.

## Paginas

Responsabilidades:

- Montar a tela.
- Orquestrar hooks e componentes.
- Nao conter chamadas Axios diretas.
- Nao concentrar regra de negocio complexa.

## Components

Responsabilidades:

- UI local e reutilizavel dentro do modulo.
- Receber dados e callbacks por props.
- Nao conhecer detalhes de endpoint.

## Services

Responsabilidades:

- Chamar API usando `src/shared/services/http.ts`.
- Normalizar resposta quando necessario.
- Jogar erros claros para a pagina/hook.

Padrao:

```ts
import http from '../../../shared/services/http';

export async function listProducts() {
  const response = await http.get('/products');
  return response.data.data;
}
```

## Rotas

Rotas publicas ficam fora de `ProtectedRoutes`.
Rotas privadas ficam dentro de `ProtectedRoutes`.

```tsx
<Route path="/login" element={<LoginPage />} />
<Route element={<ProtectedRoutes />}>
  <Route path="/dashboard" element={<DashboardPage />} />
</Route>
```

## Fluxo de Login Implementado

Arquivos envolvidos:

```txt
src/app/App.tsx
src/modules/auth/pages/LoginPage.tsx
src/modules/auth/services/authService.ts
src/shared/services/http.ts
src/shared/auth/AuthContext.tsx
src/layouts/AuthLayout.tsx
src/layouts/AppLayout.tsx
src/layouts/AppSidebar.tsx
```

### 1. Tela de Login

`LoginPage`:

- renderiza formulario com email e senha;
- se ja existir token valido, redireciona para `/dashboard`;
- valida campos obrigatorios antes de chamar API;
- chama `login(email, password)`;
- em sucesso, redireciona para `/dashboard`;
- em erro, mostra toast com mensagem vinda da API.

### 2. Service de Auth

`authService.ts`:

- faz `POST /auth/login`;
- espera `token`, `expires_in` e `auth_user`;
- salva auth via `saveAuth`;
- normaliza erro de API para uma mensagem clara.

Contrato esperado:

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

### 3. HTTP Compartilhado

`shared/services/http.ts`:

- centraliza `baseURL`;
- salva token no `localStorage`;
- valida expiracao local;
- injeta `Authorization: Bearer {token}` em requests autenticados;
- limpa auth e redireciona para `/login` em `401` ou `403`.

Chaves usadas no `localStorage`:

```txt
auth_token
auth_token_exp
auth_user
```

### 4. Rotas Protegidas

`ProtectedRoutes` em `src/app/App.tsx`:

- valida token e expiracao local;
- se invalido, redireciona para `/login`;
- se valido, renderiza `AuthProvider` e `AppLayout`.

### 5. Usuario Autenticado

`AuthContext`:

- carrega `auth_user` do `localStorage`;
- expoe `user`;
- expoe `signOut`;
- `signOut` limpa dados locais e redireciona para `/login`.

### 6. Logout

`AppSidebar` chama `signOut` no botao Sair.

## Checklist Para Novos Modulos

- [ ] Criar pasta em `src/modules/{module}`.
- [ ] Criar page principal.
- [ ] Criar service se houver API.
- [ ] Criar components locais se a tela crescer.
- [ ] Registrar rota em `src/app/App.tsx`.
- [ ] Registrar item no menu se for navegavel.
- [ ] Criar types para contratos de API.
- [ ] Prever loading, erro e empty state.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npm run build`.

## O Que Nao Fazer

- Nao recriar `src/pages`, `src/service`, `src/components` globais antigos.
- Nao chamar Axios direto dentro de pages.
- Nao guardar regra de permissao somente no frontend.
- Nao criar UI com textos explicativos sobre como usar o sistema.
- Nao misturar componentes locais de um modulo em outro sem mover para `shared`.
- Nao criar rota protegida fora de `ProtectedRoutes`.

## Fluxo Exclusivo da NovaWave Platform

O backoffice fica em `src/modules/platform` e possui sessao independente do ERP:

```txt
auth/             login e PlatformAuthContext
layout/           sidebar, topbar e outlet protegido
services/         platformApi e armazenamento da sessao
dashboard/        indicadores globais
empresas/         listagem, provisionamento e detalhes
planos/           planos e limites
assinaturas/      ciclo comercial
usuarios/         admins internos
auditoria/        rastreabilidade global
configuracoes/    parametros do SaaS
```

- Rotas visuais usam `/platform`; APIs usam `/api/platform`.
- Chaves `platform_*` nunca se misturam com `auth_*` do ERP.
- `platformApi` injeta somente o token da plataforma.
- O painel administrativo usa light mode e o ERP continua dark first.
- Use React Query, loading e empty state nas paginas remotas.
- Use React Hook Form e Zod em formularios complexos.
- Consulte `PLATFORM-UI-GUIDE.md` antes de criar ou alterar interfaces da Platform.
- Reutilize `platformTokens.ts` e `PlatformUI.tsx`; nao espalhe cores e sombras nas paginas.
