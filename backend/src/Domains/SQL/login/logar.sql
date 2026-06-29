SELECT
    u.idusuario,
    u.idempresa AS company_id,
    u.idfilial_padrao AS branch_id,
    u.nome,
    u.email,
    u.senha_hash,
    u.situacao,
    e.situacao AS empresa_situacao
FROM public.usuario AS u
INNER JOIN public.empresa AS e ON e.idempresa = u.idempresa
WHERE LOWER(BTRIM(u.email)) = LOWER(BTRIM(:email))
LIMIT 1
