<?php

namespace Tests\Feature\Auth;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\Concerns\SetsUpLaundry;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase, SetsUpLaundry;

    public function test_registration_screen_can_be_rendered()
    {
        $response = $this->get(route('register'));

        $response->assertOk();
    }

    public function test_new_users_can_register()
    {
        $response = $this->post(route('register.store'), [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'phone' => '0917 123 4567',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));

        $user = User::where('email', 'test@example.com')->sole();
        $this->assertTrue($user->hasRole('customer'));
        $this->assertSame('09171234567', $user->customer?->phone);
    }

    public function test_a_new_customer_goes_straight_in_without_an_email_code_or_link()
    {
        $this->setUpLaundry();
        Notification::fake();

        $this->post(route('register.store'), [
            'name' => 'Maria Santos',
            'email' => 'maria.santos@gmail.com',
            'phone' => '0917 765 4321',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->get(route('dashboard'))->assertRedirect(route('portal.index'));
        $this->get(route('portal.index'))->assertOk();
        Notification::assertNothingSent();
    }

    public function test_an_email_that_already_has_an_account_is_told_to_log_in()
    {
        User::factory()->create(['email' => 'maria.santos@gmail.com']);

        $this->post(route('register.store'), [
            'name' => 'Maria Santos',
            'email' => 'Maria.Santos@gmail.com',
            'phone' => '0917 765 4321',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors([
            'email' => 'This email already has an account. Log in instead, or reset your password if you forgot it.',
        ]);

        $this->assertGuest();
    }

    public function test_registering_with_a_walk_in_customers_phone_links_their_history()
    {
        $walkIn = Customer::factory()->create(['phone' => '09171234567', 'user_id' => null]);

        $this->post(route('register.store'), [
            'name' => 'Juan Dela Cruz',
            'email' => 'juan@example.com',
            'phone' => '+63 917 123 4567',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasNoErrors();

        $this->assertSame(1, Customer::count());
        $this->assertSame(User::where('email', 'juan@example.com')->value('id'), $walkIn->refresh()->user_id);
    }

    public function test_a_phone_that_already_has_an_account_cannot_register_again()
    {
        Customer::factory()->create(['phone' => '09171234567', 'user_id' => User::factory()->create()->id]);

        $this->post(route('register.store'), [
            'name' => 'Someone Else',
            'email' => 'else@example.com',
            'phone' => '09171234567',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertSessionHasErrors('phone');

        $this->assertGuest();
    }
}
