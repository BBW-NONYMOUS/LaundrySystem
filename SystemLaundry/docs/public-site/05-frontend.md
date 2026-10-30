# Public Website — Phase 5: Frontend

The React pages for the public website and its staff inbox, built from the Phase 4 design (`04-ui-ux-design.md`). This document says where things live and how they fit together.

## 1. Pages

| URL                     | Page component                                      | Layout             |
| ----------------------- | --------------------------------------------------- | ------------------ |
| `/`                     | `public/home`                                       | `PublicSiteLayout` |
| `/pricing`              | `public/pricing`                                    | `PublicSiteLayout` |
| `/about`, `/faq`        | `public/about`, `public/faq`                        | `PublicSiteLayout` |
| `/contact`, `/privacy`  | `public/contact`, `public/privacy`                  | `PublicSiteLayout` |
| `/track`                | `public/track`                                      | `PublicSiteLayout` |
| `/track/{code}`         | `track/show` (restyled)                             | `PublicSiteLayout` |
| `/book`                 | `public/book`                                       | `PublicSiteLayout` |
| `/feedback/{code}`      | `public/feedback`                                   | `PublicSiteLayout` |
| any unknown URL, errors | `errors/error` (404, 403, 419, 429, 500, 503)       | `PublicSiteLayout` |
| `/login`, `/register`   | `auth/*` (restyled; `?staff=1` shows "Staff login") | `AuthLayout`       |
| `/booking-requests`     | `website/booking-requests/index`                    | `AppLayout`        |
| `/contact-messages`     | `website/contact-messages/index`                    | `AppLayout`        |
| `/website/faqs`         | `website/faqs/index`                                | `AppLayout`        |
| `/website/testimonials` | `website/testimonials/index`                        | `AppLayout`        |
| `/settings/shop`        | `settings/shop` (+ Website card, logo upload)       | `AppLayout`        |

Layouts are chosen per page group in `resources/js/app.tsx`. The old `welcome` page and bare `public-layout` were removed.

## 2. Folder map

```
resources/js/
├── layouts/public-site-layout.tsx   skip link · info bar · navbar · page · footer · phone action bar
├── components/public/
│   ├── Shell        info-bar, site-navbar, site-footer, mobile-action-bar, site-logo, open-status
│   ├── Building     section (Section, Container), section-header, page-hero, cta-banner,
│   │   blocks       site-image, reveal, seo-head, public-form (fields, honeypot, first-error focus)
│   ├── Home         hero, quick-tracker, trust-bar, service-card, step-card, feature-card,
│   │                pricing-preview, testimonial-card, testimonial-carousel, faq-list
│   ├── Pricing      service-row, price-estimator
│   ├── Booking      booking-date-picker, booking-slots, booking-summary, booking-confirmation-dialog
│   └── Other        contact-info, star-rating
├── components/website/              status-tabs, search-box, rating-stars, shop-logo-field, types
├── pages/public/*, pages/errors/error.tsx, pages/website/*
├── lib/public-site.ts               service groups and icons, peso(), roundedStat(), estimate(),
│                                    opening-hours parser + openStatus(), orderStatusMessage(), phone helpers
└── types/public.ts                  SiteSettings, Seo, PublicOrder, BookingSlot, … (+ flash types in global.d.ts)
```

## 3. How the important parts work

**SEO.** Each public controller sends an `seo` prop. The server prints the tags into the HTML for crawlers (`app.blade.php`), and `<SeoHead>` renders the same tags with the same `head-key`s, so Inertia replaces them on navigation instead of duplicating them. The `title` callback in `app.tsx` keeps SEO titles as they are ("Pricing | Fresh Fold Laundry"). Error pages get "Title | Shop name" and staff pages "Title - Laundry System".

**Shared business details.** Every page receives `site` (name, phone, hours, opening hours, social links, logo, list of available photos). The navbar, footer, CTA banner and contact page read it, so editing Settings changes the whole site.

**Open now badge.** `openStatus()` parses the `opening_hours_schema` setting (`Mo-Sa 07:00-20:00, Su 08:00-17:00`) and compares it with the time in Manila, whatever time zone the visitor's phone uses. It refreshes every minute.

**Photos.** `<SiteImage name="hero">` shows `public/images/site/hero.webp` only if that file exists (the server lists the files in `site.images`). Otherwise it shows a branded gradient panel, so the browser never requests a missing file. To add a photo, save it with the right name; no code change is needed.

**Home quick tracker.** Posts to `/track` with `inline: true`. The server flashes `trackedOrder` (the privacy-safe summary), and the card shows it in place with an `aria-live` region.

**Booking form.**

- Changing the date reloads only `slots` and `selectedDate` (`router.reload` with `?date=`), so the form keeps what the visitor typed.
- Full and too-late slots are disabled with the reason. A full day suggests the next free date.
- `?service=&qty=` (from the Pricing estimator) pre-fills the service and amount.
- The estimate uses the same math as the server (`estimate()` mirrors `PricingService`): minimum quantity, express surcharge, and one trip for pickup plus one for delivery back.
- On success the server flashes `booking`, and the confirmation dialog shows the reference with a Copy button.

**Forms and spam.** All public forms use Inertia `useForm`. Errors appear under each field and focus moves to the first invalid one. A hidden `website` honeypot and the `form_token` time check are included automatically.

**Staff side.**

- The sidebar has a new **Website** group with count badges (`navCounts.bookings_pending`, `messages_new`, `reviews_pending`) and a "View website" link.
- Booking requests: confirm in a Sheet (customer match, change date/slot, assign a rider), decline with quick reasons, cancel with a reason.
- Messages: opening one marks it read.
- FAQs: publish and Home switches. The Home list is capped at five, by the server and in the UI.
- Reviews: approve, feature, hide, edit, delete, add by hand.
- Shop settings has a Website card; the logo uploads as soon as it is picked.

**Theme.** Light mode is the default for anyone who never picked one. The Fresh Aqua tokens (`text-fresh`, `bg-fresh-soft`) are used only for icons, eyebrows and alternate section backgrounds.

## 4. Backend changes made in this phase

| Change                                                                                                                          | Where                                                     |
| ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Sidebar badge counts for the Website inboxes (only for users with access)                                                       | `HandleInertiaRequests::navCounts()`                      |
| `site.opening_hours` and `site.images`                                                                                          | `Support/SiteSettings`                                    |
| Review count and average rating; express promise based on per-kilo services                                                     | `Support/PublicStats`                                     |
| `/privacy` page and sitemap entry                                                                                               | `PageController::privacy()`, `routes/public.php`          |
| Booking requests and messages deleted after 12 months (`model:prune`, daily 2:00 AM)                                            | `MassPrunable` on both models, `routes/console.php`       |
| Link-preview image, favicon and home-screen icon drawn with GD; preview refreshed when the shop name/tagline/city/phone changes | `BrandImageService`, `php artisan laundry:brand-images`   |
| Max five FAQs on Home                                                                                                           | `SaveFaqRequest::after()`, `Faq::HOME_LIMIT`              |
| Customer-friendly service descriptions (new services only; the owner's edits are kept)                                          | `ServiceSeeder`                                           |
| Light mode as the default theme                                                                                                 | `HandleAppearance`, `use-appearance.tsx`, `app.blade.php` |
| Logo mark: washing machine instead of the Laravel logo                                                                          | `app-logo-icon.tsx`, `public/favicon.svg`                 |

## 5. Verification

- **Tests:** the website feature tests (`tests/Feature/PublicSite`, 49 tests) now check that each page component exists.
- **Render smoke test:** all 58 screens (staff, portal, public, error and auth pages, including the inline tracker result and booking confirmation) were rendered with React's server renderer using the seeded demo data, with no errors or warnings. Key copy and exactly one H1 were confirmed on every public page.
- **Static checks:** `tsc --noEmit`, `npm run check` (lint and format) and `npm run build` pass; PHPStan level 7 passes.
- **Not done yet:** clicking through in a real browser on a phone and a desktop, and the Lighthouse audit. Both belong to Phase 6.

## 6. Install commands used

```bash
npx shadcn@latest add carousel aspect-ratio
php artisan wayfinder:generate --with-form
php artisan laundry:brand-images
```

The shadcn CLI offered to overwrite `button.tsx`. That was declined, to keep the project's version. As in earlier phases, the CLI wrote `import { cn } from "cn"` in `carousel.tsx`; it was corrected to `@/lib/utils`.
