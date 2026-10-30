<?php

namespace App\Exports;

use Illuminate\Support\Collection;
use Illuminate\Support\Enumerable;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * @implements WithMapping<array{date: string, orders: int, billed: float, express_fees: float, discounts: float, collected: float}>
 */
class SalesReportExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithTitle
{
    public const HEADINGS = ['Date', 'Orders', 'Billed', 'Express Fees', 'Discounts', 'Collected'];

    /**
     * @param  list<array{date: string, orders: int, billed: float, express_fees: float, discounts: float, collected: float}>  $rows
     */
    public function __construct(private array $rows) {}

    /**
     * @return Collection<int, array{date: string, orders: int, billed: float, express_fees: float, discounts: float, collected: float}>
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
     * Shared by the Excel and PDF exports.
     *
     * @param  array{date: string, orders: int, billed: float, express_fees: float, discounts: float, collected: float}  $row
     * @return list<string|int|float>
     */
    public static function row(array $row): array
    {
        return [$row['date'], $row['orders'], $row['billed'], $row['express_fees'], $row['discounts'], $row['collected']];
    }

    public function title(): string
    {
        return 'Sales';
    }
}
