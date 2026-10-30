<?php

namespace App\Services\Sms;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;

/**
 * Semaphore (semaphore.co) — a Philippine SMS gateway.
 * Requires SEMAPHORE_API_KEY and, optionally, an approved SEMAPHORE_SENDER_NAME.
 */
class SemaphoreSmsGateway implements SmsGateway
{
    public function __construct(
        private string $apiKey,
        private ?string $senderName,
        private string $url,
    ) {}

    public function send(string $to, string $message): void
    {
        if ($this->apiKey === '') {
            throw new SmsException('SEMAPHORE_API_KEY is not configured.');
        }

        try {
            $response = Http::asForm()
                ->timeout(15)
                ->post($this->url, array_filter([
                    'apikey' => $this->apiKey,
                    'number' => $to,
                    'message' => $message,
                    'sendername' => $this->senderName,
                ]))
                ->throw();
        } catch (RequestException $e) {
            throw new SmsException('Semaphore rejected the message: '.$e->response->body(), previous: $e);
        }

        // Semaphore answers 200 with a list of queued messages; anything else is an error payload.
        if (! array_is_list((array) $response->json())) {
            throw new SmsException('Unexpected Semaphore response: '.$response->body());
        }
    }
}
