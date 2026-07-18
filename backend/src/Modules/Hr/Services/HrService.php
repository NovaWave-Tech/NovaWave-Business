<?php

namespace App\Modules\Hr\Services;

use App\Modules\Hr\Repositories\HrRepository;
use InvalidArgumentException;

final class HrService
{
    private readonly HrRepository $repository;

    public function __construct(?HrRepository $repository = null)
    {
        $this->repository = $repository ?? new HrRepository();
    }

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $id): array
    {
        $employee = $this->repository->show($companyId, $id);
        if (!$employee) {
            throw new InvalidArgumentException('Funcionario nao encontrado');
        }
        return $employee;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->validateEmployee($data);
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function update(int $companyId, int $actorId, int $id, array $data, ?string $ip, ?string $agent): void
    {
        $this->validateEmployee($data);
        $this->repository->update($companyId, $actorId, $id, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $id, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [0, 1], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
        $this->repository->setStatus($companyId, $actorId, $id, $status, $ip, $agent);
    }

    public function saveDepartment(int $companyId, int $actorId, ?int $id, array $data, ?string $ip, ?string $agent): array
    {
        $this->validateName($data['nome'] ?? '', 'Departamento');
        return ['iddepartamento' => $this->repository->saveDepartment($companyId, $actorId, $id, $data, $ip, $agent)];
    }

    public function savePosition(int $companyId, int $actorId, ?int $id, array $data, ?string $ip, ?string $agent): array
    {
        $this->validateName($data['nome'] ?? '', 'Cargo');
        if ((float) ($data['salario_base'] ?? 0) < 0) {
            throw new InvalidArgumentException('Salario base nao pode ser negativo');
        }
        return ['idcargo' => $this->repository->savePosition($companyId, $actorId, $id, $data, $ip, $agent)];
    }

    public function setStructureStatus(int $companyId, int $actorId, string $entity, int $id, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [0, 1], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
        $this->repository->setStructureStatus($companyId, $actorId, $entity, $id, $status, $ip, $agent);
    }

    private function validateEmployee(array $data): void
    {
        if (mb_strlen(trim((string) ($data['nome'] ?? ''))) < 3) {
            throw new InvalidArgumentException('Nome e obrigatorio (min. 3 caracteres)');
        }
        if (empty($data['idfilial'])) {
            throw new InvalidArgumentException('Filial e obrigatoria');
        }
        $cpf = preg_replace('/\D/', '', (string) ($data['cpf'] ?? ''));
        if ($cpf !== '' && !$this->isValidCpf($cpf)) {
            throw new InvalidArgumentException('CPF invalido');
        }
        $email = trim((string) ($data['email'] ?? ''));
        if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('E-mail invalido');
        }
        if ((float) ($data['salario'] ?? 0) < 0) {
            throw new InvalidArgumentException('Salario nao pode ser negativo');
        }
        $admission = $data['data_admissao'] ?? null;
        $dismissal = $data['data_demissao'] ?? null;
        if ($admission && $dismissal && $dismissal < $admission) {
            throw new InvalidArgumentException('Demissao nao pode ser anterior a admissao');
        }
    }

    private function validateName(string $name, string $label): void
    {
        if (mb_strlen(trim($name)) < 2) {
            throw new InvalidArgumentException($label . ': informe um nome com ao menos 2 caracteres');
        }
    }

    private function isValidCpf(string $cpf): bool
    {
        if (strlen($cpf) !== 11 || preg_match('/^(\d)\1{10}$/', $cpf)) {
            return false;
        }
        for ($position = 9; $position < 11; $position++) {
            $sum = 0;
            for ($index = 0; $index < $position; $index++) {
                $sum += (int) $cpf[$index] * (($position + 1) - $index);
            }
            $remainder = ($sum * 10) % 11;
            $check = $remainder === 10 ? 0 : $remainder;
            if ($check !== (int) $cpf[$position]) {
                return false;
            }
        }
        return true;
    }
}
