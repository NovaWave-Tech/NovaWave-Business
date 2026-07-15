<?php

namespace App\Modules\Finance\Controllers;

use App\Modules\Finance\Services\FinanceService;
use App\Shared\Http\ApiController;
use App\Shared\Support\RequestContext;
use InvalidArgumentException;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Throwable;

final class FinanceController extends ApiController
{
    private readonly FinanceService $service;
    public function __construct(?FinanceService $service=null){$this->service=$service??new FinanceService();}
    public function index(Request $request,Response $response):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->index($c->companyId,$request->getQueryParams()));}
    public function show(Request $request,Response $response,array $args):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->show($c->companyId,$args['type'],(int)$args['id']));}
    public function store(Request $request,Response $response,array $args):Response{return $this->run($request,$response,fn(RequestContext $c)=>['ids'=>$this->service->create($c->companyId,$c->userId,$args['type'],$this->body($request),$c->ipAddress,$c->userAgent)],201,'Lancamento criado');}
    public function update(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->update($c->companyId,$c->userId,$args['type'],(int)$args['id'],$this->body($request),$c->ipAddress,$c->userAgent);return[];},200,'Lancamento atualizado');}
    public function status(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->setStatus($c->companyId,$c->userId,$args['type'],(int)$args['id'],(int)($this->body($request)['situacao']??0),$c->ipAddress,$c->userAgent);return[];},200,'Situacao atualizada');}
    public function duplicate(Request $request,Response $response,array $args):Response{return $this->run($request,$response,fn(RequestContext $c)=>['ids'=>$this->service->duplicate($c->companyId,$c->userId,$args['type'],(int)$args['id'],$c->ipAddress,$c->userAgent)],201,'Lancamento duplicado');}
    public function infra(Request $request,Response $response):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->infra($c->companyId));}
    public function storeBank(Request $request,Response $response):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->createBank($c->companyId,$c->userId,$this->body($request),$c->ipAddress,$c->userAgent),201,'Conta bancaria cadastrada');}
    public function updateBank(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->updateBank($c->companyId,$c->userId,(int)$args['id'],$this->body($request),$c->ipAddress,$c->userAgent);return[];},200,'Conta bancaria atualizada');}
    public function storeCategory(Request $request,Response $response):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->createCategory($c->companyId,$c->userId,$this->body($request),$c->ipAddress,$c->userAgent),201,'Categoria cadastrada');}
    public function updateCategory(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->updateCategory($c->companyId,$c->userId,(int)$args['id'],$this->body($request),$c->ipAddress,$c->userAgent);return[];},200,'Categoria atualizada');}
    public function storeCostCenter(Request $request,Response $response):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->createCostCenter($c->companyId,$c->userId,$this->body($request),$c->ipAddress,$c->userAgent),201,'Centro de custo cadastrado');}
    public function updateCostCenter(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->updateCostCenter($c->companyId,$c->userId,(int)$args['id'],$this->body($request),$c->ipAddress,$c->userAgent);return[];},200,'Centro de custo atualizado');}
    public function infraStatus(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->setInfraStatus($c->companyId,$c->userId,$args['entity'],(int)$args['id'],(int)($this->body($request)['situacao']??-1),$c->ipAddress,$c->userAgent);return[];},200,'Situacao atualizada');}

    public function storeCard(Request $request,Response $response):Response{return $this->run($request,$response,fn(RequestContext $c)=>$this->service->createCard($c->companyId,$c->userId,$this->body($request),$c->ipAddress,$c->userAgent),201,'Cartao cadastrado');}
    public function updateCard(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->updateCard($c->companyId,$c->userId,(int)$args['id'],$this->body($request),$c->ipAddress,$c->userAgent);return[];},200,'Cartao atualizado');}
    public function cardStatus(Request $request,Response $response,array $args):Response{return $this->run($request,$response,function(RequestContext $c)use($request,$args){$this->service->setCardStatus($c->companyId,$c->userId,(int)$args['id'],(int)($this->body($request)['situacao']??-1),$c->ipAddress,$c->userAgent);return[];},200,'Situacao do cartao atualizada');}

    public function storeAttachment(Request $request,Response $response,array $args):Response
    {
        return $this->run($request,$response,fn(RequestContext $c)=>$this->service->addAttachment(
            $c->companyId,$c->userId,$args['type'],(int)$args['id'],
            $request->getUploadedFiles()['arquivo']??null,$c->ipAddress,$c->userAgent
        ),201,'Anexo enviado');
    }

    public function deleteAttachment(Request $request,Response $response,array $args):Response
    {
        return $this->run($request,$response,function(RequestContext $c)use($args){
            $this->service->removeAttachment($c->companyId,$c->userId,$args['type'],(int)$args['id'],(int)$args['attachment'],$c->ipAddress,$c->userAgent);
            return[];
        },200,'Anexo removido');
    }

    /**
     * Download do anexo. Os arquivos ficam fora do public/, entao so saem por
     * aqui - depois do JWT e da checagem de empresa/lancamento.
     */
    public function downloadAttachment(Request $request,Response $response,array $args):Response
    {
        try{
            $context=RequestContext::fromRequest($request);
            if(!$context->companyId||!$context->userId){
                return $this->error($response,'Contexto de autenticacao invalido',403);
            }
            $file=$this->service->attachment($context->companyId,$args['type'],(int)$args['id'],(int)$args['attachment']);
            $response->getBody()->write((string)file_get_contents($file['path']));
            return $response
                ->withHeader('Content-Type',mime_content_type($file['path'])?:'application/octet-stream')
                ->withHeader('Content-Disposition','attachment; filename="'.$file['nome'].'"');
        }catch(InvalidArgumentException $exception){
            return $this->error($response,$exception->getMessage(),422);
        }catch(Throwable){
            return $this->error($response,'Nao foi possivel concluir a operacao',500);
        }
    }

    private function run(Request $request,Response $response,callable $callback,int $status=200,string $message='OK'):Response{try{$c=RequestContext::fromRequest($request);if(!$c->companyId||!$c->userId)return $this->error($response,'Contexto de autenticacao invalido',403);return $this->success($response,$callback($c),$message,$status);}catch(InvalidArgumentException $e){return $this->error($response,$e->getMessage(),422);}catch(Throwable){return $this->error($response,'Nao foi possivel concluir a operacao',500);}}
}
