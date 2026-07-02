<?php

namespace App\Modules\Customers\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class CustomerRepository
{
    private PDO $pdo;
    public function __construct() { $this->pdo = Database::getInstance(); }

    public function index(int $companyId, array $filters): array
    {
        $where = ['c.idempresa=:company_id']; $params = ['company_id' => $companyId];
        foreach (['tipo_pessoa' => 'type', 'situacao' => 'status', 'cidade' => 'city', 'estado' => 'state'] as $column => $key) if (($filters[$key] ?? '') !== '') { $where[] = "c.{$column}=:{$key}"; $params[$key] = in_array($column, ['tipo_pessoa','situacao'], true) ? (int) $filters[$key] : $filters[$key]; }
        if (!empty($filters['q'])) { $where[] = '(c.nome ILIKE :q OR c.documento ILIKE :digits OR c.telefone ILIKE :digits OR c.email ILIKE :q OR c.cidade ILIKE :q)'; $params['q'] = '%' . trim((string) $filters['q']) . '%'; $params['digits'] = '%' . preg_replace('/\D/', '', (string) $filters['q']) . '%'; }
        if (($filters['purchases'] ?? '') === 'with') $where[] = 'COALESCE(v.purchases,0)>0';
        if (($filters['purchases'] ?? '') === 'without') $where[] = 'COALESCE(v.purchases,0)=0';
        if (($filters['delinquent'] ?? '') === '1') $where[] = 'COALESCE(r.overdue,0)>0';
        if (($filters['credit'] ?? '') === 'with') $where[] = 'c.limite_credito>0';
        if (($filters['credit'] ?? '') === 'without') $where[] = 'c.limite_credito=0';
        if (($filters['last_purchase'] ?? '') === '30d') $where[] = "v.last_purchase>=CURRENT_DATE-INTERVAL '30 days'";
        if (($filters['last_purchase'] ?? '') === 'never') $where[] = 'v.last_purchase IS NULL';
        if (($filters['registered'] ?? '') === '30d') $where[] = "c.criado_em>=CURRENT_DATE-INTERVAL '30 days'";

        $base = " FROM cliente c LEFT JOIN (SELECT idempresa,idcliente,COUNT(*) FILTER(WHERE situacao=1) purchases,COALESCE(SUM(valor_total) FILTER(WHERE situacao=1),0) total_bought,COALESCE(AVG(valor_total) FILTER(WHERE situacao=1),0) average_ticket,MAX(data_venda) FILTER(WHERE situacao=1) last_purchase FROM venda GROUP BY idempresa,idcliente) v ON v.idempresa=c.idempresa AND v.idcliente=c.idcliente LEFT JOIN (SELECT idempresa,idcliente,COUNT(*) FILTER(WHERE situacao=1 AND data_vencimento<CURRENT_DATE) overdue,COALESCE(SUM(valor) FILTER(WHERE situacao=1),0) open_balance FROM conta_receber GROUP BY idempresa,idcliente) r ON r.idempresa=c.idempresa AND r.idcliente=c.idcliente";
        $customers = $this->all('SELECT c.*,COALESCE(v.purchases,0) purchases,COALESCE(v.total_bought,0) total_bought,COALESCE(v.average_ticket,0) average_ticket,v.last_purchase,COALESCE(r.overdue,0) overdue,COALESCE(r.open_balance,0) open_balance' . $base . ' WHERE ' . implode(' AND ', $where) . ' ORDER BY c.nome', $params);
        $metrics = $this->one("SELECT COUNT(*) total,COUNT(*) FILTER(WHERE situacao=1) active,COUNT(*) FILTER(WHERE situacao=0) inactive FROM cliente WHERE idempresa=:company_id", ['company_id' => $companyId]);
        $commercial = $this->one("SELECT COALESCE(SUM(valor_total) FILTER(WHERE situacao=1),0) revenue,COUNT(DISTINCT idcliente) FILTER(WHERE situacao=1) buyers FROM venda WHERE idempresa=:company_id", ['company_id' => $companyId]);
        $financial = $this->one("SELECT COUNT(DISTINCT idcliente) FILTER(WHERE situacao=1 AND data_vencimento<CURRENT_DATE) delinquent FROM conta_receber WHERE idempresa=:company_id", ['company_id' => $companyId]);
        return ['customers' => $customers, 'metrics' => array_merge($metrics, $commercial, $financial), 'options' => ['cities' => $this->all('SELECT DISTINCT cidade nome FROM cliente WHERE idempresa=:company_id AND cidade IS NOT NULL ORDER BY cidade', ['company_id' => $companyId]), 'states' => $this->all('SELECT DISTINCT estado nome FROM cliente WHERE idempresa=:company_id AND estado IS NOT NULL ORDER BY estado', ['company_id' => $companyId])]];
    }

    public function show(int $companyId, int $customerId): ?array
    {
        $customer = $this->one('SELECT * FROM cliente WHERE idempresa=:company_id AND idcliente=:customer_id', ['company_id' => $companyId, 'customer_id' => $customerId]);
        if (!$customer) return null;
        $customer['summary'] = $this->one("SELECT COUNT(*) FILTER(WHERE situacao=1) purchases,COALESCE(SUM(valor_total) FILTER(WHERE situacao=1),0) total_bought,COALESCE(AVG(valor_total) FILTER(WHERE situacao=1),0) average_ticket,MAX(data_venda) FILTER(WHERE situacao=1) last_purchase FROM venda WHERE idempresa=:company_id AND idcliente=:customer_id", ['company_id' => $companyId, 'customer_id' => $customerId]);
        $customer['sales'] = $this->all('SELECT idvenda,data_venda,valor_total,situacao FROM venda WHERE idempresa=:company_id AND idcliente=:customer_id ORDER BY data_venda DESC LIMIT 20', ['company_id' => $companyId, 'customer_id' => $customerId]);
        $customer['financial'] = $this->one("SELECT COALESCE(SUM(valor) FILTER(WHERE situacao=1),0) open_balance,COUNT(*) FILTER(WHERE situacao=1 AND data_vencimento<CURRENT_DATE) overdue,COUNT(*) FILTER(WHERE situacao=1 AND data_vencimento>=CURRENT_DATE) upcoming,MAX(data_recebimento) FILTER(WHERE situacao=2) last_payment FROM conta_receber WHERE idempresa=:company_id AND idcliente=:customer_id", ['company_id' => $companyId, 'customer_id' => $customerId]);
        $customer['timeline'] = $this->all("SELECT 'audit' source,acao title,criado_em,COALESCE(valores_novos->>'observacao','') detail FROM auditoria WHERE idempresa=:company_id AND tabela='cliente' AND registro_id=:customer_id UNION ALL SELECT 'sale','compra_realizada',data_venda,'Venda #'||idvenda||' - R$ '||valor_total FROM venda WHERE idempresa=:company_id AND idcliente=:customer_id ORDER BY criado_em DESC LIMIT 40", ['company_id' => $companyId, 'customer_id' => $customerId]);
        $notes = array_values(array_filter($customer['timeline'], fn (array $item) => $item['title'] === 'adicionar_observacao'));
        $customer['latest_note'] = $notes[0]['detail'] ?? null;
        $customer['capabilities'] = ['multiple_addresses' => false, 'birth_date' => true, 'trade_name' => true, 'recurring_manual' => true, 'credit_sales' => true];
        return $customer;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        return $this->transaction(function () use ($companyId, $actorId, $data, $ip, $agent) { $statement=$this->pdo->prepare('INSERT INTO cliente(idempresa,tipo_pessoa,nome,nome_fantasia,rg,inscricao_estadual,data_nascimento_abertura,documento,email,telefone,cep,endereco,numero,complemento,bairro,cidade,estado,limite_credito,recorrente,permite_venda_prazo,situacao) VALUES(:company_id,:type,:name,:trade_name,:rg,:state_registration,:birth_opening_date,:document,:email,:phone,:cep,:address,:number,:complement,:district,:city,:state,:credit,:recurring,:credit_sales,:status) RETURNING idcliente'); $statement->execute($this->params($companyId,$data)); $id=(int)$statement->fetchColumn(); $this->audit($companyId,$actorId,$id,'criar',null,['nome'=>$data['nome']],$ip,$agent); if(!empty(trim((string)($data['observacao']??'')))) $this->audit($companyId,$actorId,$id,'adicionar_observacao',null,['observacao'=>trim($data['observacao'])],$ip,$agent); return $id; });
    }

    public function update(int $companyId, int $actorId, int $customerId, array $data, ?string $ip, ?string $agent): void
    {
        $before=$this->one('SELECT nome,documento,situacao FROM cliente WHERE idempresa=:company_id AND idcliente=:customer_id',['company_id'=>$companyId,'customer_id'=>$customerId]); if(!$before) throw new InvalidArgumentException('Cliente nao encontrado'); $params=$this->params($companyId,$data);$params['customer_id']=$customerId;$this->pdo->prepare('UPDATE cliente SET tipo_pessoa=:type,nome=:name,nome_fantasia=:trade_name,rg=:rg,inscricao_estadual=:state_registration,data_nascimento_abertura=:birth_opening_date,documento=:document,email=:email,telefone=:phone,cep=:cep,endereco=:address,numero=:number,complemento=:complement,bairro=:district,cidade=:city,estado=:state,limite_credito=:credit,recorrente=:recurring,permite_venda_prazo=:credit_sales,situacao=:status,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idcliente=:customer_id')->execute($params);$this->audit($companyId,$actorId,$customerId,'editar',$before,['nome'=>$data['nome']],$ip,$agent);
    }

    public function setStatus(int $companyId, int $actorId, int $customerId, int $status, ?string $ip, ?string $agent): void
    {
        $statement=$this->pdo->prepare('UPDATE cliente SET situacao=:status,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idcliente=:customer_id');$statement->execute(['status'=>$status,'company_id'=>$companyId,'customer_id'=>$customerId]);if(!$statement->rowCount()) throw new InvalidArgumentException('Cliente nao encontrado');$this->audit($companyId,$actorId,$customerId,$status?'ativar':'inativar',null,['situacao'=>$status],$ip,$agent);
    }

    public function addNote(int $companyId, int $actorId, int $customerId, string $note, ?string $ip, ?string $agent): void
    {
        if(!$this->one('SELECT idcliente FROM cliente WHERE idempresa=:company_id AND idcliente=:customer_id',['company_id'=>$companyId,'customer_id'=>$customerId])) throw new InvalidArgumentException('Cliente nao encontrado');$this->audit($companyId,$actorId,$customerId,'adicionar_observacao',null,['observacao'=>$note],$ip,$agent);
    }

    private function params(int $companyId,array $data): array { $nullable=fn(string $key)=>(isset($data[$key])&&trim((string)$data[$key])!=='')?trim((string)$data[$key]):null;return ['company_id'=>$companyId,'type'=>(int)$data['tipo_pessoa'],'name'=>trim($data['nome']),'trade_name'=>$nullable('nome_fantasia'),'rg'=>$nullable('rg'),'state_registration'=>$nullable('inscricao_estadual'),'birth_opening_date'=>$nullable('data_nascimento_abertura'),'document'=>preg_replace('/\D/','',(string)$data['documento']),'email'=>$nullable('email'),'phone'=>preg_replace('/\D/','',(string)($data['telefone']??''))?:null,'cep'=>preg_replace('/\D/','',(string)($data['cep']??''))?:null,'address'=>$nullable('endereco'),'number'=>$nullable('numero'),'complement'=>$nullable('complemento'),'district'=>$nullable('bairro'),'city'=>$nullable('cidade'),'state'=>!empty($data['estado'])?strtoupper(trim($data['estado'])):null,'credit'=>(float)($data['limite_credito']??0),'recurring'=>!empty($data['recorrente'])?'true':'false','credit_sales'=>!empty($data['permite_venda_prazo'])?'true':'false','status'=>!isset($data['situacao'])||!empty($data['situacao'])?1:0]; }
    private function audit(int $companyId,int $actorId,int $customerId,string $action,?array $before,?array $after,?string $ip,?string $agent): void { $this->pdo->prepare("INSERT INTO auditoria(idempresa,idusuario,origem_usuario,tabela,registro_id,acao,valores_anteriores,valores_novos,ip,dispositivo) VALUES(:company_id,:actor_id,'empresa','cliente',:customer_id,:action,:before::jsonb,:after::jsonb,:ip,:device)")->execute(['company_id'=>$companyId,'actor_id'=>$actorId,'customer_id'=>$customerId,'action'=>$action,'before'=>$before?json_encode($before):null,'after'=>$after?json_encode($after):null,'ip'=>$ip,'device'=>$agent?substr($agent,0,150):null]); }
    private function transaction(callable $callback): mixed { $this->pdo->beginTransaction();try{$result=$callback();$this->pdo->commit();return $result;}catch(Throwable $exception){$this->pdo->rollBack();throw $exception;} }
    private function one(string $sql,array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetch(PDO::FETCH_ASSOC)?:[]; }
    private function all(string $sql,array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetchAll(PDO::FETCH_ASSOC); }
}
