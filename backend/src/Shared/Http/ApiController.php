<?php

namespace App\Shared\Http;

use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

abstract class ApiController
{
    protected function json(Response $response, array $payload, int $status = 200): Response
    {
        $response->getBody()->write(json_encode($payload, JSON_UNESCAPED_UNICODE));

        return $response
            ->withHeader('Content-Type', 'application/json')
            ->withStatus($status);
    }

    protected function success(Response $response, array $data = [], string $message = 'OK', int $status = 200): Response
    {
        return $this->json($response, [
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function error(Response $response, string $message, int $status = 400, array $details = []): Response
    {
        $payload = [
            'success' => false,
            'error' => $message,
        ];

        if ($details !== []) {
            $payload['details'] = $details;
        }

        return $this->json($response, $payload, $status);
    }

    protected function body(Request $request): array
    {
        $parsedBody = $request->getParsedBody();

        if (is_array($parsedBody)) {
            return $parsedBody;
        }

        $body = json_decode((string) $request->getBody(), true);

        return is_array($body) ? $body : [];
    }
}
