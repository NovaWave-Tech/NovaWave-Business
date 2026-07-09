<?php

namespace App\Modules\Sales\Services;

use App\Modules\Sales\Repositories\SalesRepository;
use InvalidArgumentException;

final class SalesService
{
    public function __construct(private readonly SalesRepository $repository = new SalesRepository()) {}

    public function index(int $companyId, array $filters): array
    {
        return $this->repository->index($companyId, $filters);
    }

    public function show(int $companyId, int $saleId): array
    {
        $sale = $this->repository->show($companyId, $saleId);
        if (!$sale) {
            throw new InvalidArgumentException('Venda nao encontrada');
        }
        return $sale;
    }

    public function receipt(int $companyId, int $saleId): array
    {
        $receipt = $this->repository->receipt($companyId, $saleId);
        if (!$receipt) {
            throw new InvalidArgumentException('Venda nao encontrada');
        }
        return $receipt;
    }

    public const PAYMENT_METHODS = ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'boleto', 'transferencia'];
    /** Formas aceitas na cobranca das parcelas da venda a prazo (crediario). */
    public const CREDIT_METHODS = ['dinheiro', 'pix', 'boleto', 'transferencia'];

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        if ((int) ($data['idfilial'] ?? 0) <= 0) {
            throw new InvalidArgumentException('Selecione a filial da venda');
        }
        if (empty($data['items']) || !is_array($data['items'])) {
            throw new InvalidArgumentException('Adicione ao menos um produto a venda');
        }
        $payment = strtolower(trim((string) ($data['forma_pagamento'] ?? 'dinheiro')));
        if (!in_array($payment, self::PAYMENT_METHODS, true)) {
            throw new InvalidArgumentException('Forma de pagamento invalida');
        }
        $onCredit = !empty($data['a_prazo']);
        if ($onCredit && !in_array($payment, self::CREDIT_METHODS, true)) {
            throw new InvalidArgumentException('Cartao nao se aplica a venda a prazo. Use dinheiro, PIX, boleto ou transferencia.');
        }
        $installments = (int) ($data['parcelas'] ?? 1);
        if ($installments < 1 || $installments > 24) {
            throw new InvalidArgumentException('Parcelas devem estar entre 1 e 24');
        }
        // Parcelamento so no crediario (a prazo) ou no cartao de credito.
        if ($installments > 1 && !$onCredit && $payment !== 'cartao_credito') {
            throw new InvalidArgumentException('Somente cartao de credito ou venda a prazo permitem parcelamento');
        }
        $lateFee = (float) ($data['juros_atraso'] ?? 0);
        if ($lateFee < 0 || $lateFee > 100) {
            throw new InvalidArgumentException('Juros por atraso deve estar entre 0 e 100 (% ao mes)');
        }
        $data['forma_pagamento'] = $payment;
        $data['juros_atraso'] = $onCredit ? $lateFee : 0;
        return $this->repository->create($companyId, $actorId, $data, $ip, $agent);
    }

    public function setStatus(int $companyId, int $actorId, int $saleId, int $status, ?string $ip, ?string $agent): void
    {
        if (!in_array($status, [1, 4], true)) {
            throw new InvalidArgumentException('Situacao invalida');
        }
        $this->repository->setStatus($companyId, $actorId, $saleId, $status, $ip, $agent);
    }
}
