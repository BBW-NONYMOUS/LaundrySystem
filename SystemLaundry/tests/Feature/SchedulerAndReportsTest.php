<?php

namespace Tests\Feature;

use App\Enums\OrderStatus;
use App\Enums\StockMovementType;
use App\Exports\SalesReportExport;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\Payment;
use App\Notifications\LowStockAlert;
use App\Notifications\OverdueOrdersDigest;
use App\Notifications\UnclaimedReminder;
use App\Services\InventoryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Facades\Excel;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class SchedulerAndReportsTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
        Notification::fake();
    }

    public function test_unclaimed_reminders_respect_the_threshold_and_interval(): void
    {
        $due = Order::factory()->unclaimed(days: 10)->create();
        $recentlyReminded = Order::factory()->unclaimed(days: 10)->create(['last_reminded_at' => now()->subDay(), 'reminder_count' => 1]);
        $notYet = Order::factory()->unclaimed(days: 3)->create();

        $this->artisan('laundry:send-unclaimed-reminders', ['--dry-run' => true])->assertSuccessful();
        Notification::assertNothingSent();

        $this->artisan('laundry:send-unclaimed-reminders')->assertSuccessful();

        Notification::assertSentTo($due->customer, UnclaimedReminder::class);
        Notification::assertNotSentTo($recentlyReminded->customer, UnclaimedReminder::class);
        Notification::assertNotSentTo($notYet->customer, UnclaimedReminder::class);
        $this->assertSame(1, $due->refresh()->reminder_count);
    }

    public function test_overdue_alert_goes_to_owner_and_counter_only(): void
    {
        $admin = $this->admin();
        $cashier = $this->cashier();
        $staff = $this->staff();
        Order::factory()->overdue()->create();

        $this->artisan('laundry:notify-overdue')->assertSuccessful();

        Notification::assertSentTo([$admin, $cashier], OverdueOrdersDigest::class);
        Notification::assertNotSentTo($staff, OverdueOrdersDigest::class);
    }

    public function test_low_stock_alert_fires_once_when_crossing_the_reorder_level(): void
    {
        $admin = $this->admin();
        $item = InventoryItem::factory()->create(['quantity_on_hand' => 10, 'reorder_level' => 5]);
        $inventory = app(InventoryService::class);

        $inventory->record($item, StockMovementType::Out, 4, $admin);   // 6 left: still fine
        Notification::assertNothingSent();

        $inventory->record($item, StockMovementType::Out, 2, $admin);   // 4 left: crosses
        $inventory->record($item, StockMovementType::Out, 1, $admin);   // 3 left: already low
        Notification::assertSentToTimes($admin, LowStockAlert::class, 1);

        $this->expectException(ValidationException::class);
        $inventory->record($item, StockMovementType::Out, 99, $admin);  // can't go negative
    }

    public function test_staff_can_record_usage_but_not_restock(): void
    {
        $item = InventoryItem::factory()->create(['quantity_on_hand' => 10]);

        $this->actingAs($this->staff())->post(route('inventory.movements.store', $item), ['type' => 'out', 'quantity' => 2])
            ->assertSessionHasNoErrors();
        $this->actingAs($this->staff())->post(route('inventory.movements.store', $item), ['type' => 'in', 'quantity' => 2])
            ->assertForbidden();

        $this->assertSame('8.00', $item->refresh()->quantity_on_hand);
    }

    public function test_reports_page_and_daily_summary(): void
    {
        $order = $this->orderWithItems();
        Payment::factory()->create(['order_id' => $order->id, 'amount' => 140, 'amount_tendered' => 200]);

        $this->assertPage(
            $this->actingAs($this->admin())->get(route('reports.index', ['from' => now()->subDays(6)->toDateString(), 'to' => now()->toDateString()])),
            'reports/index',
            fn ($page) => $page->has('sales', 7)->where('summary.collected', 140)->has('topServices', 1),
        );

        $this->assertPage(
            $this->actingAs($this->cashier())->get(route('reports.daily')),
            'reports/daily',
            fn ($page) => $page->where('summary.collected', 140)->where('summary.cash_on_hand', 140)->where('summary.orders_received', 1),
        );
    }

    public function test_exports_to_excel_and_pdf(): void
    {
        Excel::fake();
        $admin = $this->admin();
        $this->orderWithItems();

        $this->actingAs($admin)->get(route('reports.export', ['report' => 'sales', 'format' => 'xlsx']));
        Excel::assertDownloaded('sales-report-'.now()->subDays(29)->toDateString().'_to_'.now()->toDateString().'.xlsx',
            fn (SalesReportExport $export) => $export->collection()->count() === 30);

        $this->actingAs($admin)->get(route('reports.export', ['report' => 'pending', 'format' => 'pdf']))
            ->assertOk()->assertHeader('content-type', 'application/pdf');

        // Cashiers can export the daily summary but nothing else.
        $cashier = $this->cashier();
        $this->actingAs($cashier)->get(route('reports.export', ['report' => 'daily']))->assertOk();
        $this->actingAs($cashier)->get(route('reports.export', ['report' => 'sales']))->assertForbidden();
    }

    public function test_receipt_and_qr_tag_pdfs(): void
    {
        $order = $this->orderWithItems(['is_express' => true]);
        $cashier = $this->cashier();

        $this->actingAs($cashier)->get(route('orders.receipt.pdf', $order))
            ->assertOk()->assertHeader('content-type', 'application/pdf');

        $this->actingAs($cashier)->get(route('orders.tag', $order))
            ->assertOk()->assertHeader('content-type', 'application/pdf');

        $this->assertPage(
            $this->actingAs($cashier)->get(route('orders.receipt', $order)),
            'orders/receipt',
            fn ($page) => $page->where('order.order_number', $order->order_number)->has('trackingQrSvg'),
        );
    }

    public function test_search_finds_customers_and_orders(): void
    {
        $order = $this->orderWithItems();
        $order->customer->update(['name' => 'Rosalinda Bautista']);

        $this->actingAs($this->cashier())->getJson(route('search', ['q' => 'rosal']))
            ->assertOk()
            ->assertJsonPath('customers.0.name', 'Rosalinda Bautista')
            ->assertJsonPath('orders.0.order_number', $order->order_number);

        $this->actingAs($this->rider())->getJson(route('search', ['q' => 'rosal']))->assertForbidden();
    }

    public function test_monitoring_pages_list_overdue_and_unclaimed_orders(): void
    {
        Order::factory()->overdue()->create();
        $unclaimed = Order::factory()->unclaimed(days: 10)->create();
        Order::factory()->status(OrderStatus::Completed)->create();

        $cashier = $this->cashier();
        $this->assertPage($this->actingAs($cashier)->get(route('monitoring.overdue')), 'monitoring/overdue', fn ($page) => $page->has('orders.data', 1));
        $this->assertPage($this->actingAs($cashier)->get(route('monitoring.unclaimed')), 'monitoring/unclaimed', fn ($page) => $page->has('orders.data', 1));

        $this->actingAs($cashier)->post(route('orders.remind', $unclaimed))->assertSessionHasNoErrors();
        Notification::assertSentTo($unclaimed->customer, UnclaimedReminder::class);
    }
}
