<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Enums\StockMovementType;
use App\Http\Requests\Inventory\SaveInventoryItemRequest;
use App\Http\Requests\Inventory\StoreStockMovementRequest;
use App\Http\Resources\InventoryItemResource;
use App\Http\Resources\StockMovementResource;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Services\InventoryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Supply inventory with low-stock alerts.
 */
class InventoryItemController extends Controller
{
    public function index(Request $request): Response
    {
        $query = InventoryItem::query();
        $search = trim($request->string('search')->toString());

        if ($search !== '') {
            $query->where(fn (Builder $query) => $query->where('name', 'like', "%{$search}%")->orWhere('sku', 'like', "%{$search}%"));
        }

        if ($request->boolean('low')) {
            $query->lowStock();
        }

        $this->applySort($query, $request, [
            'name' => 'name',
            'sku' => 'sku',
            'quantity_on_hand' => 'quantity_on_hand',
            'updated_at' => 'updated_at',
        ], default: 'name', defaultDirection: 'asc');

        return Inertia::render('inventory/index', [
            'items' => InventoryItemResource::collection($query->paginate($this->perPage($request, 25))->withQueryString()),
            'filters' => $this->filters($request, ['search', 'low']),
            'lowStockCount' => InventoryItem::lowStock()->count(),
            'units' => SaveInventoryItemRequest::UNITS,
            'can' => [
                'manage' => $request->user()->can(Permission::InventoryManage->value),
            ],
        ]);
    }

    public function store(SaveInventoryItemRequest $request, InventoryService $inventory): RedirectResponse
    {
        DB::transaction(function () use ($request, $inventory) {
            $item = InventoryItem::query()->create([...Arr::except($request->validated(), ['opening_quantity']), 'quantity_on_hand' => 0]);
            $opening = (float) $request->input('opening_quantity', 0);

            if ($opening > 0) {
                $inventory->record($item, StockMovementType::In, $opening, $request->user(), 'Opening stock');
            }
        });

        $this->toast('Supply item added.');

        return back();
    }

    public function show(Request $request, InventoryItem $item): Response
    {
        return Inertia::render('inventory/show', [
            'item' => InventoryItemResource::make($item),
            'movements' => StockMovementResource::collection(
                $item->movements()->with(['user:id,name', 'order:id,order_number'])->paginate($this->perPage($request, 25))->withQueryString(),
            ),
            'movementTypes' => array_map(fn (StockMovementType $type) => ['value' => $type->value, 'label' => $type->label()], StockMovementType::cases()),
            'units' => SaveInventoryItemRequest::UNITS,
            'can' => [
                'manage' => $request->user()->can(Permission::InventoryManage->value),
                'stockOut' => $request->user()->canAny([Permission::InventoryStockOut->value, Permission::InventoryManage->value]),
            ],
        ]);
    }

    /**
     * Edits details only; stock levels change through movements so the ledger stays complete.
     */
    public function update(SaveInventoryItemRequest $request, InventoryItem $item): RedirectResponse
    {
        $item->update($request->validated());

        $this->toast("{$item->name} saved.");

        return back();
    }

    public function storeMovement(StoreStockMovementRequest $request, InventoryItem $item, InventoryService $inventory): RedirectResponse
    {
        $order = $request->filled('order_number')
            ? Order::query()->where('order_number', $request->string('order_number')->toString())->first()
            : null;

        $movement = $inventory->record(
            item: $item,
            type: $request->type(),
            quantity: (float) $request->input('quantity'),
            actor: $request->user(),
            remarks: $request->input('remarks'),
            order: $order,
        );

        $this->toast("{$movement->type->label()} recorded. {$item->name}: {$movement->balance_after} {$item->unit} left.");

        return back();
    }
}
