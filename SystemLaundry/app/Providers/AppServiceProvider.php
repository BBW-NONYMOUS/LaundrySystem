<?php

namespace App\Providers;

use App\Services\Sms\LogSmsGateway;
use App\Services\Sms\SemaphoreSmsGateway;
use App\Services\Sms\SmsGateway;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // SMS_DRIVER=semaphore sends real messages; anything else just logs them.
        $this->app->bind(SmsGateway::class, fn () => match (config('services.sms.driver')) {
            'semaphore' => new SemaphoreSmsGateway(
                apiKey: (string) config('services.semaphore.api_key'),
                senderName: config('services.semaphore.sender_name') ?: null,
                url: (string) config('services.semaphore.url'),
            ),
            default => new LogSmsGateway,
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureRateLimiting();
    }

    /**
     * Limits for the public website. Visitors get a friendly form error instead of a bare 429.
     */
    protected function configureRateLimiting(): void
    {
        $tooMany = fn (string $message) => fn () => back()->withErrors(['form' => $message]);

        // Order lookups: per-order-number lockouts live in TrackOrderController.
        RateLimiter::for('public-tracking', fn (Request $request) => Limit::perMinute(10)
            ->by($request->ip())
            ->response($tooMany('Too many lookups. Please wait a minute and try again.')));

        // Booking, contact and feedback forms: 5 per hour per form per visitor.
        RateLimiter::for('public-forms', fn (Request $request) => Limit::perHour(5)
            ->by(($request->route()?->getName() ?? 'form').'|'.$request->ip())
            ->response($tooMany('You’ve sent this form several times already. Please try again later or call us.')));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        // Inertia props get plain objects instead of {"data": {...}} wrappers.
        JsonResource::withoutWrapping();

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
