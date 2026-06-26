<?php

namespace App\Modules\Companies\Controllers;

use App\Shared\Http\ApiController;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;

class CompanyController extends ApiController
{
    public function index(Request $request, Response $response): Response
    {
        return $this->success($response, [], 'Modulo de empresas preparado para implementacao');
    }
}
