<?php

namespace App\Models;

use App\Data\OrderTotals;
use App\Enums\DeliveryType;
use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use Carbon\CarbonImmutable;
use Database\Factories\OrderFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property string $order_number
 * @property string $tracking_code
 * @property int $customer_id
 * @property int|null $created_by
 * @property OrderStatus $status
 * @property PaymentStatus $payment_status
 * @property bool $is_express
 * @property string $subtotal
 * @property string $express_fee
 * @property string $delivery_fee
 * @property string $discount_amount
 * @property string|null $discount_reason
 * @property string $total_amount
 * @property string $amount_paid
 * @property string|null $special_instructions
 * @property CarbonImmutable|null $received_at
 * @property CarbonImmutable|null $due_at
 * @property CarbonImmutable|null $ready_at
 * @property CarbonImmutable|null $completed_at
 * @property CarbonImmutable|null $cancelled_at
 * @property string|null $cancellation_reason
 * @property CarbonImmutable|null $last_reminded_at
 * @property int $reminder_count
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read float $balance
 * @property-read Customer $customer
 * @property-read User|null $creator
 * @property-read Collection<int, OrderItem> $items
 * @property-read Collection<int, OrderStatusHistory> $statusHistories
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, Delivery> $deliveries
 * @property-read BookingRequest|null $bookingRequest
 * @property-read Testimonial|null $testimonial
 */
#[Fillable([
    'order_number', 'tracking_code', 'customer_id', 'created_by', 'status', 'payment_status',
    'is_express', 'subtotal', 'express_fee', 'delivery_fee', 'discount_amount', 'discount_reason',
    'total_amount', 'amount_paid', 'special_instructions', 'received_at', 'due_at', 'ready_at',
    'completed_at', 'cancelled_at', 'cancellation_reason', 'last_reminded_at', 'reminder_count',
])]
class Order extends Model
{
    /** @use HasFactory<OrderFactory> */
    use HasFactory, LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => OrderStatus::class,
            'payment_status' => PaymentStatus::class,
            'is_express' => 'boolean',
            'subtotal' => 'decimal:2',
            'express_fee' => 'decimal:2',
            'delivery_fee' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
            'amount_paid' => 'decimal:2',
            'received_at' => 'datetime',
            'due_at' => 'datetime',
            'ready_at' => 'datetime',
            'completed_at' => 'datetime',
            'cancelled_at' => 'datetime',
            'last_reminded_at' => 'datetime',
            'reminder_count' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        // Status changes have their own history table; here we audit money and schedule edits.
        return LogOptions::defaults()
            ->logOnly([
                'status', 'is_express', 'subtotal', 'express_fee', 'delivery_fee', 'discount_amount',
                'discount_reason', 'total_amount', 'due_at', 'special_instructions', 'cancellation_reason',
            ])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('orders');
    }

    /**
     * Unguessable code for the public /track/{code} page.
     */
    public static function generateTrackingCode(): string
    {
        do {
            $code = Str::upper(Str::random(12));
        } while (static::where('tracking_code', $code)->exists());

        return $code;
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<OrderStatusHistory, $this>
     */
    public function statusHistories(): HasMany
    {
        return $this->hasMany(OrderStatusHistory::class)->orderBy('created_at')->orderBy('id');
    }

    /**
     * @return HasMany<Payment, $this>
     */
    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    /**
     * @return HasMany<Delivery, $this>
     */
    public function deliveries(): HasMany
    {
        return $this->hasMany(Delivery::class);
    }

    /**
     * @return HasOne<Delivery, $this>
     */
    public function pickup(): HasOne
    {
        return $this->hasOne(Delivery::class)->where('type', DeliveryType::Pickup->value);
    }

    /**
     * @return HasOne<Delivery, $this>
     */
    public function delivery(): HasOne
    {
        return $this->hasOne(Delivery::class)->where('type', DeliveryType::Delivery->value);
    }

    /**
     * The website booking this order was created from, if any.
     *
     * @return HasOne<BookingRequest, $this>
     */
    public function bookingRequest(): HasOne
    {
        return $this->hasOne(BookingRequest::class);
    }

    /**
     * The customer's rating for this order (one per order).
     *
     * @return HasOne<Testimonial, $this>
     */
    public function testimonial(): HasOne
    {
        return $this->hasOne(Testimonial::class);
    }

    /**
     * @return HasMany<NotificationLog, $this>
     */
    public function notificationLogs(): HasMany
    {
        return $this->hasMany(NotificationLog::class);
    }

    /**
     * @return Attribute<float, never>
     */
    protected function balance(): Attribute
    {
        return Attribute::get(fn () => round((float) $this->total_amount - (float) $this->amount_paid, 2));
    }

    public function isOverdue(): bool
    {
        return $this->due_at !== null
            && $this->due_at->isPast()
            && in_array($this->status, OrderStatus::inProcess(), true);
    }

    /**
     * Recompute subtotal, express fee and total from the order items.
     * Called whenever items, express flag, delivery fee or discount change.
     */
    public function recalculateTotals(float $expressSurchargePercent): void
    {
        $totals = OrderTotals::compute(
            subtotal: (float) $this->items()->sum('line_total'),
            express: $this->is_express,
            expressSurchargePercent: $expressSurchargePercent,
            deliveryFee: (float) $this->delivery_fee,
            discount: (float) $this->discount_amount,
        );

        $this->forceFill($totals->toOrderAttributes());

        $this->refreshPaymentStatus(save: false);
        $this->save();
    }

    /**
     * Sync the cached amount_paid / payment_status with the non-voided payments.
     */
    public function refreshPaymentStatus(bool $save = true): void
    {
        $paid = round((float) $this->payments()->whereNull('voided_at')->sum('amount'), 2);

        $this->forceFill([
            'amount_paid' => $paid,
            'payment_status' => PaymentStatus::fromAmounts((float) $this->total_amount, $paid),
        ]);

        if ($save) {
            $this->save();
        }
    }

    /**
     * Laundry still in the shop past its due time.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function overdue(Builder $query): void
    {
        $query->whereIn('status', OrderStatus::inProcess())->where('due_at', '<', now());
    }

    /**
     * Ready for pickup but not claimed for at least $days days.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function unclaimed(Builder $query, int $days): void
    {
        $query->where('status', OrderStatus::Ready)->where('ready_at', '<=', now()->subDays($days));
    }

    /**
     * Orders that are not yet finished (completed, delivered or cancelled).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function open(Builder $query): void
    {
        $query->whereNotIn('status', [OrderStatus::Completed, OrderStatus::Delivered, OrderStatus::Cancelled]);
    }

    /**
     * Orders that count as sales (everything except cancelled).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function billable(Builder $query): void
    {
        $query->where('status', '!=', OrderStatus::Cancelled);
    }
}
