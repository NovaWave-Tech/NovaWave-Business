<?php

namespace App\Modules\Companies\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class CompanyRepository
{
    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    public function show(int $companyId): ?array
    {
        $company = $this->one(
            'SELECT idempresa, razao_social, nome_fantasia, cnpj, inscricao_estadual, email, telefone,
                    cep, endereco, numero, complemento, bairro, cidade, estado,
                    logo_url, timezone, moeda, idioma, situacao, criado_em, atualizado_em
             FROM empresa WHERE idempresa = :company_id',
            ['company_id' => $companyId]
        );
        if (!$company) {
            return null;
        }
        $stats = $this->one(
            "SELECT (SELECT COUNT(*) FROM filial WHERE idempresa = :company_id AND situacao = 1) branches,
                    (SELECT COUNT(*) FROM usuario WHERE idempresa = :company_id AND situacao = 1) users,
                    (SELECT COUNT(*) FROM cliente WHERE idempresa = :company_id) customers,
                    (SELECT COUNT(*) FROM produto WHERE idempresa = :company_id) products",
            ['company_id' => $companyId]
        );
        return [
            ...$company,
            'idempresa' => (int) $company['idempresa'],
            'situacao' => (int) $company['situacao'],
            'stats' => [
                'branches' => (int) ($stats['branches'] ?? 0),
                'users' => (int) ($stats['users'] ?? 0),
                'customers' => (int) ($stats['customers'] ?? 0),
                'products' => (int) ($stats['products'] ?? 0),
            ],
        ];
    }

    public function update(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): void
    {
        try {
            $nullable = fn (string $key) => (isset($data[$key]) && trim((string) $data[$key]) !== '') ? trim((string) $data[$key]) : null;
            $this->pdo->prepare(
                'UPDATE empresa SET razao_social = :corporate_name, nome_fantasia = :trade_name, cnpj = :cnpj,
                        inscricao_estadual = :state_registration, email = :email, telefone = :phone,
                        cep = :cep, endereco = :address, numero = :number, complemento = :complement,
                        bairro = :district, cidade = :city, estado = :state,
                        timezone = :timezone, moeda = :currency, idioma = :language,
                        atualizado_em = CURRENT_TIMESTAMP
                 WHERE idempresa = :company_id'
            )->execute([
                'corporate_name' => trim((string) $data['razao_social']),
                'trade_name' => trim((string) $data['nome_fantasia']),
                'cnpj' => preg_replace('/\D/', '', (string) ($data['cnpj'] ?? '')) ?: null,
                'state_registration' => $nullable('inscricao_estadual'),
                'email' => $nullable('email'),
                'phone' => preg_replace('/\D/', '', (string) ($data['telefone'] ?? '')) ?: null,
                'cep' => preg_replace('/\D/', '', (string) ($data['cep'] ?? '')) ?: null,
                'address' => $nullable('endereco'),
                'number' => $nullable('numero'),
                'complement' => $nullable('complemento'),
                'district' => $nullable('bairro'),
                'city' => $nullable('cidade'),
                'state' => !empty($data['estado']) ? strtoupper(trim((string) $data['estado'])) : null,
                'timezone' => $nullable('timezone') ?? 'America/Sao_Paulo',
                'currency' => $nullable('moeda') ?? 'BRL',
                'language' => $nullable('idioma') ?? 'pt-BR',
                'company_id' => $companyId,
            ]);
            $this->audit($companyId, $actorId, 'editar', ['razao_social' => $data['razao_social']], $ip, $agent);
        } catch (Throwable $exception) {
            if ($exception->getCode() === '23505') {
                throw new InvalidArgumentException('Ja existe uma empresa com este CNPJ');
            }
            throw $exception;
        }
    }

    private function audit(int $companyId, int $actorId, string $action, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare(
            "INSERT INTO auditoria (idempresa, idusuario, origem_usuario, tabela, registro_id, acao, valores_novos, ip, dispositivo)
             VALUES (:company_id, :actor, 'empresa', 'empresa', :company_id, :action, :after::jsonb, :ip, :device)"
        )->execute([
            'company_id' => $companyId,
            'actor' => $actorId,
            'action' => $action,
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
