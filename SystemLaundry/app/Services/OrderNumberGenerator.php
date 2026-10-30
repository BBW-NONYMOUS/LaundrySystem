<?php

namespace App\Services;

use App\Models\OrderSequence;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Generates LND-YYYYMMDD-NNNN numbers that restart at 0001 every day.
 *
 * Two cashiers saving at the same moment must never get the same number, so the
 * day's counter row is locked (SELECT ... FOR UPDATE) until the surrounding
 * transaction commits. The UNIQUE index on orders.order_number is the final guard.
 */
class OrderNumberGenerator
{
    public const PREFIX = 'LND';

    public function next(?CarbonInterface $date = null): string
    {
        $date ??= now();
        $day = $date->toDateString();

        return DB::transaction(function () use ($date, $day) {
            // Create today's counter if this is the first order of the day (no-op if it exists).
            OrderSequence::query()->insertOrIgnore(['sequence_date' => $day, 'last_number' => 0]);

            $sequence = OrderSequence::query()->whereKey($day)->lockForUpdate()->firstOrFail();
            $next = $sequence->last_number + 1;

            OrderSequence::query()->whereKey($day)->update(['last_number' => $next]);

            return sprintf('%s-%s-%04d', self::PREFIX, $date->format('Ymd'), $next);
        });
    }
}
