<?php

namespace Tests\Feature\PublicSite;

use App\Enums\BookingStatus;
use App\Enums\ContactMessageStatus;
use App\Models\BookingRequest;
use App\Models\ContactMessage;
use App\Models\Faq;
use App\Models\Service;
use App\Models\Testimonial;
use App\Services\BrandImageService;
use App\Support\PublicStats;
use App\Support\SiteSettings;
use Database\Seeders\ServiceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Mockery\MockInterface;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

/**
 * Public-site Phase 5 backend additions: sidebar inbox badges, review stats, privacy page,
 * inbox retention, brand images and the customer-facing service descriptions.
 */
class WebsiteExtrasTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
    }

    public function test_sidebar_badges_count_website_inboxes_only_for_people_who_can_open_them(): void
    {
        BookingRequest::factory()->count(2)->create(['status' => BookingStatus::Pending]);
        BookingRequest::factory()->create(['status' => BookingStatus::Declined]);
        ContactMessage::factory()->create(['status' => ContactMessageStatus::New]);
        ContactMessage::factory()->create(['status' => ContactMessageStatus::Resolved]);
        Testimonial::factory()->create();
        Testimonial::factory()->approved()->create();

        $this->actingAs($this->admin())->get(route('dashboard'))->assertInertia(fn ($page) => $page
            ->where('navCounts.bookings_pending', 2)
            ->where('navCounts.messages_new', 1)
            ->where('navCounts.reviews_pending', 1));

        // Cashiers handle bookings and messages but don't moderate reviews.
        $this->actingAs($this->cashier())->get(route('orders.index'))->assertInertia(fn ($page) => $page
            ->where('navCounts.bookings_pending', 2)
            ->where('navCounts.reviews_pending', 0));

        // Staff (washers) see none of the website inboxes.
        $this->actingAs($this->staff())->get(route('orders.board'))->assertInertia(fn ($page) => $page
            ->where('navCounts.bookings_pending', 0)
            ->where('navCounts.messages_new', 0));
    }

    public function test_public_stats_summarise_only_approved_reviews(): void
    {
        Testimonial::factory()->approved()->create(['rating' => 5]);
        Testimonial::factory()->approved()->create(['rating' => 4]);
        Testimonial::factory()->create(['rating' => 1]);

        $stats = PublicStats::get();

        $this->assertSame(2, $stats['reviews_count']);
        $this->assertSame(4.5, $stats['average_rating']);
    }

    public function test_express_promise_uses_laundry_by_the_kilo_not_faster_per_piece_services(): void
    {
        Service::factory()->create(['pricing_unit' => 'per_kg', 'express_turnaround_hours' => 8]);
        Service::factory()->create(['pricing_unit' => 'per_item', 'express_turnaround_hours' => 6]);

        $this->assertSame(8, PublicStats::get()['fastest_express_hours']);
    }

    public function test_privacy_notice_is_public_and_listed_in_the_sitemap(): void
    {
        $this->get(route('public.privacy'))->assertOk()->assertInertia(fn ($page) => $page
            ->component('public/privacy')
            ->where('retentionMonths', 12)
            ->where('seo.title', 'Privacy Notice | Fresh Fold Laundry'));

        $this->get(route('sitemap'))->assertSee('<loc>'.route('public.privacy').'</loc>', false);
    }

    public function test_booking_requests_and_messages_are_pruned_after_twelve_months(): void
    {
        $old = BookingRequest::factory()->create(['created_at' => now()->subMonths(13)]);
        $recent = BookingRequest::factory()->create(['created_at' => now()->subMonths(11)]);
        $oldMessage = ContactMessage::factory()->create(['created_at' => now()->subMonths(13)]);
        $recentMessage = ContactMessage::factory()->create(['created_at' => now()->subMonth()]);

        $this->artisan('model:prune', ['--model' => [BookingRequest::class, ContactMessage::class]])->assertSuccessful();

        $this->assertModelMissing($old);
        $this->assertModelExists($recent);
        $this->assertModelMissing($oldMessage);
        $this->assertModelExists($recentMessage);
    }

    public function test_brand_images_are_generated(): void
    {
        $directory = storage_path('framework/testing/brand-'.uniqid());
        File::ensureDirectoryExists($directory);
        $this->app->usePublicPath($directory);

        try {
            $this->artisan('laundry:brand-images')->assertSuccessful();

            $og = getimagesize("{$directory}/images/og-image.jpg");
            $this->assertSame([1200, 630], [$og[0] ?? null, $og[1] ?? null]);
            $this->assertSame(180, getimagesize("{$directory}/apple-touch-icon.png")[0] ?? null);
            // ICO header: reserved 0, type 1 (icon), two images.
            $this->assertSame("\x00\x00\x01\x00\x02\x00", substr((string) file_get_contents("{$directory}/favicon.ico"), 0, 6));
        } finally {
            File::deleteDirectory($directory);
        }
    }

    public function test_changing_the_shop_name_refreshes_the_link_preview_image(): void
    {
        config(['laundry.auto_brand_images' => true]);
        $this->mock(BrandImageService::class, fn (MockInterface $mock) => $mock->shouldReceive('ogImage')->once());

        $this->actingAs($this->admin())->put(route('shop.update'), [
            'shop_name' => 'Sparkle Wash', 'shop_address' => '1 Main St', 'shop_phone' => '09171234567', 'shop_email' => null,
            'currency_code' => 'PHP', 'currency_symbol' => '₱', 'express_surcharge_percent' => 50, 'default_delivery_fee' => 50,
            'unclaimed_after_days' => 7, 'reminder_interval_days' => 3, 'receipt_footer' => null, 'sms_enabled' => true, 'email_enabled' => true,
        ])->assertSessionHasNoErrors();
    }

    public function test_service_seeder_never_overwrites_the_owners_descriptions(): void
    {
        Service::query()->delete();
        $this->seed(ServiceSeeder::class);
        Service::query()->where('code', 'WDF')->update(['description' => 'Owner wrote this']);

        $this->seed(ServiceSeeder::class);

        $this->assertSame('Owner wrote this', Service::query()->where('code', 'WDF')->value('description'));
        // A service the seeder creates gets the customer-facing website copy.
        $this->assertSame('Washed and spun dry. You dry and fold at home.', Service::query()->where('code', 'WO')->value('description'));
    }

    public function test_site_settings_list_only_photos_that_exist(): void
    {
        $directory = storage_path('framework/testing/photos-'.uniqid());
        File::ensureDirectoryExists("{$directory}/images/site");
        File::put("{$directory}/images/site/hero.webp", 'x');
        File::put("{$directory}/images/site/notes.txt", 'x');
        $this->app->usePublicPath($directory);

        try {
            $this->assertSame(['hero'], SiteSettings::photos());
        } finally {
            File::deleteDirectory($directory);
        }
    }

    public function test_light_mode_is_the_default_for_new_visitors(): void
    {
        $this->get(route('home'))->assertOk()
            ->assertSee("const appearance = 'light';", false)
            ->assertDontSee('class="dark"', false);

        // A visitor who chose dark keeps it.
        $this->withUnencryptedCookie('appearance', 'dark')->get(route('home'))->assertSee("const appearance = 'dark';", false);
    }

    public function test_staff_website_pages_render_their_components(): void
    {
        $this->actingAs($this->admin());

        $this->assertPage($this->get(route('booking-requests.index')), 'website/booking-requests/index');
        $this->assertPage($this->get(route('contact-messages.index')), 'website/contact-messages/index');
        $this->assertPage($this->get(route('faqs.index')), 'website/faqs/index');
        $this->assertPage($this->get(route('testimonials.index')), 'website/testimonials/index');
    }

    public function test_the_home_page_faq_list_is_capped_at_five(): void
    {
        Faq::factory()->count(5)->create(['show_on_home' => true, 'is_published' => true]);
        $first = Faq::query()->first();
        $data = ['question' => 'Do you iron?', 'answer' => 'Yes, per piece.', 'category' => 'Services', 'is_published' => true, 'show_on_home' => true];

        $this->actingAs($this->admin())->post(route('faqs.store'), $data)->assertSessionHasErrors('show_on_home');
        // Hidden from Home, or unpublished, is always fine.
        $this->actingAs($this->admin())->post(route('faqs.store'), [...$data, 'show_on_home' => false])->assertSessionHasNoErrors();
        // Editing one of the five Home questions keeps it on Home.
        $this->actingAs($this->admin())->put(route('faqs.update', $first), [...$data, 'question' => $first->question])->assertSessionHasNoErrors();
    }
}
