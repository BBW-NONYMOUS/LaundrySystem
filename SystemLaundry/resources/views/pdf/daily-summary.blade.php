@php
    /** @var array<string, mixed> $summary */
    $peso = fn ($amount) => $currency.number_format((float) $amount, 2);
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Daily Summary {{ $summary['date'] }}</title>
    <style>
        @page { margin: 32pt; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9pt; color: #111; }
        h1 { font-size: 16pt; margin: 0; }
        h2 { font-size: 10pt; margin: 16pt 0 6pt; text-transform: uppercase; color: #334155; }
        .meta { color: #555; margin-bottom: 14pt; }
        table { width: 100%; border-collapse: collapse; }
        td, th { padding: 4pt 6pt; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .num { text-align: right; }
        .cards td { width: 25%; border: 1px solid #e2e8f0; padding: 8pt; }
        .cards .label { color: #64748b; font-size: 7.5pt; text-transform: uppercase; }
        .cards .value { font-size: 13pt; font-weight: bold; }
        .signature { margin-top: 40pt; }
        .signature td { border: 0; padding-top: 24pt; }
        .line { border-top: 1px solid #000; width: 70%; padding-top: 2pt; }
    </style>
</head>
<body>
    <h1>Daily Transaction Summary</h1>
    <div class="meta">{{ $shopName }} · {{ \Carbon\CarbonImmutable::parse($summary['date'])->format('l, F j, Y') }}</div>

    <table class="cards">
        <tr>
            <td><div class="label">Collected</div><div class="value">{{ $peso($summary['collected']) }}</div></td>
            <td><div class="label">Cash on hand</div><div class="value">{{ $peso($summary['cash_on_hand']) }}</div></td>
            <td><div class="label">Orders received</div><div class="value">{{ $summary['orders_received'] }}</div></td>
            <td><div class="label">Orders released</div><div class="value">{{ $summary['orders_released'] }}</div></td>
        </tr>
    </table>

    <h2>Orders</h2>
    <table>
        <tr><td>Billed (new orders)</td><td class="num">{{ $peso($summary['billed']) }}</td></tr>
        <tr><td>Express orders</td><td class="num">{{ $summary['express_orders'] }}</td></tr>
        <tr><td>Discounts given</td><td class="num">{{ $peso($summary['discounts']) }}</td></tr>
        <tr><td>Cancelled orders</td><td class="num">{{ $summary['orders_cancelled'] }}</td></tr>
        <tr><td>Voided payments</td><td class="num">{{ $summary['voided_count'] }} ({{ $peso($summary['voided_amount']) }})</td></tr>
    </table>

    <h2>Collections by payment method</h2>
    <table>
        <tr><th>Method</th><th class="num">Transactions</th><th class="num">Amount</th></tr>
        @foreach($summary['by_method'] as $method)
            <tr><td>{{ $method['label'] }}</td><td class="num">{{ $method['count'] }}</td><td class="num">{{ $peso($method['amount']) }}</td></tr>
        @endforeach
    </table>

    <h2>Collections by staff</h2>
    <table>
        <tr><th>Staff</th><th class="num">Transactions</th><th class="num">Amount</th></tr>
        @forelse($summary['by_cashier'] as $row)
            <tr><td>{{ $row['name'] }}</td><td class="num">{{ $row['count'] }}</td><td class="num">{{ $peso($row['amount']) }}</td></tr>
        @empty
            <tr><td colspan="3">No payments recorded.</td></tr>
        @endforelse
    </table>

    <table class="signature">
        <tr>
            <td><div class="line">Prepared by (Cashier)</div></td>
            <td><div class="line">Checked by (Owner)</div></td>
        </tr>
    </table>
</body>
</html>
