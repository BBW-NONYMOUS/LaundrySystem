<?php

namespace App\Http\Controllers;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Inertia\Inertia;

abstract class Controller
{
    /**
     * Flash a Sonner toast for the next page (handled by useFlashToast on the frontend).
     */
    protected function toast(string $message, string $type = 'success'): void
    {
        Inertia::flash('toast', ['type' => $type, 'message' => $message]);
    }

    /**
     * Rows per page for data tables, clamped so a crafted URL can't request thousands.
     */
    protected function perPage(Request $request, int $default = 15): int
    {
        return min(max($request->integer('per_page', $default), 5), 100);
    }

    /**
     * Apply ?sort=column&direction=asc|desc using a whitelist of sortable columns.
     *
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @param  array<string, string>  $sortable  request key => SQL column/alias
     * @param  'asc'|'desc'  $defaultDirection
     */
    protected function applySort(Builder $query, Request $request, array $sortable, string $default, string $defaultDirection = 'desc'): void
    {
        $key = $request->string('sort')->toString();
        $column = $sortable[$key] ?? $sortable[$default];
        $direction = match ($request->string('direction')->lower()->toString()) {
            'asc' => 'asc',
            'desc' => 'desc',
            default => $defaultDirection,
        };

        // Secondary sort on the primary key keeps paging stable when values tie.
        $query->orderBy($column, $direction)->orderBy($query->getModel()->getQualifiedKeyName(), $direction);
    }

    /**
     * The filters echoed back to the page so the data table can show its current state.
     *
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    protected function filters(Request $request, array $keys): array
    {
        return collect($keys)
            ->mapWithKeys(fn (string $key) => [$key => $request->query($key)])
            ->merge([
                'sort' => $request->query('sort'),
                'direction' => $request->query('direction'),
                'per_page' => $this->perPage($request),
            ])
            ->all();
    }
}
