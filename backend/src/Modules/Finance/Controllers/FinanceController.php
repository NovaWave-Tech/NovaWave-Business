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
    private function run(Request $request,Response $response,callable $callback,int $status=200,string $message='OK'):Response{try{$c=RequestContext::fromRequest($request);if(!$c->companyId||!$c->userId)return $this->error($response,'Contexto de autenticacao invalido',403);return $this->success($response,$callback($c),$message,$status);}catch(InvalidArgumentException $e){return $this->error($response,$e->getMessage(),422);}catch(Throwable){return $this->error($response,'Nao foi possivel concluir a operacao',500);}}
}
