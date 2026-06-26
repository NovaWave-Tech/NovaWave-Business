# NovaWave Business ERP - Frontend

SPA do NovaWave Business ERP, construída com React, TypeScript, Vite, Chakra UI, React Router e Axios.

Esta base foi reestruturada para sair do formato reaproveitado anterior e iniciar uma fundação própria para o ERP SaaS multiempresa e multifilial da NovaWave Tech.

## Estrutura Atual

```txt
src/
  app/
    App.tsx
  layouts/
    AppLayout.tsx
    AppSidebar.tsx
    AppTopbar.tsx
    AuthLayout.tsx
  modules/
    auth/
      pages/
      services/
    dashboard/
      pages/
  shared/
    auth/
    pages/
    services/
  theme/
    index.ts
  main.tsx
  index.css
```

## Identidade Visual

A identidade visual oficial esta documentada em `BRAND-GUIDE.md`.

Ela define:

- conceito da marca;
- paleta dark first;
- tipografia;
- logo e variacoes;
- design system;
- componentes;
- mockups conceituais;
- tom visual e regras de uso.

## Alterações da Reestruturação

- Criado `src/app/App.tsx` como novo ponto central de rotas.
- Criado `src/modules/auth` com login próprio para o ERP.
- Criado `src/modules/dashboard` com dashboard base.
- Criado `src/shared/services/http.ts` com Axios, JWT helpers e interceptors.
- Criado `src/shared/auth/AuthContext.tsx`.
- Criados layouts novos em `src/layouts`.
- Criada sidebar com navegação dos módulos principais do ERP.
- Atualizado `src/main.tsx` para usar a nova aplicação.
- Atualizado tema Chakra para identidade escura do NovaWave Business.
- Atualizado `package.json` e `package-lock.json` para `novawave-business-frontend`.
- Ajustado `tsconfig.app.json` para validar a estrutura limpa do ERP.
- Removidos arquivos legados da base anterior para evitar conflitos de import, rotas e nomes de módulos.

## Rotas Atuais

### Públicas

| Rota | Descrição |
| --- | --- |
| `/login` | Login do ERP |
| `/` | Redireciona para dashboard/login conforme autenticação |

### Protegidas

| Rota | Módulo |
| --- | --- |
| `/dashboard` | Dashboard |
| `/companies` | Empresas |
| `/branches` | Filiais |
| `/users` | Usuários |
| `/permissions` | Permissões |
| `/customers` | Clientes |
| `/suppliers` | Fornecedores |
| `/products` | Produtos |
| `/inventory` | Estoque |
| `/sales` | Vendas |
| `/purchases` | Compras |
| `/finance` | Financeiro |
| `/reports` | Relatórios |
| `/cashier` | Caixa |
| `/settings` | Configurações |

As rotas protegidas que ainda não têm CRUD real usam placeholder visual para manter a navegação preparada.

## Padrão Para Novos Módulos

Use tambem o guia de fluxo em `CODEX-INSTRUCTIONS.md`.

```txt
src/modules/products/
  pages/
  components/
  services/
  schemas/
  types/
  hooks/
```

Regras:

- Páginas orquestram a tela.
- Components cuidam da UI local do módulo.
- Services fazem chamadas à API.
- Schemas centralizam validação.
- Hooks concentram estado e integrações.
- Tipos do módulo ficam em `types`.
- Recursos compartilhados ficam em `src/shared`.

## Autenticação

O login chama:

```txt
POST /auth/login
```

O token é salvo em `localStorage` por `shared/services/http.ts`.

As rotas protegidas validam:

- presença do token;
- expiração local;
- redirecionamento automático para `/login` em `401` ou `403`.

## Como Executar

```bash
cd frontend
npm install
npm run dev
```

URL padrão:

```txt
http://localhost:5173
```

Para executar via Docker:

```bash
cd frontend
docker compose up -d --build
```

URL Docker:

```txt
http://localhost:3000
```

O build Docker recebe `VITE_API_BASE_URL` via build arg e usa `http://localhost:8085` por padrao.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Servidor Vite |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build |
| `npm run lint` | Verificação ESLint |
| `npm run format` | Formatação Prettier |

## Estrutura Legada Removida

Foram removidos da base ativa:

- `src/App.tsx`
- `src/AuthLayout.tsx`
- `src/ProtectedLayout.tsx`
- `src/components`
- `src/contexts`
- `src/pages`
- `src/service`
- `src/utils`
- `src/assets/react.svg`

Com isso, o frontend passa a usar somente `app`, `layouts`, `modules`, `shared`, `theme`, `main.tsx` e `index.css`.

## Próximos Passos Técnicos

- Adicionar React Query, React Hook Form e Zod nos módulos reais.
- Criar design system interno com tabela, modal, filtros, empty state e loading.
- Implementar módulo Empresas.
- Implementar módulo Filiais.
- Implementar RBAC no frontend.
- Criar dashboard consumindo API real.
- Criar os módulos reais em cima da estrutura limpa.
