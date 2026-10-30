@php
    /** @var \App\Models\Order $order */
    $pieces = $order->items->sum('piece_count');
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Tag {{ $order->order_number }}</title>
    <style>
        /* 4 x 3 inch bag label */
        @page { margin: 10pt; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 8pt; color: #000; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; }
        .order-no { font-size: 13pt; font-weight: bold; letter-spacing: .5pt; }
        .customer { font-size: 11pt; font-weight: bold; margin-top: 4pt; }
        .label { color: #444; font-size: 7pt; text-transform: uppercase; margin-top: 5pt; }
        .value { font-size: 9pt; font-weight: bold; }
        .express { display: inline-block; margin-top: 4pt; border: 2px solid #000; padding: 1pt 5pt; font-size: 10pt; font-weight: bold; }
        .shop { color: #444; font-size: 7pt; margin-top: 6pt; }
    </style>
</head>
<body>
    <table>
        <tr>
            <td style="width: 58%;">
                <div class="order-no">{{ $order->order_number }}</div>
                <div class="customer">{{ $order->customer->name }}</div>
                <div>{{ $order->customer->phone }}</div>

                <div class="label">Due</div>
                <div class="value">{{ $order->due_at?->format('D, M j · g:i A') ?? 'On arrival' }}</div>

                <div class="label">Items</div>
                <div class="value">
                    {{ $order->items->map(fn ($item) => $item->service_name.' '.rtrim(rtrim(number_format((float) $item->quantity, 2), '0'), '.').$item->pricing_unit->shortLabel())->implode(', ') ?: '—' }}
                </div>

                @if($pieces > 0)
                    <div class="label">Piece count</div>
                    <div class="value">{{ $pieces }} pcs</div>
                @endif

                @if($order->is_express)
                    <div class="express">EXPRESS</div>
                @endif

                <div class="shop">{{ $shopName }}</div>
            </td>
            <td style="width: 42%; text-align: right;">
                <img src="{{ $qr }}" width="110" height="110" alt="">
                <div style="font-size: 6.5pt; color: #444;">Scan to update status</div>
            </td>
        </tr>
    </table>
</body>
</html>
