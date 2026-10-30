<?php

namespace App\Services;

use App\Enums\BookingStatus;
use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use App\Enums\Permission;
use App\Enums\PickupSlot;
use App\Models\BookingRequest;
use App\Models\Customer;
use App\Models\Delivery;
use App\Models\Order;
use App\Models\Service;
use App\Models\Setting;
use App\Models\User;
use App\Notifications\BookingConfirmed;
use App\Notifications\BookingDeclined;
use App\Notifications\BookingReceived;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\WebsiteInboxAlert;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

/**
 * Website pickup bookings: which slots are open, saving guest requests, and turning them
 * into real orders (or declining them) from the staff inbox.
 */
class BookingService
{
    /** Guests can book today up to two weeks ahead. */
    public const DAYS_AHEAD = 14;

    /** Riders need at least this much notice before a slot starts. */
    public const MIN_NOTICE_MINUTES = 60;

    /** Stops one number from filling the calendar with unconfirmed requests. */
    public const MAX_PENDING_PER_PHONE = 3;

    public function __construct(private OrderService $orders) {}

    /**
     * Free places per slot for a date. Taken = pending website requests + pickup trips
     * already scheduled in that slot (from the counter, portal or confirmed requests).
     *
     * @return list<array{value: string, label: string, window: string, remaining: int, available: bool, reason: string|null}>
     */
    public function availability(CarbonInterface $date): array
    {
        $capacity = max(Setting::int('pickup_slot_capacity'), 1);
        $day = CarbonImmutable::parse($date->toDateString());

        return array_map(function (PickupSlot $slot) use ($capacity, $day) {
            $start = $day->setTimeFromTimeString($slot->value);
            $taken = BookingRequest::query()->holdingSlot($day, $slot)->count()
                + Delivery::query()
                    ->where('type', DeliveryType::Pickup)
                    ->whereIn('status', [DeliveryStatus::Scheduled, DeliveryStatus::InTransit])
                    ->whereBetween('scheduled_at', [$start, $start->addHours(2)->subSecond()])
                    ->count();
            $remaining = max($capacity - $taken, 0);
            $tooLate = $start->lessThan(now()->addMinutes(self::MIN_NOTICE_MINUTES));

            return [
                'value' => $slot->value,
                'label' => $slot->label(),
                'window' => $slot->window(),
                'remaining' => $tooLate ? 0 : $remaining,
                'available' => ! $tooLate && $remaining > 0,
                'reason' => $tooLate ? 'Too late to book today' : ($remaining === 0 ? 'Fully booked' : null),
            ];
        }, PickupSlot::cases());
    }

    /**
     * Dates shown in the booking form, each flagged when every slot is gone.
     *
     * @return list<array{date: string, available: bool}>
     */
    public function bookableDates(): array
    {
        $dates = [];

        for ($offset = 0; $offset <= self::DAYS_AHEAD; $offset++) {
            $date = CarbonImmutable::today()->addDays($offset);
            $dates[] = [
                'date' => $date->toDateString(),
                'available' => collect($this->availability($date))->contains('available', true),
            ];
        }

        return $dates;
    }

    /**
     * Save a guest request. A short lock per slot stops two people from both taking
     * the last place at the same moment.
     *
     * @param  array{name: string, phone: string, email: string|null, address: string, pickup_date: string, time_slot: string, service_id: int|null, estimated_quantity: float|null, is_express: bool, wants_delivery: bool, special_instructions: string|null}  $data
     */
    public function create(array $data, ?string $ipAddress): BookingRequest
    {
        $date = CarbonImmutable::parse($data['pickup_date']);
        $slot = PickupSlot::from($data['time_slot']);
        $phone = (string) Customer::normalizePhone($data['phone']);

        $pending = BookingRequest::query()->pending()->where('phone', $phone)->count();

        if ($pending >= self::MAX_PENDING_PER_PHONE) {
            throw ValidationException::withMessages([
                'phone' => 'This number already has '.self::MAX_PENDING_PER_PHONE.' pickup requests waiting. Please call us to change them.',
            ]);
        }

        return Cache::lock("pickup-slot:{$date->toDateString()}:{$slot->value}", 10)->block(5, function () use ($data, $date, $slot, $phone, $ipAddress) {
            $slotInfo = collect($this->availability($date))->firstWhere('value', $slot->value);

            if (! ($slotInfo['available'] ?? false)) {
                throw ValidationException::withMessages([
                    'time_slot' => 'Sorry, that time slot just filled up. Please choose another one.',
                ]);
            }

            $booking = BookingRequest::query()->create([
                'reference' => BookingRequest::generateReference(),
                'status' => BookingStatus::Pending,
                'name' => $data['name'],
                'phone' => $phone,
                'email' => $data['email'],
                'address' => $data['address'],
                'pickup_date' => $date->toDateString(),
                'time_slot' => $slot,
                'service_id' => $data['service_id'],
                'estimated_quantity' => $data['estimated_quantity'],
                'is_express' => $data['is_express'],
                'wants_delivery' => $data['wants_delivery'],
                'special_instructions' => $data['special_instructions'],
                // Recognize returning customers right away so staff see their history.
                'customer_id' => Customer::query()->where('phone', $phone)->value('id'),
                'ip_address' => $ipAddress,
            ]);

            $this->notifyGuest($booking, new BookingReceived($booking));
            $this->notifyStaff(
                'New pickup request',
                "{$booking->name} · {$booking->pickup_date->format('D, M j')} {$booking->time_slot->label()}",
                route('booking-requests.index', absolute: false),
            );

            return $booking;
        });
    }

    /**
     * Staff accept the request: find or create the customer by mobile number and create the
     * For Pickup order + pickup trip through OrderService (same rules as the counter).
     */
    public function confirm(
        BookingRequest $booking,
        User $actor,
        ?User $rider = null,
        ?CarbonInterface $pickupDate = null,
        ?PickupSlot $slot = null,
    ): Order {
        $this->ensurePending($booking);

        return DB::transaction(function () use ($booking, $actor, $rider, $pickupDate, $slot) {
            if ($pickupDate !== null || $slot !== null) {
                $booking->update([
                    'pickup_date' => ($pickupDate ?? $booking->pickup_date)->toDateString(),
                    'time_slot' => $slot ?? $booking->time_slot,
                ]);
            }

            if ($booking->pickup_date->isBefore(CarbonImmutable::today())) {
                throw ValidationException::withMessages([
                    'pickup_date' => 'This pickup date has passed. Choose a new date before confirming.',
                ]);
            }

            $customer = Customer::query()->firstOrCreate(
                ['phone' => $booking->phone],
                ['name' => $booking->name, 'email' => $booking->email, 'address' => $booking->address],
            );

            $order = $this->orders->create([
                'customer_id' => $customer->id,
                'is_express' => $booking->is_express,
                'special_instructions' => $this->instructionsFor($booking),
                'pickup' => [
                    'scheduled_at' => $booking->scheduled_at->toDateTimeString(),
                    'address' => $booking->address,
                    'contact_phone' => $booking->phone,
                    'rider_id' => $rider?->id,
                ],
            ], $actor);

            $booking->update([
                'status' => BookingStatus::Confirmed,
                'customer_id' => $customer->id,
                'order_id' => $order->id,
                'handled_by' => $actor->id,
                'handled_at' => now(),
            ]);

            $this->notifyGuest($booking, new BookingConfirmed($booking->load('order')));

            return $order;
        });
    }

    public function decline(BookingRequest $booking, User $actor, string $reason): void
    {
        $this->ensurePending($booking);

        $booking->update([
            'status' => BookingStatus::Declined,
            'decline_reason' => $reason,
            'handled_by' => $actor->id,
            'handled_at' => now(),
        ]);

        $this->notifyGuest($booking, new BookingDeclined($booking));
    }

    /**
     * The customer asked to cancel (by phone): no message is sent back.
     */
    public function cancel(BookingRequest $booking, User $actor, string $reason): void
    {
        $this->ensurePending($booking);

        $booking->update([
            'status' => BookingStatus::Cancelled,
            'decline_reason' => $reason,
            'handled_by' => $actor->id,
            'handled_at' => now(),
        ]);
    }

    /**
     * Guests may not be customers yet, so send to the request's own phone/email.
     */
    public function notifyGuest(BookingRequest $booking, BaseNotification $notification): void
    {
        Notification::route(SmsChannel::class, $booking->phone)
            ->route('mail', $booking->email ?? '')
            ->notify($notification);
    }

    /**
     * Bell alert for everyone who handles the website inbox.
     */
    public function notifyStaff(string $title, string $message, string $url, Permission $permission = Permission::BookingsManage): void
    {
        $staff = User::query()->active()->permission($permission->value)->get();

        Notification::send($staff, new WebsiteInboxAlert($title, $message, $url));
    }

    private function ensurePending(BookingRequest $booking): void
    {
        if ($booking->status !== BookingStatus::Pending) {
            throw ValidationException::withMessages([
                'booking' => "This request is already {$booking->status->label()}.",
            ]);
        }
    }

    /**
     * Carry the guest's choices onto the order so the counter sees them when weighing.
     */
    private function instructionsFor(BookingRequest $booking): string
    {
        $service = $booking->service_id ? Service::query()->find($booking->service_id) : null;

        return collect([
            "Website booking {$booking->reference}",
            $service ? "Requested: {$service->name}".($booking->estimated_quantity ? " (about {$booking->estimated_quantity} {$service->pricing_unit->shortLabel()})" : '') : null,
            $booking->wants_delivery ? 'Customer wants the laundry delivered back.' : null,
            $booking->special_instructions,
        ])->filter()->implode("\n");
    }
}
