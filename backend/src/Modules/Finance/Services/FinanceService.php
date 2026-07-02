<?php

namespace App\Modules\Finance\Services;

use App\Modules\Finance\Repositories\FinanceRepository;
use InvalidArgumentException;

final class FinanceService
{
    public function __construct(private readonly FinanceRepository $repository=new FinanceRepository()){}
    public function index(int $companyId,array $filters):array{return $this->repository->index($companyId,$filters);}
    public function show(int $companyId,string $type,int $id):array{$this->type($type);$item=$this->repository->show($companyId,$type,$id);if(!$item)throw new InvalidArgumentException('Lancamento nao encontrado');return $item;}
    public function create(int $companyId,int $actorId,string $type,array $data,?string $ip,?string $agent):array{$this->type($type);$this->validate($data);return $this->repository->create($companyId,$actorId,$type,$data,$ip,$agent);}
    public function update(int $companyId,int $actorId,string $type,int $id,array $data,?string $ip,?string $agent):void{$this->type($type);$this->validate($data);$this->repository->update($companyId,$actorId,$type,$id,$data,$ip,$agent);}
    public function setStatus(int $companyId,int $actorId,string $type,int $id,int $status,?string $ip,?string $agent):void{$this->type($type);if(!in_array($status,[1,2,3],true))throw new InvalidArgumentException('Situacao invalida');$this->repository->setStatus($companyId,$actorId,$type,$id,$status,$ip,$agent);}
    public function duplicate(int $companyId,int $actorId,string $type,int $id,?string $ip,?string $agent):array{$this->type($type);return $this->repository->duplicate($companyId,$actorId,$type,$id,$ip,$agent);}
    private function type(string $type):void{if(!in_array($type,['revenue','expense'],true))throw new InvalidArgumentException('Tipo de lancamento invalido');}
    private function validate(array $data):void{foreach(['descricao','idcategoria_financeira','idcentro_custo','idconta_bancaria','data_vencimento']as$field)if(empty($data[$field]))throw new InvalidArgumentException("Campo {$field} e obrigatorio");if((float)($data['valor']??0)<=0)throw new InvalidArgumentException('Valor deve ser maior que zero');$installments=(int)($data['parcelas_total']??1);if($installments<1||$installments>120)throw new InvalidArgumentException('Parcelamento deve possuir entre 1 e 120 parcelas');}
}
