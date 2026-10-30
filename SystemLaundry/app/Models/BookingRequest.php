<?php

namespace App\Models;

use App\Enums\BookingStatus;
use App\Enums\PickupSlot;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Database\Factories\BookingRequestFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * A guest's pickup request from the public /book page. Staff confirm it into a real
 * customer + For Pickup order, or decline it.
 *
 * @property int $id
 * @property string $reference
 * @property BookingStatus $status
 * @property string $name
 * @property string $phone
 * @property string|null $email
 * @property string $address
 * @property CarbonImmutable $pickup_date
 * @property PickupSlot $time_slot
 * @property int|null $service_id
 * @property string|null $estimated_quantity
 * @property bool $is_express
 * @property bool $wants_delivery
 * @property string|null $special_instructions
 * @property int|null $customer_id
 * @property int|null $order_id
 * @property int|null $handled_by
 * @property CarbonImmutable|null $handled_at
 * @property string|null $decline_reason
 * @property string|null $ip_address
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read CarbonImmutable $scheduled_at
 * @property-read Service|null $service
 * @property-read Customer|null $customer
 * @property-read Order|null $order
 * @property-read User|null $handler
 */
#[Fillable([
    'reference', 'status', 'name', 'phone', 'email', 'address', 'pickup_date', 'time_slot',
    'service_id', 'estimated_quantity', 'is_express', 'wants_delivery', 'special_instructions',
    'customer_id', 'order_id', 'handled_by', 'handled_at', 'decline_reason', 'ip_address',
])]
class BookingRequest extends Model
{
    /** @use HasFactory<BookingRequestFactory> */
    use HasFactory, LogsActivity, MassPrunable;

    /** Months kept before `model:prune` deletes them (promised in the Privacy Notice). */
    public const RETENTION_MONTHS = 12;

    /** No 0/O or 1/I, so a reference read over the phone can't be misheard. */
    private const REFERENCE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => BookingStatus::class,
            'time_slot' => PickupSlot::class,
            'pickup_date' => 'date',
            'estimated_quantity' => 'decimal:2',
            'is_express' => 'boolean',
            'wants_delivery' => 'boolean',
            'handled_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'pickup_date', 'time_slot', 'decline_reason', 'order_id'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('bookings');
    }

    /**
     * BKG-20261023-7KQ2: date for staff, random suffix so references can't be enumerated.
     */
    public static function generateReference(?CarbonInterface $date = null): string
    {
        $prefix = 'BKG-'.($date ?? now())->format('Ymd').'-';

        do {
            $suffix = '';

            for ($i = 0; $i < 4; $i++) {
                $suffix .= self::REFERENCE_ALPHABET[random_int(0, strlen(self::REFERENCE_ALPHABET) - 1)];
            }
        } while (static::query()->where('reference', $prefix.$suffix)->exists());

        return $prefix.$suffix;
    }

    /**
     * @return Attribute<string, string>
     */
    protected function phone(): Attribute
    {
        return Attribute::make(set: fn (string $value) => Customer::normalizePhone($value));
    }

    /**
     * Pickup date + slot start as one datetime (what the delivery trip is scheduled at).
     *
     * @return Attribute<CarbonImmutable, never>
     */
    protected function scheduledAt(): Attribute
    {
        return Attribute::get(fn () => $this->pickup_date->setTimeFromTimeString($this->time_slot->value));
    }

    /**
     * @return BelongsTo<Service, $this>
     */
    public function service(): BelongsTo
    {
        return $this->belongsTo(Service::class);
    }

    /**
     * @return BelongsTo<Customer, $this>
     */
    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class)->withTrashed();
    }

    /**
     * @return BelongsTo<Order, $this>
     */
    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function pending(Builder $query): void
    {
        $query->where('status', BookingStatus::Pending);
    }

    /**
     * Requests still holding a place in the given date + slot (used for slot capacity).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function holdingSlot(Builder $query, CarbonInterface $date, PickupSlot $slot): void
    {
        $query->whereIn('status', BookingStatus::holdingSlot())
            ->whereDate('pickup_date', $date->toDateString())
            ->where('time_slot', $slot);
    }

    /**
     * @return Builder<static>
     */
    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subMonths(self::RETENTION_MONTHS));
    }
}
