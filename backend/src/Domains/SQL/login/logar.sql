SELECT 
    idusuario,
    nome,
    email,
    senha,
    situacao
FROM usuario 
WHERE LOWER(TRIM(email)) = LOWER(TRIM(:email))
  AND situacao = 1
LIMIT 1
