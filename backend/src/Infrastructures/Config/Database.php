<?php

namespace App\Infrastructures\Config;

use PDO;

class Database
{
    private static $_pdo;

    private static function writeLog(string $filename, array $data): void
    {
        $logDir = dirname($filename);

        if (!is_dir($logDir)) {
            @mkdir($logDir, 0775, true);
        }

        @file_put_contents($filename, print_r($data, true), FILE_APPEND);
    }

    /**
     * Chama o banco cadastro em Config.php
     * se parametro $db for passado, e for uma numero idFilial, chama o banco da filial
     * @param string $db
     */
    public static function getInstance()
    {
        if (!self::$_pdo) {  // se for um número, é uma filial
            $cx = Config::getDbDriver() . ":host=" . Config::getDbHost() . ";port=" . Config::getDbPort() . ";dbname=" . Config::getDbName();
            self::$_pdo = new \PDO($cx, Config::getDbUser(), Config::getDbPassword());
            self::$_pdo->setAttribute(\PDO::ATTR_EMULATE_PREPARES, true);
            self::$_pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }

        return self::$_pdo;
    }

    /**
     * Retorna ou executa um SQL
     * se penultimo for false retorna SQL com parametros subtituidos
     * ultimo parametro ira logar SQL e retorno do mesmo nos LOGs caso seja true
     * sempre verificar tipos dos campos nos Parametros do SQL EX:int,string ...
     * retorno array ['retorno']
     * erro em ['error']
     * @param array   $params
     * @param string  $sqlnome
     * @param boolean $exec
     * @param boolean $log
     *
     * @return array ['retorno']
     */
    public static function switchParams($params, $sqlnome, $exec = false, $log = false, $sqlPrm = '', $asObject = 0, $transacao = true)
    {

        $sql = $sqlPrm != '' ? $sqlPrm : file_get_contents(__DIR__ . '/../../Domains/SQL/' . $sqlnome . '.sql');
        $res = [
            'retorno' => false,
            'error' => false,
        ];
        $pdo = null;

        try {
            $pdo = self::getInstance();

            $stmt = $pdo->prepare($sql);

            preg_match_all('/(?<!:):([a-zA-Z_][a-zA-Z0-9_]*)/', $sql, $matches);
            $sqlParams = array_flip($matches[1] ?? []);

            foreach ($params as $nome => $valor) {
                if (!isset($sqlParams[$nome])) {
                    continue;
                }

                $tipo = is_int($valor)
                    ? PDO::PARAM_INT
                    : PDO::PARAM_STR;

                $stmt->bindValue(':' . $nome, $valor, $tipo);
            }

            if ($exec) {
                if ($transacao) $pdo->beginTransaction();

                $stmt->execute();

                if ($asObject == 1) {
                    $res['retorno'] = $stmt->fetchObject();
                } else {
                    $res['retorno'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
                }

                if ($transacao) $pdo->commit();
            } else {
                $res['retorno'] = $sql;
            }

            if ($log) {
                $logjv = [
                    'data' => date('Y-m-d H:i:s'),
                    'sql'  => $sql,
                    'params' => $params,
                    'res'  => $res['retorno']
                ];
                self::writeLog(__DIR__ . '/../../../logs/exec' . date('Y-m-d') . '-sql.txt', $logjv);
            }
        } catch (\Exception $e) {
            if ($transacao && $pdo instanceof PDO && $pdo->inTransaction()) {
                $pdo->rollBack();
            }
            $logjv = [
                'data' => date('Y-m-d H:i:s'),
                'msg'  => $e->getMessage(),
                'sql' => $sql
            ];
            self::writeLog(__DIR__ . '/../../../logs/error' . date('Y-m-d') . '-sql.txt', $logjv);
            $res['error'] = $e->getMessage();
        }

        return $res;
    }

    /**
     * Loga dados em arquivo temporário sem interromper o fluxo HTTP (debug seguro).
     */
    public static function dd(mixed $data, ?string $label = null): void
    {
        $projectRoot = dirname(__DIR__, 3);
        $defaultDir = $projectRoot . DIRECTORY_SEPARATOR . 'public';

        // Aceita caminho via env, mas faz fallback seguro para /public se o path for invalido ou relativo (docker).
        $envDir = $_ENV['DD_LOG_DIR'] ?? null;
        if ($envDir && !preg_match('#^([a-zA-Z]:\\\\|/)#', $envDir)) {
            $envDir = $projectRoot . DIRECTORY_SEPARATOR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $envDir);
        }

        $baseDir = $envDir ?: $defaultDir;

        // So usa o caminho do env se ele ja existir e for gravavel; senao volta para /public.
        if ($envDir && (!is_dir($baseDir) || !is_writable($baseDir))) {
            $baseDir = $defaultDir;
        }

        if (!is_dir($baseDir)) {
            @mkdir($baseDir, 0775, true);
        }

        if (!is_dir($baseDir) || !is_writable($baseDir)) {
            $baseDir = sys_get_temp_dir();
        }

        $filename = rtrim($baseDir, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'dd-' . date('Y-m-d') . '.log';
        $context = print_r($data, true);
        $prefix = sprintf('[%s]%s', date('Y-m-d H:i:s'), $label ? " {$label}" : '');
        $payload = $prefix . PHP_EOL . $context . PHP_EOL . PHP_EOL;

        if (file_put_contents($filename, $payload, FILE_APPEND) === false) {
            error_log('BaseRepository::dd - nao foi possivel gravar em ' . $filename);
        }
    }
}

