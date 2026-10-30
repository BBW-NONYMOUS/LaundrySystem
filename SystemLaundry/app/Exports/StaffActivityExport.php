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
 * @phpstan-type StaffRow array{user_id: int, name: string, roles: string, orders_created: int, status_updates: int, payments_count: int, payments_amount: float, trips_completed: int, last_login_at: string|null}
 *
 * @implements WithMapping<StaffRow>
 */
class StaffActivityExport implements FromCollection, ShouldAutoSize, WithHeadings, WithMapping, WithTitle
{
    public const HEADINGS = ['Name', 'Role', 'Orders Created', 'Status Updates', 'Payments', 'Amount Collected', 'Trips Completed', 'Last Login'];

    /**
     * @param  list<StaffRow>  $rows
     */
    public function __construct(private array $rows) {}

    /**
     * @return Collection<int, StaffRow>
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
     * @param  StaffRow  $row
     * @return list<string|int|float>
     */
    public static function row(array $row): array
    {
        return [
            $row['name'], $row['roles'], $row['orders_created'], $row['status_updates'],
            $row['payments_count'], $row['payments_amount'], $row['trips_completed'], $row['last_login_at'] ?? 'Never',
        ];
    }

    public function title(): string
    {
        return 'Staff Activity';
    }
}
