<?php

namespace App\Modules\Hr\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;

/**
 * RH: funcionarios, cargos e departamentos de uma empresa.
 * Hierarquia: departamento -> cargo -> funcionario (lotado numa filial).
 */
final class HrRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function index(int $companyId, array $filters): array
    {
        $where = ['f.idempresa = :company_id'];
        $params = ['company_id' => $companyId];
        if (($filters['status'] ?? '') !== '') {
            $where[] = 'f.situacao = :status';
            $params['status'] = (int) $filters['status'];
        }
        if (($filters['department'] ?? '') !== '') {
            $where[] = 'c.iddepartamento = :department';
            $params['department'] = (int) $filters['department'];
        }
        if (($filters['branch'] ?? '') !== '') {
            $where[] = 'f.idfilial = :branch';
            $params['branch'] = (int) $filters['branch'];
        }
        if (!empty($filters['q'])) {
            $where[] = '(f.nome ILIKE :q OR f.email ILIKE :q OR f.cpf LIKE :digits)';
            $params['q'] = '%' . trim((string) $filters['q']) . '%';
            $params['digits'] = '%' . preg_replace('/\D/', '', (string) $filters['q']) . '%';
        }

        $employees = $this->all(
            "SELECT f.idfuncionario, f.nome, f.cpf, f.email, f.telefone, f.salario,
                    f.data_admissao, f.data_demissao, f.data_nascimento, f.situacao,
                    f.idfilial, fi.nome AS filial, f.idcargo, ca.nome AS cargo,
                    ca.iddepartamento, de.nome AS departamento
             FROM funcionario f
             JOIN filial fi ON fi.idempresa = f.idempresa AND fi.idfilial = f.idfilial
             LEFT JOIN cargo ca ON ca.idempresa = f.idempresa AND ca.idcargo = f.idcargo
             LEFT JOIN departamento de ON de.idempresa = f.idempresa AND de.iddepartamento = ca.iddepartamento
             WHERE " . implode(' AND ', $where) . '
             ORDER BY f.situacao DESC, f.nome
             LIMIT 500',
            $params
        );

        $metrics = $this->one(
            "SELECT COUNT(*) FILTER (WHERE situacao = 1) AS ativos,
                    COUNT(*) FILTER (WHERE situacao = 0) AS inativos,
                    COALESCE(SUM(salario) FILTER (WHERE situacao = 1), 0) AS folha,
                    COUNT(*) FILTER (WHERE situacao = 1 AND data_admissao >= date_trunc('month', CURRENT_DATE)) AS admitidos_mes
             FROM funcionario WHERE idempresa = :company_id",
            ['company_id' => $companyId]
        );

        return [
            'employees' => array_map(fn ($row) => $this->normalizeEmployee($row), $employees),
            'metrics' => [
                'ativos' => (int) $metrics['ativos'],
                'inativos' => (int) $metrics['inativos'],
                'folha' => (float) $metrics['folha'],
                'admitidos_mes' => (int) $metrics['admitidos_mes'],
            ],
            'options' => $this->options($companyId),
        ];
    }

    public function show(int $companyId, int $id): ?array
    {
        $employee = $this->one(
            "SELECT f.*, fi.nome AS filial, ca.nome AS cargo, ca.iddepartamento, de.nome AS departamento
             FROM funcionario f
             JOIN filial fi ON fi.idempresa = f.idempresa AND fi.idfilial = f.idfilial
             LEFT JOIN cargo ca ON ca.idempresa = f.idempresa AND ca.idcargo = f.idcargo
             LEFT JOIN departamento de ON de.idempresa = f.idempresa AND de.iddepartamento = ca.iddepartamento
             WHERE f.idempresa = :company_id AND f.idfuncionario = :id",
            ['company_id' => $companyId, 'id' => $id]
        );
        if (!$employee) {
            return null;
        }
        $employee['history'] = $this->all(
            "SELECT idauditoria, acao, criado_em FROM auditoria
             WHERE idempresa = :company_id AND tabela = 'funcionario' AND registro_id = :id
             ORDER BY criado_em DESC LIMIT 20",
            ['company_id' => $companyId, 'id' => $id]
        );
        return $this->normalizeEmployee($employee) + ['history' => $employee['history']];
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->assertReferences($companyId, $data);
        $s = $this->pdo->prepare(
            'INSERT INTO funcionario (idempresa, idfilial, idcargo, nome, cpf, email, telefone, salario, data_admissao, data_demissao, data_nascimento, situacao)
             VALUES (:company_id, :branch, :position, :name, :cpf, :email, :phone, :salary, :admission, :dismissal, :birth, :status)
             RETURNING idfuncionario'
        );
        $s->execute($this->params($companyId, $data));
        $id = (int) $s->fetchColumn();
        $this->audit($companyId, $actorId, 'funcionario', $id, 'criar', null, ['nome' => $data['nome']], $ip, $agent);
        return $id;
    }

    public function update(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        $before = $this->one('SELECT nome, salario, idcargo FROM funcionario WHERE idempresa = :company_id AND idfuncionario = :id', ['company_id' => $companyId, 'id' => $id]);
        if (!$before) {
            throw new InvalidArgumentException('Funcionario nao encontrado');
        }
        $this->assertReferences($companyId, $data);
        $this->pdo->prepare(
            'UPDATE funcionario SET idfilial = :branch, idcargo = :position, nome = :name, cpf = :cpf,
                    email = :email, telefone = :phone, salario = :salary, data_admissao = :admission,
                    data_demissao = :dismissal, data_nascimento = :birth, situacao = :status, atualizado_em = CURRENT_TIMESTAMP
             WHERE idempresa = :company_id AND idfuncionario = :id'
        )->execute($this->params($companyId, $data) + ['id' => $id]);
        $this->audit($companyId, $actorId, 'funcionario', $id, 'editar', $before, ['nome' => $data['nome']], $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $id, int $status, ?string $ip, ?string $agent): void
    {
        $s = $this->pdo->prepare('UPDATE funcionario SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idfuncionario = :id');
        $s->execute(['status' => $status, 'company_id' => $companyId, 'id' => $id]);
        if (!$s->rowCount()) {
            throw new InvalidArgumentException('Funcionario nao encontrado');
        }
        $this->audit($companyId, $actorId, 'funcionario', $id, $status ? 'ativar' : 'inativar', null, ['situacao' => $status], $ip, $agent);
    }

    // --- Departamentos e cargos ---------------------------------------------

    public function saveDepartment(int $companyId, int $actorId, ?int $id, array $data, ?string $ip, ?string $agent): int
    {
        $name = trim((string) ($data['nome'] ?? ''));
        $description = ($data['descricao'] ?? '') !== '' ? trim((string) $data['descricao']) : null;
        if ($id) {
            $s = $this->pdo->prepare('UPDATE departamento SET nome = :name, descricao = :description, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND iddepartamento = :id');
            $s->execute(['name' => $name, 'description' => $description, 'company_id' => $companyId, 'id' => $id]);
            if (!$s->rowCount()) {
                throw new InvalidArgumentException('Departamento nao encontrado');
            }
            $this->audit($companyId, $actorId, 'departamento', $id, 'editar', null, ['nome' => $name], $ip, $agent);
            return $id;
        }
        $s = $this->pdo->prepare('INSERT INTO departamento (idempresa, nome, descricao, situacao) VALUES (:company_id, :name, :description, 1) RETURNING iddepartamento');
        $s->execute(['company_id' => $companyId, 'name' => $name, 'description' => $description]);
        $newId = (int) $s->fetchColumn();
        $this->audit($companyId, $actorId, 'departamento', $newId, 'criar', null, ['nome' => $name], $ip, $agent);
        return $newId;
    }

    public function savePosition(int $companyId, int $actorId, ?int $id, array $data, ?string $ip, ?string $agent): int
    {
        $departmentId = !empty($data['iddepartamento']) ? (int) $data['iddepartamento'] : null;
        if ($departmentId !== null && !$this->one('SELECT 1 FROM departamento WHERE idempresa = :company_id AND iddepartamento = :id', ['company_id' => $companyId, 'id' => $departmentId])) {
            throw new InvalidArgumentException('Departamento invalido');
        }
        $params = [
            'company_id' => $companyId,
            'department' => $departmentId,
            'name' => trim((string) ($data['nome'] ?? '')),
            'description' => ($data['descricao'] ?? '') !== '' ? trim((string) $data['descricao']) : null,
            'salary' => max(0.0, (float) ($data['salario_base'] ?? 0)),
        ];
        if ($id) {
            $s = $this->pdo->prepare('UPDATE cargo SET iddepartamento = :department, nome = :name, descricao = :description, salario_base = :salary, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND idcargo = :id');
            $s->execute($params + ['id' => $id]);
            if (!$s->rowCount()) {
                throw new InvalidArgumentException('Cargo nao encontrado');
            }
            $this->audit($companyId, $actorId, 'cargo', $id, 'editar', null, ['nome' => $params['name']], $ip, $agent);
            return $id;
        }
        $s = $this->pdo->prepare('INSERT INTO cargo (idempresa, iddepartamento, nome, descricao, salario_base, situacao) VALUES (:company_id, :department, :name, :description, :salary, 1) RETURNING idcargo');
        $s->execute($params);
        $newId = (int) $s->fetchColumn();
        $this->audit($companyId, $actorId, 'cargo', $newId, 'criar', null, ['nome' => $params['name']], $ip, $agent);
        return $newId;
    }

    public function setStructureStatus(int $companyId, int $actorId, string $entity, int $id, int $status, ?string $ip, ?string $agent): void
    {
        [$table, $pk, $label] = match ($entity) {
            'departments' => ['departamento', 'iddepartamento', 'Departamento'],
            'positions' => ['cargo', 'idcargo', 'Cargo'],
            default => throw new InvalidArgumentException('Cadastro invalido'),
        };
        $s = $this->pdo->prepare("UPDATE $table SET situacao = :status, atualizado_em = CURRENT_TIMESTAMP WHERE idempresa = :company_id AND $pk = :id");
        $s->execute(['status' => $status, 'company_id' => $companyId, 'id' => $id]);
        if (!$s->rowCount()) {
            throw new InvalidArgumentException($label . ' nao encontrado');
        }
        $this->audit($companyId, $actorId, $table, $id, $status ? 'ativar' : 'inativar', null, ['situacao' => $status], $ip, $agent);
    }

    // --- Helpers -------------------------------------------------------------

    private function options(int $companyId): array
    {
        return [
            'branches' => $this->all('SELECT idfilial id, nome FROM filial WHERE idempresa = :company_id AND situacao = 1 ORDER BY matriz DESC, nome', ['company_id' => $companyId]),
            'departments' => $this->all('SELECT iddepartamento id, nome, descricao, situacao FROM departamento WHERE idempresa = :company_id ORDER BY nome', ['company_id' => $companyId]),
            'positions' => $this->all('SELECT idcargo id, nome, descricao, salario_base, iddepartamento, situacao FROM cargo WHERE idempresa = :company_id ORDER BY nome', ['company_id' => $companyId]),
        ];
    }

    private function params(int $companyId, array $data): array
    {
        $nullable = fn (string $key) => isset($data[$key]) && $data[$key] !== '' ? $data[$key] : null;
        return [
            'company_id' => $companyId,
            'branch' => (int) $data['idfilial'],
            'position' => !empty($data['idcargo']) ? (int) $data['idcargo'] : null,
            'name' => trim((string) $data['nome']),
            'cpf' => ($data['cpf'] ?? '') !== '' ? preg_replace('/\D/', '', (string) $data['cpf']) : null,
            'email' => $nullable('email'),
            'phone' => ($data['telefone'] ?? '') !== '' ? preg_replace('/\D/', '', (string) $data['telefone']) : null,
            'salary' => max(0.0, (float) ($data['salario'] ?? 0)),
            'admission' => $nullable('data_admissao'),
            'dismissal' => $nullable('data_demissao'),
            'birth' => $nullable('data_nascimento'),
            'status' => !isset($data['situacao']) || !empty($data['situacao']) ? 1 : 0,
        ];
    }

    private function assertReferences(int $companyId, array $data): void
    {
        if (!$this->one('SELECT 1 FROM filial WHERE idempresa = :company_id AND idfilial = :id AND situacao = 1', ['company_id' => $companyId, 'id' => (int) ($data['idfilial'] ?? 0)])) {
            throw new InvalidArgumentException('Filial invalida');
        }
        if (!empty($data['idcargo']) && !$this->one('SELECT 1 FROM cargo WHERE idempresa = :company_id AND idcargo = :id', ['company_id' => $companyId, 'id' => (int) $data['idcargo']])) {
            throw new InvalidArgumentException('Cargo invalido');
        }
    }

    private function normalizeEmployee(array $row): array
    {
        return [
            'idfuncionario' => (int) $row['idfuncionario'],
            'nome' => $row['nome'],
            'cpf' => $row['cpf'],
            'email' => $row['email'],
            'telefone' => $row['telefone'],
            'salario' => (float) $row['salario'],
            'data_admissao' => $row['data_admissao'],
            'data_demissao' => $row['data_demissao'],
            'data_nascimento' => $row['data_nascimento'],
            'situacao' => (int) $row['situacao'],
            'idfilial' => (int) $row['idfilial'],
            'filial' => $row['filial'],
            'idcargo' => $row['idcargo'] !== null ? (int) $row['idcargo'] : null,
            'cargo' => $row['cargo'],
            'iddepartamento' => $row['iddepartamento'] !== null ? (int) $row['iddepartamento'] : null,
            'departamento' => $row['departamento'],
        ];
    }

    private function audit(int $companyId, int $actorId, string $table, int $id, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_anteriores, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', :table, :id, :action, :before::jsonb, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'table' => $table,
            'id' => $id,
            'action' => $action,
            'before' => $before ? json_encode($before) : null,
            'after' => $after ? json_encode($after) : null,
            'ip' => $ip,
            'device' => $agent ? substr($agent, 0, 150) : null,
        ]);
    }

    private function one(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetch(PDO::FETCH_ASSOC) ?: [];
    }

    private function all(string $sql, array $params): array
    {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
