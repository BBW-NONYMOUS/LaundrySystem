<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\CustomerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Notifications\Notifiable;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * @property int $id
 * @property int|null $user_id
 * @property string $name
 * @property string $phone
 * @property string|null $email
 * @property string|null $address
 * @property string|null $notes
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property CarbonImmutable|null $deleted_at
 * @property-read User|null $user
 * @property-read Collection<int, Order> $orders
 * @property-read Collection<int, Payment> $payments
 * @property-read Collection<int, BookingRequest> $bookingRequests
 * @property-read Collection<int, Testimonial> $testimonials
 */
#[Fillable(['user_id', 'name', 'phone', 'email', 'address', 'notes'])]
class Customer extends Model
{
    /** @use HasFactory<CustomerFactory> */
    use HasFactory, LogsActivity, Notifiable, SoftDeletes;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('customers');
    }

    /**
     * Normalize Philippine mobile numbers to 09XXXXXXXXX so "+63 917 123 4567",
     * "639171234567" and "0917-123-4567" are all treated as the same customer.
     */
    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        // "+63 9xx..." (full or partially typed in the search box) becomes "09xx...".
        if (str_starts_with($digits, '639')) {
            return '0'.substr($digits, 2);
        }

        if (str_starts_with($digits, '9') && strlen($digits) === 10) {
            return '0'.$digits;
        }

        return $digits;
    }

    /**
     * @return Attribute<string, string>
     */
    protected function phone(): Attribute
    {
        return Attribute::make(
            set: fn (?string $value) => static::normalizePhone($value),
        );
    }

    /**
     * @return Attribute<string, string>
     */
    protected function name(): Attribute
    {
        // Collapse double spaces and title-case to reduce misspelled duplicates.
        return Attribute::make(
            set: fn (string $value) => mb_convert_case(trim(preg_replace('/\s+/', ' ', $value) ?? $value), MB_CASE_TITLE),
        );
    }

    /**
     * Route SMS notifications to the customer's phone number.
     */
    public function routeNotificationForSms(): string
    {
        return $this->phone;
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return HasMany<Order, $this>
     */
    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    /**
     * Website pickup requests made with this customer's mobile number.
     *
     * @return HasMany<BookingRequest, $this>
     */
    public function bookingRequests(): HasMany
    {
        return $this->hasMany(BookingRequest::class);
    }

    /**
     * @return HasMany<Testimonial, $this>
     */
    public function testimonials(): HasMany
    {
        return $this->hasMany(Testimonial::class);
    }

    /**
     * @return HasManyThrough<Payment, Order, $this>
     */
    public function payments(): HasManyThrough
    {
        return $this->hasManyThrough(Payment::class, Order::class);
    }

    /**
     * Search-first lookup used by the New Order combobox (name or phone).
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function search(Builder $query, ?string $term): void
    {
        if (blank($term)) {
            return;
        }

        $phone = static::normalizePhone($term);

        $query->where(function (Builder $query) use ($term, $phone) {
            $query->where('name', 'like', "%{$term}%");

            if ($phone !== null && strlen($phone) >= 4) {
                $query->orWhere('phone', 'like', "%{$phone}%");
            }
        });
    }
}
