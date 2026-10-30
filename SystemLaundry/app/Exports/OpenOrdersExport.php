<?php

namespace App\Exports;

use App\Models\Order;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithTitle;

/**
 * Pending orders report: everything not yet completed, delivered or cancelled.
 *
 * @implements WithMapping<Order>
 */
class OpenOrdersExport implements FromQuery, ShouldAutoSize, WithHeadings, WithMapping, WithTitle
{
    public const HEADINGS = ['Order #', 'Customer', 'Phone', 'Status', 'Express', 'Received', 'Due', 'Total', 'Paid', 'Balance', 'Overdue'];

    /**
     * @return Builder<Order>
     */
    public function query(): Builder
    {
        // Unique tie-breaker (id) keeps chunked exports from skipping/duplicating rows.
        return Order::query()->open()->with('customer:id,name,phone')->orderByRaw('due_at IS NULL, due_at')->orderBy('id');
    }

    /**
     * @return list<string>
     */
    public function headings(): array
    {
        return self::HEADINGS;
    }

    /**
     * @param  Order  $row
     * @return list<string|float>
     */
    public function map(mixed $row): array
    {
        return [
            $row->order_number,
            $row->customer->name,
            $row->customer->phone,
            $row->status->label(),
            $row->is_express ? 'Yes' : 'No',
            $row->received_at?->format('Y-m-d H:i') ?? '—',
            $row->due_at?->format('Y-m-d H:i') ?? '—',
            (float) $row->total_amount,
            (float) $row->amount_paid,
            $row->balance,
            $row->isOverdue() ? 'Yes' : 'No',
        ];
    }

    public function title(): string
    {
        return 'Pending Orders';
    }
}
