<?php

namespace App\Modules\Branches\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

final class BranchRepository
{
    private PDO $pdo;

    public function __construct() { $this->pdo = Database::getInstance(); }

    public function index(int $companyId, array $filters): array
    {
        $where = ['f.idempresa=:company_id'];
        $params = ['company_id' => $companyId];
        foreach (['situacao' => 'status', 'cidade' => 'city', 'estado' => 'state', 'idgerente' => 'manager'] as $column => $key) {
            if (($filters[$key] ?? '') !== '') { $where[] = "f.{$column}=:{$key}"; $params[$key] = $column === 'situacao' || $column === 'idgerente' ? (int) $filters[$key] : $filters[$key]; }
        }
        if (($filters['matrix'] ?? '') !== '') { $where[] = 'f.matriz=:matrix'; $params['matrix'] = $filters['matrix'] === '1' ? 'true' : 'false'; }
        if (!empty($filters['q'])) { $where[] = '(f.nome ILIKE :q OR f.codigo ILIKE :q OR f.cidade ILIKE :q OR f.cnpj ILIKE :q OR g.nome ILIKE :q)'; $params['q'] = '%' . trim((string) $filters['q']) . '%'; }
        $movement = $filters['movement'] ?? '';
        if ($movement === 'with') $where[] = 'COALESCE(v.last_sale, me.last_stock) IS NOT NULL';
        if ($movement === 'without') $where[] = 'COALESCE(v.last_sale, me.last_stock) IS NULL';

        $branches = $this->all("SELECT f.*, g.nome AS gerente,
            COALESCE(u.total,0) AS usuarios, COALESCE(v.month_revenue,0) AS receita_mes,
            COALESCE(v.today_revenue,0) AS receita_dia, COALESCE(v.orders,0) AS pedidos,
            COALESCE(v.customers,0) AS clientes, COALESCE(v.avg_ticket,0) AS ticket_medio,
            COALESCE(es.products,0) AS produtos_estoque, COALESCE(es.critical,0) AS estoque_critico,
            COALESCE(v.last_sale, me.last_stock) AS ultima_movimentacao
          FROM filial f
          LEFT JOIN funcionario g ON g.idempresa=f.idempresa AND g.idfuncionario=f.idgerente
          LEFT JOIN (SELECT idempresa,idfilial_padrao,COUNT(*) total FROM usuario GROUP BY idempresa,idfilial_padrao) u ON u.idempresa=f.idempresa AND u.idfilial_padrao=f.idfilial
          LEFT JOIN (SELECT idempresa,idfilial,SUM(valor_total) FILTER (WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1) month_revenue,SUM(valor_total) FILTER (WHERE data_venda>=CURRENT_DATE AND situacao=1) today_revenue,COUNT(*) FILTER (WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1) orders,COUNT(DISTINCT idcliente) FILTER (WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1) customers,AVG(valor_total) FILTER (WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1) avg_ticket,MAX(data_venda) last_sale FROM venda GROUP BY idempresa,idfilial) v ON v.idempresa=f.idempresa AND v.idfilial=f.idfilial
          LEFT JOIN (SELECT e.idempresa,e.idfilial,COUNT(*) FILTER (WHERE e.quantidade>0) products,COUNT(*) FILTER (WHERE e.quantidade<=p.estoque_minimo) critical FROM estoque e JOIN produto p ON p.idempresa=e.idempresa AND p.idproduto=e.idproduto GROUP BY e.idempresa,e.idfilial) es ON es.idempresa=f.idempresa AND es.idfilial=f.idfilial
          LEFT JOIN (SELECT idempresa,idfilial,MAX(criado_em) last_stock FROM movimentacao_estoque GROUP BY idempresa,idfilial) me ON me.idempresa=f.idempresa AND me.idfilial=f.idfilial
          WHERE " . implode(' AND ', $where) . ' ORDER BY f.matriz DESC,f.nome', $params);

        $metrics = $this->one("SELECT COUNT(*) total,COUNT(*) FILTER(WHERE situacao=1) active,COUNT(*) FILTER(WHERE situacao=0) inactive,MAX(nome) FILTER(WHERE matriz) matrix FROM filial WHERE idempresa=:company_id", ['company_id' => $companyId]);
        $totals = $this->one("SELECT (SELECT COUNT(*) FROM usuario WHERE idempresa=:company_id) users,COALESCE((SELECT SUM(valor_total) FROM venda WHERE idempresa=:company_id AND situacao=1 AND data_venda>=date_trunc('month',CURRENT_DATE)),0) revenue", ['company_id' => $companyId]);
        return ['branches' => $branches, 'metrics' => array_merge($metrics, $totals), 'options' => $this->options($companyId)];
    }

    public function show(int $companyId, int $branchId): ?array
    {
        $branch = $this->one('SELECT f.*,e.nome_fantasia AS empresa,g.nome AS gerente FROM filial f JOIN empresa e ON e.idempresa=f.idempresa LEFT JOIN funcionario g ON g.idempresa=f.idempresa AND g.idfuncionario=f.idgerente WHERE f.idempresa=:company_id AND f.idfilial=:branch_id', ['company_id' => $companyId, 'branch_id' => $branchId]);
        if (!$branch) return null;
        $branch['indicators'] = $this->one("SELECT COALESCE(SUM(valor_total) FILTER(WHERE data_venda>=CURRENT_DATE AND situacao=1),0) revenue_today,COALESCE(SUM(valor_total) FILTER(WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1),0) revenue_month,COUNT(*) FILTER(WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1) orders,COALESCE(AVG(valor_total) FILTER(WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1),0) average_ticket,COUNT(DISTINCT idcliente) FILTER(WHERE data_venda>=date_trunc('month',CURRENT_DATE) AND situacao=1) customers FROM venda WHERE idempresa=:company_id AND idfilial=:branch_id", ['company_id' => $companyId, 'branch_id' => $branchId]);
        $stock = $this->one('SELECT COUNT(*) FILTER(WHERE e.quantidade>0) products,COUNT(*) FILTER(WHERE e.quantidade<=p.estoque_minimo) critical FROM estoque e JOIN produto p ON p.idempresa=e.idempresa AND p.idproduto=e.idproduto WHERE e.idempresa=:company_id AND e.idfilial=:branch_id', ['company_id' => $companyId, 'branch_id' => $branchId]);
        $cash = $this->one("SELECT COUNT(*) FILTER(WHERE situacao=1) open_cash,COALESCE(SUM(saldo_inicial) FILTER(WHERE situacao=1),0) current_cash FROM caixa WHERE idempresa=:company_id AND idfilial=:branch_id", ['company_id' => $companyId, 'branch_id' => $branchId]);
        $branch['indicators'] = array_merge($branch['indicators'], $stock, $cash);
        $branch['users'] = $this->all("SELECT u.idusuario,u.nome,u.email,u.situacao,u.ultimo_login,c.nome cargo,COALESCE(string_agg(DISTINCT pa.nome,', '),'Sem perfil') perfil FROM usuario u LEFT JOIN funcionario fn ON fn.idempresa=u.idempresa AND fn.idfuncionario=u.idfuncionario LEFT JOIN cargo c ON c.idempresa=fn.idempresa AND c.idcargo=fn.idcargo LEFT JOIN usuario_perfil up ON up.idempresa=u.idempresa AND up.idusuario=u.idusuario LEFT JOIN perfil_acesso pa ON pa.idempresa=up.idempresa AND pa.idperfil=up.idperfil WHERE u.idempresa=:company_id AND (u.idfilial_padrao=:branch_id OR EXISTS(SELECT 1 FROM usuario_filial uf WHERE uf.idempresa=u.idempresa AND uf.idusuario=u.idusuario AND uf.idfilial=:branch_id)) GROUP BY u.idusuario,c.nome ORDER BY u.nome", ['company_id' => $companyId, 'branch_id' => $branchId]);
        $branch['operation'] = $this->one("SELECT (SELECT MAX(data_venda) FROM venda WHERE idempresa=:company_id AND idfilial=:branch_id) last_sale,(SELECT MAX(data_compra) FROM compra WHERE idempresa=:company_id AND idfilial=:branch_id) last_purchase,(SELECT MAX(criado_em) FROM movimentacao_estoque WHERE idempresa=:company_id AND idfilial=:branch_id) last_stock,(SELECT COUNT(*) FROM conta_pagar WHERE idempresa=:company_id AND idfilial=:branch_id)+(SELECT COUNT(*) FROM conta_receber WHERE idempresa=:company_id AND idfilial=:branch_id) linked_accounts", ['company_id' => $companyId, 'branch_id' => $branchId]);
        $branch['history'] = $this->all("SELECT idauditoria,acao,valores_anteriores,valores_novos,criado_em FROM auditoria WHERE idempresa=:company_id AND ((tabela='filial' AND registro_id=:branch_id) OR idfilial=:branch_id) ORDER BY criado_em DESC LIMIT 30", ['company_id' => $companyId, 'branch_id' => $branchId]);
        $goal = $this->one("SELECT valor_meta FROM meta_venda WHERE idempresa=:company_id AND idfilial=:branch_id AND competencia=date_trunc('month',CURRENT_DATE)::date", ['company_id' => $companyId, 'branch_id' => $branchId]);
        $branch['monthly_goal'] = $goal['valor_meta'] ?? null;
        $branch['capabilities'] = ['daily_goal' => false, 'ticket_goal' => false, 'customer_goal' => false, 'ranking' => false];
        return $branch;
    }

    public function create(int $companyId, int $actorId, array $data, ?string $ip, ?string $agent): int
    {
        return $this->transaction(function () use ($companyId, $actorId, $data, $ip, $agent) {
            if (!empty($data['matriz'])) $this->pdo->prepare('UPDATE filial SET matriz=false WHERE idempresa=:company_id')->execute(['company_id' => $companyId]);
            $sql = 'INSERT INTO filial (idempresa,nome,codigo,cnpj,inscricao_estadual,email,telefone,cep,endereco,numero,complemento,bairro,cidade,estado,matriz,idgerente,latitude,longitude,permite_estoque_negativo,caixa_obrigatorio,situacao) VALUES (:idempresa,:nome,:codigo,:cnpj,:ie,:email,:telefone,:cep,:endereco,:numero,:complemento,:bairro,:cidade,:estado,:matriz,:idgerente,:latitude,:longitude,:estoque_negativo,:caixa_obrigatorio,:situacao) RETURNING idfilial';
            $statement = $this->pdo->prepare($sql); $statement->execute($this->params($companyId, $data)); $id = (int) $statement->fetchColumn();
            $this->saveGoal($companyId, $id, $data['meta_mensal'] ?? null);
            $this->audit($companyId, $actorId, $id, 'criar', null, ['nome' => $data['nome']], $ip, $agent);
            return $id;
        });
    }

    public function update(int $companyId, int $actorId, int $branchId, array $data, ?string $ip, ?string $agent): void
    {
        $this->transaction(function () use ($companyId, $actorId, $branchId, $data, $ip, $agent) {
            $before = $this->one('SELECT nome,codigo,matriz,situacao FROM filial WHERE idempresa=:company_id AND idfilial=:branch_id', ['company_id' => $companyId, 'branch_id' => $branchId]);
            if (!$before) throw new InvalidArgumentException('Filial nao encontrada');
            if (!empty($data['matriz'])) $this->pdo->prepare('UPDATE filial SET matriz=false WHERE idempresa=:company_id')->execute(['company_id' => $companyId]);
            $sql = 'UPDATE filial SET nome=:nome,codigo=:codigo,cnpj=:cnpj,inscricao_estadual=:ie,email=:email,telefone=:telefone,cep=:cep,endereco=:endereco,numero=:numero,complemento=:complemento,bairro=:bairro,cidade=:cidade,estado=:estado,matriz=:matriz,idgerente=:idgerente,latitude=:latitude,longitude=:longitude,permite_estoque_negativo=:estoque_negativo,caixa_obrigatorio=:caixa_obrigatorio,situacao=:situacao,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:idempresa AND idfilial=:idfilial';
            $params = $this->params($companyId, $data); $params['idfilial'] = $branchId; $this->pdo->prepare($sql)->execute($params);
            $this->saveGoal($companyId, $branchId, $data['meta_mensal'] ?? null);
            $this->audit($companyId, $actorId, $branchId, 'editar', $before, ['nome' => $data['nome']], $ip, $agent);
        });
    }

    public function setStatus(int $companyId, int $actorId, int $branchId, int $status, ?string $ip, ?string $agent): void
    {
        $branch = $this->one('SELECT matriz FROM filial WHERE idempresa=:company_id AND idfilial=:branch_id', ['company_id' => $companyId, 'branch_id' => $branchId]);
        if (!$branch) throw new InvalidArgumentException('Filial nao encontrada');
        if ($status === 0 && $branch['matriz']) throw new InvalidArgumentException('Defina outra matriz antes de inativar esta filial');
        $this->pdo->prepare('UPDATE filial SET situacao=:status,atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id AND idfilial=:branch_id')->execute(['status' => $status, 'company_id' => $companyId, 'branch_id' => $branchId]);
        $this->audit($companyId, $actorId, $branchId, $status ? 'ativar' : 'inativar', null, ['situacao' => $status], $ip, $agent);
    }

    public function setMatrix(int $companyId, int $actorId, int $branchId, ?string $ip, ?string $agent): void
    {
        $this->transaction(function () use ($companyId, $actorId, $branchId, $ip, $agent) {
            if (!$this->one('SELECT idfilial FROM filial WHERE idempresa=:company_id AND idfilial=:branch_id AND situacao=1', ['company_id' => $companyId, 'branch_id' => $branchId])) throw new InvalidArgumentException('Somente uma filial ativa pode ser matriz');
            $this->pdo->prepare('UPDATE filial SET matriz=(idfilial=:branch_id),atualizado_em=CURRENT_TIMESTAMP WHERE idempresa=:company_id')->execute(['branch_id' => $branchId, 'company_id' => $companyId]);
            $this->audit($companyId, $actorId, $branchId, 'definir_matriz', null, ['matriz' => true], $ip, $agent);
        });
    }

    private function params(int $companyId, array $data): array
    {
        $nullable = fn (string $key) => ($data[$key] ?? '') !== '' ? $data[$key] : null;
        return ['idempresa' => $companyId, 'nome' => trim($data['nome']), 'codigo' => trim($data['codigo']), 'cnpj' => $nullable('cnpj'), 'ie' => $nullable('inscricao_estadual'), 'email' => $nullable('email'), 'telefone' => $nullable('telefone'), 'cep' => $nullable('cep'), 'endereco' => $nullable('endereco'), 'numero' => $nullable('numero'), 'complemento' => $nullable('complemento'), 'bairro' => $nullable('bairro'), 'cidade' => trim($data['cidade']), 'estado' => strtoupper(trim($data['estado'])), 'matriz' => !empty($data['matriz']) ? 'true' : 'false', 'idgerente' => !empty($data['idgerente']) ? (int) $data['idgerente'] : null, 'latitude' => $nullable('latitude'), 'longitude' => $nullable('longitude'), 'estoque_negativo' => !empty($data['permite_estoque_negativo']) ? 'true' : 'false', 'caixa_obrigatorio' => !empty($data['caixa_obrigatorio']) ? 'true' : 'false', 'situacao' => !isset($data['situacao']) || !empty($data['situacao']) ? 1 : 0];
    }

    private function saveGoal(int $companyId, int $branchId, mixed $value): void
    {
        if ($value === null || $value === '') return;
        $statement = $this->pdo->prepare("INSERT INTO meta_venda(idempresa,idfilial,competencia,valor_meta) VALUES(:company_id,:branch_id,date_trunc('month',CURRENT_DATE)::date,:value) ON CONFLICT(idempresa,idfilial,competencia) DO UPDATE SET valor_meta=EXCLUDED.valor_meta,atualizado_em=CURRENT_TIMESTAMP");
        $statement->execute(['company_id' => $companyId, 'branch_id' => $branchId, 'value' => $value]);
    }

    private function options(int $companyId): array
    {
        return ['company' => $this->one('SELECT idempresa,nome_fantasia nome FROM empresa WHERE idempresa=:company_id', ['company_id' => $companyId]), 'cities' => $this->all('SELECT DISTINCT cidade nome FROM filial WHERE idempresa=:company_id AND cidade IS NOT NULL ORDER BY cidade', ['company_id' => $companyId]), 'states' => $this->all('SELECT DISTINCT estado nome FROM filial WHERE idempresa=:company_id AND estado IS NOT NULL ORDER BY estado', ['company_id' => $companyId]), 'managers' => $this->all('SELECT idfuncionario id,nome FROM funcionario WHERE idempresa=:company_id AND situacao=1 ORDER BY nome', ['company_id' => $companyId])];
    }

    private function audit(int $companyId, int $actorId, int $branchId, string $action, ?array $before, ?array $after, ?string $ip, ?string $agent): void
    {
        $this->pdo->prepare("INSERT INTO auditoria(idempresa,idfilial,idusuario,origem_usuario,tabela,registro_id,acao,valores_anteriores,valores_novos,ip,dispositivo) VALUES(:company_id,:branch_id,:actor_id,'empresa','filial',:branch_id,:action,:before::jsonb,:after::jsonb,:ip,:device)")->execute(['company_id' => $companyId, 'branch_id' => $branchId, 'actor_id' => $actorId, 'action' => $action, 'before' => $before ? json_encode($before) : null, 'after' => $after ? json_encode($after) : null, 'ip' => $ip, 'device' => $agent ? substr($agent, 0, 150) : null]);
    }

    private function transaction(callable $callback): mixed { $this->pdo->beginTransaction(); try { $result = $callback(); $this->pdo->commit(); return $result; } catch (Throwable $exception) { $this->pdo->rollBack(); throw $exception; } }
    private function one(string $sql, array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetch(PDO::FETCH_ASSOC) ?: []; }
    private function all(string $sql, array $params): array { $s=$this->pdo->prepare($sql);$s->execute($params);return $s->fetchAll(PDO::FETCH_ASSOC); }
}
