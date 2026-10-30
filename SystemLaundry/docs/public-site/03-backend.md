# Public Website — Phase 3: Backend

The Laravel side of the public website and its staff inbox. The React pages come in Phase 5.

## 1. Routes

### Public (no login) — `routes/public.php`

| Method    | URL                           | Name                                           | Limit                                | Purpose                                                                                        |
| --------- | ----------------------------- | ---------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------- |
| GET       | `/`                           | `home`                                         |                                      | Home: services, real stats, approved reviews, Home FAQs                                        |
| GET       | `/pricing`                    | `public.pricing`                               |                                      | Services and prices, live from the `services` table                                            |
| GET       | `/about`, `/faq`, `/contact`  | `public.about`, `public.faq`, `public.contact` |                                      | Content from Settings and the FAQ table                                                        |
| POST      | `/contact`                    | `public.contact.store`                         | 5/hour                               | Contact form                                                                                   |
| GET       | `/track`                      | `public.track`                                 |                                      | Tracking form                                                                                  |
| POST      | `/track`                      | `public.track.lookup`                          | 10/min, plus a 5-fail lock per order | Order # + mobile → `/track/{code}`, or the result inline (Home quick tracker)                  |
| GET       | `/track/{code}`               | `tracking.show`                                | 10/min                               | Order status (privacy-safe), `noindex`                                                         |
| GET       | `/book`                       | `public.book`                                  |                                      | Booking form. `?date=` reloads one day's slots; signed-in customers are sent to `/portal/book` |
| POST      | `/book`                       | `public.book.store`                            | 5/hour                               | Guest pickup request                                                                           |
| GET, POST | `/feedback/{code}`            | `public.feedback(.store)`                      | 10/min, 5/hour                       | "Rate us" from the order-completed SMS. One review per finished order                          |
| GET       | `/sitemap.xml`, `/robots.txt` | `sitemap`, `robots`                            |                                      | Generated from `APP_URL`; public pages only                                                    |
| GET       | any unknown URL               |                                                |                                      | Branded `errors/error` page (404 / 403; 500 / 503 only when `APP_DEBUG=false`)                 |

When a limit is hit, the visitor sees a friendly form error, not a raw "429 Too Many Requests" page.

### Staff inboxes (login required)

| URL                                                          | Permission (roles)                 | Purpose                                                                          |
| ------------------------------------------------------------ | ---------------------------------- | -------------------------------------------------------------------------------- |
| `/booking-requests` + `/{id}/confirm`, `/decline`, `/cancel` | `bookings.manage` (admin, cashier) | Guest pickup requests                                                            |
| `/contact-messages` + `PATCH /{id}`                          | `messages.view` (admin, cashier)   | Contact form messages (new → read → resolved)                                    |
| `/website/faqs` (CRUD)                                       | `website.manage` (admin)           | Website FAQs                                                                     |
| `/website/testimonials` (CRUD)                               | `website.manage` (admin)           | Approve, feature or add reviews                                                  |
| `POST`, `DELETE /settings/shop/logo`                         | `settings.manage` (admin)          | Shop logo (PNG, JPG or WebP, max 1 MB; SVG refused because it can carry scripts) |

Shop Settings also accepts the website fields: tagline, city, hours, schema hours, social links, Google Maps embed (only `https://www.google.com/maps/embed…` is accepted), about text, founding year, service area, and pickups per slot. They are optional, so the current settings form keeps working.

## 2. Services

| Class                        | Responsibility                                                                                                                            |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `BookingService`             | Slot availability, saving requests, confirm/decline/cancel, guest and staff notifications (details below)                                 |
| `SeoService`                 | Title, description, canonical URL, Open Graph tags, and JSON-LD (`DryCleaningOrLaundry` LocalBusiness on every page; `FAQPage` on `/faq`) |
| `Support\SiteSettings`       | Public business details shared to every page as the `site` prop, and passed directly to error pages                                       |
| `Support\PublicOrderSummary` | The privacy-safe order view: first name only; no address, staff names or payment list                                                     |
| `Support\PublicStats`        | Trust-bar numbers from real data, cached for one hour                                                                                     |

**`BookingService` in detail:**

- **Slot availability:** capacity minus pending requests minus pickup trips already scheduled in that slot.
- **Booking window and notice:** today up to 14 days ahead. A slot closes 60 minutes before it starts.
- **Saving a request:**
    - A short lock per slot, so two guests can't both take its last place.
    - At most 3 pending requests per mobile number.
    - A returning customer is recognized by mobile number.
- **Confirming:**
    - The guest becomes a customer, found or created by mobile number, so there are no duplicates.
    - The order is created through `OrderService`, so it gets the same pickup trip, delivery fee and rules as an order taken at the counter.
    - Staff can change the date or slot and assign a rider while confirming.
    - A pickup date that has already passed must be moved first.

## 3. Spam and abuse protection

| Measure                                                                                       | Where                                         |
| --------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Hidden honeypot field (`website`)                                                             | `ProtectsAgainstSpam`                         |
| Time check: an encrypted page token rejects submissions faster than 3 s or older than 2 hours | `ProtectsAgainstSpam`                         |
| Rate limits per visitor (forms 5/hour, lookups 10/min)                                        | `AppServiceProvider::configureRateLimiting()` |
| 5 failed lookups lock an order number for 15 minutes                                          | `TrackOrderController`                        |
| Identical "not found" message for a wrong order number and a wrong mobile number              | `TrackOrderController`                        |
| Max 3 pending bookings per mobile number                                                      | `BookingService`                              |
| Data Privacy Act consent checkbox on the booking and contact forms                            | Form Requests                                 |

## 4. Notifications

| Notification               | To                              | Channels                 | When                                                          |
| -------------------------- | ------------------------------- | ------------------------ | ------------------------------------------------------------- |
| `BookingReceived`          | Guest                           | SMS + email              | Request saved (includes the reference number)                 |
| `BookingConfirmed`         | Guest                           | SMS + email              | Staff confirmed (includes the order number and tracking link) |
| `BookingDeclined`          | Guest                           | SMS + email              | Staff declined (includes the reason)                          |
| `ContactMessageReceived`   | Sender                          | Email (if one was given) | Contact form sent                                             |
| `WebsiteInboxAlert`        | Staff with the inbox permission | Bell                     | New request, new message, new review                          |
| `OrderCompleted` (updated) | Customer                        | SMS + email              | Now ends with "Rate us: /feedback/{code}"                     |

Guests may not be customers yet, so guest messages are sent to the phone and email on the request (`Notification::route(...)`). `SmsChannel` now accepts any notification implementing `SendsSms`, and still logs every SMS in `notification_logs`.

## 5. SEO without a Node SSR server

Public controllers return an `seo` prop. `resources/views/app.blade.php` prints it inside `<x-inertia::head>` with `data-inertia` keys:

- `<title data-inertia="">`
- `description`, `canonical`, `robots`
- `og:*`, `twitter:card`
- `json-ld-N`

Crawlers that don't run JavaScript, such as Facebook's link preview, read these tags from the raw HTML. In Phase 5, a React `<SeoHead>` renders the same tags with the same `head-key`s, so Inertia's head manager replaces them instead of duplicating or removing them. Personal pages (`/track/{code}`, `/feedback/{code}`) are marked `noindex`.

## 6. Fixes made during this phase

- **`Setting::allValues()`** used to cache the defaults together with the saved values. A key added in a later release (such as `opening_hours_schema`) stayed missing until the cache was cleared. It now caches only the saved rows and adds the defaults on each read.
- **Static `public/robots.txt` removed:** the web server would have served it instead of the generated one.
- **`/track/{code}` reuses `PublicOrderSummary`,** so both tracking paths show exactly the same fields.

## 7. Tests

37 tests in `tests/Feature/PublicSite/` (the full suite is **170 passing**), covering:

- Live pricing and stats.
- SEO tags and schema in the raw HTML.
- Tracking: matching with different number formats, the identical message for both kinds of mismatch, the lockout, and the privacy-safe inline result.
- Booking:
    - Saving a request, recognizing returning customers.
    - Full slots, slots taken by scheduled trips, the 60-minute notice.
    - Spam variants, validation, the per-phone limit, the rate limit.
- Booking inbox: confirming into a customer and order (with the past-date rule and no duplicates), declining vs cancelling, and inbox permissions.
- Contact form, feedback (once per order, hidden until approved), the rating link.
- Sitemap and robots, the 404 page, website settings validation, logo upload.

**Known gap until Phase 5:** the public React pages don't exist yet, so `/`, `/pricing`, `/track`, `/book` and the others render a blank page in the browser. The admin system and `/login` are unaffected.
