<?php

namespace App\Http\Controllers;

use App\Enums\PaymentMethod;
use App\Http\Requests\Payments\StorePaymentRequest;
use App\Http\Requests\Payments\VoidPaymentRequest;
use App\Http\Resources\PaymentResource;
use App\Models\Order;
use App\Models\Payment;
use App\Models\Setting;
use App\Services\PaymentService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    /**
     * Payment history (feature: payment history).
     */
    public function index(Request $request): Response
    {
        $query = Payment::query()->with(['order.customer:id,name', 'receiver:id,name', 'voider:id,name']);

        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(function (Builder $query) use ($search) {
                $query->where('reference_number', 'like', "%{$search}%")
                    ->orWhereHas('order', fn (Builder $orders) => $orders
                        ->where('order_number', 'like', "%{$search}%")
                        ->orWhereHas('customer', fn (Builder $customers) => $customers->search($search)));
            });
        }

        if (PaymentMethod::tryFrom($request->string('method')->toString()) !== null) {
            $query->where('method', $request->string('method')->toString());
        }

        if ($request->filled('voided') && $request->boolean('voided')) {
            $query->whereNotNull('voided_at');
        } elseif ($request->filled('voided')) {
            $query->whereNull('voided_at');
        }

        if ($request->filled('from')) {
            $query->where('paid_at', '>=', $request->date('from')?->startOfDay());
        }

        if ($request->filled('to')) {
            $query->where('paid_at', '<=', $request->date('to')?->endOfDay());
        }

        $total = round((float) (clone $query)->whereNull('voided_at')->sum('amount'), 2);

        $this->applySort($query, $request, ['paid_at' => 'paid_at', 'amount' => 'amount'], default: 'paid_at');

        return Inertia::render('payments/index', [
            'payments' => PaymentResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => $this->filters($request, ['search', 'method', 'voided', 'from', 'to']),
            'totalCollected' => $total,
            'methods' => array_map(fn (PaymentMethod $method) => ['value' => $method->value, 'label' => $method->label()], PaymentMethod::cases()),
        ]);
    }

    public function store(StorePaymentRequest $request, Order $order, PaymentService $payments): RedirectResponse
    {
        $payment = $payments->record(
            order: $order,
            method: $request->paymentMethod(),
            amount: (float) $request->input('amount'),
            receivedBy: $request->user(),
            tendered: $request->filled('amount_tendered') ? (float) $request->input('amount_tendered') : null,
            reference: $request->input('reference_number'),
            notes: $request->input('notes'),
        );

        $symbol = Setting::get('currency_symbol', '₱');
        $change = $payment->change > 0 ? " Change: {$symbol}".number_format($payment->change, 2).'.' : '';

        $this->toast("Payment of {$symbol}".number_format((float) $payment->amount, 2)." recorded.{$change}");

        return back();
    }

    public function void(VoidPaymentRequest $request, Payment $payment, PaymentService $payments): RedirectResponse
    {
        $payments->void($payment, $request->user(), $request->string('reason')->toString());

        $this->toast('Payment voided.');

        return back();
    }
}
