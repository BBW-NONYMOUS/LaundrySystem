@php
    /** @var \App\Models\Order $order */
    $peso = fn ($amount) => $shop['currency_symbol'].number_format((float) $amount, 2);
    $delivery = $order->deliveries->firstWhere('type', \App\Enums\DeliveryType::Delivery);
@endphp
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Receipt {{ $order->order_number }}</title>
    <style>
        /* 80 mm thermal receipt. DejaVu Sans ships with DomPDF and includes the peso sign. */
        @page { margin: 10pt 8pt; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 8pt; color: #000; }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .muted { color: #444; }
        .shop { font-size: 11pt; font-weight: bold; }
        .order-no { font-size: 10pt; font-weight: bold; letter-spacing: .5pt; }
        hr { border: 0; border-top: 1px dashed #000; margin: 5pt 0; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 1pt 0; vertical-align: top; }
        .total td { font-size: 10pt; font-weight: bold; padding-top: 3pt; }
        .express { border: 1px solid #000; padding: 1pt 4pt; font-weight: bold; }
    </style>
</head>
<body>
    <div class="center">
        <div class="shop">{{ $shop['name'] }}</div>
        <div class="muted">{{ $shop['address'] }}</div>
        <div class="muted">{{ $shop['phone'] }}@if($shop['email']) · {{ $shop['email'] }}@endif</div>
    </div>

    <hr>

    <div class="center">
        <div class="order-no">{{ $order->order_number }}</div>
        @if($order->is_express)<span class="express">EXPRESS</span>@endif
    </div>

    <table>
        <tr><td>Customer</td><td class="right bold">{{ $order->customer->name }}</td></tr>
        <tr><td>Phone</td><td class="right">{{ $order->customer->phone }}</td></tr>
        <tr><td>Received</td><td class="right">{{ $order->received_at?->format('M j, Y g:i A') ?? 'For pickup' }}</td></tr>
        <tr><td>Ready by</td><td class="right bold">{{ $order->due_at?->format('M j, Y g:i A') ?? '—' }}</td></tr>
        @if($delivery)
            <tr><td>Delivery</td><td class="right">{{ $delivery->scheduled_at->format('M j, g:i A') }}</td></tr>
        @endif
        <tr><td>Cashier</td><td class="right">{{ $order->creator?->name }}</td></tr>
    </table>

    <hr>

    <table>
        @foreach($order->items as $item)
            <tr>
                <td colspan="2" class="bold">{{ $item->service_name }}</td>
            </tr>
            <tr>
                <td class="muted">
                    {{ rtrim(rtrim(number_format((float) $item->quantity, 2), '0'), '.') }} {{ $item->pricing_unit->shortLabel() }}
                    × {{ $peso($item->unit_price) }}
                    @if($item->piece_count) · {{ $item->piece_count }} pcs @endif
                </td>
                <td class="right">{{ $peso($item->line_total) }}</td>
            </tr>
        @endforeach
    </table>

    <hr>

    <table>
        <tr><td>Subtotal</td><td class="right">{{ $peso($order->subtotal) }}</td></tr>
        @if((float) $order->express_fee > 0)
            <tr><td>Express fee</td><td class="right">{{ $peso($order->express_fee) }}</td></tr>
        @endif
        @if((float) $order->delivery_fee > 0)
            <tr><td>Pickup/Delivery</td><td class="right">{{ $peso($order->delivery_fee) }}</td></tr>
        @endif
        @if((float) $order->discount_amount > 0)
            <tr><td>Discount ({{ $order->discount_reason }})</td><td class="right">-{{ $peso($order->discount_amount) }}</td></tr>
        @endif
        <tr class="total"><td>TOTAL</td><td class="right">{{ $peso($order->total_amount) }}</td></tr>
    </table>

    @if($order->payments->isNotEmpty())
        <hr>
        <table>
            @foreach($order->payments as $payment)
                <tr>
                    <td>{{ $payment->method->label() }} · {{ $payment->paid_at->format('M j g:i A') }}</td>
                    <td class="right">{{ $peso($payment->amount) }}</td>
                </tr>
                @if($payment->amount_tendered !== null && $payment->change > 0)
                    <tr class="muted"><td>&nbsp;&nbsp;Cash {{ $peso($payment->amount_tendered) }} · Change</td><td class="right">{{ $peso($payment->change) }}</td></tr>
                @endif
                @if($payment->reference_number)
                    <tr class="muted"><td colspan="2">&nbsp;&nbsp;Ref: {{ $payment->reference_number }}</td></tr>
                @endif
            @endforeach
        </table>
    @endif

    <table>
        <tr class="total">
            <td>{{ $order->balance > 0 ? 'BALANCE DUE' : 'PAID IN FULL' }}</td>
            <td class="right">{{ $order->balance > 0 ? $peso($order->balance) : '' }}</td>
        </tr>
    </table>

    @if($order->special_instructions)
        <hr>
        <div><span class="bold">Notes:</span> {{ $order->special_instructions }}</div>
    @endif

    <hr>

    <div class="center">
        <img src="{{ $trackingQr }}" width="80" height="80" alt="">
        <div class="muted">Scan to track your laundry</div>
        <div class="muted" style="font-size: 6.5pt;">{{ $trackingUrl }}</div>
    </div>

    @if($shop['receipt_footer'])
        <hr>
        <div class="center muted">{{ $shop['receipt_footer'] }}</div>
    @endif
</body>
</html>
