<?php

namespace App\Modules\Platform\Repositories;

use App\Infrastructures\Config\Database;
use PDO;
use RuntimeException;

final class PlatformRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function dashboard(): array
    {
        $metrics = $this->pdo->query(
            "SELECT
              (SELECT COUNT(*) FROM empresa WHERE situacao = 1) AS empresas_ativas,
              (SELECT COUNT(*) FROM empresa WHERE situacao = 2) AS empresas_bloqueadas,
              (SELECT COUNT(DISTINCT idempresa) FROM assinatura WHERE status = 2) AS empresas_teste,
              (SELECT COUNT(*) FROM assinatura WHERE status = 1) AS assinaturas_ativas,
              (SELECT COUNT(*) FROM assinatura WHERE status = 3) AS assinaturas_vencidas,
              (SELECT COALESCE(SUM(valor_atual), 0) FROM assinatura WHERE status = 1) AS mrr,
              (SELECT COALESCE(SUM(valor_atual), 0) * 12 FROM assinatura WHERE status = 1) AS arr,
              (SELECT COUNT(*) FROM empresa WHERE criado_em >= date_trunc('month', CURRENT_DATE)) AS novos_clientes_mes,
              (SELECT COUNT(*) FROM usuario WHERE situacao = 1) AS usuarios_totais,
              (SELECT COUNT(*) FROM filial WHERE situacao = 1) AS filiais_totais,
              (SELECT COUNT(*) FROM produto WHERE situacao = 1) AS produtos_totais,
              (SELECT COUNT(*) FROM venda WHERE situacao <> 4) AS vendas_processadas"
        )->fetch(PDO::FETCH_ASSOC);

        $growth = $this->pdo->query(
            "WITH meses AS (
               SELECT generate_series(
                 date_trunc('month', CURRENT_DATE) - INTERVAL '5 months',
                 date_trunc('month', CURRENT_DATE), INTERVAL '1 month'
               ) AS mes
             )
             SELECT to_char(m.mes, 'Mon') AS mes,
                    COUNT(e.idempresa) AS empresas,
                    COALESCE((SELECT SUM(a.valor_atual) FROM assinatura a
                      WHERE a.status = 1 AND date_trunc('month', a.criado_em) = m.mes), 0) AS receita
             FROM meses m
             LEFT JOIN empresa e ON date_trunc('month', e.criado_em) = m.mes
             GROUP BY m.mes ORDER BY m.mes"
        )->fetchAll(PDO::FETCH_ASSOC);

        return [
            'metrics' => $metrics,
            'growth' => $growth,
            'recent_companies' => $this->pdo->query(
                'SELECT idempresa, nome_fantasia, razao_social, situacao, criado_em
                 FROM empresa ORDER BY criado_em DESC LIMIT 6'
            )->fetchAll(PDO::FETCH_ASSOC),
            'expiring_subscriptions' => $this->pdo->query(
                "SELECT a.idassinatura, e.nome_fantasia, p.nome AS plano,
                        a.data_proxima_cobranca, a.valor_atual, a.status
                 FROM assinatura a
                 JOIN empresa e ON e.idempresa = a.idempresa
                 JOIN plano p ON p.idplano = a.idplano
                 WHERE a.status IN (1, 2)
                   AND a.data_proxima_cobranca <= CURRENT_DATE + INTERVAL '15 days'
                 ORDER BY a.data_proxima_cobranca LIMIT 6"
            )->fetchAll(PDO::FETCH_ASSOC),
        ];
    }

    public function companies(array $filters): array
    {
        $where = ['1=1'];
        $params = [];

        if (!empty($filters['q'])) {
            $where[] = "(e.nome_fantasia ILIKE :q OR e.razao_social ILIKE :q OR e.cnpj ILIKE :q OR e.email ILIKE :q)";
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
        }
        if (isset($filters['situacao']) && $filters['situacao'] !== '') {
            $where[] = 'e.situacao = :situacao';
            $params['situacao'] = (int) $filters['situacao'];
        }

        $sql = "SELECT e.idempresa, e.nome_fantasia, e.razao_social, e.cnpj, e.email,
                       e.situacao, e.criado_em, p.nome AS plano, a.status AS assinatura_status,
                       (SELECT COUNT(*) FROM filial f WHERE f.idempresa = e.idempresa) AS filiais,
                       (SELECT COUNT(*) FROM usuario u WHERE u.idempresa = e.idempresa) AS usuarios
                FROM empresa e
                LEFT JOIN LATERAL (
                  SELECT * FROM assinatura ax WHERE ax.idempresa = e.idempresa
                  ORDER BY ax.criado_em DESC LIMIT 1
                ) a ON true
                LEFT JOIN plano p ON p.idplano = a.idplano
                WHERE " . implode(' AND ', $where) . '
                ORDER BY e.criado_em DESC';
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);

        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public function company(int $id): ?array
    {
        $statement = $this->pdo->prepare(
            'SELECT e.*, a.idassinatura, a.status AS assinatura_status, a.valor_atual,
                    a.data_inicio, a.data_proxima_cobranca, p.idplano, p.nome AS plano
             FROM empresa e
             LEFT JOIN LATERAL (
               SELECT * FROM assinatura ax WHERE ax.idempresa = e.idempresa
               ORDER BY ax.criado_em DESC LIMIT 1
             ) a ON true
             LEFT JOIN plano p ON p.idplano = a.idplano
             WHERE e.idempresa = :id'
        );
        $statement->execute(['id' => $id]);
        $company = $statement->fetch(PDO::FETCH_ASSOC);

        if (!$company) {
            return null;
        }

        $company['filiais'] = $this->fetchAll(
            'SELECT * FROM filial WHERE idempresa = :id ORDER BY matriz DESC, nome', ['id' => $id]
        );
        $company['usuarios'] = $this->fetchAll(
            'SELECT idusuario, nome, email, admin_empresa, situacao, ultimo_login
             FROM usuario WHERE idempresa = :id ORDER BY nome', ['id' => $id]
        );

        return $company;
    }

    public function createCompany(array $data, int $platformUserId): int
    {
        $this->pdo->beginTransaction();

        try {
            $company = $this->pdo->prepare(
                'INSERT INTO empresa
                 (razao_social, nome_fantasia, cnpj, inscricao_estadual, email, telefone,
                  cep, endereco, numero, complemento, bairro, cidade, estado, timezone, moeda, idioma)
                 VALUES
                 (:razao_social, :nome_fantasia, :cnpj, :inscricao_estadual, :email, :telefone,
                  :cep, :endereco, :numero, :complemento, :bairro, :cidade, :estado, :timezone, :moeda, :idioma)
                 RETURNING idempresa'
            );
            $company->execute($this->pick($data, [
                'razao_social', 'nome_fantasia', 'cnpj', 'inscricao_estadual', 'email', 'telefone',
                'cep', 'endereco', 'numero', 'complemento', 'bairro', 'cidade', 'estado',
                'timezone', 'moeda', 'idioma',
            ], ['timezone' => 'America/Sao_Paulo', 'moeda' => 'BRL', 'idioma' => 'pt-BR']));
            $companyId = (int) $company->fetchColumn();

            $branchData = $data['filial'] ?? [];
            $branch = $this->pdo->prepare(
                'INSERT INTO filial
                 (idempresa, nome, codigo, cnpj, email, telefone, cep, endereco, numero,
                  complemento, bairro, cidade, estado, matriz)
                 VALUES (:idempresa, :nome, :codigo, :cnpj, :email, :telefone, :cep, :endereco,
                  :numero, :complemento, :bairro, :cidade, :estado, true)
                 RETURNING idfilial'
            );
            $branch->execute(array_merge(['idempresa' => $companyId], $this->pick($branchData, [
                'nome', 'codigo', 'cnpj', 'email', 'telefone', 'cep', 'endereco', 'numero',
                'complemento', 'bairro', 'cidade', 'estado',
            ], ['nome' => 'Matriz', 'codigo' => 'MATRIZ'])));
            $branchId = (int) $branch->fetchColumn();

            $subscription = $data['assinatura'] ?? [];
            $statement = $this->pdo->prepare(
                'INSERT INTO assinatura
                 (idempresa, idplano, data_inicio, data_proxima_cobranca, status, forma_pagamento, valor_atual)
                 VALUES (:idempresa, :idplano, :data_inicio, :data_proxima_cobranca,
                         :status, :forma_pagamento, :valor_atual)'
            );
            $statement->execute([
                'idempresa' => $companyId,
                'idplano' => (int) ($subscription['idplano'] ?? 0),
                'data_inicio' => $subscription['data_inicio'] ?? date('Y-m-d'),
                'data_proxima_cobranca' => $subscription['data_proxima_cobranca'] ?? null,
                'status' => (int) ($subscription['status'] ?? 2),
                'forma_pagamento' => $subscription['forma_pagamento'] ?? null,
                'valor_atual' => (float) ($subscription['valor_atual'] ?? 0),
            ]);

            $admin = $data['administrador'] ?? [];
            $statement = $this->pdo->prepare(
                'INSERT INTO usuario
                 (idempresa, idfilial_padrao, nome, email, senha_hash, telefone, admin_empresa)
                 VALUES (:idempresa, :idfilial, :nome, :email, :senha_hash, :telefone, true)
                 RETURNING idusuario'
            );
            $statement->execute([
                'idempresa' => $companyId,
                'idfilial' => $branchId,
                'nome' => $admin['nome'] ?? '',
                'email' => strtolower(trim((string) ($admin['email'] ?? ''))),
                'senha_hash' => password_hash((string) ($admin['senha'] ?? ''), PASSWORD_DEFAULT),
                'telefone' => $admin['telefone'] ?? null,
            ]);
            $adminId = (int) $statement->fetchColumn();

            $profile = $this->pdo->prepare(
                "INSERT INTO perfil_acesso (idempresa, nome, descricao, escopo)
                 VALUES (:idempresa, 'Administrador da Empresa', 'Acesso administrativo completo', 1)
                 RETURNING idperfil"
            );
            $profile->execute(['idempresa' => $companyId]);
            $profileId = (int) $profile->fetchColumn();
            $this->execute(
                'INSERT INTO usuario_perfil (idempresa, idusuario, idperfil)
                 VALUES (:empresa, :usuario, :perfil)',
                ['empresa' => $companyId, 'usuario' => $adminId, 'perfil' => $profileId]
            );
            $this->execute(
                'INSERT INTO perfil_permissao (idempresa, idperfil, idpermissao)
                 SELECT :empresa, :perfil, idpermissao FROM permissao',
                ['empresa' => $companyId, 'perfil' => $profileId]
            );
            $this->execute(
                'INSERT INTO usuario_filial (idempresa, idusuario, idfilial)
                 VALUES (:empresa, :usuario, :filial)',
                ['empresa' => $companyId, 'usuario' => $adminId, 'filial' => $branchId]
            );
            $this->execute(
                "INSERT INTO auditoria
                 (idempresa, idplatform_usuario, origem_usuario, tabela, registro_id, acao, valores_novos)
                 VALUES (:empresa, :platform_user, 'platform', 'empresa', :empresa, 'criar', :valores::jsonb)",
                [
                    'empresa' => $companyId,
                    'platform_user' => $platformUserId,
                    'valores' => json_encode(['nome_fantasia' => $data['nome_fantasia']]),
                ]
            );

            $this->pdo->commit();
            return $companyId;
        } catch (\Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function setCompanyStatus(int $id, int $status, int $platformUserId): bool
    {
        $statement = $this->pdo->prepare(
            'UPDATE empresa SET situacao = :situacao, atualizado_em = CURRENT_TIMESTAMP
             WHERE idempresa = :id'
        );
        $statement->execute(['situacao' => $status, 'id' => $id]);

        if ($statement->rowCount() > 0) {
            $this->execute(
                "INSERT INTO auditoria
                 (idempresa, idplatform_usuario, origem_usuario, tabela, registro_id, acao, valores_novos)
                 VALUES (:id, :user, 'platform', 'empresa', :id, 'alterar_situacao', :values::jsonb)",
                ['id' => $id, 'user' => $platformUserId, 'values' => json_encode(['situacao' => $status])]
            );
            return true;
        }

        return false;
    }

    public function plans(): array
    {
        return $this->pdo->query('SELECT * FROM plano ORDER BY valor_mensal, nome')->fetchAll(PDO::FETCH_ASSOC);
    }

    public function savePlan(array $data, ?int $id = null): int
    {
        $params = $this->pick($data, [
            'nome', 'descricao', 'valor_mensal', 'valor_anual', 'limite_usuarios',
            'limite_filiais', 'limite_produtos', 'limite_armazenamento_mb', 'situacao',
        ], ['situacao' => 1]);
        $params['modulos'] = json_encode($data['modulos'] ?? []);

        if ($id === null) {
            $statement = $this->pdo->prepare(
                'INSERT INTO plano
                 (nome, descricao, valor_mensal, valor_anual, limite_usuarios, limite_filiais,
                  limite_produtos, limite_armazenamento_mb, modulos, situacao)
                 VALUES (:nome, :descricao, :valor_mensal, :valor_anual, :limite_usuarios,
                  :limite_filiais, :limite_produtos, :limite_armazenamento_mb, :modulos::jsonb, :situacao)
                 RETURNING idplano'
            );
        } else {
            $params['id'] = $id;
            $statement = $this->pdo->prepare(
                'UPDATE plano SET nome=:nome, descricao=:descricao, valor_mensal=:valor_mensal,
                  valor_anual=:valor_anual, limite_usuarios=:limite_usuarios,
                  limite_filiais=:limite_filiais, limite_produtos=:limite_produtos,
                  limite_armazenamento_mb=:limite_armazenamento_mb, modulos=:modulos::jsonb,
                  situacao=:situacao, atualizado_em=CURRENT_TIMESTAMP
                 WHERE idplano=:id RETURNING idplano'
            );
        }
        $statement->execute($params);
        $result = $statement->fetchColumn();
        if (!$result) {
            throw new RuntimeException('Plano nao encontrado');
        }
        return (int) $result;
    }

    public function subscriptions(): array
    {
        return $this->pdo->query(
            'SELECT a.*, e.nome_fantasia AS empresa, p.nome AS plano
             FROM assinatura a
             JOIN empresa e ON e.idempresa = a.idempresa
             JOIN plano p ON p.idplano = a.idplano
             ORDER BY a.data_proxima_cobranca NULLS LAST, e.nome_fantasia'
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    public function platformUsers(): array
    {
        return $this->pdo->query(
            'SELECT idplatform_usuario, nome, email, telefone, cargo, nivel_acesso,
                    ultimo_login, situacao, criado_em
             FROM platform_usuario ORDER BY nome'
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    public function createPlatformUser(array $data): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO platform_usuario
             (nome, email, senha_hash, telefone, cargo, nivel_acesso, situacao)
             VALUES (:nome, LOWER(BTRIM(:email)), :senha_hash, :telefone, :cargo, :nivel_acesso, :situacao)
             RETURNING idplatform_usuario'
        );
        $statement->execute([
            'nome' => $data['nome'],
            'email' => $data['email'],
            'senha_hash' => password_hash((string) $data['senha'], PASSWORD_DEFAULT),
            'telefone' => $data['telefone'] ?? null,
            'cargo' => $data['cargo'] ?? null,
            'nivel_acesso' => $data['nivel_acesso'] ?? 'leitura',
            'situacao' => (int) ($data['situacao'] ?? 1),
        ]);
        return (int) $statement->fetchColumn();
    }

    public function audit(array $filters): array
    {
        $where = ['1=1'];
        $params = [];
        foreach (['origem_usuario', 'tabela', 'acao'] as $field) {
            if (!empty($filters[$field])) {
                $where[] = "a.$field = :$field";
                $params[$field] = $filters[$field];
            }
        }
        if (!empty($filters['idempresa'])) {
            $where[] = 'a.idempresa = :idempresa';
            $params['idempresa'] = (int) $filters['idempresa'];
        }

        $statement = $this->pdo->prepare(
            "SELECT a.*, e.nome_fantasia AS empresa, f.nome AS filial,
                    COALESCE(u.nome, pu.nome, 'Sistema') AS usuario
             FROM auditoria a
             LEFT JOIN empresa e ON e.idempresa = a.idempresa
             LEFT JOIN filial f ON f.idempresa = a.idempresa AND f.idfilial = a.idfilial
             LEFT JOIN usuario u ON u.idempresa = a.idempresa AND u.idusuario = a.idusuario
             LEFT JOIN platform_usuario pu ON pu.idplatform_usuario = a.idplatform_usuario
             WHERE " . implode(' AND ', $where) . '
             ORDER BY a.criado_em DESC LIMIT 200'
        );
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    public function configurations(): array
    {
        return $this->pdo->query(
            "SELECT chave, CASE WHEN segredo THEN 'null'::jsonb ELSE valor END AS valor,
                    grupo, segredo, atualizado_em
             FROM platform_configuracao ORDER BY grupo, chave"
        )->fetchAll(PDO::FETCH_ASSOC);
    }

    public function saveConfigurations(array $items, int $platformUserId): void
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO platform_configuracao (chave, valor, grupo, segredo, atualizado_por, atualizado_em)
             VALUES (:chave, :valor::jsonb, :grupo, :segredo, :usuario, CURRENT_TIMESTAMP)
             ON CONFLICT (chave) DO UPDATE SET
               valor=EXCLUDED.valor, grupo=EXCLUDED.grupo, segredo=EXCLUDED.segredo,
               atualizado_por=EXCLUDED.atualizado_por, atualizado_em=CURRENT_TIMESTAMP'
        );
        foreach ($items as $item) {
            $statement->execute([
                'chave' => $item['chave'],
                'valor' => json_encode($item['valor'] ?? null),
                'grupo' => $item['grupo'],
                'segredo' => (bool) ($item['segredo'] ?? false),
                'usuario' => $platformUserId,
            ]);
        }
    }

    private function fetchAll(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }

    private function execute(string $sql, array $params): void
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
    }

    private function pick(array $data, array $keys, array $defaults = []): array
    {
        $result = [];
        foreach ($keys as $key) {
            $result[$key] = $data[$key] ?? $defaults[$key] ?? null;
        }
        return $result;
    }
}
