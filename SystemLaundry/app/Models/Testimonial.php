<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\TestimonialFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Customer feedback. Only approved rows are shown on the public website.
 *
 * @property int $id
 * @property int|null $customer_id
 * @property int|null $order_id
 * @property string $author_name
 * @property int $rating
 * @property string $comment
 * @property string $source
 * @property bool $is_approved
 * @property bool $is_featured
 * @property int|null $approved_by
 * @property CarbonImmutable|null $approved_at
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 * @property-read Customer|null $customer
 * @property-read Order|null $order
 * @property-read User|null $approver
 */
#[Fillable([
    'customer_id', 'order_id', 'author_name', 'rating', 'comment', 'source',
    'is_approved', 'is_featured', 'approved_by', 'approved_at',
])]
class Testimonial extends Model
{
    /** @use HasFactory<TestimonialFactory> */
    use HasFactory, LogsActivity;

    public const SOURCE_FEEDBACK = 'feedback';

    public const SOURCE_MANUAL = 'manual';

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'rating' => 'integer',
            'is_approved' => 'boolean',
            'is_featured' => 'boolean',
            'approved_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['author_name', 'rating', 'comment', 'is_approved', 'is_featured'])
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('website');
    }

    /** Filipino surname particles: the surname starts at the particle ("Dela Cruz"). */
    private const SURNAME_PARTICLES = ['de', 'del', 'dela', 'delos', 'della', 'san', 'sta', 'sta.', 'santa', 'van', 'von'];

    /**
     * Public display name that protects privacy: "Maria Santos" → "Maria S.",
     * "Juan Dela Cruz" → "Juan D." (not "Juan C.").
     */
    public static function displayName(string $fullName): string
    {
        $parts = preg_split('/\s+/', trim($fullName)) ?: [];

        if (count($parts) < 2) {
            return trim($fullName);
        }

        $surnameStart = count($parts) - 1;

        foreach (array_slice($parts, 1, -1, true) as $index => $word) {
            if (in_array(Str::lower($word), self::SURNAME_PARTICLES, true)) {
                $surnameStart = $index;
                break;
            }
        }

        return $parts[0].' '.Str::upper(Str::substr($parts[$surnameStart], 0, 1)).'.';
    }

    /**
     * What the public website may show: no customer id, no order, no approver.
     *
     * @return array{id: int, author_name: string, rating: int, comment: string, date: string|null}
     */
    public function publicData(): array
    {
        return [
            'id' => $this->id,
            'author_name' => $this->author_name,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'date' => $this->created_at?->toDateString(),
        ];
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
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function approved(Builder $query): void
    {
        $query->where('is_approved', true);
    }

    /**
     * Approved reviews for the Home page carousel, featured first.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function forWebsite(Builder $query): void
    {
        $query->where('is_approved', true)->orderByDesc('is_featured')->orderByDesc('rating')->latest();
    }
}
