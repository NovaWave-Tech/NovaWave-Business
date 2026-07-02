<?php

namespace App\Modules\Products\Services;

use App\Modules\Products\Repositories\ProductRepository;
use InvalidArgumentException;

final class ProductService
{
    public function __construct(private readonly ProductRepository $repository = new ProductRepository()) {}
    public function index(int $companyId, array $filters): array { return $this->repository->index($companyId, $filters); }
    public function show(int $companyId, int $productId): array { $product=$this->repository->show($companyId,$productId);if(!$product)throw new InvalidArgumentException('Produto nao encontrado');return $product; }
    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int { $this->validate($data);return $this->repository->create($companyId,$actorId,$data,$ip,$agent); }
    public function update(int $companyId, int $actorId, int $productId, array $data, ?string $ip, ?string $agent): void { $this->validate($data);$this->repository->update($companyId,$actorId,$productId,$data,$ip,$agent); }
    public function setStatus(int $companyId,int $actorId,int $productId,int $status,?string $ip,?string $agent): void { if(!in_array($status,[0,1],true))throw new InvalidArgumentException('Situacao invalida');$this->repository->setStatus($companyId,$actorId,$productId,$status,$ip,$agent); }
    public function duplicate(int $companyId,int $actorId,int $productId,?string $ip,?string $agent): int { return $this->repository->duplicate($companyId,$actorId,$productId,$ip,$agent); }
    public function moveStock(int $companyId,int $actorId,int $productId,array $data,?string $ip,?string $agent): void { if(empty($data['idfilial']))throw new InvalidArgumentException('Filial e obrigatoria');if((float)($data['quantidade']??0)<=0)throw new InvalidArgumentException('Quantidade deve ser maior que zero');if(!in_array((int)($data['tipo']??0),[1,2,5],true))throw new InvalidArgumentException('Tipo de movimento invalido');$this->repository->moveStock($companyId,$actorId,$productId,$data,$ip,$agent); }

    private function validate(array $data): void
    {
        if(strlen(trim((string)($data['nome']??'')))<2)throw new InvalidArgumentException('Nome e obrigatorio');
        if(empty($data['idcategoria']))throw new InvalidArgumentException('Categoria e obrigatoria');
        if((float)($data['preco_venda']??0)<=0)throw new InvalidArgumentException('Preco de venda deve ser maior que zero');
        foreach(['preco_custo','estoque_minimo','estoque_maximo','estoque_inicial'] as $field)if(isset($data[$field])&&(float)$data[$field]<0)throw new InvalidArgumentException("{$field} nao pode ser negativo");
    }
}
