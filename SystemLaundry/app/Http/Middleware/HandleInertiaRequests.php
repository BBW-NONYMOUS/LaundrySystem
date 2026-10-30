<?php

namespace App\Http\Middleware;

use App\Enums\BookingStatus;
use App\Enums\ContactMessageStatus;
use App\Enums\OrderStatus;
use App\Enums\Permission;
use App\Enums\UserRole;
use App\Models\BookingRequest;
use App\Models\ContactMessage;
use App\Models\InventoryItem;
use App\Models\Order;
use App\Models\Setting;
use App\Models\Testimonial;
use App\Models\User;
use App\Support\SiteSettings;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $user instanceof User ? $this->authUser($user) : null,
            ],
            'shop' => fn () => [
                'name' => Setting::get('shop_name'),
                'currency_symbol' => Setting::get('currency_symbol', '₱'),
            ],
            // Business details for public pages (navbar, footer, contact).
            'site' => fn () => SiteSettings::shared(),
            // Lets StatusBadge/filters use the same labels and colors as the server.
            'orderStatuses' => fn () => OrderStatus::options(),
            'notifications' => fn () => $user instanceof User && $user->isStaff() ? [
                'unread_count' => $user->unreadNotifications()->count(),
                'latest' => $user->unreadNotifications()->latest()->limit(8)->get()->map(fn ($notification) => [
                    'id' => $notification->id,
                    ...$notification->data,
                    'created_at' => $notification->created_at?->toIso8601String(),
                ]),
            ] : null,
            // Sidebar badges: indexed COUNT queries, only for the sections this user can open.
            'navCounts' => fn () => $user instanceof User && $user->isStaff() ? $this->navCounts($user) : null,
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }

    /**
     * The signed-in user plus roles/permissions for the role-based sidebar and buttons.
     * The server still enforces every permission; these only decide what to show.
     *
     * @return array<string, mixed>
     */
    private function authUser(User $user): array
    {
        $role = $user->getRoleNames()->first();

        return [
            ...$user->only(['id', 'name', 'email', 'phone', 'email_verified_at', 'created_at', 'updated_at']),
            'two_factor_enabled' => $user->two_factor_confirmed_at !== null,
            'role' => $role,
            'role_label' => $role !== null ? (UserRole::tryFrom($role)?->label() ?? $role) : null,
            'permissions' => $user->getAllPermissions()->pluck('name')->values(),
        ];
    }

    /**
     * @return array<string, int>
     */
    private function navCounts(User $user): array
    {
        $monitoring = $user->can(Permission::MonitoringView->value);

        return [
            'overdue' => $monitoring ? Order::overdue()->count() : 0,
            'unclaimed' => $monitoring ? Order::unclaimed(Setting::int('unclaimed_after_days'))->count() : 0,
            'low_stock' => $monitoring && $user->can(Permission::InventoryView->value) ? InventoryItem::lowStock()->count() : 0,
            'bookings_pending' => $user->can(Permission::BookingsManage->value) ? BookingRequest::query()->where('status', BookingStatus::Pending)->count() : 0,
            'messages_new' => $user->can(Permission::MessagesView->value) ? ContactMessage::query()->where('status', ContactMessageStatus::New)->count() : 0,
            'reviews_pending' => $user->can(Permission::WebsiteManage->value) ? Testimonial::query()->where('is_approved', false)->count() : 0,
        ];
    }
}
