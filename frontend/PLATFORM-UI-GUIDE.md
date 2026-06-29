# NovaWave Platform - UI/UX Guide

Este documento registra o design system e as decisoes de experiencia do painel administrativo da NovaWave Tech.

## Fundamentos

- Tema atual: light mode.
- Cor primaria: `#2563FF`.
- Cor secundaria: `#4F46E5`.
- Canvas: `#F6F8FB`.
- Superficies: branco, borda `#E4E8F0` e sombra discreta.
- Radius de controles: `6px`.
- Radius de superficies: `8px`.
- Transicoes: `160ms ease`.
- Escala de espacamento: multiplos de 4px usando os tokens do Chakra UI.

Os tokens oficiais ficam em `src/modules/platform/theme/platformTokens.ts`. Cores e sombras novas nao devem ser declaradas diretamente nas paginas.

## Componentes Base

`src/modules/platform/components/PlatformUI.tsx` concentra:

- `PageHeader`: titulo, contexto e acao principal.
- `Surface`: superficie padrao, com variante interativa.
- `PanelHeader`: cabecalho consistente para graficos e tabelas.
- `MetricCard`: KPI com icone, valor, detalhe e skeleton.
- `StatusBadge`: estados semanticos discretos.
- `LoadingTable`: skeleton de tabelas.
- `EmptyState`: icone, titulo, descricao e acao opcional.
- `TablePagination`: navegacao e contagem de registros.

`hooks/usePlatformToast.tsx` fornece feedback com icone semantico, animacao, fechamento e barra de progresso.

Inputs, selects, textareas, botoes, tabs, menus, tabelas, modais, drawers e alerts possuem variantes globais em `src/theme/index.ts`.

## Navegacao

- Sidebar agrupada em Visao geral, Gestao e Sistema.
- Estado recolhido persistido em `platform_sidebar_collapsed`.
- Menu mobile em drawer.
- Navbar com breadcrumb, busca global, ambiente, acoes rapidas, notificacoes e menu do usuario.
- Item ativo usa contraste, fundo sutil e indicador lateral.

## Melhorias Aplicadas

- Dashboard reorganizado com KPIs prioritarios, grafico combinado, alertas e atalhos.
- Tabelas com toolbar, hover, ordenacao e paginacao cliente.
- Estados vazios e carregamentos padronizados.
- Modais e drawers corrigidos para light mode.
- Formularios com foco, erro, hover e disabled consistentes.
- Badges com paleta semantica de baixo contraste.
- Grids e navegacao revisados para desktop, notebook, tablet e mobile.
- Paginas carregadas sob demanda para reduzir o custo inicial da Platform.

## Regras Para Novas Telas

1. Reutilizar tokens e componentes base antes de criar estilos locais.
2. Manter uma unica acao primaria por cabecalho.
3. Usar skeleton em dados remotos e empty state quando nao houver registros.
4. Colocar tabelas em containers com overflow horizontal no mobile.
5. Preservar labels, foco visivel, contraste e navegacao por teclado.
6. Validar `npm run lint` e `npm run build` antes de concluir.

## Evolucao Futura

- Dark mode usando os mesmos semantic tokens.
- Paginacao e ordenacao server-side para grandes volumes.
- Central de notificacoes em tempo real.
- Busca global com resultados remotos e atalhos de comando.
- Testes visuais automatizados para os principais viewports.
