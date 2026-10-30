<?php

namespace App\Http\Requests;

use App\Services\ReportService;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Http\FormRequest;

class ReportFilterRequest extends FormRequest
{
    /**
     * Route middleware already checks the report permission.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
            'date' => ['nullable', 'date'],
            'format' => ['nullable', 'in:pdf,xlsx'],
        ];
    }

    /**
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public function range(int $defaultDays = 30): array
    {
        return ReportService::range($this->input('from'), $this->input('to'), $defaultDays);
    }

    public function reportDate(): CarbonImmutable
    {
        return $this->filled('date') ? CarbonImmutable::parse($this->string('date')->toString()) : CarbonImmutable::today();
    }
}
