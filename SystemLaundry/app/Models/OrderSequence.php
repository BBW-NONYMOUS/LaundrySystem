<?php

namespace App\Models;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Table;
use Illuminate\Database\Eloquent\Model;

/**
 * Daily counter behind LND-YYYYMMDD-NNNN order numbers.
 *
 * @property CarbonImmutable $sequence_date
 * @property int $last_number
 */
#[Table(key: 'sequence_date', keyType: 'string', incrementing: false, timestamps: false)]
#[Fillable(['sequence_date', 'last_number'])]
class OrderSequence extends Model
{
    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'sequence_date' => 'date:Y-m-d',
            'last_number' => 'integer',
        ];
    }
}
