<?php

namespace App\Modules\Companies\Services;

use App\Modules\Companies\Repositories\CompanyRepository;
use InvalidArgumentException;

final class CompanyService
{
    public function __construct(private readonly CompanyRepository $repository = new CompanyRepository()) {}

    public function show(int $companyId): array
    {
        $company = $this->repository->show($companyId);
        if (!$company) {
            throw new InvalidArgumentException('Empresa nao encontrada');
        }
        return $company;
    }

    public function update(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): void
    {
        if (strlen(trim((string) ($data['razao_social'] ?? ''))) < 3) {
            throw new InvalidArgumentException('Razao social e obrigatoria');
        }
        if (strlen(trim((string) ($data['nome_fantasia'] ?? ''))) < 2) {
            throw new InvalidArgumentException('Nome fantasia e obrigatorio');
        }
        $cnpj = preg_replace('/\D/', '', (string) ($data['cnpj'] ?? ''));
        if ($cnpj !== '' && strlen($cnpj) !== 14) {
            throw new InvalidArgumentException('CNPJ invalido');
        }
        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('E-mail invalido');
        }
        if (!empty($data['estado']) && strlen(trim((string) $data['estado'])) !== 2) {
            throw new InvalidArgumentException('Estado deve usar a sigla com 2 letras');
        }
        $this->repository->update($companyId, $actorId, $data, $ip, $agent);
    }
}
