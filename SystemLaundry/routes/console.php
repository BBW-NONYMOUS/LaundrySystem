<?php

use Illuminate\Support\Facades\Schedule;

/*
|--------------------------------------------------------------------------
| Scheduled tasks
|--------------------------------------------------------------------------
| Requires the scheduler to run every minute:
|   * * * * * php /path/to/artisan schedule:run   (Linux cron)
|   php artisan schedule:work                      (development / Windows)
*/

// Morning and early-afternoon alert so the counter can chase late laundry.
Schedule::command('laundry:notify-overdue')->twiceDaily(8, 13)->withoutOverlapping();

// Customer reminders go out once a day at a polite hour.
Schedule::command('laundry:send-unclaimed-reminders')->dailyAt('09:00')->withoutOverlapping();

// Keep the audit trail to the retention set in config/activitylog.php.
Schedule::command('activitylog:clean')->monthly();

// Website inbox retention promised in the Privacy Notice: booking requests and contact
// messages older than 12 months (BookingRequest::prunable(), ContactMessage::prunable()).
Schedule::command('model:prune')->dailyAt('02:00');
