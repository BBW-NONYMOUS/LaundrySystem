<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Str;
use Spatie\Activitylog\Models\Activity;

/**
 * One audit-trail entry: who changed what, with before/after values.
 *
 * @mixin Activity
 */
class ActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        /** @var array{attributes?: array<string, mixed>, old?: array<string, mixed>} $changes */
        $changes = $this->attribute_changes?->toArray() ?? [];

        return [
            'id' => $this->id,
            'log_name' => $this->log_name,
            'description' => $this->description,
            'event' => $this->event,
            'subject_type' => $this->subject_type !== null ? Str::headline(class_basename($this->subject_type)) : null,
            'subject_id' => $this->subject_id,
            'subject_label' => $this->subjectLabel(),
            'causer' => $this->causer?->getAttribute('name'),
            'new' => $changes['attributes'] ?? [],
            'old' => $changes['old'] ?? [],
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    /**
     * A human-friendly name for the changed record (order number, customer name, ...).
     */
    private function subjectLabel(): ?string
    {
        $subject = $this->subject;

        if ($subject === null) {
            return null;
        }

        foreach (['order_number', 'name', 'sku', 'code'] as $attribute) {
            if (filled($subject->getAttribute($attribute))) {
                return (string) $subject->getAttribute($attribute);
            }
        }

        return '#'.$subject->getKey();
    }
}
