<?php

namespace App\Http\Controllers;

use App\Enums\Permission;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Services\ReportService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    /**
     * One URL for everyone after login: riders and customers are sent to their own home page;
     * the owner gets analytics; counter staff get today's operational numbers.
     */
    public function __invoke(Request $request, ReportService $reports): Response|RedirectResponse
    {
        $user = $request->user();

        if (! $user->can(Permission::DashboardView->value)) {
            if ($user->can(Permission::DeliveriesOwn->value)) {
                return to_route('rider.deliveries.index');
            }

            if ($user->can(Permission::PortalAccess->value)) {
                return to_route('portal.index');
            }

            return Inertia::render('dashboard', ['stats' => null, 'recentOrders' => [], 'analytics' => null]);
        }

        [$from, $to] = ReportService::range(null, null, 30);

        return Inertia::render('dashboard', [
            'stats' => $reports->dashboardStats(),
            'recentOrders' => OrderResource::collection(Order::with('customer')->latest()->limit(8)->get()),
            // Charts load right after the page renders (Skeletons meanwhile) so the counter isn't slowed down.
            'analytics' => $user->can(Permission::DashboardAnalytics->value)
                ? Inertia::defer(fn () => [
                    'range' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
                    'salesTrend' => $reports->salesTrend($from, $to),
                    'peakHours' => $reports->peakHours($from, $to),
                    'topServices' => $reports->topServices($from, $to),
                    'topCustomers' => $reports->topCustomers($from, $to),
                    'paymentMethods' => $reports->paymentMethods($from, $to),
                ])
                : null,
        ]);
    }
}
