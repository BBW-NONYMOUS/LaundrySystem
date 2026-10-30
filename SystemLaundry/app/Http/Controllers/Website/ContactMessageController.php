<?php

namespace App\Http\Controllers\Website;

use App\Enums\ContactMessageStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Website\UpdateContactMessageRequest;
use App\Http\Resources\ContactMessageResource;
use App\Models\ContactMessage;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Messages from the public Contact page.
 */
class ContactMessageController extends Controller
{
    public function index(Request $request): Response
    {
        $query = ContactMessage::query()->with('handler:id,name')->latest()->latest('id');
        $status = ContactMessageStatus::tryFrom($request->string('status')->toString());

        if ($status !== null) {
            $query->where('status', $status);
        }

        return Inertia::render('website/contact-messages/index', [
            'messages' => ContactMessageResource::collection($query->paginate($this->perPage($request))->withQueryString()),
            'filters' => $this->filters($request, ['status']),
            'counts' => ContactMessage::query()->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
        ]);
    }

    /**
     * Opening a message marks it read; staff mark it resolved once they've replied.
     */
    public function update(UpdateContactMessageRequest $request, ContactMessage $message): RedirectResponse
    {
        $status = $request->status();

        $message->update([
            'status' => $status,
            'handled_by' => $request->user()->id,
            'read_at' => $message->read_at ?? ($status !== ContactMessageStatus::New ? now() : null),
            'resolved_at' => $status === ContactMessageStatus::Resolved ? now() : null,
        ]);

        if ($status === ContactMessageStatus::Resolved) {
            $this->toast('Marked as resolved.');
        }

        return back();
    }
}
