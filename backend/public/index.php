<?php
require_once '../vendor/autoload.php';
// Load environment variables
$dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
$dotenv->load();
use App\Infrastructures\Config\Config;
use Slim\Factory\AppFactory;
use Psr\Http\Message\ServerRequestInterface as Request;

function sendCorsHeaders(): void
{
    $allowedOrigins = Config::getCorsAllowedOrigins();
    $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
    $allowOrigin = '';

    if (in_array('*', $allowedOrigins, true)) {
        $allowOrigin = $requestOrigin !== '' ? $requestOrigin : '*';
    } elseif ($requestOrigin !== '' && in_array($requestOrigin, $allowedOrigins, true)) {
        $allowOrigin = $requestOrigin;
    }

    if ($allowOrigin === '') {
        return;
    }

    $allowHeaders = $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS'] ?? '';
    if ($allowHeaders === '') {
        $allowHeaders = 'Content-Type, Authorization, X-Requested-With';
    }

    header('Access-Control-Allow-Origin: ' . $allowOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Headers: ' . $allowHeaders);
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Credentials: true');
}

sendCorsHeaders();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Create Slim app
$app = AppFactory::create();

// Add body parsing middleware (para JSON)
$app->addBodyParsingMiddleware();

// Add error middleware
$app->addErrorMiddleware(true, true, true);
// Load routes
require_once '../src/Routes/api.php';
// Run the Slim app
$app->run();
