<?php

namespace App\Models;

use App\Enums\DeliveryStatus;
use App\Enums\DeliveryType;
use Carbon\CarbonImmutable;
use Database\Factories\DeliveryFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $order_id
 * @property DeliveryType $type
 * @property DeliveryStatus $status
 * @property int|null $rider_id
 * @property int|null $assigned_by
 * @property CarbonImmutable $scheduled_at
 * @property string $address
 * @property string $contact_phone
 * @property int $attempts
 * @property CarbonImmutable|null $completed_at
 * @property string|null $failure_reason
 * @property string|null $notes
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Order $order
 * @property-read User|null $rider
 * @property-read User|null $assigner
 */
#[Fillable([
    'order_id', 'type', 'status', 'rider_id', 'assigned_by', 'scheduled_at', 'address',
    'contact_phone', 'attempts', 'completed_at', 'failure_reason', 'notes',
])]
class Delivery extends Model
{
    /** @use HasFactory<DeliveryFactory> */
    use HasFactory, LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => DeliveryType::class,
            'status' => DeliveryStatus::class,
            'scheduled_at' => 'datetime',
            'completed_at' => 'datetime',
            'attempts' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['status', 'rider_id', 'scheduled_at', 'failure_reason'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('deliveries');
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
    public function rider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'rider_id');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function assigner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    /**
     * Trips that still need to be done (scheduled or on the road).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function pending(Builder $query): void
    {
        $query->whereIn('status', [DeliveryStatus::Scheduled, DeliveryStatus::InTransit]);
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function forRider(Builder $query, User $rider): void
    {
        $query->where('rider_id', $rider->id);
    }
}
