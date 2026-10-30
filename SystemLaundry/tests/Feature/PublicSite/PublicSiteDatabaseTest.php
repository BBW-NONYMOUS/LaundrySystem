<?php

namespace Tests\Feature\PublicSite;

use App\Enums\BookingStatus;
use App\Enums\PickupSlot;
use App\Models\BookingRequest;
use App\Models\Faq;
use App\Models\Setting;
use App\Models\Testimonial;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PublicSiteDatabaseTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_references_are_dated_unique_and_easy_to_read_aloud(): void
    {
        $references = collect(range(1, 50))->map(fn () => BookingRequest::factory()->create()->reference);

        $this->assertSame(50, $references->unique()->count());
        $references->each(fn (string $reference) => $this->assertMatchesRegularExpression(
            '/^BKG-'.now()->format('Ymd').'-[2-9A-HJ-NP-Z]{4}$/',
            $reference,
        ));
    }

    public function test_booking_phone_is_normalized_like_customers(): void
    {
        $booking = BookingRequest::factory()->create(['phone' => '+63 917 555 0101']);

        $this->assertSame('09175550101', $booking->phone);
    }

    public function test_only_pending_requests_hold_a_place_in_a_slot(): void
    {
        $date = now()->addDay();
        BookingRequest::factory()->count(2)->forSlot($date->toDateString(), PickupSlot::Morning)->create();
        BookingRequest::factory()->declined()->forSlot($date->toDateString(), PickupSlot::Morning)->create();
        BookingRequest::factory()->forSlot($date->toDateString(), PickupSlot::Afternoon)->create();

        $this->assertSame(2, BookingRequest::query()->holdingSlot($date, PickupSlot::Morning)->count());
        $this->assertTrue(
            BookingRequest::query()->holdingSlot($date, PickupSlot::Morning)->first()
                ->scheduled_at->equalTo($date->startOfDay()->setTime(9, 0)),
        );
    }

    public function test_testimonials_hide_surnames_and_only_approved_ones_reach_the_website(): void
    {
        $this->assertSame('Maria S.', Testimonial::displayName('Maria  Santos'));
        $this->assertSame('Juan D.', Testimonial::displayName('Juan Dela Cruz'));
        $this->assertSame('Cher', Testimonial::displayName('Cher'));

        Testimonial::factory()->create();
        $plain = Testimonial::factory()->approved()->create(['rating' => 5]);
        $featured = Testimonial::factory()->featured()->create(['rating' => 4]);

        $this->assertSame([$featured->id, $plain->id], Testimonial::query()->forWebsite()->pluck('id')->all());
    }

    public function test_faqs_are_ordered_and_home_shows_at_most_five(): void
    {
        Faq::factory()->count(7)->create(['show_on_home' => true]);
        Faq::factory()->create(['is_published' => false, 'show_on_home' => true]);

        $this->assertCount(5, Faq::query()->forHome()->get());
        $this->assertSame(
            Faq::query()->where('is_published', true)->orderBy('sort_order')->orderBy('id')->pluck('id')->all(),
            Faq::query()->published()->pluck('id')->all(),
        );
    }

    public function test_website_settings_have_defaults_without_seeding(): void
    {
        $this->assertSame('4', Setting::get('pickup_slot_capacity'));
        $this->assertNotEmpty(Setting::get('business_hours'));
    }

    public function test_demo_seed_produces_consistent_website_data(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(12, Faq::query()->count());
        $this->assertSame(5, Faq::query()->forHome()->count());
        $this->assertGreaterThanOrEqual(6, Testimonial::query()->approved()->count());

        // Every seeded review belongs to a finished order of the same customer.
        Testimonial::query()->with('order')->get()->each(function (Testimonial $testimonial) {
            $this->assertNotNull($testimonial->order);
            $this->assertSame($testimonial->customer_id, $testimonial->order->customer_id);
            $this->assertTrue($testimonial->order->status->isFinal());
        });

        // Tomorrow 9 AM is seeded 3 of 4 full to demonstrate slot capacity.
        $this->assertSame(3, BookingRequest::query()->holdingSlot(now()->addDay(), PickupSlot::Morning)->count());
        $this->assertGreaterThan(0, BookingRequest::query()->where('status', BookingStatus::Declined)->count());
    }
}
