<?php

namespace App\Modules\Notifications\Services;

use App\Modules\Notifications\Repositories\NotificationRepository;
use InvalidArgumentException;

final class NotificationService
{
    private readonly NotificationRepository $repository;

    public function __construct(?NotificationRepository $repository = null)
    {
        $this->repository = $repository ?? new NotificationRepository();
    }

    public function index(int $companyId, int $userId): array
    {
        return $this->repository->index($companyId, $userId);
    }

    public function markRead(int $companyId, int $userId, int $id): void
    {
        if ($id <= 0) {
            throw new InvalidArgumentException('Notificacao invalida');
        }
        $this->repository->markRead($companyId, $userId, $id);
    }

    public function markAllRead(int $companyId, int $userId): array
    {
        return ['lidas' => $this->repository->markAllRead($companyId, $userId)];
    }
}
