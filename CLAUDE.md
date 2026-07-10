# Instrucoes para o Claude - NovaWave Business ERP

Guia operacional para trabalhar neste repositorio. Leia junto com os guias
oficiais antes de qualquer implementacao:

- `backend/CODEX-INSTRUCTIONS.md` - arquitetura e fluxo do backend
- `frontend/CODEX-INSTRUCTIONS.md` - arquitetura e fluxo do frontend
- `frontend/ERP-UI-GUIDE.md` - padrao visual do ERP

## Sobre o projeto

NovaWave Business e um ERP web multiempresa/multifilial (vendas, compras,
estoque, caixa, clientes, fornecedores, relatorios) mais o painel
administrativo NovaWave Platform. Roda apenas em ambiente local por
enquanto - nao ha producao.

## Stack

- Frontend: React 19 + TypeScript + Vite 7, Chakra UI v2, TanStack Query,
  React Hook Form + Zod, Recharts.
- Backend: PHP 8 + Slim 4, JWT (firebase/php-jwt), PostgreSQL.
- Infra: Docker Compose local (containers `backend-php` e `backend-postgres`).

## Comandos

- Subir backend: `cd backend && composer install && docker compose up -d --build`.
- Subir frontend: `cd frontend && npm install && npm run dev`.
- Lint do frontend: `npm run lint`; build/typecheck: `npm run build`.
- Antes de rodar local: copiar `.env.example` -> `.env` em `backend/` e `frontend/`.
- Nao ha suite de testes automatizados; a verificacao e lint + build +
  smoke test autenticado (secao "Verificacao").

## Fluxo de trabalho obrigatorio

1. Sincronizar a main antes de comecar: `git checkout main && git pull --ff-only origin main`.
2. Criar branch por tarefa a partir da main (`feat/...` ou `fix/...`).
3. Implementar, verificar (secao "Verificacao") e so entao commitar.
4. Push e PR **sempre com base na `main`** via `gh pr create --base main`.
   Nunca empilhar PR sobre outra branch de feature (ja causou perda de
   codigo quando a base foi mergeada antes - PR #14/#15).
5. O usuario mergeia. Depois do merge: sincronizar a main e apagar a branch local.
6. Descricao do PR sempre detalhada: resumo, o que mudou, verificacao executada.

O `gh` CLI nao esta no PATH do Git Bash. Use:
`export PATH="$PATH:/c/Program Files/GitHub CLI"`.

## Ambiente local

- Frontend: Vite em `http://localhost:5173`.
- API: `http://localhost:8085` (container `backend-php`).
- PostgreSQL: container `backend-postgres` (user/db `novabusiness`).
- Acesso ao banco: `docker exec -i backend-postgres psql -U novabusiness -d novabusiness`.
- Lint de PHP: `docker exec -i backend-php php -l /var/www/html/src/...`.
  No Git Bash, prefixe com `export MSYS_NO_PATHCONV=1` para nao converter paths.
- Credenciais de teste (ERP e painel platform): arquivo local gitignorado
  `backend/database/migrations/CREDENTIALS.md`. **Nunca** colocar credenciais
  em arquivos versionados - o repositorio e publico.

## Verificacao (obrigatoria antes de commit)

- Backend: `php -l` em todo arquivo PHP novo/alterado.
- Frontend: `npm run lint` e `npm run build` (roda `tsc`).
- **Smoke test autenticado via curl** dos endpoints criados/alterados
  (login com as credenciais de teste; conferir status HTTP e efeitos no banco).
- Criar dados de teste proprios, verificar e **remover ao final**.
  Nunca apagar ou alterar dados criados pelo usuario; se precisar mudar algo
  real durante um teste, reverter ao valor original.

## Padroes do backend

- Modulo = `Controllers/ + Services/ + Repositories/` em `src/Modules/{Nome}`.
- **Construtor de controller deve ser null-safe** - o Slim instancia com
  `new Controller(null)`:
  ```php
  public function __construct(?XService $service = null)
  { $this->service = $service ?? new XService(); }
  ```
  O padrao `__construct(private readonly X $s = new X())` quebra TODAS as
  rotas do controller com erro 500 (ja aconteceu em Reports e Permissions).
- Erros: `InvalidArgumentException` -> 422 com mensagem amigavel;
  `Throwable` generico -> 500. Violacao de unique (`23505`) deve virar 422.
- Toda query filtra `idempresa` (e `idfilial` quando aplicavel).
- Acoes sensiveis gravam em `auditoria` (padrao `audit()` dos repositories).
- Operacoes multi-tabela em transacao (padrao `transaction()` + `FOR UPDATE`).
- PUT e **full-update**: atualiza todos os campos; o frontend envia o form completo.
- Rotas novas em `src/Routes/api.php`, dentro do grupo com `JwtAuthMiddleware`.

### Convencoes de dominio

- `movimentacao_estoque.tipo`: 1=entrada, 2=saida, 5=ajuste (backend aceita [1,2,5]).
- `movimentacao_caixa.tipo`: 1=suprimento, 2=sangria, 3=venda, 4=outros;
  saldo = inicial + (1,3) - (2,4). `caixa.situacao`: 1=aberto, 2=fechado
  (1 caixa aberto por filial). **Somente vendas em dinheiro passam pelo
  caixa fisico** (tipo 3; estorno no cancelamento e tipo 4); as demais
  formas aparecem no relatorio do dia da tela Caixa. Sangria pode deixar
  o caixa negativo.
- Pagamento da venda: `venda.forma_pagamento` (dinheiro, pix,
  cartao_credito, cartao_debito, boleto, transferencia), `a_prazo`,
  `parcelas`, `juros_atraso` (% a.m., so no prazo). Parcelamento apenas em
  cartao de credito (a vista, 1-12x, informativo) ou a prazo (crediario,
  gera `conta_receber` com vencimentos mensais e cliente com
  `permite_venda_prazo`). Cartao nao se aplica a prazo.
- `venda`/`compra.situacao`: 1=concluida ... 4=cancelada. Venda da baixa no
  estoque; compra da entrada; cancelamento estorna. Movimentar estoque =
  upsert em `estoque` + insert em `movimentacao_estoque`, respeitando
  `permite_estoque_negativo` de produto e filial.
- Venda sem cliente informado (`idcliente` null) e vinculada pelo backend ao
  cliente padrao da empresa `CONSUMIDOR FINAL` (find-or-create por empresa,
  em `SalesRepository::resolveDefaultCustomer`).
- `cliente.documento` e opcional (cadastro rapido no caixa); CPF/CNPJ e
  validado apenas quando informado. Busca de clientes para autocomplete:
  `GET /customers/search?q=` (nome, documento, telefone, e-mail; LIMIT 8).
- Login do ERP usa campo `password`; login da platform usa `senha`.
- Autorizacao do ERP: toda rota exige permissao `modulo:acao` via
  `PermissionMiddleware::check(...)` (rotas novas DEVEM declarar a sua).
  `admin_empresa` recebe o curinga `*`; os demais carregam as permissoes
  dos perfis ativos no JWT (trocar perfil exige novo login). No frontend,
  `useAuth().can('modulo:acao')` e o campo `permission` de
  `erpNavigation` controlam a visibilidade; 403 mostra a mensagem da API
  sem derrubar a sessao (so 401 desloga).

### Banco e schema

- `backend/database/migrations/` e **gitignorado** (schema gerenciado fora
  do repo publico). Migrations novas ficam locais nessa pasta; aplicar com
  psql e avisar o usuario.
- Snapshot do schema: `backend/database/migrations/schema-snapshot-*.sql`.

## Padroes do frontend

- Modulo = `pages/ + services/ + types/` em `src/modules/{nome}`;
  rota em `src/app/App.tsx` (cuidado com conflito de nomes com paginas da
  Platform - usar alias `Erp...` no import se preciso).
- Kit compartilhado obrigatorio (`src/shared/ui/`): `KpiCard`, `StatGroup`
  (painel denso de numeros, padrao do Financeiro/Vendas/Compras/Produtos),
  `DeltaPill`, `PageHeader`, `Surface`, `SectionHeader`, `BrandSurface`,
  `EmptyState`/`ErrorState`, `DateRangeField` (popover De -> Ate com
  atalhos), `FilterSelect`, `ComboSelect`, `FormattedInput`/`CurrencyInput`,
  `chart.tsx`/`chartTheme.ts` (graficos), `motion.tsx` (Reveal/CountUp).
- **Nunca usar `Select` nativo do Chakra em telas do ERP.** Regra:
  filtro de toolbar -> `FilterSelect` (menu com radio); campo de formulario
  em modal/drawer -> `ComboSelect` (filtro por digitacao, dropdown em
  Portal); cliente na venda -> `CustomerSearchSelect` (busca assincrona em
  `sales/components`). Dropdowns dentro de `BrandSurface`/`Surface` com
  overflow hidden precisam de `Portal` (senao ficam cortados).
- Formatacao SEMPRE por `src/shared/utils/formatters.ts` (moeda, datas,
  documentos, `formatDelta`...). Nunca `Intl`/`toLocaleString` direto em pagina.
- Direcao visual validada pelo usuario: **clean e estruturado, SEM
  gradientes**; superficies solidas, acento azul pontual (`erp.brandSoft`
  no chip de icone), numeros `tabular-nums` em negrito, animacoes contidas.
- Filtros de data usam intervalo De -> Ate (`DateRangeField` + `start`/`end`
  na API), nunca selects de periodo fixo.
- Apos mutacoes, invalidar TODOS os caches afetados (ex.: venda/compra
  invalida tambem `inventory` e `products`).
- Toast de erro padrao `notifyError` mostrando `error.message` da API.
- Formularios multi-etapas: validar campos da etapa ao avancar
  (`form.trigger`) e, no submit, navegar ate a etapa do primeiro erro com
  toast (padrao aplicado em Clientes).

## Comunicacao com o usuario

- Responder em portugues.
- O usuario valida visualmente pelo app rodando; quando a mudanca for
  grande/visual, mostrar antes de commitar se ele pedir revisao.
- Relatar sempre: o que foi feito, o que foi testado (com resultados reais)
  e o que ficou de fora ou merece atencao.
