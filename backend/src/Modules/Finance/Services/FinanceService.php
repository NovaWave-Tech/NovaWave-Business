<?php

namespace App\Modules\Finance\Services;

use App\Modules\Finance\Repositories\FinanceRepository;
use InvalidArgumentException;
use Psr\Http\Message\UploadedFileInterface;
use Throwable;

final class FinanceService
{
    /** Formatos aceitos no anexo de um lancamento. */
    private const ATTACHMENT_EXTENSIONS = ['pdf', 'xml', 'png', 'jpg', 'jpeg', 'webp'];
    private const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

    public function __construct(private readonly FinanceRepository $repository=new FinanceRepository()){}
    public function index(int $companyId,array $filters):array{return $this->repository->index($companyId,$filters);}
    public function show(int $companyId,string $type,int $id):array{$this->type($type);$item=$this->repository->show($companyId,$type,$id);if(!$item)throw new InvalidArgumentException('Lancamento nao encontrado');return $item;}
    public function create(int $companyId,int $actorId,string $type,array $data,?string $ip,?string $agent):array{$this->type($type);$this->validate($data);return $this->repository->create($companyId,$actorId,$type,$data,$ip,$agent);}
    public function update(int $companyId,int $actorId,string $type,int $id,array $data,?string $ip,?string $agent):void{$this->type($type);$this->validate($data);$this->repository->update($companyId,$actorId,$type,$id,$data,$ip,$agent);}
    public function setStatus(int $companyId,int $actorId,string $type,int $id,int $status,?string $ip,?string $agent):void{$this->type($type);if(!in_array($status,[1,2,3],true))throw new InvalidArgumentException('Situacao invalida');$this->repository->setStatus($companyId,$actorId,$type,$id,$status,$ip,$agent);}
    public function duplicate(int $companyId,int $actorId,string $type,int $id,?string $ip,?string $agent):array{$this->type($type);return $this->repository->duplicate($companyId,$actorId,$type,$id,$ip,$agent);}
    /**
     * Recebe o arquivo, valida formato/tamanho e grava fora do public/ com
     * nome aleatorio (o original vai so para o banco, para exibicao). Se o
     * registro falhar, o arquivo e removido para nao deixar lixo no disco.
     */
    public function addAttachment(int $companyId,int $actorId,string $type,int $id,?UploadedFileInterface $file,?string $ip,?string $agent):array
    {
        $this->type($type);
        if($file===null||$file->getError()!==UPLOAD_ERR_OK){
            throw new InvalidArgumentException('Envie um arquivo valido');
        }
        $size=(int)$file->getSize();
        if($size<=0){
            throw new InvalidArgumentException('Arquivo vazio');
        }
        if($size>self::ATTACHMENT_MAX_BYTES){
            throw new InvalidArgumentException('Arquivo maior que 10 MB');
        }
        $name=$this->safeName((string)$file->getClientFilename());
        $extension=strtolower(pathinfo($name,PATHINFO_EXTENSION));
        if(!in_array($extension,self::ATTACHMENT_EXTENSIONS,true)){
            throw new InvalidArgumentException('Formato nao aceito. Envie PDF, XML ou imagem (png, jpg, webp)');
        }

        $directory=$this->storageRoot().'/anexos/'.$companyId;
        if(!is_dir($directory)&&!mkdir($directory,0775,true)&&!is_dir($directory)){
            throw new InvalidArgumentException('Nao foi possivel armazenar o anexo');
        }
        $relative='anexos/'.$companyId.'/'.bin2hex(random_bytes(16)).'.'.$extension;
        $file->moveTo($this->storageRoot().'/'.$relative);

        try{
            $attachmentId=$this->repository->addAttachment($companyId,$actorId,$type,$id,$name,$relative,$ip,$agent);
        }catch(Throwable $exception){
            @unlink($this->storageRoot().'/'.$relative);
            throw $exception;
        }
        return ['idanexo'=>$attachmentId,'nome'=>$name];
    }

    /** Caminho absoluto do anexo para download (nome original + arquivo). */
    public function attachment(int $companyId,string $type,int $id,int $attachmentId):array
    {
        $this->type($type);
        $item=$this->repository->attachment($companyId,$type,$id,$attachmentId);
        $absolute=$this->resolve((string)$item['url']);
        if($absolute===null||!is_file($absolute)){
            throw new InvalidArgumentException('Arquivo do anexo nao encontrado');
        }
        return ['nome'=>(string)$item['nome'],'path'=>$absolute];
    }

    public function removeAttachment(int $companyId,int $actorId,string $type,int $id,int $attachmentId,?string $ip,?string $agent):void
    {
        $this->type($type);
        $relative=$this->repository->removeAttachment($companyId,$actorId,$type,$id,$attachmentId,$ip,$agent);
        $absolute=$this->resolve($relative);
        if($absolute!==null&&is_file($absolute)){
            @unlink($absolute);
        }
    }

    private function storageRoot():string{return dirname(__DIR__,4).'/storage';}

    /** Resolve o caminho garantindo que ele nao escapa da pasta de storage. */
    private function resolve(string $relative):?string
    {
        $root=realpath($this->storageRoot());
        $absolute=realpath($this->storageRoot().'/'.$relative);
        if($root===false||$absolute===false||!str_starts_with($absolute,$root)){
            return null;
        }
        return $absolute;
    }

    private function safeName(string $name):string
    {
        $name=basename(str_replace('\\','/',$name));
        $name=preg_replace('/[^\w.\- ]+/u','_',$name)?:'anexo';
        return mb_substr(trim($name)!==''?$name:'anexo',0,180);
    }

    public function createCard(int $companyId,int $actorId,array $data,?string $ip,?string $agent):array{$this->validateCard($data);return ['idcartao'=>$this->repository->createCard($companyId,$actorId,$data,$ip,$agent)];}
    public function updateCard(int $companyId,int $actorId,int $id,array $data,?string $ip,?string $agent):void{$this->validateCard($data);$this->repository->updateCard($companyId,$actorId,$id,$data,$ip,$agent);}
    public function setCardStatus(int $companyId,int $actorId,int $id,int $status,?string $ip,?string $agent):void{if(!in_array($status,[0,1],true))throw new InvalidArgumentException('Situacao invalida');$this->repository->setCardStatus($companyId,$actorId,$id,$status,$ip,$agent);}

    private function validateCard(array $data):void
    {
        foreach(['banco'=>'Banco','descricao'=>'Descricao']as$field=>$label){
            if(mb_strlen(trim((string)($data[$field]??'')))<2)throw new InvalidArgumentException("{$label} e obrigatorio");
        }
        if((float)($data['limite']??0)<0)throw new InvalidArgumentException('Limite nao pode ser negativo');
        $day=(int)($data['dia_vencimento']??0);
        if($day<1||$day>31)throw new InvalidArgumentException('Dia de vencimento deve estar entre 1 e 31');
        $digits=preg_replace('/\D/','',(string)($data['final_cartao']??''));
        if($digits!==''&&strlen($digits)!==4)throw new InvalidArgumentException('Final do cartao deve ter 4 digitos');
    }

    private function type(string $type):void{if(!in_array($type,['revenue','expense'],true))throw new InvalidArgumentException('Tipo de lancamento invalido');}
    private function validate(array $data):void{foreach(['descricao','idcategoria_financeira','idcentro_custo','idconta_bancaria','data_vencimento']as$field)if(empty($data[$field]))throw new InvalidArgumentException("Campo {$field} e obrigatorio");if((float)($data['valor']??0)<=0)throw new InvalidArgumentException('Valor deve ser maior que zero');$installments=(int)($data['parcelas_total']??1);if($installments<1||$installments>120)throw new InvalidArgumentException('Parcelamento deve possuir entre 1 e 120 parcelas');}
}
