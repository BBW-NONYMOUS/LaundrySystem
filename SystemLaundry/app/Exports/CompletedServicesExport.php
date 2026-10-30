<?php

namespace App\Exports;

use App\Enums\PricingUnit;
use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * @implements WithMapping<array{service: string, unit: string, quantity: float, orders: int, revenue: float}>
 */
class CompletedServicesExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithTitle
{
    public const HEADINGS = ['Service', 'Unit', 'Quantity', 'Orders', 'Revenue'];

    /**
     * @param  list<array{service: string, unit: string, quantity: float, orders: int, revenue: float}>  $rows
     */
    public function __construct(private array $rows) {}

    /**
     * @return Collection<int, array{service: string, unit: string, quantity: float, orders: int, revenue: float}>
     */
    public function collection(): Enumerable
    {
        return collect($this->rows);
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return self::HEADINGS;
    }

    /**
     * @return list<string|int|float>
     */
    public function map(mixed $row): array
    {
        return self::row($row);
    }

    /**
     * @param  array{service: string, unit: string, quantity: float, orders: int, revenue: float}  $row
     * @return list<string|int|float>
     */
    public static function row(array $row): array
    {
        return [$row['service'], PricingUnit::tryFrom($row['unit'])?->shortLabel() ?? $row['unit'], $row['quantity'], $row['orders'], $row['revenue']];
    }

    public function title(): string
    {
        return 'Completed Services';
    }
}
