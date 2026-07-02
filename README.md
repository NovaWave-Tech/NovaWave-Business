# NovaWave Business ERP

Base inicial do NovaWave Business ERP, organizada em backend PHP/Slim e frontend React/Vite.

## Estrutura

```txt
backend/
  src/Modules/
  src/Shared/
  src/Infrastructure/
  src/Routes/api.php

frontend/
  src/app/
  src/layouts/
  src/modules/
  src/shared/
  src/theme/
```

## Como executar

Backend:

```bash
cd backend
composer install
docker compose up -d --build
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Variaveis de ambiente

Copie os exemplos antes de rodar localmente:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Nunca publique arquivos `.env`. Eles ficam ignorados pelo `.gitignore` da raiz.

## Validacao feita

- Frontend: `npm run lint`
- Frontend: `npm run build`
- Docker Compose backend: `docker compose config`
- Docker Compose frontend: `docker compose config`
- Varredura basica de arquivos sensiveis e credenciais hardcoded

Observacao: a validacao de runtime dos containers depende do Docker Desktop estar em execucao.

## Publicacao do repositorio

Antes de deixar publico, confira se somente arquivos de exemplo foram versionados:

- publicar `.env.example`
- nao publicar `.env`
- nao publicar `backend/vendor`
- nao publicar `frontend/node_modules`
- nao publicar `frontend/dist`
- trocar `JWT_SECRET` por um valor longo e aleatorio no ambiente real

## Proximos passos

## NovaWave Platform

O backoffice oficial da NovaWave Tech foi implementado com login, token, layout e APIs separados do ERP. A interface inicia em:

```txt
http://localhost:5173/platform/login
```

O painel inclui dashboard global, empresas, provisionamento em etapas, planos, assinaturas, usuarios internos, auditoria e configuracoes. Consulte `backend/CODEX-INSTRUCTIONS.md` e `frontend/CODEX-INSTRUCTIONS.md` para os fluxos de desenvolvimento.

## Centro de Gestao de Filiais

A rota autenticada `/branches` concentra a administracao operacional das unidades da empresa. A tela apresenta indicadores consolidados, busca e filtros, cards responsivos, cadastro guiado, edicao e um drawer com visao geral, indicadores, usuarios, operacao e auditoria.

As APIs de filiais usam exclusivamente a empresa do token JWT. Criacao, edicao, definicao de matriz, metas e auditoria sao executadas de forma transacional. A exclusao fisica fica bloqueada para preservar o historico do ERP; unidades podem ser inativadas, e uma matriz ativa precisa ser substituida antes da inativacao.

O schema de filiais inclui participacao em metas, exibicao no ranking, meta mensal, diaria, ticket medio e quantidade de clientes. Esses dados sao persistidos e exibidos nos indicadores da unidade.

## Centro de Gestao de Clientes

A rota autenticada `/customers` oferece uma visao comercial e financeira da base de clientes. O modulo inclui indicadores, filtros avancados, listagem responsiva, cadastro adaptativo para pessoa fisica ou juridica, edicao, historico de compras, contas a receber e relacionamento em timeline.

As APIs respeitam a empresa do token JWT e registram criacao, alteracoes, observacoes e mudancas de situacao na auditoria. CPF e CNPJ sao validados no frontend e no backend. A exclusao fisica permanece bloqueada para preservar vendas e registros financeiros, sendo substituida pela inativacao.

Formatadores de documento, telefone, CEP, moeda e datas sao reutilizados da camada compartilhada. O schema de clientes contempla RG, nome fantasia, inscricao estadual, nascimento ou abertura, recorrencia manual e permissao de venda a prazo.

## Centro de Gestao de Produtos

A rota autenticada `/products` concentra catalogo, precos, estoque, fornecedores e desempenho comercial. O modulo inclui indicadores, filtros, tabela responsiva, cadastro guiado em sete etapas e detalhes de informacoes gerais, estoque por filial, financeiro, movimentacoes, vendas, fornecedores e auditoria.

Criacao, estoque inicial, fornecedores, imagens e auditoria sao persistidos em uma unica transacao. Movimentacoes de entrada, saida e ajuste validam a disponibilidade e a politica de estoque negativo. SKU e codigo de barras permanecem unicos por empresa, e a exclusao fisica fica bloqueada para preservar compras, vendas e movimentacoes.

Os formatadores compartilhados contemplam moeda, percentual, quantidade, codigo de barras, peso e dimensoes. A migration privada adiciona dados fiscais e logisticos, reserva de estoque, galeria de imagens e multiplos fornecedores, mantendo preparada a evolucao para variacoes, kits, lotes, series e validade.

## Centro de Gestao de Usuarios

A rota autenticada `/users` concentra a administracao dos usuarios de cada empresa. O modulo inclui indicadores, busca e filtros, cadastro guiado, edicao, perfis, filiais, bloqueio, redefinicao de senha, sessoes e historico de auditoria.

As APIs ficam sob `/users` e sempre utilizam o tenant do token JWT. Operacoes de criacao e edicao sincronizam o funcionario, a filial e o perfil em transacao. Data de nascimento, exigencia de troca de senha e autenticacao em dois fatores sao persistidas. Upload de foto e convite por e-mail continuam dependentes da futura camada de arquivos e mensageria.

## Evolucao Privada do Schema

As migrations de banco permanecem em `backend/database/migrations/` e sao ignoradas pelo Git para proteger a estrutura privada. A evolucao de cadastros adiciona campos operacionais para clientes, usuarios e filiais e deve ser aplicada pela rotina privada de infraestrutura antes da publicacao de uma nova versao da API.

Validacao do modulo:

```bash
cd frontend
npm run lint
npm run build

cd ../backend
docker compose exec -T php php -l src/Modules/Users/Controllers/UserController.php
```

## Proximos passos

- Evoluir o schema pelo processo privado de infraestrutura, fora do repositorio publico.
- Implementar refresh token sobre as tabelas de sessao existentes.
- Aplicar o RBAC e o isolamento de tenant nos middlewares do backend.
- Integrar a gravacao de auditoria aos servicos da aplicacao.
- Implementar modulos reais em cima da estrutura modular.
