<?php

namespace App\Modules\Permissions\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class PermissionRepository
{
    private PDO $pdo;

    private const MODULES = [
        'dashboard' => 'Dashboard',
        'financeiro' => 'Financeiro',
        'venda' => 'Vendas',
        'compra' => 'Compras',
        'estoque' => 'Estoque',
        'produto' => 'Produtos',
        'cliente' => 'Clientes',
        'fornecedor' => 'Fornecedores',
        'funcionario' => 'Funcionarios',
        'usuario' => 'Usuarios',
        'filial' => 'Filiais',
        'relatorio' => 'Relatorios',
        'crm' => 'CRM',
        'rh' => 'RH',
        'fiscal' => 'Fiscal',
        'configuracao' => 'Configuracoes',
    ];

    private const ACTIONS = [
        'visualizar' => 'Visualizar',
        'criar' => 'Criar',
        'editar' => 'Editar',
        'excluir' => 'Excluir',
        'importar' => 'Importar',
        'exportar' => 'Exportar',
        'aprovar' => 'Aprovar',
        'cancelar' => 'Cancelar',
        'imprimir' => 'Imprimir',
        'gerenciar' => 'Gerenciar',
        'administrar' => 'Administrar',
    ];

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        $where = ['pa.idempresa=:company_id'];
        $params = ['company_id' => $companyId];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'pa.situacao=:status';
            $params['status'] = (int) $filters['status'];
        }
        if (($filters['type'] ?? '') === 'system') $where[] = 'pa.escopo=1';
        if (($filters['type'] ?? '') === 'custom') $where[] = 'pa.escopo=2';
        if (!empty($filters['q'])) {
            $where[] = '(pa.nome ILIKE :q OR pa.descricao ILIKE :q OR EXISTS (
                SELECT 1 FROM perfil_permissao px JOIN permissao p ON p.idpermissao=px.idpermissao
                WHERE px.idempresa=pa.idempresa AND px.idperfil=pa.idperfil
                AND (p.modulo ILIKE :q OR p.acao ILIKE :q OR p.descricao ILIKE :q)
            ))';
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
        }

        $profiles = $this->all(
            "SELECT pa.idperfil,pa.nome,pa.descricao,pa.escopo,pa.situacao,pa.criado_em,pa.atualizado_em,
                    COALESCE(u.nome,'Sistema') criado_por,
                    COUNT(DISTINCT up.idusuario) usuarios,
                    COUNT(DISTINCT pp.idpermissao) permissoes,
                    COUNT(DISTINCT up.idfilial) FILTER (WHERE up.idfilial IS NOT NULL) filiais,
                    MAX(a.criado_em) ultima_alteracao
             FROM perfil_acesso pa
             LEFT JOIN usuario_perfil up ON up.idempresa=pa.idempresa AND up.idperfil=pa.idperfil
             LEFT JOIN perfil_permissao pp ON pp.idempresa=pa.idempresa AND pp.idperfil=pa.idperfil
             LEFT JOIN auditoria a ON a.idempresa=pa.idempresa AND a.tabela='perfil_acesso' AND a.registro_id=pa.idperfil
             LEFT JOIN LATERAL (
                SELECT au.nome FROM auditoria aa JOIN usuario au ON au.idempresa=aa.idempresa AND au.idusuario=aa.idusuario
                WHERE aa.idempresa=pa.idempresa AND aa.tabela='perfil_acesso' AND aa.registro_id=pa.idperfil
                ORDER BY aa.criado_em ASC LIMIT 1
             ) u ON true
             WHERE " . implode(' AND ', $where) . "
             GROUP BY pa.idperfil,u.nome
             ORDER BY pa.situacao DESC, usuarios DESC, pa.nome",
            $params
        );

        if (($filters['users'] ?? '') === 'with') $profiles = array_values(array_filter($profiles, fn ($profile) => (int) $profile['usuarios'] > 0));
        if (($filters['users'] ?? '') === 'without') $profiles = array_values(array_filter($profiles, fn ($profile) => (int) $profile['usuarios'] === 0));

        return [
            'profiles' => array_map(fn ($profile) => $this->normalizeProfile($profile), $profiles),
            'metrics' => $this->metrics($companyId),
            'catalog' => $this->catalog(),
            'options' => [
                'branches' => $this->all('SELECT idfilial id,nome FROM filial WHERE idempresa=:company_id AND situacao=1 ORDER BY matriz DESC,nome', ['company_id' => $companyId]),
            ],
        ];
    }

    public function show(int $companyId, int $profileId): ?array
    {
        $profile = $this->one(
            "SELECT pa.idperfil,pa.nome,pa.descricao,pa.escopo,pa.situacao,pa.criado_em,pa.atualizado_em,
                    COUNT(DISTINCT up.idusuario) usuarios,
                    COUNT(DISTINCT pp.idpermissao) permissoes
             FROM perfil_acesso pa
             LEFT JOIN usuario_perfil up ON up.idempresa=pa.idempresa AND up.idperfil=pa.idperfil
             LEFT JOIN perfil_permissao pp ON pp.idempresa=pa.idempresa AND pp.idperfil=pa.idperfil
             WHERE pa.idempresa=:company_id AND pa.idperfil=:profile_id
             GROUP BY pa.idperfil",
            ['company_id' => $companyId, 'profile_id' => $profileId]
        );
        if (!$profile) return null;
        $permissionRows = $this->all(
            'SELECT p.idpermissao,p.modulo,p.acao,p.descricao
             FROM perfil_permissao pp JOIN permissao p ON p.idpermissao=pp.idpermissao
             WHERE pp.idempresa=:company_id AND pp.idperfil=:profile_id
             ORDER BY p.modulo,p.acao',
            ['company_id' => $companyId, 'profile_id' => $profileId]
        );
        $users = $this->all(
            "SELECT u.idusuario,u.nome,u.email,u.situacao,u.ultimo_login,
                    COALESCE(c.nome,'Sem cargo') cargo,COALESCE(f.nome,'Todas as filiais') filial
             FROM usuario_perfil up
             JOIN usuario u ON u.idempresa=up.idempresa AND u.idusuario=up.idusuario
             LEFT JOIN filial f ON f.idempresa=up.idempresa AND f.idfilial=COALESCE(up.idfilial,u.idfilial_padrao)
             LEFT JOIN funcionario fn ON fn.idempresa=u.idempresa AND fn.idfuncionario=u.idfuncionario
             LEFT JOIN cargo c ON c.idempresa=fn.idempresa AND c.idcargo=fn.idcargo
             WHERE up.idempresa=:company_id AND up.idperfil=:profile_id
             ORDER BY u.nome",
            ['company_id' => $companyId, 'profile_id' => $profileId]
        );
        $history = $this->all(
            "SELECT a.idauditoria,a.acao,a.valores_anteriores,a.valores_novos,a.ip,a.criado_em,COALESCE(u.nome,'Sistema') usuario
             FROM auditoria a LEFT JOIN usuario u ON u.idempresa=a.idempresa AND u.idusuario=a.idusuario
             WHERE a.idempresa=:company_id AND a.tabela='perfil_acesso' AND a.registro_id=:profile_id
             ORDER BY a.criado_em DESC LIMIT 30",
            ['company_id' => $companyId, 'profile_id' => $profileId]
        );
        return [
            ...$this->normalizeProfile($profile),
            'permissions' => array_map(fn ($row) => ['modulo' => $row['modulo'], 'acao' => $row['acao'], 'idpermissao' => (int) $row['idpermissao'], 'descricao' => $row['descricao']], $permissionRows),
            'users' => $users,
            'history' => $history,
        ];
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->pdo->beginTransaction();
        try {
            $statement = $this->pdo->prepare(
                'INSERT INTO perfil_acesso (idempresa,nome,descricao,escopo,situacao)
                 VALUES (:company_id,:name,:description,2,1) RETURNING idperfil'
            );
            $statement->execute([
                'company_id' => $companyId,
                'name' => trim((string) $data['nome']),
                'description' => $data['descricao'] ?? null,
            ]);
            $profileId = (int) $statement->fetchColumn();
            $this->syncPermissions($companyId, $profileId, $data['permissions'] ?? []);
            $this->audit($companyId, $actorId, $profileId, 'criar', null, ['nome' => $data['nome']], $ip, $agent);
            $this->pdo->commit();
            return $profileId;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            if ($exception->getCode() === '23505') throw new InvalidArgumentException('Ja existe um perfil com este nome');
            throw $exception;
        }
    }

    public function update(int $companyId, int $actorId, int $profileId, array $data, ?string $ip, ?string $agent): void
    {
        $this->pdo->beginTransaction();
        try {
            $before = $this->show($companyId, $profileId);
            if (!$before) throw new InvalidArgumentException('Perfil nao encontrado');
            $statement = $this->pdo->prepare(
                'UPDATE perfil_acesso SET nome=:name,descricao=:description,atualizado_em=CURRENT_TIMESTAMP
                 WHERE idempresa=:company_id AND idperfil=:profile_id'
            );
            $statement->execute([
                'name' => trim((string) $data['nome']),
                'description' => $data['descricao'] ?? null,
                'company_id' => $companyId,
                'profile_id' => $profileId,
            ]);
            $this->syncPermissions($companyId, $profileId, $data['permissions'] ?? []);
            $this->audit($companyId, $actorId, $profileId, 'editar', ['permissoes' => count($before['permissions'])], ['permissoes' => count($data['permissions'] ?? [])], $ip, $agent);
            $this->pdo->commit();
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            if ($exception->getCode() === '23505') throw new InvalidArgumentException('Ja existe um perfil com este nome');
            throw $exception;
        }
    }

    public function duplicate(int $companyId, int $actorId, int $profileId, string $name, ?string $ip, ?string $agent): int
    {
        $source = $this->show($companyId, $profileId);
        if (!$source) throw new InvalidArgumentException('Perfil nao encontrado');
        $newName = $name !== '' ? $name : $source['nome'] . ' - Copia';
        return $this->create($companyId, $actorId, ['nome' => $newName, 'descricao' => $source['descricao'], 'permissions' => $source['permissions']], $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $profileId, int $status, ?string $ip, ?string $agent): void
    {
        $statement = $this->pdo->prepare('UPDATE perfil_acesso SET situacao=:status,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idperfil=:profile_id');
        $statement->execute(['status' => $status, 'company_id' => $companyId, 'profile_id' => $profileId]);
        if (!$statement->rowCount()) throw new InvalidArgumentException('Perfil nao encontrado');
        $this->audit($companyId, $actorId, $profileId, $status ? 'ativar' : 'desativar', null, ['situacao' => $status], $ip, $agent);
    }

    private function syncPermissions(int $companyId, int $profileId, array $permissions): void
    {
        $this->pdo->prepare('DELETE FROM perfil_permissao WHERE idempresa=:company_id AND idperfil=:profile_id')
            ->execute(['company_id' => $companyId, 'profile_id' => $profileId]);
        $insert = $this->pdo->prepare('INSERT INTO perfil_permissao (idempresa,idperfil,idpermissao) VALUES (:company_id,:profile_id,:permission_id) ON CONFLICT DO NOTHING');
        foreach ($permissions as $permission) {
            if (!is_array($permission) || empty($permission['modulo']) || empty($permission['acao'])) continue;
            $permissionId = $this->ensurePermission((string) $permission['modulo'], (string) $permission['acao']);
            $insert->execute(['company_id' => $companyId, 'profile_id' => $profileId, 'permission_id' => $permissionId]);
        }
    }

    private function ensurePermission(string $module, string $action): int
    {
        $statement = $this->pdo->prepare(
            'INSERT INTO permissao (modulo,acao,descricao)
             VALUES (:module,:action,:description)
             ON CONFLICT (modulo,acao) DO UPDATE SET descricao=COALESCE(permissao.descricao,EXCLUDED.descricao)
             RETURNING idpermissao'
        );
        $statement->execute([
            'module' => $module,
            'action' => $action,
            'description' => (self::ACTIONS[$action] ?? ucfirst($action)) . ' ' . strtolower(self::MODULES[$module] ?? $module),
        ]);
        return (int) $statement->fetchColumn();
    }

    private function catalog(): array
    {
        $existing = $this->all('SELECT idpermissao,modulo,acao,descricao FROM permissao ORDER BY modulo,acao', []);
        $byKey = [];
        foreach ($existing as $row) $byKey[$row['modulo'] . ':' . $row['acao']] = $row;
        $modules = [];
        foreach (self::MODULES as $module => $label) {
            $actions = [];
            foreach (self::ACTIONS as $action => $actionLabel) {
                $row = $byKey[$module . ':' . $action] ?? null;
                $actions[] = ['modulo' => $module, 'acao' => $action, 'label' => $actionLabel, 'idpermissao' => $row ? (int) $row['idpermissao'] : null, 'descricao' => $row['descricao'] ?? "{$actionLabel} {$label}"];
            }
            $modules[] = ['modulo' => $module, 'label' => $label, 'actions' => $actions];
        }
        return ['modules' => $modules, 'actions' => self::ACTIONS];
    }

    private function metrics(int $companyId): array
    {
        $base = $this->one(
            "SELECT COUNT(*) profiles,
                    COUNT(*) FILTER (WHERE escopo=2) custom_profiles,
                    COUNT(DISTINCT up.idusuario) linked_users,
                    COUNT(DISTINCT up.idfilial) FILTER (WHERE up.idfilial IS NOT NULL) branches
             FROM perfil_acesso pa LEFT JOIN usuario_perfil up ON up.idempresa=pa.idempresa AND up.idperfil=pa.idperfil
             WHERE pa.idempresa=:company_id",
            ['company_id' => $companyId]
        );
        $top = $this->one(
            "SELECT pa.nome,COUNT(DISTINCT up.idusuario) users
             FROM perfil_acesso pa LEFT JOIN usuario_perfil up ON up.idempresa=pa.idempresa AND up.idperfil=pa.idperfil
             WHERE pa.idempresa=:company_id GROUP BY pa.idperfil ORDER BY users DESC,pa.nome LIMIT 1",
            ['company_id' => $companyId]
        );
        return [
            'profiles' => (int) ($base['profiles'] ?? 0),
            'linked_users' => (int) ($base['linked_users'] ?? 0),
            'permissions' => count(self::MODULES) * count(self::ACTIONS),
            'branches' => (int) ($base['branches'] ?? 0),
            'top_profile' => $top['nome'] ?? '-',
            'custom_profiles' => (int) ($base['custom_profiles'] ?? 0),
        ];
    }

    private function normalizeProfile(array $profile): array
    {
        return [
            ...$profile,
            'idperfil' => (int) $profile['idperfil'],
            'escopo' => (int) $profile['escopo'],
            'situacao' => (int) $profile['situacao'],
            'usuarios' => (int) ($profile['usuarios'] ?? 0),
            'permissoes' => (int) ($profile['permissoes'] ?? 0),
            'filiais' => (int) ($profile['filiais'] ?? 0),
        ];
    }

    private function audit(int $companyId, int $actorId, int $profileId, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa,idusuario,origem_usuario,tabela,registro_id,acao,valores_anteriores,valores_novos,ip,dispositivo)
             VALUES (:company_id,:actor_id,'empresa','perfil_acesso',:profile_id,:action,:before::jsonb,:after::jsonb,:ip,:device)"
        )->execute([
            'company_id' => $companyId, 'actor_id' => $actorId, 'profile_id' => $profileId,
            'action' => $action, 'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null, 'ip' => $ip,
            'device' => $agent ? substr($agent, 0, 150) : null,
        ]);
    }

    private function one(string $sql, array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetch(PDO::FETCH_ASSOC)?:[]; }
    private function all(string $sql, array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetchAll(PDO::FETCH_ASSOC); }
}
