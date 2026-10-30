<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Database\Factories\FaqFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Scope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\Models\Concerns\LogsActivity;
use Spatie\Activitylog\Support\LogOptions;

/**
 * Website FAQ entry, managed by the owner.
 *
 * @property int $id
 * @property string $question
 * @property string $answer
 * @property string $category
 * @property int $sort_order
 * @property bool $is_published
 * @property bool $show_on_home
 * @property CarbonImmutable|null $created_at
 * @property CarbonImmutable|null $updated_at
 */
#[Fillable(['question', 'answer', 'category', 'sort_order', 'is_published', 'show_on_home'])]
class Faq extends Model
{
    /** Questions shown on the Home page FAQ preview. */
    public const HOME_LIMIT = 5;

    /** @use HasFactory<FaqFactory> */
    use HasFactory, LogsActivity;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
            'is_published' => 'boolean',
            'show_on_home' => 'boolean',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->dontLogEmptyChanges()
            ->useLogName('website');
    }

    /**
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function published(Builder $query): void
    {
        $query->where('is_published', true)->orderBy('sort_order')->orderBy('id');
    }

    /**
     * The short list for the Home page preview.
     *
     * @param  Builder<self>  $query
     */
    #[Scope]
    protected function forHome(Builder $query): void
    {
        $query->where('is_published', true)->where('show_on_home', true)->orderBy('sort_order')->limit(self::HOME_LIMIT);
    }
}
