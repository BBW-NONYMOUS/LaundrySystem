<?php

namespace App\Http\Controllers\Public;

use App\Enums\ContactMessageStatus;
use App\Enums\Permission;
use App\Http\Controllers\Controller;
use App\Http\Requests\Public\StoreContactMessageRequest;
use App\Models\ContactMessage;
use App\Notifications\ContactMessageReceived;
use App\Services\BookingService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ContactController extends Controller
{
    public function store(StoreContactMessageRequest $request, BookingService $inbox): RedirectResponse
    {
        $message = ContactMessage::query()->create([
            ...$request->safe()->only(['name', 'email', 'phone', 'subject', 'message']),
            'status' => ContactMessageStatus::New,
            'ip_address' => $request->ip(),
        ]);

        if (filled($message->email)) {
            Notification::route('mail', $message->email)->notify(new ContactMessageReceived($message));
        }

        $inbox->notifyStaff(
            'New message',
            $message->name.': '.Str::limit($message->subject ?: $message->message, 60),
            route('contact-messages.index', absolute: false),
            Permission::MessagesView,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Thanks! Your message was sent. We usually reply within one business day.']);

        return to_route('public.contact');
    }
}
