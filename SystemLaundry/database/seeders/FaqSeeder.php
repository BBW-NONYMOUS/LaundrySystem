<?php

namespace Database\Seeders;

use App\Models\Faq;
use Illuminate\Database\Seeder;

/**
 * Real starter FAQs for the website (safe in production; the owner edits them later).
 * Re-running updates the text but keeps the owner's publish/home choices.
 */
class FaqSeeder extends Seeder
{
    /**
     * category, question, answer, show on home
     *
     * @var list<array{0: string, 1: string, 2: string, 3: bool}>
     */
    private const FAQS = [
        ['Services', 'How long does a regular wash take?', 'Regular Wash, Dry & Fold is ready within 24 hours. Bulky items like comforters and curtains take 2–3 days, and dry cleaning takes about 3 days. We text you the moment your laundry is ready.', true],
        ['Pricing', 'How much does it cost?', 'Wash, Dry & Fold is priced per kilo with a 3 kg minimum. Comforters, ironing and dry cleaning are priced per piece. See the Services & Pricing page for the full, always up-to-date list.', true],
        ['Pickup & Delivery', 'Do you pick up and deliver?', 'Yes. Book a pickup online or call us, choose a morning, early-afternoon or late-afternoon slot, and our rider will collect your laundry. We can deliver it back when it’s done. A small fee applies per trip.', true],
        ['Services', 'Do you offer same-day or express service?', 'Yes. Express orders are ready in as little as 8 hours for wash-dry-fold, for an extra 50% of the laundry charge. Shoe cleaning is the only service without an express option.', true],
        ['Pickup & Delivery', 'How do I track my laundry?', 'Every order comes with an order number on your receipt and a tracking link by SMS. Enter your order number and mobile number on our Track Order page any time — no account needed.', true],
        ['Payments', 'What payment methods do you accept?', 'Cash, GCash, Maya, bank transfer and card. You can pay when you drop off, when you pick up, or pay the rider on delivery.', false],
        ['Care & Policies', 'Do you separate whites and colors?', 'Always. We sort every load by color and fabric, and you can add special instructions such as “no bleach” or “unscented softener” when you book or drop off.', false],
        ['Care & Policies', 'What if an item is lost or damaged?', 'Every bag gets a QR tag and a piece count at drop-off, so items don’t get mixed up. If something does go wrong, contact us within 48 hours of claiming and we’ll make it right.', false],
        ['Care & Policies', 'How long can I leave my laundry unclaimed?', 'We’ll keep your laundry for 30 days and send reminders after it’s been ready for a week. After 30 days we’re no longer responsible for unclaimed items.', false],
        ['Pickup & Delivery', 'What areas do you serve?', 'We pick up and deliver within about 5 km of the shop. Not sure if you’re covered? Send your address through the Contact page and we’ll confirm.', false],
        ['Payments', 'Do you offer discounts?', 'Senior citizens and PWDs get 20% off with a valid ID, and loyalty card holders get 10% off every 10th visit.', false],
        ['Services', 'Can I create an account?', 'Yes — register with your mobile number to see all your orders, past receipts and book pickups faster. If you’ve ordered before, your history is linked automatically.', false],
    ];

    public function run(): void
    {
        foreach (self::FAQS as $index => [$category, $question, $answer, $onHome]) {
            $faq = Faq::query()->firstOrNew(['question' => $question]);

            $faq->fill(['category' => $category, 'answer' => $answer, 'sort_order' => ($index + 1) * 10]);

            if (! $faq->exists) {
                $faq->fill(['is_published' => true, 'show_on_home' => $onHome]);
            }

            $faq->save();
        }
    }
}
