<?php

use App\Enums\Permission as P;
use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DeliveryController;
use App\Http\Controllers\InventoryItemController;
use App\Http\Controllers\MonitoringController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\OrderReceiptController;
use App\Http\Controllers\OrderStatusController;
use App\Http\Controllers\OrderTagController;
use App\Http\Controllers\PaymentController;
use App\Http\Controllers\Portal\PortalController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\Rider\TripController;
use App\Http\Controllers\ScanController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\Website\BookingRequestController;
use App\Http\Controllers\Website\ContactMessageController;
use App\Http\Controllers\Website\FaqController;
use App\Http\Controllers\Website\TestimonialController;
use Illuminate\Support\Facades\Route;
use Spatie\Permission\Middleware\PermissionMiddleware;

// Public website: home, pricing, tracking, booking, contact, sitemap...
require __DIR__.'/public.php';

/*
|--------------------------------------------------------------------------
| Signed-in users
|--------------------------------------------------------------------------
| Each group requires a permission (see App\Enums\Permission / UserRole::permissions()).
| Record-level rules (e.g. "riders only see their own trips") live in app/Policies.
*/

$can = fn (P ...$permissions): string => PermissionMiddleware::using(array_map(fn (P $permission) => $permission->value, $permissions));

Route::middleware(['auth', 'verified'])->group(function () use ($can) {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('search', SearchController::class)
        ->middleware(['throttle:120,1', $can(P::CustomersView, P::OrdersView)])
        ->name('search');

    Route::post('notifications/{id}/read', [NotificationController::class, 'read'])->name('notifications.read');
    Route::post('notifications/read-all', [NotificationController::class, 'readAll'])->name('notifications.read-all');

    // Customers
    Route::middleware($can(P::CustomersView))->group(function () {
        Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
        Route::post('customers', [CustomerController::class, 'store'])->name('customers.store');
        Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
        Route::put('customers/{customer}', [CustomerController::class, 'update'])->name('customers.update');
        Route::delete('customers/{customer}', [CustomerController::class, 'destroy'])->can('delete', 'customer')->name('customers.destroy');
    });

    // Orders, status updates, receipts, QR tags and scanning
    Route::middleware($can(P::OrdersView))->group(function () use ($can) {
        Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
        Route::get('orders/board', [OrderController::class, 'board'])->name('orders.board');
        Route::get('orders/create', [OrderController::class, 'create'])->middleware($can(P::OrdersCreate))->name('orders.create');
        Route::post('orders', [OrderController::class, 'store'])->name('orders.store');
        Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
        Route::put('orders/{order}', [OrderController::class, 'update'])->name('orders.update');
        Route::post('orders/{order}/status', [OrderStatusController::class, 'update'])->name('orders.status.update');
        Route::get('orders/{order}/receipt', [OrderReceiptController::class, 'show'])->name('orders.receipt');
        Route::get('orders/{order}/receipt.pdf', [OrderReceiptController::class, 'pdf'])->name('orders.receipt.pdf');
        Route::get('orders/{order}/tag.pdf', [OrderTagController::class, 'show'])->name('orders.tag');
        Route::post('orders/{order}/payments', [PaymentController::class, 'store'])->name('orders.payments.store');
        Route::post('orders/{order}/deliveries', [DeliveryController::class, 'store'])->name('orders.deliveries.store');

        Route::get('scan', [ScanController::class, 'index'])->name('scan.index');
        Route::get('scan/{orderNumber}', [ScanController::class, 'show'])->name('scan.show');
    });

    // Payments
    Route::middleware($can(P::PaymentsView))->group(function () {
        Route::get('payments', [PaymentController::class, 'index'])->name('payments.index');
        Route::post('payments/{payment}/void', [PaymentController::class, 'void'])->name('payments.void');
    });

    // Pickup & delivery scheduling (counter)
    Route::middleware($can(P::DeliveriesView))->group(function () {
        Route::get('deliveries', [DeliveryController::class, 'index'])->name('deliveries.index');
        Route::put('deliveries/{delivery}', [DeliveryController::class, 'update'])->name('deliveries.update');
    });

    // Rider's own trips
    Route::middleware($can(P::DeliveriesOwn))->prefix('rider')->name('rider.')->group(function () {
        Route::get('deliveries', [TripController::class, 'index'])->name('deliveries.index');
        Route::post('deliveries/{delivery}/start', [TripController::class, 'start'])->name('deliveries.start');
        Route::post('deliveries/{delivery}/complete', [TripController::class, 'complete'])->name('deliveries.complete');
        Route::post('deliveries/{delivery}/fail', [TripController::class, 'fail'])->name('deliveries.fail');
    });

    // Overdue and unclaimed monitoring
    Route::middleware($can(P::MonitoringView))->group(function () {
        Route::get('monitoring/overdue', [MonitoringController::class, 'overdue'])->name('monitoring.overdue');
        Route::get('monitoring/unclaimed', [MonitoringController::class, 'unclaimed'])->name('monitoring.unclaimed');
        Route::post('orders/{order}/remind', [MonitoringController::class, 'remind'])->name('orders.remind');
    });

    // Services & pricing
    Route::middleware($can(P::ServicesManage))->group(function () {
        Route::get('services', [ServiceController::class, 'index'])->name('services.index');
        Route::post('services', [ServiceController::class, 'store'])->name('services.store');
        Route::put('services/{service}', [ServiceController::class, 'update'])->name('services.update');
        Route::delete('services/{service}', [ServiceController::class, 'destroy'])->name('services.destroy');
    });

    // Supplies inventory
    Route::middleware($can(P::InventoryView))->group(function () {
        Route::get('inventory', [InventoryItemController::class, 'index'])->name('inventory.index');
        Route::post('inventory', [InventoryItemController::class, 'store'])->name('inventory.store');
        Route::get('inventory/{item}', [InventoryItemController::class, 'show'])->name('inventory.show');
        Route::put('inventory/{item}', [InventoryItemController::class, 'update'])->name('inventory.update');
        Route::post('inventory/{item}/movements', [InventoryItemController::class, 'storeMovement'])->name('inventory.movements.store');
    });

    // Reports (cashiers get the daily summary only)
    Route::get('reports/daily', [ReportController::class, 'daily'])->middleware($can(P::ReportsView, P::ReportsDailySummary))->name('reports.daily');
    Route::get('reports/export/{report}', [ReportController::class, 'export'])
        ->middleware($can(P::ReportsExport, P::ReportsDailySummary))
        ->whereIn('report', ['sales', 'services', 'staff', 'pending', 'daily'])
        ->name('reports.export');

    Route::middleware($can(P::ReportsView))->group(function () {
        Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
        Route::get('reports/staff', [ReportController::class, 'staff'])->name('reports.staff');
    });

    // Staff accounts and audit trail
    Route::middleware($can(P::UsersManage))->group(function () {
        Route::get('users', [UserController::class, 'index'])->name('users.index');
        Route::post('users', [UserController::class, 'store'])->name('users.store');
        Route::put('users/{user}', [UserController::class, 'update'])->name('users.update');
        Route::patch('users/{user}/active', [UserController::class, 'toggleActive'])->name('users.toggle-active');
    });

    Route::get('activity-log', [ActivityLogController::class, 'index'])->middleware($can(P::ActivityLogView))->name('activity-log.index');

    // Website inboxes: guest pickup requests and Contact page messages (counter + owner)
    Route::middleware($can(P::BookingsManage))->group(function () {
        Route::get('booking-requests', [BookingRequestController::class, 'index'])->name('booking-requests.index');
        Route::post('booking-requests/{booking}/confirm', [BookingRequestController::class, 'confirm'])->name('booking-requests.confirm');
        Route::post('booking-requests/{booking}/decline', [BookingRequestController::class, 'decline'])->name('booking-requests.decline');
        Route::post('booking-requests/{booking}/cancel', [BookingRequestController::class, 'cancel'])->name('booking-requests.cancel');
    });

    Route::middleware($can(P::MessagesView))->group(function () {
        Route::get('contact-messages', [ContactMessageController::class, 'index'])->name('contact-messages.index');
        Route::patch('contact-messages/{message}', [ContactMessageController::class, 'update'])->name('contact-messages.update');
    });

    // Website content (owner)
    Route::middleware($can(P::WebsiteManage))->prefix('website')->group(function () {
        Route::get('faqs', [FaqController::class, 'index'])->name('faqs.index');
        Route::post('faqs', [FaqController::class, 'store'])->name('faqs.store');
        Route::put('faqs/{faq}', [FaqController::class, 'update'])->name('faqs.update');
        Route::delete('faqs/{faq}', [FaqController::class, 'destroy'])->name('faqs.destroy');

        Route::get('testimonials', [TestimonialController::class, 'index'])->name('testimonials.index');
        Route::post('testimonials', [TestimonialController::class, 'store'])->name('testimonials.store');
        Route::put('testimonials/{testimonial}', [TestimonialController::class, 'update'])->name('testimonials.update');
        Route::delete('testimonials/{testimonial}', [TestimonialController::class, 'destroy'])->name('testimonials.destroy');
    });

    // Customer portal
    Route::middleware($can(P::PortalAccess))->prefix('portal')->name('portal.')->group(function () {
        Route::get('/', [PortalController::class, 'index'])->name('index');
        Route::get('orders/{order}', [PortalController::class, 'show'])->name('orders.show');
        Route::get('book', [PortalController::class, 'create'])->name('bookings.create');
        Route::post('book', [PortalController::class, 'store'])->name('bookings.store');
    });
});

require __DIR__.'/settings.php';
