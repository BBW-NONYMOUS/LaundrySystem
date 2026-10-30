@php
    /**
     * Generic tabular report.
     * @var string $title  @var string $period  @var list<string> $columns  @var list<list<string|int|float>> $rows
     */
    $format = fn ($value) => is_float($value) ? number_format($value, 2) : $value;
    // Sum numeric columns (except the first, which is a label) for a totals row.
    $totals = [];
    foreach ($columns as $index => $column) {
        $numbers = array_filter(array_column($rows, $index), fn ($v) => is_int($v) || is_float($v));
        $totals[$index] = $index > 0 && count($numbers) === count($rows) && $rows !== [] ? array_sum($numbers) : null;
    }
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
    <style>
        @page { margin: 28pt 28pt 36pt; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 8pt; color: #111; }
        h1 { font-size: 15pt; margin: 0; }
        .meta { color: #555; margin: 2pt 0 12pt; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #f1f5f9; text-align: left; font-size: 7.5pt; text-transform: uppercase; color: #334155; }
        th, td { border-bottom: 1px solid #e2e8f0; padding: 4pt 5pt; }
        td.num, th.num { text-align: right; }
        tr.totals td { font-weight: bold; border-top: 2px solid #334155; border-bottom: 0; }
        .footer { position: fixed; bottom: -20pt; left: 0; right: 0; color: #777; font-size: 7pt; }
    </style>
</head>
<body>
    <h1>{{ $title }}</h1>
    <div class="meta">{{ $shopName }} · {{ $period }} · Generated {{ now()->format('M j, Y g:i A') }}</div>

    <table>
        <thead>
            <tr>
                @foreach($columns as $index => $column)
                    <th class="{{ $totals[$index] !== null ? 'num' : '' }}">{{ $column }}</th>
                @endforeach
            </tr>
        </thead>
        <tbody>
            @forelse($rows as $row)
                <tr>
                    @foreach($row as $index => $value)
                        <td class="{{ is_int($value) || is_float($value) ? 'num' : '' }}">{{ $format($value) }}</td>
                    @endforeach
                </tr>
            @empty
                <tr><td colspan="{{ count($columns) }}">No records for this period.</td></tr>
            @endforelse
            @if($rows !== [] && array_filter($totals, fn ($t) => $t !== null) !== [])
                <tr class="totals">
                    @foreach($columns as $index => $column)
                        <td class="{{ $totals[$index] !== null ? 'num' : '' }}">{{ $index === 0 ? 'Total' : ($totals[$index] !== null ? $format($totals[$index]) : '') }}</td>
                    @endforeach
                </tr>
            @endif
        </tbody>
    </table>

    <div class="footer">Amounts in {{ $currency }}</div>
</body>
</html>
