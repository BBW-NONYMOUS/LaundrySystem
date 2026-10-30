<?php

namespace App\Services\Sms;

interface SmsGateway
{
    /**
     * @throws SmsException when the provider rejects the message
     */
    public function send(string $to, string $message): void;
}
