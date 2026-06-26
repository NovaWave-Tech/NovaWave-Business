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

- Modelar schema definitivo do ERP.
- Migrar todas as senhas para `password_hash`.
- Implementar refresh token.
- Criar RBAC completo.
- Criar auditoria centralizada.
- Implementar modulos reais em cima da estrutura modular.
