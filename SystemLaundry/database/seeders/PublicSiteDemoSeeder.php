<?php

namespace Database\Seeders;

use App\Enums\BookingStatus;
use App\Enums\ContactMessageStatus;
use App\Enums\OrderStatus;
use App\Enums\PickupSlot;
use App\Enums\UserRole;
use App\Models\BookingRequest;
use App\Models\ContactMessage;
use App\Models\Order;
use App\Models\Service;
use App\Models\Testimonial;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Seeder;

/**
 * Demo data for the public website: reviews tied to real completed orders, guest booking
 * requests for the coming days (one slot almost full), and a few contact messages.
 * Runs after DemoDataSeeder.
 */
class PublicSiteDemoSeeder extends Seeder
{
    /**
     * rating, comment, approved, featured
     *
     * @var list<array{0: int, 1: string, 2: bool, 3: bool}>
     */
    private const REVIEWS = [
        [5, 'Booked a pickup before work and my clothes came back the next evening, folded better than I do it myself. The SMS updates are a lifesaver.', true, true],
        [5, 'Sobrang bango ng damit! Our family drops off 8–10 kilos every Saturday and nothing has ever gone missing in two years.', true, true],
        [5, 'I needed my barong pressed for a wedding the same day. Express service had it ready in a few hours. Highly recommend.', true, true],
        [4, 'Fair prices and very careful with my delicate blouses. Only wish they opened a bit earlier on Sundays.', true, true],
        [5, 'As a student near the campus, the per-kilo price and free text reminders are perfect. I can track my order right from my phone.', true, true],
        [5, 'They cleaned two thick comforters that I thought were beyond saving. Came back soft and fresh. Rider was polite and on time.', true, true],
        [4, 'Quick turnaround and the receipt shows exactly what I paid for. Good service overall.', true, false],
        [5, 'Paid by GCash on delivery, super convenient. The rider even called ahead to make sure I was home.', true, false],
        [3, 'Clothes were clean but delivery came in the later slot than I picked.', false, false],
        [5, 'Best laundry shop in our area. Friendly staff at the counter and they remember my preferences.', false, false],
    ];

    public function run(): void
    {
        $this->seedTestimonials();
        $this->seedBookingRequests();
        $this->seedContactMessages();
    }

    private function seedTestimonials(): void
    {
        $admin = User::role(UserRole::Admin->value)->first();

        // One review per customer, from their most recent finished order.
        $orders = Order::query()
            ->whereIn('status', [OrderStatus::Completed, OrderStatus::Delivered])
            ->with('customer')
            ->latest('completed_at')
            ->get()
            ->unique('customer_id')
            ->values();

        foreach (self::REVIEWS as $index => [$rating, $comment, $approved, $featured]) {
            $order = $orders->get($index);

            if ($order === null) {
                break;
            }

            $reviewedAt = $order->completed_at?->addHours(fake()->numberBetween(2, 30)) ?? now();

            $testimonial = new Testimonial([
                'customer_id' => $order->customer_id,
                'order_id' => $order->id,
                'author_name' => Testimonial::displayName($order->customer->name),
                'rating' => $rating,
                'comment' => $comment,
                'source' => Testimonial::SOURCE_FEEDBACK,
                'is_approved' => $approved,
                'is_featured' => $featured,
                'approved_by' => $approved ? $admin?->id : null,
                'approved_at' => $approved ? $reviewedAt->addDay() : null,
            ]);
            $testimonial->created_at = $reviewedAt;
            $testimonial->updated_at = $reviewedAt;
            $testimonial->save();
        }
    }

    private function seedBookingRequests(): void
    {
        $tomorrow = CarbonImmutable::tomorrow()->toDateString();
        $wdf = Service::query()->where('code', 'WDF')->first();
        $comforter = Service::query()->where('code', 'COMF')->first();
        $cashier = User::role(UserRole::Cashier->value)->first();

        // Tomorrow 9 AM is almost full (3 of 4 places) to demonstrate slot capacity.
        BookingRequest::factory()->count(3)->forSlot($tomorrow, PickupSlot::Morning)->create(['service_id' => $wdf?->id]);

        BookingRequest::factory()->forSlot($tomorrow, PickupSlot::Afternoon)->create([
            'service_id' => $comforter?->id,
            'estimated_quantity' => 2,
            'special_instructions' => 'Two queen-size comforters. Please call when you are outside the gate.',
        ]);
        BookingRequest::factory()->forSlot(CarbonImmutable::today()->addDays(2)->toDateString(), PickupSlot::LateAfternoon)->create([
            'service_id' => $wdf?->id,
            'is_express' => true,
            'estimated_quantity' => 5,
        ]);

        BookingRequest::factory()->declined('Address is outside our 5 km pickup area — invited to drop off at the shop.')->create([
            'pickup_date' => CarbonImmutable::yesterday()->toDateString(),
            'handled_by' => $cashier?->id,
        ]);
        BookingRequest::factory()->create([
            'status' => BookingStatus::Cancelled,
            'pickup_date' => CarbonImmutable::yesterday()->toDateString(),
            'decline_reason' => 'Customer called to cancel — will drop off instead.',
            'handled_by' => $cashier?->id,
            'handled_at' => now()->subDay(),
        ]);
    }

    private function seedContactMessages(): void
    {
        $admin = User::role(UserRole::Admin->value)->first();

        $messages = [
            ['Business account for our dormitory', 'Hi! I manage a 40-bed dormitory near the university. Do you offer weekly pickup and a monthly billing arrangement for residents?', ContactMessageStatus::New, 2],
            ['Is Barangay San Isidro covered?', 'Good day, is our area within your pickup range? We are about 4 km from your shop near the public market.', ContactMessageStatus::New, 5],
            ['Price for gowns', 'How much is dry cleaning for a long beaded gown? I need it by next Friday.', ContactMessageStatus::Read, 26],
            ['Thank you!', 'Just wanted to say thank you to your rider Dodong for returning the wallet I left in my jeans pocket.', ContactMessageStatus::Resolved, 72],
        ];

        foreach ($messages as [$subject, $body, $status, $hoursAgo]) {
            $at = now()->subHours($hoursAgo);
            $message = ContactMessage::factory()->make([
                'subject' => $subject,
                'message' => $body,
                'status' => $status,
                'read_at' => $status !== ContactMessageStatus::New ? $at->addHours(2) : null,
                'resolved_at' => $status === ContactMessageStatus::Resolved ? $at->addHours(5) : null,
                'handled_by' => $status !== ContactMessageStatus::New ? $admin?->id : null,
            ]);
            $message->created_at = $at;
            $message->updated_at = $at;
            $message->save();
        }
    }
}
