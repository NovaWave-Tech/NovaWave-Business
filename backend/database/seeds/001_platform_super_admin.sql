-- Seed idempotente do primeiro Super Admin da NovaWave Platform.
-- Execute com psql informando admin_nome, admin_email e admin_senha.

\if :{?admin_nome}
\else
  \echo 'ERRO: informe --set=admin_nome=...'
  \quit 3
\endif

\if :{?admin_email}
\else
  \echo 'ERRO: informe --set=admin_email=...'
  \quit 3
\endif

\if :{?admin_senha}
\else
  \echo 'ERRO: informe --set=admin_senha=...'
  \quit 3
\endif

CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO public.platform_usuario (
  nome,
  email,
  senha_hash,
  cargo,
  nivel_acesso,
  situacao
)
SELECT
  BTRIM(:'admin_nome'),
  LOWER(BTRIM(:'admin_email')),
  crypt(:'admin_senha', gen_salt('bf', 12)),
  'Administrador da Plataforma',
  'super_admin',
  1
WHERE NOT EXISTS (
  SELECT 1
  FROM public.platform_usuario
  WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:'admin_email'))
);

\echo 'Super Admin processado.'

SELECT
  idplatform_usuario,
  nome,
  email,
  cargo,
  nivel_acesso,
  situacao,
  criado_em
FROM public.platform_usuario
WHERE LOWER(BTRIM(email)) = LOWER(BTRIM(:'admin_email'));
