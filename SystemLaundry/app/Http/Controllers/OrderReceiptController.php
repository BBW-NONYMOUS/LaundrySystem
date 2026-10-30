<?php

namespace App\Http\Controllers;

use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\Setting;
use App\Services\QrCodeService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response as HttpResponse;
use Inertia\Inertia;
use Inertia\Response;

class OrderReceiptController extends Controller
{
    /**
     * Printable receipt page (browser print, 80 mm thermal or A4).
     */
    public function show(Order $order, QrCodeService $qr): Response
    {
        return Inertia::render('orders/receipt', [
            'order' => OrderResource::make($this->loadForReceipt($order)),
            'shop' => $this->shop(),
            'trackingQrSvg' => $qr->svg(route('tracking.show', $order->tracking_code), 120),
            'trackingUrl' => route('tracking.show', $order->tracking_code),
        ]);
    }

    /**
     * Same receipt as a PDF sized for an 80 mm thermal printer.
     */
    public function pdf(Order $order, QrCodeService $qr): HttpResponse
    {
        $order = $this->loadForReceipt($order);

        // DomPDF needs a fixed page height: grow the roll length with the number of lines.
        $height = 470 + ($order->items->count() * 30) + ($order->payments->count() * 16);

        return Pdf::loadView('pdf.receipt', [
            'order' => $order,
            'shop' => $this->shop(),
            'trackingQr' => $qr->dataUri(route('tracking.show', $order->tracking_code), 110),
            'trackingUrl' => route('tracking.show', $order->tracking_code),
        ])
            ->setPaper([0, 0, 226.77, $height]) // 80 mm wide
            ->stream("receipt-{$order->order_number}.pdf");
    }

    private function loadForReceipt(Order $order): Order
    {
        return $order->load([
            'customer', 'creator:id,name', 'items',
            'payments' => fn ($payments) => $payments->whereNull('voided_at')->with('receiver:id,name')->oldest('paid_at'),
            'deliveries',
        ]);
    }

    /**
     * @return array<string, string|null>
     */
    private function shop(): array
    {
        return [
            'name' => Setting::get('shop_name'),
            'address' => Setting::get('shop_address'),
            'phone' => Setting::get('shop_phone'),
            'email' => Setting::get('shop_email'),
            'currency_symbol' => Setting::get('currency_symbol', '₱'),
            'receipt_footer' => Setting::get('receipt_footer'),
        ];
    }
}
