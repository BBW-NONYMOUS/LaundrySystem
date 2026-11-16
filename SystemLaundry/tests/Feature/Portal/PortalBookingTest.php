<?php

namespace Tests\Feature\Portal;

use App\Enums\UserRole;
use App\Models\Customer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class PortalBookingTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    protected function setUp(): void
    {
        parent::setUp();
        $this->setUpLaundry();
    }

    public function test_booking_only_needs_a_time_and_uses_the_profile_details(): void
    {
        $user = $this->userWithRole(UserRole::Customer);
        $customer = Customer::factory()->create([
            'user_id' => $user->id,
            'phone' => '09171234567',
            'address' => '12 Rizal St., Brgy. Centro',
        ]);

        $this->actingAs($user)->post(route('portal.bookings.store'), [
            'scheduled_at' => now()->addDay()->setTime(9, 0)->toDateTimeString(),
        ])->assertSessionHasNoErrors();

        $pickup = $customer->orders()->sole()->deliveries()->sole();
        $this->assertSame('12 Rizal St., Brgy. Centro', $pickup->address);
        $this->assertSame($customer->phone, $pickup->contact_phone);
    }

    public function test_customers_without_a_saved_address_give_one_once(): void
    {
        $user = $this->userWithRole(UserRole::Customer);
        $customer = Customer::factory()->create(['user_id' => $user->id, 'address' => null]);
        $when = now()->addDay()->setTime(13, 0)->toDateTimeString();

        $this->actingAs($user)->post(route('portal.bookings.store'), ['scheduled_at' => $when])
            ->assertSessionHasErrors('address');

        $this->actingAs($user)->post(route('portal.bookings.store'), [
            'scheduled_at' => $when,
            'address' => '5 Mabini St.',
        ])->assertSessionHasNoErrors();

        $this->assertSame('5 Mabini St.', $customer->refresh()->address);
        $this->assertSame('5 Mabini St.', $customer->orders()->sole()->deliveries()->sole()->address);
    }
}
