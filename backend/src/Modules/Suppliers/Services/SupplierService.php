<?php

namespace App\Modules\Suppliers\Services;

use App\Modules\Suppliers\Repositories\SupplierRepository;
use InvalidArgumentException;

final class SupplierService
{
    public function __construct(private readonly SupplierRepository $repository = new SupplierRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $supplierId): array
    {
        $supplier = $this->repository->show($companyId, $supplierId);
        if (!$supplier) {
            throw new InvalidArgumentException('Fornecedor nao encontrado');
        }
        return $supplier;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        $this->validate($data);
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function update(int $companyId, int $actorId, int $supplierId, array $data, ?string $ip, ?string $agent): void
    {
        $this->validate($data);
        $this->repository->update($companyId, $actorId, $supplierId, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $supplierId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [0, 1], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
        $this->repository->setStatus($companyId, $actorId, $supplierId, $status, $ip, $agent);
    }

    private function validate(array $data): void
    {
        if (strlen(trim((string) ($data['razao_social'] ?? ''))) < 3) {
            throw new InvalidArgumentException('Razao social e obrigatoria');
        }
        $document = preg_replace('/\D/', '', (string) ($data['documento'] ?? ''));
        if ($document !== '' && !in_array(strlen($document), [11, 14], true)) {
            throw new InvalidArgumentException('Documento deve ser um CPF ou CNPJ valido');
        }
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('E-mail invalido');
        }
        if (!empty($data['estado']) && strlen(trim((string) $data['estado'])) !== 2) {
            throw new InvalidArgumentException('Estado deve usar a sigla com 2 letras');
        }
    }
}
