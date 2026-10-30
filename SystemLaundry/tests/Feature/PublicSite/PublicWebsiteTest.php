<?php

namespace Tests\Feature\PublicSite;

use App\Enums\OrderStatus;
use App\Enums\PickupSlot;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Faq;
use App\Models\Order;
use App\Models\Testimonial;
use App\Notifications\OrderCompleted;
use App\Notifications\WebsiteInboxAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Notification;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia;
use Symfony\Component\HttpFoundation\Response;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

/**
 * Public pages, tracking, SEO output, sitemap/robots and error pages.
 */
class PublicWebsiteTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
        Notification::fake();
    }

    /**
     * @param  TestResponse<Response>  $response
     */
    private function assertPublicPage(TestResponse $response, string $component, ?callable $props = null): void
    {
        $response->assertOk()->assertInertia(function (AssertableInertia $page) use ($component, $props) {
            $page->component($component);

            if ($props !== null) {
                $props($page);
            }
        });
    }

    public function test_home_shows_live_services_real_stats_and_only_approved_reviews(): void
    {
        $this->washDryFold();
        Order::factory()->status(OrderStatus::Completed)->count(3)->create();
        Testimonial::factory()->featured()->create(['comment' => 'Visible review']);
        Testimonial::factory()->create(['comment' => 'Waiting for approval']);
        Faq::factory()->count(6)->create(['show_on_home' => true]);

        $this->assertPublicPage($this->get(route('home')), 'public/home', fn ($page) => $page
            ->has('services', 1)
            ->where('stats.orders_completed', 3)
            ->has('testimonials', 1)
            ->where('testimonials.0.comment', 'Visible review')
            ->missing('testimonials.0.customer_id')
            ->has('faqs', 5)
            ->where('site.name', 'Fresh Fold Laundry')
            ->where('seo.title', 'Fresh Fold Laundry'));
    }

    public function test_seo_tags_and_local_business_schema_are_in_the_raw_html_for_crawlers(): void
    {
        $html = $this->get(route('public.pricing'))->assertOk()->getContent();

        $this->assertStringContainsString('<title data-inertia="">Services &amp; Pricing | Fresh Fold Laundry</title>', $html);
        $this->assertStringContainsString('property="og:title"', $html);
        $this->assertStringContainsString('name="description"', $html);
        $this->assertStringContainsString('data-inertia="description"', $html);
        $this->assertStringContainsString('"@type":"DryCleaningOrLaundry"', $html);
        $this->assertStringNotContainsString('noindex', $html);
    }

    public function test_faq_page_includes_faq_schema(): void
    {
        Faq::factory()->create(['question' => 'Do you deliver?', 'answer' => 'Yes, within 5 km.']);

        $html = $this->get(route('public.faq'))->assertOk()->getContent();

        $this->assertStringContainsString('"@type":"FAQPage"', $html);
        $this->assertStringContainsString('Do you deliver?', $html);
    }

    public function test_tracking_by_order_number_and_mobile_redirects_to_the_status_page(): void
    {
        $order = $this->orderWithItems(['order_number' => 'LND-20261023-0042']);
        $order->customer->update(['phone' => '09175550101']);

        // A receipt number typed without the LND- prefix and a +63 mobile still match.
        $this->post(route('public.track.lookup'), [
            'order_number' => '20261023-0042',
            'phone' => '+63 917 555 0101',
        ])->assertRedirect(route('tracking.show', $order->tracking_code));
    }

    public function test_wrong_order_number_and_wrong_mobile_get_the_same_message(): void
    {
        $order = $this->orderWithItems();
        $order->customer->update(['phone' => '09175550101']);

        $wrongPhone = $this->post(route('public.track.lookup'), ['order_number' => $order->order_number, 'phone' => '09990000000'])
            ->assertSessionHasErrors('order_number')->getSession()->get('errors')->first('order_number');

        $wrongNumber = $this->post(route('public.track.lookup'), ['order_number' => 'LND-20200101-9999', 'phone' => '09175550101'])
            ->assertSessionHasErrors('order_number')->getSession()->get('errors')->first('order_number');

        $this->assertSame($wrongPhone, $wrongNumber);
    }

    public function test_an_order_number_locks_after_five_failed_lookups(): void
    {
        $order = $this->orderWithItems();
        $order->customer->update(['phone' => '09175550101']);

        foreach (range(1, 5) as $attempt) {
            $this->post(route('public.track.lookup'), ['order_number' => $order->order_number, 'phone' => '0999000000'.$attempt]);
        }

        // Even the right mobile is refused while locked.
        $this->post(route('public.track.lookup'), ['order_number' => $order->order_number, 'phone' => '09175550101'])
            ->assertSessionHasErrors(['order_number' => 'Too many attempts for this order number. Please try again in 15 minutes or call us.']);
    }

    public function test_home_quick_tracker_returns_a_privacy_safe_result_inline(): void
    {
        $order = $this->orderWithItems();
        $order->customer->update(['phone' => '09175550101', 'name' => 'Maria Santos', 'address' => '12 Secret St.']);

        $this->from(route('home'))
            ->post(route('public.track.lookup'), ['order_number' => $order->order_number, 'phone' => '09175550101', 'inline' => true])
            ->assertRedirect(route('home'))
            ->assertSessionHas('inertia.flash_data.trackedOrder.order_number', $order->order_number)
            ->assertSessionHas('inertia.flash_data.trackedOrder.customer_first_name', 'Maria')
            ->assertSessionMissing('inertia.flash_data.trackedOrder.address');
    }

    public function test_feedback_only_for_finished_orders_once_and_hidden_until_approved(): void
    {
        $open = $this->orderWithItems();
        $this->get(route('public.feedback', $open->tracking_code))->assertNotFound();

        $done = $this->orderWithItems(['status' => OrderStatus::Completed, 'completed_at' => now()]);
        $done->customer->update(['name' => 'Juan Dela Cruz']);
        $owner = $this->admin();

        $this->assertPublicPage($this->get(route('public.feedback', $done->tracking_code)), 'public/feedback', fn ($page) => $page->where('alreadyRated', false));

        $token = Crypt::encryptString((string) now()->subMinute()->getTimestamp());
        $this->post(route('public.feedback.store', $done->tracking_code), ['rating' => 5, 'comment' => 'Super fresh and on time!', 'form_token' => $token])
            ->assertSessionHasNoErrors();
        $this->post(route('public.feedback.store', $done->tracking_code), ['rating' => 1, 'comment' => 'Trying to rate twice', 'form_token' => $token])
            ->assertSessionHasErrors('rating');

        $review = Testimonial::query()->sole();
        $this->assertSame('Juan D.', $review->author_name);
        $this->assertFalse($review->is_approved);
        $this->assertSame(0, Testimonial::query()->forWebsite()->count());
        Notification::assertSentTo($owner, WebsiteInboxAlert::class);
    }

    public function test_order_completed_message_contains_the_rating_link(): void
    {
        $order = $this->orderWithItems(['status' => OrderStatus::Completed]);

        $text = (new OrderCompleted($order))->text($order->customer);

        $this->assertStringContainsString(route('public.feedback', $order->tracking_code), $text);
    }

    public function test_sitemap_lists_only_public_pages_and_robots_points_to_it(): void
    {
        $xml = $this->get(route('sitemap'))->assertOk()->assertHeader('Content-Type', 'application/xml; charset=UTF-8')->getContent();

        foreach (['home', 'public.pricing', 'public.book', 'public.track', 'public.faq', 'public.about', 'public.contact'] as $name) {
            $this->assertStringContainsString('<loc>'.route($name).'</loc>', $xml);
        }
        $this->assertStringNotContainsString('dashboard', $xml);

        $this->get('/robots.txt')->assertOk()
            ->assertSee('Disallow: /dashboard', false)
            ->assertSee('Disallow: /track/', false)
            ->assertSee('Sitemap: '.route('sitemap'), false);
    }

    public function test_unknown_pages_render_the_branded_error_page(): void
    {
        $this->get('/this-page-does-not-exist')
            ->assertNotFound()
            ->assertInertia(fn ($page) => $page->component('errors/error')->where('status', 404)->where('site.name', 'Fresh Fold Laundry'));

        // JSON callers still get JSON.
        $this->getJson('/this-page-does-not-exist')->assertNotFound()->assertJsonStructure(['message']);
    }

    public function test_signed_in_customers_book_through_the_portal(): void
    {
        $customer = $this->userWithRole(UserRole::Customer);
        Customer::factory()->create(['user_id' => $customer->id]);

        $this->actingAs($customer)->get(route('public.book'))->assertRedirect(route('portal.bookings.create'));
    }

    public function test_booking_page_offers_two_weeks_of_dates_and_slot_availability(): void
    {
        $this->travelTo(now()->setTime(8, 0));

        $this->assertPublicPage($this->get(route('public.book')), 'public/book', fn ($page) => $page
            ->has('dates', 15)
            ->has('slots', 3)
            ->where('slots.0.value', PickupSlot::Morning->value)
            ->where('selectedDate', now()->toDateString())
            ->has('formToken'));

        // Another day's slots load with a partial reload (?date=).
        $tomorrow = now()->addDay()->toDateString();
        $this->assertPublicPage($this->get(route('public.book', ['date' => $tomorrow])), 'public/book', fn ($page) => $page->where('selectedDate', $tomorrow));
    }

    public function test_owner_saves_website_settings_and_only_google_map_embeds_are_accepted(): void
    {
        $owner = $this->admin();
        $base = [
            'shop_name' => 'Sparkle Wash', 'shop_address' => '1 Main St', 'shop_phone' => '09171234567', 'shop_email' => null,
            'currency_code' => 'PHP', 'currency_symbol' => '₱', 'express_surcharge_percent' => 50, 'default_delivery_fee' => 50,
            'unclaimed_after_days' => 7, 'reminder_interval_days' => 3, 'receipt_footer' => null, 'sms_enabled' => true, 'email_enabled' => true,
        ];

        $this->actingAs($owner)->put(route('shop.update'), [...$base, 'map_embed_url' => 'https://evil.example.com/embed'])
            ->assertSessionHasErrors('map_embed_url');

        $this->actingAs($owner)->put(route('shop.update'), [...$base, 'shop_tagline' => 'Clean in a day', 'pickup_slot_capacity' => 6])
            ->assertSessionHasNoErrors();

        $this->assertPublicPage($this->get(route('home')), 'public/home', fn ($page) => $page->where('site.name', 'Sparkle Wash')->where('site.tagline', 'Clean in a day'));
    }
}
