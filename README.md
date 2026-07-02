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

Campos planejados que ainda nao existem no schema privado, como metas diarias, meta de ticket, meta de clientes e participacao no ranking, ficam identificados e desabilitados na interface, sem persistencia ficticia.

## Centro de Gestao de Usuarios

A rota autenticada `/users` concentra a administracao dos usuarios de cada empresa. O modulo inclui indicadores, busca e filtros, cadastro guiado, edicao, perfis, filiais, bloqueio, redefinicao de senha, sessoes e historico de auditoria.

As APIs ficam sob `/users` e sempre utilizam o tenant do token JWT. Operacoes de criacao e edicao sincronizam o funcionario, a filial e o perfil em transacao. Recursos que ainda dependem de evolucao do schema privado, como data de nascimento, upload de foto, 2FA e troca obrigatoria da primeira senha, aparecem identificados na interface e nao geram persistencia ficticia.

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
