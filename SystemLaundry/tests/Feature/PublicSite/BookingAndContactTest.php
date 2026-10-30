<?php

namespace Tests\Feature\PublicSite;

use App\Enums\BookingStatus;
use App\Enums\DeliveryType;
use App\Enums\OrderStatus;
use App\Enums\PickupSlot;
use App\Models\BookingRequest;
use App\Models\ContactMessage;
use App\Models\Customer;
use App\Models\Order;
use App\Models\Setting;
use App\Notifications\BookingConfirmed;
use App\Notifications\BookingDeclined;
use App\Notifications\BookingReceived;
use App\Notifications\Channels\SmsChannel;
use App\Notifications\ContactMessageReceived;
use App\Notifications\WebsiteInboxAlert;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class BookingAndContactTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
        Notification::fake();
        $this->travelTo(now()->setTime(8, 0));
    }

    /** A form token issued a minute ago (passes the "too fast" check). */
    private function token(int $secondsAgo = 60): string
    {
        return Crypt::encryptString((string) now()->subSeconds($secondsAgo)->getTimestamp());
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function booking(array $overrides = []): array
    {
        return [
            'name' => 'Maria Santos',
            'phone' => '0917 555 0101',
            'email' => 'maria@example.com',
            'address' => 'Blk 4 Lot 12, Mabini St., Barangay Poblacion',
            'pickup_date' => now()->addDay()->toDateString(),
            'time_slot' => PickupSlot::Afternoon->value,
            'service_id' => $this->washDryFold()->id,
            'estimated_quantity' => 5,
            'wants_delivery' => true,
            'consent' => true,
            'form_token' => $this->token(),
            ...$overrides,
        ];
    }

    public function test_guest_books_a_pickup_and_gets_a_reference_and_confirmation_sms(): void
    {
        $cashier = $this->cashier();

        $this->post(route('public.book.store'), $this->booking())
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('public.book'))
            ->assertSessionHas('inertia.flash_data.booking.window', '1:00 – 3:00 PM');

        $booking = BookingRequest::query()->sole();
        $this->assertSame(BookingStatus::Pending, $booking->status);
        $this->assertSame('09175550101', $booking->phone);
        $this->assertMatchesRegularExpression('/^BKG-\d{8}-[2-9A-HJ-NP-Z]{4}$/', $booking->reference);
        $this->assertSame(0, Order::query()->count(), 'A guest request must not create an order yet.');

        Notification::assertSentOnDemand(BookingReceived::class, fn ($notification, $channels, AnonymousNotifiable $notifiable) => $notifiable->routes[SmsChannel::class] === '09175550101');
        Notification::assertSentTo($cashier, WebsiteInboxAlert::class);
    }

    public function test_returning_customers_are_recognized_by_mobile_number(): void
    {
        $customer = Customer::factory()->create(['phone' => '09175550101']);

        $this->post(route('public.book.store'), $this->booking(['phone' => '+63 917 555 0101']))->assertSessionHasNoErrors();

        $this->assertSame($customer->id, BookingRequest::query()->sole()->customer_id);
    }

    public function test_a_full_slot_cannot_be_booked(): void
    {
        Setting::set('pickup_slot_capacity', '2');
        $date = now()->addDay()->toDateString();
        BookingRequest::factory()->count(2)->forSlot($date, PickupSlot::Afternoon)->create();

        $this->post(route('public.book.store'), $this->booking())
            ->assertSessionHasErrors(['time_slot' => 'Sorry, that time slot just filled up. Please choose another one.']);

        $this->get(route('public.book', ['date' => $date]))->assertInertia(fn ($page) => $page
            ->component('public/book')
            ->where('slots.1.available', false)
            ->where('slots.1.reason', 'Fully booked')
            ->where('slots.0.available', true));
    }

    public function test_scheduled_pickup_trips_also_use_up_slot_places(): void
    {
        Setting::set('pickup_slot_capacity', '1');
        $order = Order::factory()->pendingPickup()->create();
        $order->deliveries()->create([
            'type' => DeliveryType::Pickup, 'status' => 'scheduled',
            'scheduled_at' => now()->addDay()->setTime(13, 0), 'address' => 'x', 'contact_phone' => '09181234567',
        ]);

        $this->post(route('public.book.store'), $this->booking())->assertSessionHasErrors('time_slot');
    }

    public function test_slots_starting_within_an_hour_are_closed(): void
    {
        $this->travelTo(now()->setTime(12, 30));

        $this->post(route('public.book.store'), $this->booking(['pickup_date' => now()->toDateString(), 'time_slot' => '13:00']))
            ->assertSessionHasErrors('time_slot');
        $this->post(route('public.book.store'), $this->booking(['pickup_date' => now()->toDateString(), 'time_slot' => '16:00']))
            ->assertSessionHasNoErrors();
    }

    public function test_spam_is_rejected_without_saving(): void
    {
        $this->post(route('public.book.store'), $this->booking(['website' => 'http://spam.example']))->assertSessionHasErrors('form');
        $this->post(route('public.book.store'), $this->booking(['form_token' => $this->token(1)]))->assertSessionHasErrors('form');
        $this->post(route('public.book.store'), $this->booking(['form_token' => 'forged']))->assertSessionHasErrors('form');
        $this->post(route('public.book.store'), $this->booking(['form_token' => null]))->assertSessionHasErrors('form_token');

        $this->assertSame(0, BookingRequest::query()->count());
    }

    public function test_validation_requires_consent_full_address_and_a_date_within_two_weeks(): void
    {
        $this->post(route('public.book.store'), $this->booking([
            'consent' => false,
            'address' => 'Short',
            'pickup_date' => now()->addDays(20)->toDateString(),
            'time_slot' => '07:00',
        ]))->assertSessionHasErrors(['consent', 'address', 'pickup_date', 'time_slot']);
    }

    public function test_one_mobile_can_have_at_most_three_pending_requests(): void
    {
        BookingRequest::factory()->count(3)->create(['phone' => '09175550101']);

        $this->post(route('public.book.store'), $this->booking())->assertSessionHasErrors('phone');
    }

    public function test_booking_form_is_rate_limited_per_visitor(): void
    {
        // Different days, so slot capacity (4 per slot) isn't what stops the 6th request.
        foreach (range(1, 5) as $i) {
            $this->post(route('public.book.store'), $this->booking([
                'phone' => "0917555010{$i}",
                'pickup_date' => now()->addDays($i)->toDateString(),
            ]))->assertSessionHasNoErrors();
        }

        $this->post(route('public.book.store'), $this->booking(['phone' => '09175550109']))->assertSessionHasErrors('form');
        $this->assertSame(5, BookingRequest::query()->count());
    }

    public function test_staff_confirm_a_request_into_a_customer_and_a_pickup_order(): void
    {
        $cashier = $this->cashier();
        $rider = $this->rider();
        $booking = BookingRequest::factory()->forSlot(now()->addDay()->toDateString(), PickupSlot::Morning)->create([
            'name' => 'Ana Reyes', 'phone' => '09181112222', 'is_express' => false, 'wants_delivery' => true,
            'service_id' => $this->washDryFold()->id, 'estimated_quantity' => 6,
        ]);

        $this->actingAs($cashier)->post(route('booking-requests.confirm', $booking), ['rider_id' => $rider->id])
            ->assertSessionHasNoErrors();

        $booking->refresh();
        $order = $booking->order;
        $this->assertSame(BookingStatus::Confirmed, $booking->status);
        $this->assertSame(OrderStatus::Pending, $order->status);
        $this->assertSame('Ana Reyes', $order->customer->name);
        $this->assertSame($rider->id, $order->pickup->rider_id);
        $this->assertTrue($order->pickup->scheduled_at->equalTo(now()->addDay()->setTime(9, 0)));
        $this->assertStringContainsString($booking->reference, (string) $order->special_instructions);
        $this->assertStringContainsString('delivered back', (string) $order->special_instructions);
        Notification::assertSentOnDemand(BookingConfirmed::class);

        // Confirming twice is refused.
        $this->actingAs($cashier)->post(route('booking-requests.confirm', $booking))->assertSessionHasErrors('booking');
        $this->assertSame(1, Order::query()->count());
    }

    public function test_confirming_reuses_an_existing_customer_and_a_past_date_must_be_moved(): void
    {
        $existing = Customer::factory()->create(['phone' => '09181112222']);
        $booking = BookingRequest::factory()->forSlot(now()->subDay()->toDateString(), PickupSlot::Morning)->create(['phone' => '09181112222']);
        $cashier = $this->cashier();

        $this->actingAs($cashier)->post(route('booking-requests.confirm', $booking))->assertSessionHasErrors('pickup_date');

        $this->actingAs($cashier)->post(route('booking-requests.confirm', $booking), [
            'pickup_date' => now()->addDay()->toDateString(),
            'time_slot' => PickupSlot::LateAfternoon->value,
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Customer::query()->count());
        $this->assertSame($existing->id, $booking->refresh()->order->customer_id);
    }

    public function test_decline_notifies_the_guest_but_cancel_does_not(): void
    {
        $cashier = $this->cashier();
        [$declined, $cancelled] = BookingRequest::factory()->count(2)->create();

        $this->actingAs($cashier)->post(route('booking-requests.decline', $declined), ['reason' => 'Outside our pickup area.'])->assertSessionHasNoErrors();
        $this->actingAs($cashier)->post(route('booking-requests.cancel', $cancelled), ['reason' => 'Customer called to cancel.'])->assertSessionHasNoErrors();

        $this->assertSame(BookingStatus::Declined, $declined->refresh()->status);
        $this->assertSame(BookingStatus::Cancelled, $cancelled->refresh()->status);
        Notification::assertSentOnDemandTimes(BookingDeclined::class, 1);
    }

    public function test_inbox_permissions(): void
    {
        $this->actingAs($this->staff())->get(route('booking-requests.index'))->assertForbidden();
        $this->actingAs($this->cashier())->get(route('booking-requests.index'))->assertOk();
        $this->actingAs($this->cashier())->get(route('contact-messages.index'))->assertOk();
        $this->actingAs($this->cashier())->get(route('faqs.index'))->assertForbidden();
        $this->actingAs($this->admin())->get(route('testimonials.index'))->assertOk();
    }

    public function test_contact_message_is_saved_staff_alerted_and_sender_emailed(): void
    {
        $owner = $this->admin();

        $this->post(route('public.contact.store'), [
            'name' => 'Lito Ramos',
            'email' => 'lito@example.com',
            'subject' => 'Dorm account',
            'message' => 'Do you offer weekly pickup for a dormitory of 40 students?',
            'consent' => true,
            'form_token' => $this->token(),
        ])->assertSessionHasNoErrors()->assertRedirect(route('public.contact'));

        $this->assertSame('new', ContactMessage::query()->sole()->status->value);
        Notification::assertSentOnDemand(ContactMessageReceived::class);
        Notification::assertSentTo($owner, WebsiteInboxAlert::class);
    }

    public function test_contact_needs_a_way_to_reply(): void
    {
        $this->post(route('public.contact.store'), [
            'name' => 'Anonymous', 'message' => 'Hello there, what time do you open?', 'consent' => true, 'form_token' => $this->token(),
        ])->assertSessionHasErrors(['email', 'phone']);
    }

    public function test_owner_uploads_and_removes_the_logo(): void
    {
        Storage::fake('public');
        $owner = $this->admin();

        $this->actingAs($owner)->post(route('shop.logo.store'), ['logo' => UploadedFile::fake()->image('logo.png', 256, 256)])
            ->assertSessionHasNoErrors();
        $path = (string) Setting::get('logo_path');
        Storage::disk('public')->assertExists($path);

        $this->actingAs($owner)->post(route('shop.logo.store'), ['logo' => UploadedFile::fake()->create('logo.svg', 10, 'image/svg+xml')])
            ->assertSessionHasErrors('logo');

        $this->actingAs($owner)->delete(route('shop.logo.destroy'))->assertSessionHasNoErrors();
        Storage::disk('public')->assertMissing($path);
        $this->assertSame('', Setting::get('logo_path'));
    }
}
