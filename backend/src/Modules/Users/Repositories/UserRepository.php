<?php

namespace App\Modules\Users\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class UserRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        $where = ['u.idempresa = :company_id'];
        $params = ['company_id' => $companyId];
        foreach (['idfilial_padrao' => 'branch', 'situacao' => 'status'] as $column => $key) {
            if (($filters[$key] ?? '') !== '') {
                $where[] = "u.{$column} = :{$key}";
                $params[$key] = (int) $filters[$key];
            }
        }
        if (($filters['profile'] ?? '') !== '') {
            $where[] = 'EXISTS (SELECT 1 FROM usuario_perfil ux WHERE ux.idempresa=u.idempresa AND ux.idusuario=u.idusuario AND ux.idperfil=:profile)';
            $params['profile'] = (int) $filters['profile'];
        }
        if (($filters['department'] ?? '') !== '') {
            $where[] = 'c.iddepartamento = :department';
            $params['department'] = (int) $filters['department'];
        }
        if (($filters['role'] ?? '') !== '') {
            $where[] = 'c.idcargo = :role';
            $params['role'] = (int) $filters['role'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(u.nome ILIKE :q OR u.email ILIKE :q OR u.telefone ILIKE :q OR c.nome ILIKE :q)';
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
        }
        if (($filters['last_access'] ?? '') === 'never') {
            $where[] = 'u.ultimo_login IS NULL';
        } elseif (($filters['last_access'] ?? '') === '7d') {
            $where[] = "u.ultimo_login >= CURRENT_TIMESTAMP - INTERVAL '7 days'";
        } elseif (($filters['last_access'] ?? '') === '30d') {
            $where[] = "u.ultimo_login >= CURRENT_TIMESTAMP - INTERVAL '30 days'";
        }

        $users = $this->fetchAll(
            "SELECT u.idusuario, u.nome, u.email, u.telefone, u.avatar_url,
                    u.admin_empresa, u.situacao, u.ultimo_login, u.criado_em,
                    f.nome AS filial, c.nome AS cargo, d.nome AS departamento,
                    COALESCE(string_agg(DISTINCT pa.nome, ', '), CASE WHEN u.admin_empresa THEN 'Administrador' ELSE 'Sem perfil' END) AS perfil
             FROM usuario u
             LEFT JOIN filial f ON f.idempresa=u.idempresa AND f.idfilial=u.idfilial_padrao
             LEFT JOIN funcionario fn ON fn.idempresa=u.idempresa AND fn.idfuncionario=u.idfuncionario
             LEFT JOIN cargo c ON c.idempresa=fn.idempresa AND c.idcargo=fn.idcargo
             LEFT JOIN departamento d ON d.idempresa=c.idempresa AND d.iddepartamento=c.iddepartamento
             LEFT JOIN usuario_perfil up ON up.idempresa=u.idempresa AND up.idusuario=u.idusuario
             LEFT JOIN perfil_acesso pa ON pa.idempresa=up.idempresa AND pa.idperfil=up.idperfil
             WHERE " . implode(' AND ', $where) . "
             GROUP BY u.idusuario, f.nome, c.nome, d.nome
             ORDER BY u.nome",
            $params
        );

        $metrics = $this->fetchOne(
            "SELECT COUNT(*) AS total,
                    COUNT(*) FILTER (WHERE situacao=1) AS active,
                    COUNT(*) FILTER (WHERE situacao=0) AS inactive,
                    COUNT(*) FILTER (WHERE admin_empresa=true) AS admins,
                    COUNT(DISTINCT idfilial_padrao) FILTER (WHERE idfilial_padrao IS NOT NULL) AS branches
             FROM usuario WHERE idempresa=:company_id",
            ['company_id' => $companyId]
        );

        return ['users' => $users, 'metrics' => $metrics, 'options' => $this->options($companyId)];
    }

    public function show(int $companyId, int $userId): ?array
    {
        $user = $this->fetchOne(
            "SELECT u.idusuario, u.idfilial_padrao, u.idfuncionario, u.nome, u.email,
                    u.telefone, u.avatar_url, u.admin_empresa, u.situacao, u.ultimo_login,
                    u.criado_em, e.nome_fantasia AS empresa, f.nome AS filial,
                    fn.cpf, fn.data_admissao, c.idcargo, c.nome AS cargo,
                    d.iddepartamento, d.nome AS departamento
             FROM usuario u JOIN empresa e ON e.idempresa=u.idempresa
             LEFT JOIN filial f ON f.idempresa=u.idempresa AND f.idfilial=u.idfilial_padrao
             LEFT JOIN funcionario fn ON fn.idempresa=u.idempresa AND fn.idfuncionario=u.idfuncionario
             LEFT JOIN cargo c ON c.idempresa=fn.idempresa AND c.idcargo=fn.idcargo
             LEFT JOIN departamento d ON d.idempresa=c.idempresa AND d.iddepartamento=c.iddepartamento
             WHERE u.idempresa=:company_id AND u.idusuario=:user_id",
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        if (!$user) return null;
        $user['profiles'] = $this->fetchAll(
            'SELECT pa.idperfil, pa.nome FROM usuario_perfil up JOIN perfil_acesso pa
             ON pa.idempresa=up.idempresa AND pa.idperfil=up.idperfil
             WHERE up.idempresa=:company_id AND up.idusuario=:user_id ORDER BY pa.nome',
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        $user['permissions'] = $this->fetchAll(
            'SELECT DISTINCT p.modulo FROM usuario_perfil up
             JOIN perfil_permissao pp ON pp.idempresa=up.idempresa AND pp.idperfil=up.idperfil
             JOIN permissao p ON p.idpermissao=pp.idpermissao
             WHERE up.idempresa=:company_id AND up.idusuario=:user_id ORDER BY p.modulo',
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        $user['branches'] = $this->fetchAll(
            'SELECT f.idfilial, f.nome FROM usuario_filial uf JOIN filial f
             ON f.idempresa=uf.idempresa AND f.idfilial=uf.idfilial
             WHERE uf.idempresa=:company_id AND uf.idusuario=:user_id ORDER BY f.nome',
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        $user['sessions'] = $this->fetchAll(
            "SELECT idsessao, dispositivo, sistema_operacional, navegador, ip,
                    criado_em, expira_em, revogado_em,
                    CASE WHEN revogado_em IS NULL AND expira_em > CURRENT_TIMESTAMP THEN true ELSE false END AS active
             FROM sessao_usuario WHERE idempresa=:company_id AND idusuario=:user_id
             ORDER BY criado_em DESC LIMIT 20",
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        $user['history'] = $this->fetchAll(
            "SELECT idauditoria, acao, valores_anteriores, valores_novos, ip, criado_em
             FROM auditoria WHERE idempresa=:company_id
               AND ((tabela='usuario' AND registro_id=:user_id) OR idusuario=:user_id)
             ORDER BY criado_em DESC LIMIT 30",
            ['company_id' => $companyId, 'user_id' => $userId]
        );
        $user['birth_date'] = null;
        $user['capabilities'] = ['force_password_change' => false, 'two_factor' => false, 'email_invite' => false];
        return $user;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $userAgent): int
    {
        $this->pdo->beginTransaction();
        try {
            $this->assertReferences($companyId, $data);
            $employeeId = $this->insertEmployee($companyId, $data);
            $statement = $this->pdo->prepare(
                'INSERT INTO usuario (idempresa,idfilial_padrao,idfuncionario,nome,email,senha_hash,telefone,admin_empresa,situacao)
                 VALUES (:company_id,:branch_id,:employee_id,:name,LOWER(BTRIM(:email)),:password,:phone,:admin,1)
                 RETURNING idusuario'
            );
            $statement->execute([
                'company_id' => $companyId,
                'branch_id' => (int) $data['idfilial'],
                'employee_id' => $employeeId,
                'name' => trim((string) $data['nome']),
                'email' => trim((string) $data['email']),
                'password' => password_hash((string) $data['senha'], PASSWORD_DEFAULT),
                'phone' => $data['telefone'] ?? null,
                'admin' => !empty($data['admin_empresa']) ? 'true' : 'false',
            ]);
            $userId = (int) $statement->fetchColumn();
            $this->syncAccess($companyId, $userId, $data);
            $this->audit($companyId, $actorId, $userId, 'criar', null, ['email' => $data['email']], $ip, $userAgent);
            $this->pdo->commit();
            return $userId;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function update(int $companyId, int $actorId, int $userId, array $data, ?string $ip, ?string $userAgent): void
    {
        $this->pdo->beginTransaction();
        try {
            $before = $this->show($companyId, $userId);
            if (!$before) throw new InvalidArgumentException('Usuario nao encontrado');
            $this->assertReferences($companyId, $data);
            $statement = $this->pdo->prepare(
                'UPDATE usuario SET nome=:name,email=LOWER(BTRIM(:email)),telefone=:phone,
                 idfilial_padrao=:branch_id,admin_empresa=:admin,atualizado_em=CURRENT_TIMESTAMP
                 WHERE idempresa=:company_id AND idusuario=:user_id'
            );
            $statement->execute([
                'name' => trim((string) $data['nome']), 'email' => trim((string) $data['email']),
                'phone' => $data['telefone'] ?? null, 'branch_id' => (int) $data['idfilial'],
                'admin' => !empty($data['admin_empresa']) ? 'true' : 'false',
                'company_id' => $companyId, 'user_id' => $userId,
            ]);
            if ($before['idfuncionario']) {
                $employee = $this->pdo->prepare(
                    'UPDATE funcionario SET nome=:name,cpf=:cpf,email=:email,telefone=:phone,idfilial=:branch_id,
                     idcargo=:role_id,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idfuncionario=:employee_id'
                );
                $employee->execute([
                    'name' => $data['nome'], 'cpf' => $data['cpf'] ?? null, 'email' => $data['email'],
                    'phone' => $data['telefone'] ?? null, 'branch_id' => (int) $data['idfilial'],
                    'role_id' => !empty($data['idcargo']) ? (int) $data['idcargo'] : null,
                    'company_id' => $companyId, 'employee_id' => (int) $before['idfuncionario'],
                ]);
            }
            $this->syncAccess($companyId, $userId, $data);
            $this->audit($companyId, $actorId, $userId, 'editar', ['email' => $before['email']], ['email' => $data['email']], $ip, $userAgent);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
    }

    public function setStatus(int $companyId, int $actorId, int $userId, int $status, ?string $ip, ?string $userAgent): void
    {
        $statement = $this->pdo->prepare('UPDATE usuario SET situacao=:status,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idusuario=:user_id');
        $statement->execute(['status' => $status, 'company_id' => $companyId, 'user_id' => $userId]);
        if (!$statement->rowCount()) throw new InvalidArgumentException('Usuario nao encontrado');
        if ($status === 0) {
            $this->pdo->prepare('UPDATE sessao_usuario SET revogado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idusuario=:user_id AND revogado_em IS NULL')
                ->execute(['company_id' => $companyId, 'user_id' => $userId]);
        }
        $this->audit($companyId, $actorId, $userId, $status ? 'ativar' : 'bloquear', null, ['situacao' => $status], $ip, $userAgent);
    }

    public function resetPassword(int $companyId, int $actorId, int $userId, string $password, ?string $ip, ?string $userAgent): void
    {
        $statement = $this->pdo->prepare('UPDATE usuario SET senha_hash=:password,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idusuario=:user_id');
        $statement->execute(['password' => password_hash($password, PASSWORD_DEFAULT), 'company_id' => $companyId, 'user_id' => $userId]);
        if (!$statement->rowCount()) throw new InvalidArgumentException('Usuario nao encontrado');
        $this->pdo->prepare('UPDATE sessao_usuario SET revogado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idusuario=:user_id AND revogado_em IS NULL')
            ->execute(['company_id' => $companyId, 'user_id' => $userId]);
        $this->audit($companyId, $actorId, $userId, 'redefinir_senha', null, null, $ip, $userAgent);
    }

    public function revokeSession(int $companyId, int $actorId, int $userId, int $sessionId, ?string $ip, ?string $userAgent): void
    {
        $statement = $this->pdo->prepare('UPDATE sessao_usuario SET revogado_em=CURRENT_TIMESTAMP WHERE idsessao=:session_id AND idempresa=:company_id AND idusuario=:user_id AND revogado_em IS NULL');
        $statement->execute(['session_id' => $sessionId, 'company_id' => $companyId, 'user_id' => $userId]);
        if (!$statement->rowCount()) throw new InvalidArgumentException('Sessao ativa nao encontrada');
        $this->audit($companyId, $actorId, $userId, 'encerrar_sessao', null, ['idsessao' => $sessionId], $ip, $userAgent);
    }

    private function options(int $companyId): array
    {
        return [
            'company' => $this->fetchOne('SELECT idempresa,nome_fantasia AS nome FROM empresa WHERE idempresa=:company_id', ['company_id' => $companyId]),
            'branches' => $this->fetchAll('SELECT idfilial AS id,nome FROM filial WHERE idempresa=:company_id AND situacao=1 ORDER BY matriz DESC,nome', ['company_id' => $companyId]),
            'departments' => $this->fetchAll('SELECT iddepartamento AS id,nome FROM departamento WHERE idempresa=:company_id AND situacao=1 ORDER BY nome', ['company_id' => $companyId]),
            'roles' => $this->fetchAll('SELECT idcargo AS id,iddepartamento,nome FROM cargo WHERE idempresa=:company_id AND situacao=1 ORDER BY nome', ['company_id' => $companyId]),
            'profiles' => $this->fetchAll('SELECT idperfil AS id,nome,descricao FROM perfil_acesso WHERE idempresa=:company_id AND situacao=1 ORDER BY nome', ['company_id' => $companyId]),
        ];
    }

    private function insertEmployee(int $companyId, array $data): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO funcionario (idempresa,idfilial,idcargo,nome,cpf,email,telefone,situacao)
             VALUES (:company_id,:branch_id,:role_id,:name,:cpf,:email,:phone,1) RETURNING idfuncionario'
        );
        $statement->execute([
            'company_id' => $companyId, 'branch_id' => (int) $data['idfilial'],
            'role_id' => !empty($data['idcargo']) ? (int) $data['idcargo'] : null,
            'name' => trim((string) $data['nome']), 'cpf' => $data['cpf'] ?? null,
            'email' => trim((string) $data['email']), 'phone' => $data['telefone'] ?? null,
        ]);
        return (int) $statement->fetchColumn();
    }

    private function syncAccess(int $companyId, int $userId, array $data): void
    {
        $this->pdo->prepare('DELETE FROM usuario_filial WHERE idempresa=:company_id AND idusuario=:user_id')
            ->execute(['company_id' => $companyId, 'user_id' => $userId]);
        $branches = array_unique(array_map('intval', $data['filiais'] ?? [$data['idfilial']]));
        $branchInsert = $this->pdo->prepare('INSERT INTO usuario_filial (idempresa,idusuario,idfilial) VALUES (:company_id,:user_id,:branch_id)');
        foreach ($branches as $branchId) $branchInsert->execute(['company_id' => $companyId, 'user_id' => $userId, 'branch_id' => $branchId]);

        $this->pdo->prepare('DELETE FROM usuario_perfil WHERE idempresa=:company_id AND idusuario=:user_id')
            ->execute(['company_id' => $companyId, 'user_id' => $userId]);
        if (!empty($data['idperfil'])) {
            $this->pdo->prepare('INSERT INTO usuario_perfil (idempresa,idusuario,idperfil) VALUES (:company_id,:user_id,:profile_id)')
                ->execute(['company_id' => $companyId, 'user_id' => $userId, 'profile_id' => (int) $data['idperfil']]);
        }
    }

    private function assertReferences(int $companyId, array $data): void
    {
        $branch = $this->fetchOne('SELECT idfilial FROM filial WHERE idempresa=:company_id AND idfilial=:id AND situacao=1', ['company_id' => $companyId, 'id' => (int) $data['idfilial']]);
        if (!$branch) throw new InvalidArgumentException('Filial invalida');
        if (!empty($data['idcargo']) && !$this->fetchOne('SELECT idcargo FROM cargo WHERE idempresa=:company_id AND idcargo=:id AND situacao=1', ['company_id' => $companyId, 'id' => (int) $data['idcargo']])) throw new InvalidArgumentException('Cargo invalido');
        if (!empty($data['idperfil']) && !$this->fetchOne('SELECT idperfil FROM perfil_acesso WHERE idempresa=:company_id AND idperfil=:id AND situacao=1', ['company_id' => $companyId, 'id' => (int) $data['idperfil']])) throw new InvalidArgumentException('Perfil invalido');
    }

    private function audit(int $companyId, int $actorId, int $userId, string $action, ?array $before, ?array $after, ?string $ip, ?string $userAgent): void
    {
        $statement = $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa,idusuario,origem_usuario,tabela,registro_id,acao,valores_anteriores,valores_novos,ip,dispositivo)
             VALUES (:company_id,:actor_id,'empresa','usuario',:user_id,:action,:before::jsonb,:after::jsonb,:ip,:device)"
        );
        $statement->execute([
            'company_id' => $companyId, 'actor_id' => $actorId, 'user_id' => $userId,
            'action' => $action, 'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null, 'ip' => $ip,
            'device' => $userAgent ? substr($userAgent, 0, 150) : null,
        ]);
    }

    private function fetchOne(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql); $statement->execute($params);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function fetchAll(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql); $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
