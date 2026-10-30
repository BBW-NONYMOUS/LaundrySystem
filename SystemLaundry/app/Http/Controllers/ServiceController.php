<?php

namespace App\Http\Controllers;

use App\Enums\PricingUnit;
use App\Http\Requests\SaveServiceRequest;
use App\Http\Resources\ServiceResource;
use App\Models\Service;
use Illuminate\Http\RedirectResponse;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Services & pricing (wash, dry, fold, iron, dry clean...).
 */
class ServiceController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('services/index', [
            'services' => ServiceResource::collection(Service::query()->withCount('orderItems')->orderBy('sort_order')->orderBy('name')->get()),
            'pricingUnits' => array_map(fn (PricingUnit $unit) => ['value' => $unit->value, 'label' => $unit->label()], PricingUnit::cases()),
        ]);
    }

    public function store(SaveServiceRequest $request): RedirectResponse
    {
        $service = Service::query()->create($request->validated());

        $this->toast("{$service->name} added.");

        return back();
    }

    public function update(SaveServiceRequest $request, Service $service): RedirectResponse
    {
        $service->update($request->validated());

        $this->toast("{$service->name} saved. New orders use the new price; existing orders keep theirs.");

        return back();
    }

    /**
     * Services used on past orders are deactivated instead of deleted so receipts stay intact.
     */
    public function destroy(Service $service): RedirectResponse
    {
        if ($service->orderItems()->exists()) {
            $service->update(['is_active' => false]);
            $this->toast("{$service->name} has past orders, so it was deactivated instead of deleted.", 'info');
        } else {
            $service->delete();
            $this->toast("{$service->name} deleted.");
        }

        return back();
    }
}
