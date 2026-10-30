<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Services\PricingService;
use Carbon\CarbonImmutable;
use Database\Factories\PaymentFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int $order_id
 * @property int $received_by
 * @property PaymentMethod $method
 * @property string|null $reference_number
 * @property string $amount
 * @property string|null $amount_tendered
 * @property CarbonImmutable $paid_at
 * @property CarbonImmutable|null $voided_at
 * @property int|null $voided_by
 * @property string|null $void_reason
 * @property string|null $notes
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read float $change
 * @property-read Order $order
 * @property-read User $receiver
 * @property-read User|null $voider
 */
#[Fillable([
    'order_id', 'received_by', 'method', 'reference_number', 'amount', 'amount_tendered',
    'paid_at', 'voided_at', 'voided_by', 'void_reason', 'notes',
])]
class Payment extends Model
{
    /** @use HasFactory<PaymentFactory> */
    use HasFactory, LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'amount' => 'decimal:2',
            'amount_tendered' => 'decimal:2',
            'paid_at' => 'datetime',
            'voided_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['method', 'reference_number', 'amount', 'amount_tendered', 'voided_at', 'void_reason'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('payments');
    }

    /**
     * Change returned to the customer. Derived, never stored.
     *
     * @return Attribute<float, never>
     */
    protected function change(): Attribute
    {
        return Attribute::get(fn () => PricingService::change(
            (float) $this->amount,
            $this->amount_tendered === null ? null : (float) $this->amount_tendered,
        ));
    }

    public function isVoided(): bool
    {
        return $this->voided_at !== null;
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
    public function receiver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function voider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'voided_by');
    }

    /**
     * Payments that count toward sales (not voided).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function valid(Builder $query): void
    {
        $query->whereNull('voided_at');
    }
}
