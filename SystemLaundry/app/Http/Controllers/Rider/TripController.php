<?php

namespace App\Http\Controllers\Rider;

use App\Enums\DeliveryStatus;
use App\Enums\PaymentMethod;
use App\Http\Controllers\Controller;
use App\Http\Requests\Deliveries\CompleteTripRequest;
use App\Http\Requests\Deliveries\FailTripRequest;
use App\Http\Resources\DeliveryResource;
use App\Models\Delivery;
use App\Services\DeliveryService;
use App\Services\PaymentService;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The rider's phone screen: today's trips with Start / Done / Failed buttons.
 */
class TripController extends Controller
{
    public function index(Request $request): Response
    {
        $rider = $request->user();
        $relations = ['order.customer:id,name,phone', 'order.items'];

        return Inertia::render('rider/deliveries', [
            'pending' => DeliveryResource::collection(
                Delivery::query()->forRider($rider)->pending()->with($relations)->orderBy('scheduled_at')->get(),
            ),
            'completedToday' => DeliveryResource::collection(
                Delivery::query()->forRider($rider)
                    ->whereIn('status', [DeliveryStatus::Completed, DeliveryStatus::Failed])
                    ->where('updated_at', '>=', CarbonImmutable::today())
                    ->with($relations)->latest('updated_at')->get(),
            ),
            'paymentMethods' => array_map(fn (PaymentMethod $method) => [
                'value' => $method->value,
                'label' => $method->label(),
                'requires_reference' => $method->requiresReference(),
            ], [PaymentMethod::Cash, PaymentMethod::GCash, PaymentMethod::Maya]),
        ]);
    }

    public function start(Request $request, Delivery $delivery, DeliveryService $deliveries): RedirectResponse
    {
        Gate::authorize('ride', $delivery);

        $deliveries->start($delivery, $request->user());

        $this->toast("On the way: {$delivery->order->order_number}.");

        return back();
    }

    /**
     * Records any cash-on-delivery first, then completes the trip — both or neither.
     */
    public function complete(CompleteTripRequest $request, Delivery $delivery, DeliveryService $deliveries, PaymentService $payments): RedirectResponse
    {
        DB::transaction(function () use ($request, $delivery, $deliveries, $payments) {
            if ($request->filled('collected_amount')) {
                $payments->record(
                    order: $delivery->order,
                    method: PaymentMethod::from($request->string('payment_method')->toString()),
                    amount: (float) $request->input('collected_amount'),
                    receivedBy: $request->user(),
                    tendered: $request->filled('amount_tendered') ? (float) $request->input('amount_tendered') : null,
                    reference: $request->input('reference_number'),
                    notes: 'Collected on delivery',
                );
            }

            $deliveries->complete($delivery, $request->user());
        });

        $this->toast("{$delivery->type->label()} completed: {$delivery->order->order_number}.");

        return back();
    }

    public function fail(FailTripRequest $request, Delivery $delivery, DeliveryService $deliveries): RedirectResponse
    {
        $deliveries->fail($delivery, $request->user(), $request->string('reason')->toString());

        $this->toast('Marked as failed. The counter will reschedule it.', 'warning');

        return back();
    }
}
