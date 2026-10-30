<?php

namespace App\Models;

use App\Enums\PricingUnit;
use Carbon\CarbonImmutable;
use Database\Factories\ServiceFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property string $code
 * @property string $name
 * @property string|null $description
 * @property PricingUnit $pricing_unit
 * @property string $price
 * @property string $min_quantity
 * @property int $turnaround_hours
 * @property int|null $express_turnaround_hours
 * @property bool $is_active
 * @property int $sort_order
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable([
    'code', 'name', 'description', 'pricing_unit', 'price', 'min_quantity',
    'turnaround_hours', 'express_turnaround_hours', 'is_active', 'sort_order',
])]
class Service extends Model
{
    /** @use HasFactory<ServiceFactory> */
    use HasFactory, LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'pricing_unit' => PricingUnit::class,
            'price' => 'decimal:2',
            'min_quantity' => 'decimal:2',
            'turnaround_hours' => 'integer',
            'express_turnaround_hours' => 'integer',
            'is_active' => 'boolean',
            'sort_order' => 'integer',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        // Price changes are the most important thing to audit here.
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('services');
    }

    /**
     * @return HasMany<OrderItem, $this>
     */
    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * @return HasMany<BookingRequest, $this>
     */
    public function bookingRequests(): HasMany
    {
        return $this->hasMany(BookingRequest::class);
    }

    public function offersExpress(): bool
    {
        return $this->express_turnaround_hours !== null;
    }

    /**
     * Quantity actually billed after applying the minimum (e.g. 2.4 kg billed as 3 kg).
     */
    public function billableQuantity(float $quantity): float
    {
        return max($quantity, (float) $this->min_quantity);
    }

    public function lineTotal(float $quantity): float
    {
        return round($this->billableQuantity($quantity) * (float) $this->price, 2);
    }

    public function turnaroundHours(bool $express): int
    {
        return $express && $this->offersExpress()
            ? (int) $this->express_turnaround_hours
            : $this->turnaround_hours;
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function active(Builder $query): void
    {
        $query->where('is_active', true)->orderBy('sort_order')->orderBy('name');
    }
}
