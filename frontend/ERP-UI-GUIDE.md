# NovaWave Business ERP - Guia de Interface

Este documento define o padrao visual e de experiencia da area autenticada do ERP.
O tema inicial e escuro, mas a escolha entre claro e escuro e persistida pelo Chakra UI.

## Fundamentos

- Fonte: Inter.
- Sidebar: `260px` expandida e `72px` recolhida.
- Topbar: `64px`.
- Conteudo: largura maxima de `1600px` e espacamento responsivo.
- Bordas: discretas, usando `erp.border`.
- Superficies: raio de `12px`, sem cards aninhados.
- Icones: Lucide React.
- Cor da marca: reservada para selecao, acao primaria e destaque funcional.

## Assinatura Visual NovaWave

Toda tela deve ser reconhecivel como NovaWave mesmo sem a sidebar. A identidade do produto e criada pela repeticao controlada destes elementos:

- `BrandSurface` para o bloco estrategico principal da pagina, com filete azul-indigo e profundidade suave;
- icones Lucide dentro de modulos geometricos usando `erp.brandSoft`, `erp.brandBorder` e `erp.brandText`;
- `PageHeader` com icone de dominio nas telas principais;
- `SectionHeader` com icone e eyebrow curto para organizar blocos analiticos;
- numeros financeiros com `fontVariantNumeric="tabular-nums"` para alinhamento e personalidade tecnica;
- azul para inteligencia e navegacao, verde para resultado positivo, amarelo para atencao e vermelho somente para risco;
- uma ou duas superficies de marca por viewport, evitando transformar todo card em destaque.

Evite telas compostas apenas por caixas brancas e bordas cinza. Tambem evite compensar isso com gradientes extensos, ilustracoes decorativas ou excesso de cores. A identidade deve vir da geometria modular, dos acentos funcionais e da hierarquia consistente.

## Tokens Semanticos

Use os tokens de `src/theme/index.ts`; nao aplique cores de fundo e texto diretamente nos modulos.

| Token | Uso |
| --- | --- |
| `erp.canvas` | Fundo geral |
| `erp.sidebar` | Navegacao lateral |
| `erp.surface` | Paineis, tabelas e formularios |
| `erp.surfaceSubtle` | Areas secundarias |
| `erp.hover` | Hover e selecao discreta |
| `erp.border` | Bordas padrao |
| `erp.text` | Texto principal |
| `erp.textSecondary` | Texto auxiliar |
| `erp.success`, `erp.warning`, `erp.danger`, `erp.info` | Estados semanticos |

## Componentes Compartilhados

`src/shared/ui/ErpUI.tsx` fornece:

- `PageHeader`: breadcrumb, titulo, descricao e acoes da pagina.
- `Surface`: superficie base para conteudo operacional.
- `BrandSurface`: superficie estrategica com assinatura visual NovaWave.
- `SectionHeader`: cabecalho interno de secoes.
- `MetricCard`: indicador numerico com tendencia.
- `StatusCard`: resumo de estado ou alerta.
- `EmptyState`, `ErrorState` e `PageSkeleton`: estados obrigatorios.

`src/shared/ui/DataTable.tsx` fornece busca, filtros, ordenacao, selecao, acoes em lote, menu por linha, loading, vazio e paginacao. Novas listagens devem partir deste componente.

## Fluxo de Uma Pagina

1. Comece com `PageHeader`.
2. Consulte dados por um service do modulo e React Query.
3. Durante a consulta, mostre `PageSkeleton` ou skeleton local.
4. Em falha, mostre `ErrorState` com nova tentativa.
5. Em ausencia de dados, use `EmptyState` com uma unica acao util.
6. Use `Surface` apenas quando o conteudo precisar de agrupamento real.
7. Listagens usam `DataTable`; formularios usam labels, ajuda e erros associados.
8. Acoes destrutivas exigem confirmacao e o variant `danger`.

## Navegacao

Os grupos e itens do ERP ficam em `src/layouts/erpNavigation.ts`. O mesmo cadastro alimenta sidebar, busca global e breadcrumb, evitando listas divergentes.

A sidebar salva seu estado em `erp_sidebar_collapsed`. No mobile ela se transforma em drawer e deve fechar depois da navegacao.

## Dashboard

O dashboard da matriz consome `GET /dashboard?period={period}` por `dashboardService.ts` e consolida todas as filiais da empresa autenticada. Ele apresenta KPIs, meta e projecao, ranking e metas por filial, comparativo, evolucao temporal, alertas e atividade recente.

Valores financeiros, comparativos e atividades sempre devem vir da API. Quando metas, series ou filiais nao existirem, a interface mostra um estado vazio orientado a acao em vez de inventar dados.

## NovaWave Platform

O backoffice em `src/modules/platform` compartilha os mesmos tokens `erp.*`, dimensoes de layout, estados e regras de responsividade. Seus componentes especializados continuam em `components/PlatformUI.tsx`, e `theme/platformTokens.ts` apenas mapeia nomes legados para os tokens semanticos globais.

A sessao, as rotas e as permissoes da Platform permanecem independentes do ERP. O tema claro/escuro, por ser uma preferencia visual do mesmo produto, e compartilhado e persistido pelo Chakra UI.

### Campos e formatacao

Formatacoes de apresentacao ficam em `src/shared/utils/formatters.ts`. Use as funcoes compartilhadas para moeda, numeros, percentuais, datas, data/hora, CPF/CNPJ, telefone, CEP e forma de pagamento. Nao crie `Intl.NumberFormat`, `toLocaleDateString` ou mascaras locais dentro de paginas.

Para entrada de dados, use `FormattedInput` e `CurrencyInput` de `src/shared/ui/FormattedInput.tsx`. As mascaras disponiveis sao `cnpj`, `cpf`, `document`, `phone` e `cep`.

Listagens da Platform devem usar `FilterBar`, `LoadingTable`, `ErrorState`, `EmptyState` e `TablePagination` exportados por `components/PlatformUI.tsx`.

## Checklist

- [ ] Usa tokens `erp.*` e funciona em claro e escuro.
- [ ] Tem loading, erro, vazio e nova tentativa quando aplicavel.
- [ ] Controles possuem nome acessivel e foco visivel.
- [ ] Acoes reais estao ligadas a rota, API ou callback.
- [ ] Mobile nao possui overflow ou alvos menores que 44px nas acoes principais.
- [ ] `npm run lint` e `npm run build` passam.
