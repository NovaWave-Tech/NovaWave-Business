<?php

namespace App\Modules\Customers\Services;

use App\Modules\Customers\Repositories\CustomerRepository;
use InvalidArgumentException;

final class CustomerService
{
    public function __construct(private readonly CustomerRepository $repository = new CustomerRepository()) {}

    public function index(int $companyId, array $filters): array { return $this->repository->index($companyId, $filters); }

    public function show(int $companyId, int $customerId): array
    {
        $customer = $this->repository->show($companyId, $customerId);
        if (!$customer) throw new InvalidArgumentException('Cliente nao encontrado');
        return $customer;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->validate($data);
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function update(int $companyId, int $actorId, int $customerId, array $data, ?string $ip, ?string $agent): void
    {
        $this->validate($data);
        $this->repository->update($companyId, $actorId, $customerId, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $customerId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [0, 1], true)) throw new InvalidArgumentException('Situacao invalida');
        $this->repository->setStatus($companyId, $actorId, $customerId, $status, $ip, $agent);
    }

    public function addNote(int $companyId, int $actorId, int $customerId, string $note, ?string $ip, ?string $agent): void
    {
        $note = trim($note);
        if (strlen($note) < 3 || strlen($note) > 1000) throw new InvalidArgumentException('A observacao deve possuir entre 3 e 1000 caracteres');
        $this->repository->addNote($companyId, $actorId, $customerId, $note, $ip, $agent);
    }

    private function validate(array $data): void
    {
        $type = (int) ($data['tipo_pessoa'] ?? 0);
        if (!in_array($type, [1, 2], true)) throw new InvalidArgumentException('Tipo de pessoa invalido');
        if (strlen(trim((string) ($data['nome'] ?? ''))) < 3) throw new InvalidArgumentException('Nome e obrigatorio');
        $document = preg_replace('/\D/', '', (string) ($data['documento'] ?? ''));
        if (($type === 1 && !$this->validCpf($document)) || ($type === 2 && !$this->validCnpj($document))) throw new InvalidArgumentException($type === 1 ? 'CPF invalido' : 'CNPJ invalido');
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) throw new InvalidArgumentException('E-mail invalido');
        if (isset($data['limite_credito']) && (float) $data['limite_credito'] < 0) throw new InvalidArgumentException('Limite de credito invalido');
        if (!empty($data['estado']) && strlen(trim((string) $data['estado'])) !== 2) throw new InvalidArgumentException('Estado deve usar a sigla com 2 letras');
    }

    private function validCpf(string $value): bool
    {
        if (strlen($value) !== 11 || preg_match('/^(\d)\1{10}$/', $value)) return false;
        for ($digit = 9; $digit < 11; $digit++) { $sum = 0; for ($i = 0; $i < $digit; $i++) $sum += (int) $value[$i] * (($digit + 1) - $i); $check = (10 * $sum) % 11; if ($check === 10) $check = 0; if ($check !== (int) $value[$digit]) return false; }
        return true;
    }

    private function validCnpj(string $value): bool
    {
        if (strlen($value) !== 14 || preg_match('/^(\d)\1{13}$/', $value)) return false;
        foreach ([12, 13] as $length) { $sum = 0; $weight = $length - 7; for ($i = 0; $i < $length; $i++) { $sum += (int) $value[$i] * $weight--; if ($weight < 2) $weight = 9; } $check = $sum % 11 < 2 ? 0 : 11 - ($sum % 11); if ($check !== (int) $value[$length]) return false; }
        return true;
    }
}
