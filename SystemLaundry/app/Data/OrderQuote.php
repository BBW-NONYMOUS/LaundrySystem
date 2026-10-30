<?php

namespace App\Data;

use Carbon\CarbonImmutable;

/**
 * Result of pricing a set of items: the line snapshots to store plus the totals and due date.
 */
final readonly class OrderQuote
{
    /**
     * @param  list<array<string, mixed>>  $lines  OrderItem attributes ready to insert
     */
    public function __construct(
        public array $lines,
        public OrderTotals $totals,
        public ?CarbonImmutable $dueAt,
    ) {}
}
