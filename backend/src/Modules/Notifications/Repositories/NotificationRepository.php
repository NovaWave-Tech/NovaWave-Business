<?php

namespace App\Modules\Notifications\Repositories;

use App\Infrastructures\Config\Database;
use InvalidArgumentException;
use PDO;
use Throwable;

/**
 * Notificacoes derivadas do estado real da operacao (nao ha agendador).
 *
 * A cada leitura o `sync()` detecta as condicoes atuais, faz upsert pela
 * `chave` (preservando o `lida_em` de quem ja viu) e apaga as notificacoes
 * cuja condicao deixou de existir. Assim a lista fica sempre coerente com o
 * sistema, sem duplicar e sem exigir cron.
 */
final class NotificationRepository
{
    /** Dias de antecedencia para avisar de um vencimento proximo. */
    private const DUE_SOON_DAYS = 3;

    /** Teto por detector, para uma base grande nao explodir o sino. */
    private const PER_DETECTOR_LIMIT = 50;

    private PDO $pdo;

    public function __construct()
    {
        $this->pdo = Database::getInstance();
    }

    /** Sincroniza e devolve as notificacoes do usuario (nao lidas primeiro). */
    public function index(int $companyId, int $userId): array
    {
        $this->sync($companyId, $userId);
        $rows = $this->all(
            'SELECT idnotificacao, titulo, mensagem, tipo, link, lida_em, criado_em, idfilial
             FROM notificacao
             WHERE idempresa = :company_id AND idusuario = :user AND situacao = 1
             ORDER BY (lida_em IS NULL) DESC, criado_em DESC
             LIMIT 100',
            ['company_id' => $companyId, 'user' => $userId]
        );
        $items = array_map(fn ($row) => [
            'idnotificacao' => (int) $row['idnotificacao'],
            'titulo' => $row['titulo'],
            'mensagem' => $row['mensagem'],
            'tipo' => $row['tipo'],
            'link' => $row['link'],
            'lida' => $row['lida_em'] !== null,
            'criado_em' => $row['criado_em'],
        ], $rows);
        return [
            'notifications' => $items,
            'unread' => count(array_filter($items, fn ($item) => !$item['lida'])),
        ];
    }

    public function markRead(int $companyId, int $userId, int $id): void
    {
        $statement = $this->pdo->prepare(
            'UPDATE notificacao SET lida_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP
             WHERE idempresa = :company_id AND idusuario = :user AND idnotificacao = :id AND lida_em IS NULL'
        );
        $statement->execute(['company_id' => $companyId, 'user' => $userId, 'id' => $id]);
        if (!$statement->rowCount() && !$this->one('SELECT 1 FROM notificacao WHERE idempresa = :company_id AND idusuario = :user AND idnotificacao = :id', ['company_id' => $companyId, 'user' => $userId, 'id' => $id])) {
            throw new InvalidArgumentException('Notificacao nao encontrada');
        }
    }

    public function markAllRead(int $companyId, int $userId): int
    {
        $statement = $this->pdo->prepare(
            'UPDATE notificacao SET lida_em = CURRENT_TIMESTAMP, atualizado_em = CURRENT_TIMESTAMP
             WHERE idempresa = :company_id AND idusuario = :user AND lida_em IS NULL'
        );
        $statement->execute(['company_id' => $companyId, 'user' => $userId]);
        return $statement->rowCount();
    }

    /** Detecta as condicoes atuais e reconcilia a lista do usuario. */
    private function sync(int $companyId, int $userId): void
    {
        $this->transaction(function () use ($companyId, $userId) {
            $current = [
                ...$this->receivableAlerts($companyId),
                ...$this->payableAlerts($companyId),
                ...$this->stockAlerts($companyId),
            ];

            $upsert = $this->pdo->prepare(
                'INSERT INTO notificacao (idempresa, idusuario, idfilial, titulo, mensagem, tipo, link, chave, situacao)
                 VALUES (:company_id, :user, :branch, :title, :message, :type, :link, :key, 1)
                 ON CONFLICT (idempresa, idusuario, chave) WHERE chave IS NOT NULL
                 DO UPDATE SET titulo = EXCLUDED.titulo, mensagem = EXCLUDED.mensagem,
                               link = EXCLUDED.link, idfilial = EXCLUDED.idfilial,
                               situacao = 1, atualizado_em = CURRENT_TIMESTAMP'
            );
            foreach ($current as $alert) {
                $upsert->execute([
                    'company_id' => $companyId,
                    'user' => $userId,
                    'branch' => $alert['idfilial'],
                    'title' => $alert['titulo'],
                    'message' => $alert['mensagem'],
                    'type' => $alert['tipo'],
                    'link' => $alert['link'],
                    'key' => $alert['chave'],
                ]);
            }

            // Remove as derivadas cuja condicao foi resolvida (titulo pago,
            // estoque reposto...). Notificacoes manuais (chave NULL) ficam.
            $keys = array_column($current, 'chave');
            if ($keys === []) {
                $this->pdo->prepare(
                    'DELETE FROM notificacao WHERE idempresa = :company_id AND idusuario = :user AND chave IS NOT NULL'
                )->execute(['company_id' => $companyId, 'user' => $userId]);
                return;
            }
            $placeholders = implode(',', array_map(fn ($i) => ':k' . $i, array_keys($keys)));
            $params = ['company_id' => $companyId, 'user' => $userId];
            foreach ($keys as $i => $key) {
                $params['k' . $i] = $key;
            }
            $this->pdo->prepare(
                "DELETE FROM notificacao
                  WHERE idempresa = :company_id AND idusuario = :user
                    AND chave IS NOT NULL AND chave NOT IN ($placeholders)"
            )->execute($params);
        });
    }

    /** Titulos a receber vencidos ou vencendo nos proximos dias. */
    private function receivableAlerts(int $companyId): array
    {
        $rows = $this->all(
            "SELECT cr.idconta_receber, cr.valor, cr.data_vencimento, cr.idfilial,
                    COALESCE(c.nome, 'Cliente') AS cliente,
                    (CURRENT_DATE - cr.data_vencimento) AS dias
             FROM conta_receber cr
             LEFT JOIN cliente c ON c.idempresa = cr.idempresa AND c.idcliente = cr.idcliente
             WHERE cr.idempresa = :company_id AND cr.situacao = 1
               AND cr.data_vencimento <= CURRENT_DATE + :days
             ORDER BY cr.data_vencimento
             LIMIT :limit",
            ['company_id' => $companyId, 'days' => self::DUE_SOON_DAYS, 'limit' => self::PER_DETECTOR_LIMIT]
        );
        return array_map(function ($row) {
            $late = (int) $row['dias'] > 0;
            $amount = $this->money($row['valor']);
            return [
                'chave' => ($late ? 'receber_vencido:' : 'receber_vencendo:') . (int) $row['idconta_receber'],
                'tipo' => $late ? 'receber_vencido' : 'receber_vencendo',
                'titulo' => $late ? 'Titulo vencido' : 'Titulo a vencer',
                'mensagem' => sprintf(
                    '%s - %s %s',
                    $row['cliente'],
                    $amount,
                    $late
                        ? 'vencido ha ' . (int) $row['dias'] . ' dia(s)'
                        : $this->dueLabel((int) $row['dias'])
                ),
                'link' => '/receivables',
                'idfilial' => $row['idfilial'] !== null ? (int) $row['idfilial'] : null,
            ];
        }, $rows);
    }

    /** Contas a pagar vencidas ou vencendo nos proximos dias. */
    private function payableAlerts(int $companyId): array
    {
        $rows = $this->all(
            "SELECT cp.idconta_pagar, cp.valor, cp.data_vencimento, cp.idfilial, cp.descricao,
                    COALESCE(f.nome_fantasia, f.razao_social, '') AS fornecedor,
                    (CURRENT_DATE - cp.data_vencimento) AS dias
             FROM conta_pagar cp
             LEFT JOIN fornecedor f ON f.idempresa = cp.idempresa AND f.idfornecedor = cp.idfornecedor
             WHERE cp.idempresa = :company_id AND cp.situacao = 1
               AND cp.data_vencimento <= CURRENT_DATE + :days
             ORDER BY cp.data_vencimento
             LIMIT :limit",
            ['company_id' => $companyId, 'days' => self::DUE_SOON_DAYS, 'limit' => self::PER_DETECTOR_LIMIT]
        );
        return array_map(function ($row) {
            $late = (int) $row['dias'] > 0;
            $who = trim((string) $row['fornecedor']) !== '' ? $row['fornecedor'] : $row['descricao'];
            return [
                'chave' => ($late ? 'pagar_vencido:' : 'pagar_vencendo:') . (int) $row['idconta_pagar'],
                'tipo' => $late ? 'pagar_vencido' : 'pagar_vencendo',
                'titulo' => $late ? 'Conta a pagar vencida' : 'Conta a pagar vencendo',
                'mensagem' => sprintf(
                    '%s - %s %s',
                    $who,
                    $this->money($row['valor']),
                    $late
                        ? 'vencida ha ' . (int) $row['dias'] . ' dia(s)'
                        : $this->dueLabel((int) $row['dias'])
                ),
                'link' => '/finance',
                'idfilial' => $row['idfilial'] !== null ? (int) $row['idfilial'] : null,
            ];
        }, $rows);
    }

    /** Produtos com saldo igual ou abaixo do estoque minimo. */
    private function stockAlerts(int $companyId): array
    {
        $rows = $this->all(
            'SELECT e.idproduto, e.idfilial, e.quantidade, p.nome, p.estoque_minimo, p.unidade, f.nome AS filial
             FROM estoque e
             JOIN produto p ON p.idempresa = e.idempresa AND p.idproduto = e.idproduto
             LEFT JOIN filial f ON f.idempresa = e.idempresa AND f.idfilial = e.idfilial
             WHERE e.idempresa = :company_id AND p.situacao = 1
               AND p.estoque_minimo > 0 AND e.quantidade <= p.estoque_minimo
             ORDER BY (e.quantidade - p.estoque_minimo)
             LIMIT :limit',
            ['company_id' => $companyId, 'limit' => self::PER_DETECTOR_LIMIT]
        );
        return array_map(fn ($row) => [
            'chave' => 'estoque_baixo:' . (int) $row['idproduto'] . ':' . (int) $row['idfilial'],
            'tipo' => 'estoque_baixo',
            'titulo' => (float) $row['quantidade'] <= 0 ? 'Produto sem estoque' : 'Estoque baixo',
            'mensagem' => sprintf(
                '%s - %s %s em %s (minimo %s)',
                $row['nome'],
                $this->quantity($row['quantidade']),
                $row['unidade'],
                $row['filial'] ?? 'filial',
                $this->quantity($row['estoque_minimo'])
            ),
            'link' => '/inventory',
            'idfilial' => (int) $row['idfilial'],
        ], $rows);
    }

    private function dueLabel(int $days): string
    {
        $remaining = -$days;
        if ($remaining <= 0) {
            return 'vence hoje';
        }
        return 'vence em ' . $remaining . ' dia(s)';
    }

    private function money(mixed $value): string
    {
        return 'R$ ' . number_format((float) $value, 2, ',', '.');
    }

    private function quantity(mixed $value): string
    {
        return rtrim(rtrim(number_format((float) $value, 2, ',', '.'), '0'), ',');
    }

    private function transaction(callable $callback): mixed
    {
        $this->pdo->beginTransaction();
        try {
            $result = $callback();
            $this->pdo->commit();
            return $result;
        } catch (Throwable $exception) {
            $this->pdo->rollBack();
            throw $exception;
        }
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
        foreach ($params as $key => $value) {
            $statement->bindValue(
                ':' . $key,
                $value,
                is_int($value) ? PDO::PARAM_INT : PDO::PARAM_STR
            );
        }
        $statement->execute();
        return $statement->fetchAll(PDO::FETCH_ASSOC);
    }
}
