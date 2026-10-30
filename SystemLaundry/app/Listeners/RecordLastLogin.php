<?php

namespace App\Listeners;

use App\Models\User;
use Illuminate\Auth\Events\Login;

/**
 * Stores the login time for the staff activity report.
 */
class RecordLastLogin
{
    public function handle(Login $event): void
    {
        if ($event->user instanceof User) {
            // saveQuietly: a login is not an edit worth an activity-log entry.
            $event->user->forceFill(['last_login_at' => now()])->saveQuietly();
        }
    }
}
