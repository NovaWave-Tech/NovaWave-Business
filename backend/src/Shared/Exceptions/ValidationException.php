<?php

namespace App\Shared\Exceptions;

use RuntimeException;

class ValidationException extends RuntimeException
{
    public function __construct(string $message, private readonly array $errors = [])
    {
        parent::__construct($message, 422);
    }

    public function errors(): array
    {
        return $this->errors;
    }
}
