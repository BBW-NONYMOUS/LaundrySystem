# Public Website — Phase 4: UI/UX Design and Copy

The look, layout and final wording of every public page. Phase 5 builds exactly this.

**How to read the copy.** Words in `{braces}` are filled in live from Settings or the database, so the site stays correct when the owner changes a price or the shop hours. Everything else is the final text.

| Placeholder                          | Comes from                                         | Sample value                      |
| ------------------------------------ | -------------------------------------------------- | --------------------------------- |
| `{shop_name}`                        | Settings → shop name                               | Fresh Fold Laundry                |
| `{tagline}`                          | Settings → tagline                                 | Fresh, clean, and on time.        |
| `{city}`                             | Settings → city (text before the comma)            | Quezon City                       |
| `{phone}`, `{email}`, `{address}`    | Settings                                           | 0917 123 4567                     |
| `{hours}`                            | Settings → business hours                          | Mon–Sat 7:00 AM – 8:00 PM · Sun … |
| `{service_area}`                     | Settings → service area                            | Pickup and delivery within 5 km … |
| `{kg_from}`                          | Cheapest active per-kilo price                     | ₱20                               |
| `{wdf_price}`                        | Wash, Dry & Fold price                             | ₱35                               |
| `{express_pct}`, `{express_hours}`   | Settings → express surcharge; fastest express time | 50%, 8                            |
| `{wdf_min}`                          | Wash, Dry & Fold minimum quantity                  | 3                                 |
| `{delivery_fee}`                     | Settings → delivery fee per trip                   | ₱50                               |
| `{orders}`, `{customers}`, `{years}` | Real counts (`PublicStats`), rounded down          | 600+, 150+, 7                     |

**Design goals, in priority order**

1. **Book or track in under a minute on a phone.** Most visitors come from Facebook on mobile data.
2. **Trust at first glance.** Real prices, real reviews, real shop details, no stock-photo smiles.
3. **One look with the admin system.** Same theme tokens, same shadcn components, same status colors.
4. **Light and fast.** No animation library, lazy images, nothing that blocks the first screen.

---

## 1. Design system

### 1.1 Color

The public site uses the admin system's theme unchanged and adds **one accent, Fresh Aqua**, for icons, small labels and soft section backgrounds. Laundry Blue stays the only color for buttons and links, so visitors always know what is clickable.

| Token          | Light                    | Dark                   | Used for                                                     |
| -------------- | ------------------------ | ---------------------- | ------------------------------------------------------------ |
| `--primary`    | `oklch(0.52 0.17 252)`   | `oklch(0.72 0.14 245)` | Buttons, links, focus rings, CTA banner background           |
| `--fresh`      | `oklch(0.52 0.1 205)`    | `oklch(0.8 0.11 205)`  | Icons in service/feature cards, section eyebrows, star icons |
| `--fresh-soft` | `oklch(0.982 0.016 205)` | `oklch(0.2 0.03 225)`  | Background of every second section, icon tiles               |
| `--background` | white                    | near-black             | Default section background                                   |
| `--status-*`   | from the admin theme     | from the admin theme   | Order status on the tracking pages (same badge as staff see) |

The tokens are in `resources/css/app.css` and work as Tailwind classes: `text-fresh`, `bg-fresh-soft`, `bg-fresh/10`.

**Measured contrast (WCAG AA needs 4.5:1 for text)**

| Pair                                    | Ratio  |
| --------------------------------------- | ------ |
| Primary on white / white on primary     | 5.5:1  |
| Fresh on white                          | 5.2:1  |
| Fresh on fresh-soft                     | 4.9:1  |
| Muted text on fresh-soft                | 4.5:1  |
| Dark mode: fresh on the dark background | 11.0:1 |

**Rules**

- Roughly 70% white or near-white, 20% neutral text, 10% blue and aqua.
- Sections alternate `bg-background` and `bg-fresh-soft`, so long pages have a rhythm without borders.
- Aqua never appears on a button. One solid primary button per section at most.
- Status colors appear only where an order status is shown.

### 1.2 Typography

One font, **Instrument Sans**, which the admin system already loads, so the public site costs no extra font download. Marketing pages use larger sizes than the admin screens.

| Role                    | Classes                                                         | Size on phone → desktop |
| ----------------------- | --------------------------------------------------------------- | ----------------------- |
| H1 (hero, one per page) | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight` | 36 → 60 px              |
| H1 (inner pages)        | `text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight` | 30 → 48 px              |
| H2 (section title)      | `text-3xl md:text-4xl font-semibold tracking-tight`             | 30 → 36 px              |
| H3 (card title)         | `text-lg font-semibold`                                         | 18 px                   |
| Eyebrow (above H2)      | `text-sm font-semibold text-fresh`                              | 14 px                   |
| Lead paragraph          | `text-lg text-muted-foreground` (`md:text-xl` in the hero)      | 18 → 20 px              |
| Body                    | `text-base leading-7`                                           | 16 px                   |
| Small / helper          | `text-sm text-muted-foreground`                                 | 14 px                   |
| Prices                  | `font-semibold tabular-nums`; `text-3xl` in price cards         |                         |
| Order and reference no. | `font-mono`                                                     |                         |

- Body text is 16 px minimum on public pages. Smaller text on a phone is hard to read and makes iOS zoom into form fields.
- Headings are short (under 8 words). Line length stays under 70 characters (`max-w-2xl` on paragraphs).
- Money is always `₱1,234` in marketing copy (no decimals when the amount is whole) and `₱1,234.50` on tracking pages.

### 1.3 Spacing and layout grid

| Element         | Rule                                                                                |
| --------------- | ----------------------------------------------------------------------------------- |
| Page container  | `mx-auto max-w-6xl px-4 sm:px-6 lg:px-8` (1152 px wide at most)                     |
| Section padding | `py-16 md:py-24`; the hero `pt-10 pb-16 md:pt-16 md:pb-24`                          |
| Section header  | 48 px (`mb-12`) above the section content                                           |
| Card grid       | `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` (services, features); `gap-6` on desktop |
| Form            | Single column on phone; `gap-5` between fields; labels above inputs                 |
| Breakpoints     | phone < 640 · `sm` 640 · `md` 768 (2 columns) · `lg` 1024 (full navbar) · `xl` 1280 |

Everything is designed at **360 px wide first**, then widened. No horizontal scrolling at any width, except the date chips on the booking form, which scroll on purpose.

### 1.4 Shape, elevation and motion

| Element    | Style                                                                                                                   |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- |
| Cards      | `rounded-2xl border bg-card shadow-sm`; clickable cards add `transition hover:-translate-y-0.5 hover:shadow-md`         |
| Icon tile  | `size-11 rounded-xl bg-fresh/10 text-fresh` with a 22 px lucide icon                                                    |
| Inputs     | shadcn defaults, `h-11` on public forms (44 px touch target)                                                            |
| Images     | `rounded-2xl`, inside shadcn **Aspect Ratio**, `object-cover`                                                           |
| Badges     | shadcn Badge; the hero eyebrow is `variant="outline"` with a small aqua dot                                             |
| Decoration | Two soft blurred circles (`bg-fresh/20`, `bg-primary/10`, `blur-3xl`) behind the hero and CTA banner. No other ornament |

**Motion** (no Framer Motion, decision D6):

- Sections fade up 8 px over 500 ms the first time they scroll into view, through a tiny `<Reveal>` component (IntersectionObserver + `tw-animate-css`).
- Card hover lift 150 ms. Accordion, Sheet and Dialog use shadcn's built-in transitions.
- `motion-reduce:` turns all of this off for visitors who ask their phone for less motion.
- No autoplay anywhere. The testimonial carousel moves only when the visitor swipes or presses an arrow.

### 1.5 Buttons

All buttons are the shadcn `Button`. No custom button styles.

| Use                               | Variant / size                                                                          | Example                 |
| --------------------------------- | --------------------------------------------------------------------------------------- | ----------------------- |
| Main action of a section          | `default`, `size="lg"`, `h-12 px-6 text-base` in hero and CTA, `h-11` elsewhere         | Book a Pickup           |
| Second action next to it          | `outline`, same size                                                                    | Track My Order          |
| On the blue CTA banner            | `secondary` (white) + `ghost` with white text                                           | Book a Pickup · Call us |
| Text links inside sections        | `link`, with an `ArrowRight` icon                                                       | See all prices →        |
| Navbar                            | `ghost` (Log in) · `outline` (Track Order) · `default` (Book Now), `size="sm"` on phone |                         |
| Icon-only (menu, carousel arrows) | `ghost` / `outline`, `size="icon"`, always with `aria-label`                            |                         |

**Button wording rules:** start with a verb, 1–3 words, the same wording everywhere: **Book a Pickup**, **Track My Order**, **Check Status**, **Send Message**, **Call Us**. On phones, "Book Now" is used in the navbar where space is tight.

### 1.6 Section patterns

Every section is built from the same three parts, so pages feel related:

```
 SectionHeader            (eyebrow · H2 · lead; centered on Home, left-aligned on inner pages)
 Content                  (cards, table, form or accordion)
 Section action           (one button or link, centered on phone)
```

| Component         | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `SectionHeader`   | Eyebrow, H2 and lead paragraph with consistent spacing             |
| `ServiceCard`     | Icon tile, name, one-line description, "from" price                |
| `StepCard`        | Step number, icon, title, one sentence                             |
| `FeatureCard`     | Icon tile, title, one sentence (no border, used in grids)          |
| `TestimonialCard` | Stars, quote, initials avatar, name and month                      |
| `CtaBanner`       | Blue panel, H2, one sentence, two buttons                          |
| `SiteImage`       | Image with Aspect Ratio, lazy loading and a branded fallback (§16) |
| `PageHero`        | Inner-page heading: breadcrumb, H1, lead                           |

### 1.7 Icons (lucide-react)

| Topic                            | Icon                                           |
| -------------------------------- | ---------------------------------------------- |
| Wash, Dry & Fold                 | `WashingMachine`                               |
| Wash or Dry Only                 | `Droplets`                                     |
| Ironing & Pressing               | `Shirt`                                        |
| Bedding & Curtains               | `BedDouble`                                    |
| Dry Cleaning                     | `Sparkles`                                     |
| Express                          | `Zap`                                          |
| Shoe Cleaning                    | `Footprints`                                   |
| Book                             | `CalendarCheck`                                |
| Pickup / delivery                | `Truck`                                        |
| Ready / delivered                | `PackageCheck`                                 |
| Tracking                         | `MapPin`                                       |
| SMS updates                      | `MessageSquareText`                            |
| Payment                          | `Wallet`                                       |
| Tagged and counted               | `Tag`                                          |
| Careful handling                 | `ShieldCheck`                                  |
| Hours / phone / email            | `Clock` · `Phone` · `Mail`                     |
| Facebook / Messenger / Instagram | `Facebook` · `MessageCircle` · `Instagram`     |
| Rating                           | `Star` (filled with `fill-current text-fresh`) |

Icons are decorative (`aria-hidden`) whenever text sits next to them.

### 1.8 Accessibility rules

- **One H1 per page**, headings in order (H1 → H2 → H3), landmark elements (`header`, `nav`, `main`, `footer`).
- **"Skip to main content"** link as the first thing a keyboard user reaches.
- Every input has a visible label. Errors appear under the field (`FieldError`), are linked with `aria-describedby`, and focus moves to the first invalid field after a failed submit.
- Visible focus ring on everything clickable (shadcn `focus-visible:ring` in Laundry Blue).
- Touch targets are at least 44 × 44 px.
- The quick-tracker result and the booking slot list are `aria-live="polite"`, so screen readers announce them.
- Star ratings read as text: "Rated 5 out of 5".
- Images have real alt text (§16). Decorative images and the blurred circles are `aria-hidden`.
- Status is never color alone: badges always have an icon and a word.

### 1.9 Light and dark mode

Light mode is the default for visitors who never chose one. Visitors who already picked Light, Dark or System in the portal keep their choice. The footer has a small appearance toggle. Every token above has a dark value, so no page needs special dark-mode code.

### 1.10 shadcn components

Already installed: navigation-menu, sheet, button, separator, card, badge, avatar, accordion, tabs, field, input, label, textarea, select, calendar, radio-group, checkbox, sonner, alert, skeleton, progress, dialog, tooltip, hover-card, toggle-group.

Still needed (installed at the start of Phase 5):

```bash
npx shadcn@latest add carousel aspect-ratio
```

- **Carousel** (Embla, about 7 KB gzipped) for the testimonials. It loads only on the pages that use it.
- **Aspect Ratio** for every image, so images reserve their space and the page doesn't jump while loading.

---

## 2. Global layout (`PublicSiteLayout`)

### 2.1 Info bar (desktop only, `md` and up)

A thin strip above the navbar with what local customers look for first.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ ● Open now · until 8:00 PM      📍 Quezon City      📞 0917 123 4567   f  💬    │
└────────────────────────────────────────────────────────────────────────────────┘
```

| State                     | Text                                 |
| ------------------------- | ------------------------------------ |
| Open                      | **Open now** · until 8:00 PM         |
| Closed, opens later today | **Closed** · opens at 7:00 AM        |
| Closed, opens another day | **Closed** · opens Monday at 7:00 AM |

The open/closed state is worked out in the browser from the `opening_hours_schema` setting, always in Philippine time.

### 2.2 Navbar

Sticky (`sticky top-0 z-40`), white with a slight blur (`bg-background/85 backdrop-blur`). The bottom border appears once the page is scrolled.

**Desktop (`lg` and up)**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [🫧] Fresh Fold Laundry   Services & Pricing  How It Works  About  FAQ  Contact │
│                                               Log in  [Track Order] [Book Now] │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Phone and tablet**

```
┌──────────────────────────────────────┐
│ [🫧] Fresh Fold        [Book Now] [☰] │
└──────────────────────────────────────┘
          ☰ opens a Sheet from the right:
          ┌──────────────────────────┐
          │ Fresh Fold Laundry    ✕  │
          │ Home                     │
          │ Services & Pricing       │
          │ How It Works             │
          │ About Us                 │
          │ FAQ                      │
          │ Contact                  │
          │ ──────────────────────── │
          │ [Track My Order]         │
          │ [Book a Pickup]          │
          │ Log in · Create account  │
          │ ──────────────────────── │
          │ ● Open now · until 8 PM  │
          │ 📞 Call 0917 123 4567    │
          └──────────────────────────┘
```

- **Logo:** the uploaded shop logo (`site.logo_url`), else a `WashingMachine` icon tile plus the shop name.
- **Links:** Services & Pricing (`/pricing`) · How It Works (`/#how-it-works`) · About (`/about`) · FAQ (`/faq`) · Contact (`/contact`). The current page is marked with `aria-current="page"` and primary-colored text.
- **Signed-in visitors:** "Log in" becomes **My Orders** (customers → `/portal`) or **Dashboard** (staff → `/dashboard`).
- **Built from:** NavigationMenu (desktop), Sheet (mobile), Button, Separator.

### 2.3 Mobile action bar (phones only)

After the visitor scrolls past the hero, a bar slides up at the bottom of the Home and Pricing pages:

```
┌──────────────────────────────────────┐
│  [📞]   [      Book a Pickup       ] │
└──────────────────────────────────────┘
```

It is hidden on the Book, Track and Contact pages (where the form is already the action) and never covers the footer: the page gets matching bottom padding.

### 2.4 Footer

**Desktop**

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ [🫧] Fresh Fold Laundry      Services          Company        Visit us          │
│ Neighborhood laundry with    Services & Pricing About Us       123 Rizal Street, │
│ pickup & delivery, SMS       Book a Pickup     FAQ            Brgy. Poblacion   │
│ updates and online tracking  Track Order       Contact        Quezon City       │
│ in Quezon City.              Create account    Privacy        Mon–Sat 7 AM–8 PM │
│ [f] [💬] [◎]                                                   0917 123 4567     │
│                                                               hello@freshfold…  │
│────────────────────────────────────────────────────────────────────────────────│
│ © 2026 Fresh Fold Laundry. All rights reserved.        ◐ Theme  ·  Staff login │
└────────────────────────────────────────────────────────────────────────────────┘
```

On phones the four columns stack: brand, then Services and Company side by side, then Visit us.

**Footer copy**

- Description: "Neighborhood laundry with pickup & delivery, SMS updates and online order tracking in {city}."
- Column titles: **Services**, **Company**, **Visit us**.
- Links: Services & Pricing · Book a Pickup · Track Order · Create an account · About Us · FAQ · Contact · Privacy Notice.
- Address links to Google Maps (`map_link`); phone is a `tel:` link; email is a `mailto:` link.
- Social icons have labels: "Fresh Fold Laundry on Facebook", "Message us on Messenger", "Fresh Fold Laundry on Instagram". A social link that is empty in Settings is hidden.
- Bottom row: "© {year} {shop_name}. All rights reserved." · appearance toggle · **Staff login** (small, muted, links to `/login?staff=1`).

---

## 3. Home page (`/`)

Section order follows the brief. Sections with no data (no approved reviews yet, no Home FAQs) are hidden rather than shown empty.

| #   | Section             | Background                     |
| --- | ------------------- | ------------------------------ |
| 1   | Navbar              | white                          |
| 2   | Hero                | soft gradient                  |
| 3   | Quick Order Tracker | white (overlaps the hero edge) |
| 4   | Trust Bar           | white                          |
| 5   | Services            | fresh-soft                     |
| 6   | How It Works        | white                          |
| 7   | Why Choose Us       | fresh-soft                     |
| 8   | Pricing Preview     | white                          |
| 9   | Testimonials        | fresh-soft                     |
| 10  | FAQ Preview         | white                          |
| 11  | CTA Banner          | primary blue                   |
| 12  | Footer              | muted                          |

### 3.2 Hero

**Phone**

```
┌──────────────────────────────────────┐
│ (● Pickup & delivery in Quezon City) │
│                                      │
│ Fresh laundry,                       │
│ picked up and                        │
│ delivered.                           │
│                                      │
│ Wash, dry & fold from ₱35/kg. Book…  │
│                                      │
│ [        Book a Pickup         ]     │
│ [        Track My Order        ]     │
│                                      │
│ ✓ Ready in 24 hours                  │
│ ✓ Express in 8 hours                 │
│ ✓ Free SMS updates                   │
│ ┌──────────────────────────────────┐ │
│ │        hero photo (4:3)          │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

**Desktop:** two columns, text on the left (7/12), photo on the right (5/12) with a small floating card over its corner showing a sample SMS: "🫧 Your laundry is ready for pickup! LND-…0042".

**Copy**

- Eyebrow badge: **Pickup & delivery in {city}**
- H1: **Fresh laundry, picked up and delivered.**
- Lead: "Wash, dry & fold from {wdf_price}/kg. Book a pickup in under a minute, get an SMS at every step, and track your order any time — no account needed."
- Buttons: **Book a Pickup** (primary) · **Track My Order** (outline, scrolls to the tracker)
- Check list (with `CircleCheck` icons in aqua):
    - Ready in 24 hours
    - Express in {express_hours} hours
    - Free SMS updates
- Rating line (shown only with 5 or more approved reviews): "★ 4.8 average from 37 customer reviews"
- Floating SMS card text: "Hi Maria! Your laundry LND-20261023-0042 is ready for pickup. — {shop_name}"
- Photo: `hero.webp` (§16)

### 3.3 Quick Order Tracker

A white card that overlaps the bottom of the hero by 40 px on desktop, so it is visible without scrolling.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│ 📍 Already dropped off? Check your laundry.                                     │
│ Order number              Mobile number                                         │
│ [LND-20261023-0012     ]  [0917 123 4567       ]  [ Check Status ]              │
│ Your order number is on your receipt and in our SMS.                            │
├────────────────────────────────────────────────────────────────────────────────┤
│ (result, after a match)                                                         │
│ LND-20261023-0042 · Hi, Maria!                       [🌀 Washing]               │
│ ●━━━━━━●━━━━━━◐──────○──────○──────○                                            │
│ Received  Washing  Drying  Folding  Ready  Done                                 │
│ Ready by  Thu, Oct 24 · 5:00 PM      Balance due  ₱245.00                       │
│                                                    [View full details →]        │
└────────────────────────────────────────────────────────────────────────────────┘
```

**Copy**

- Title: **Already dropped off? Check your laundry.**
- Labels: **Order number** (placeholder `LND-20261023-0012`) · **Mobile number** (placeholder `0917 123 4567`)
- Button: **Check Status** (shows a spinner while checking)
- Helper: "Your order number is on your receipt and in our SMS."
- Result greeting: "Hi, {first name}!"
- Result labels: **Ready by** · **Pickup** · **Delivery** · **Balance due**. A zero balance shows "Fully paid" in green.
- Link: **View full details →** (opens `/track/{code}`)
- Not found (from the server): "We couldn't find an order with those details. Check the order number on your receipt and use the mobile number you gave us."
- Locked (from the server): "Too many attempts for this order number. Please try again in 15 minutes or call us."

Built from Card, Field, Input, Button, Spinner, Alert (errors), Badge (status) and Progress plus the existing `OrderStepper`.

### 3.4 Trust Bar

Four numbers in a row (2 × 2 on phones), separated by thin vertical lines on desktop.

```
   600+                  150+                 7 years             8-hour
   orders completed      happy customers      serving Quezon City express service
```

| Stat             | Copy                                     | Shown when                | Replaced by (when too small)        |
| ---------------- | ---------------------------------------- | ------------------------- | ----------------------------------- |
| Orders completed | **{orders}** orders completed            | 100 or more               | **Free** SMS updates on every order |
| Customers        | **{customers}** happy customers          | 50 or more                | **3** pickup slots every day        |
| Years            | **{years} years** serving {city}         | always (minimum 1)        |                                     |
| Express          | **{express_hours}-hour** express service | an express service exists | **24-hour** regular turnaround      |

Numbers are rounded **down** (to the nearest 10 under 1,000, the nearest 100 above) and get a "+", so the site never overstates.

### 3.5 Services

**Copy**

- Eyebrow: **Our services**
- H2: **Everything your wardrobe needs**
- Lead: "From everyday clothes to your best barong — priced per kilo or per piece, with no hidden fees."

Six cards (3 × 2 on desktop, 2 columns on tablet, 1 on phone):

| Card               | Icon             | Description                                                                           | Price line                    | Price from (service codes) |
| ------------------ | ---------------- | ------------------------------------------------------------------------------------- | ----------------------------- | -------------------------- |
| Wash, Dry & Fold   | `WashingMachine` | Everyday clothes washed, tumble-dried and neatly folded, ready for your closet.       | from **₱35**/kg               | WDF                        |
| Wash or Dry Only   | `Droplets`       | Just need the machines? We wash or dry, and you take it from there.                   | from **₱20**/kg               | WO, DO                     |
| Ironing & Pressing | `Shirt`          | Crisp polos, uniforms and slacks, steam-pressed and returned on hangers.              | from **₱25**/piece            | IRN, WDP                   |
| Bedding & Curtains | `BedDouble`      | Comforters, sheets and curtains, washed separately in a hot cycle for a deeper clean. | from **₱45**/kg               | BED, COMF, CURT            |
| Dry Cleaning       | `Sparkles`       | Gentle care for barong, gowns, suits and delicate fabrics.                            | from **₱250**/piece           | DC                         |
| Express Service    | `Zap`            | In a rush? Get wash, dry & fold back in as little as {express_hours} hours.           | **+{express_pct}%** surcharge | settings                   |

- Prices are read live from the services table. A card whose services are all deactivated is hidden; a new service the owner adds always appears on the full Pricing page.
- Section action: **See full price list →**

### 3.6 How It Works (`id="how-it-works"`)

Four steps in a row on desktop, connected by a dashed line; a vertical list on phones.

| Step | Icon             | Title          | Text                                                                                     |
| ---- | ---------------- | -------------- | ---------------------------------------------------------------------------------------- |
| 1    | `CalendarCheck`  | **Book**       | Book online or call us. Pick a date and a time slot that suits you.                      |
| 2    | `Truck`          | **We pick up** | Our rider collects your laundry at your door and tags every bag.                         |
| 3    | `WashingMachine` | **We clean**   | Sorted by color and fabric, then washed, dried and folded. You get an SMS at every step. |
| 4    | `PackageCheck`   | **We deliver** | Fresh, folded laundry back at your door. Pay with cash, GCash or Maya.                   |

- Eyebrow: **How it works**
- H2: **Clean clothes in four easy steps**
- Lead: "No need to leave the house. We pick up, clean and deliver within {service_area_short}."
- Section action: **Book a Pickup**, with the note "Prefer to drop off? Walk in any time during shop hours."

`{service_area_short}` is the service area text with the leading "Pickup and delivery" removed, e.g. "within 5 km of the shop".

### 3.7 Why Choose Us

Desktop: two columns. Left: eyebrow, H2, lead and the photo `why-us.webp`. Right: a 2 × 3 grid of feature cards. Phone: heading, then the six features, then the photo.

- Eyebrow: **Why {shop_name}**
- H2: **Laundry you don't have to worry about**
- Lead: "We built our shop around one promise: you always know where your clothes are and when they'll be back."

| Icon                | Title                  | Text                                                                                        |
| ------------------- | ---------------------- | ------------------------------------------------------------------------------------------- |
| `MapPin`            | Real-time tracking     | Follow your order from washer to doorstep with your order number. No app, no account.       |
| `MessageSquareText` | SMS at every step      | We text you when we receive your laundry, when it's ready and when the rider is on the way. |
| `Truck`             | Pickup & delivery      | Door-to-door within 5 km, in three time slots every day.                                    |
| `Wallet`            | Pay with GCash or Maya | Or cash, bank transfer or card — at the counter or to our rider.                            |
| `Tag`               | Tagged and counted     | Every bag gets a QR tag and a piece count, so nothing gets lost or mixed up.                |
| `ShieldCheck`       | Careful handling       | Whites and colors sorted, fabrics checked, and your special instructions followed.          |

("Pay with GCash or Maya" instead of "online payment": decision D8.)

### 3.8 Pricing Preview

Desktop: tabs on the left with the price list, a notes card on the right. Phone: tabs, list, then notes.

```
 [ Per kilo ] [ Per piece ]
 ┌─────────────────────────────────────┬──────────────────────────────┐
 │ Wash, Dry & Fold        ₱35 / kg    │ Good to know                 │
 │ Wash Only               ₱20 / kg    │ • Minimum 3 kg per load      │
 │ Dry Only                ₱20 / kg    │ • Express: +50%, ready in 8h │
 │ Wash, Dry & Press       ₱60 / kg    │ • Pickup & delivery ₱50/trip │
 │ Bedsheets & Pillowcases ₱45 / kg    │ • Seniors & PWD 20% off      │
 └─────────────────────────────────────┴──────────────────────────────┘
                     [ See All Prices ]
```

- Eyebrow: **Pricing**
- H2: **Simple, honest prices**
- Lead: "Pay by the kilo for everyday laundry and by the piece for special items. What you see here is what you pay."
- Tabs: **Per kilo** · **Per piece** (first five services of each)
- Notes card title: **Good to know**
    - "Minimum {wdf_min} kg for wash, dry & fold" (from that service's minimum quantity)
    - "Express: +{express_pct}%, ready in as little as {express_hours} hours"
    - "Pickup & delivery: {delivery_fee} per trip"
    - "Senior citizens and PWDs: 20% off with a valid ID"
- Button: **See All Prices**

### 3.9 Testimonials

A carousel: 1 card visible on phones, 2 on tablets, 3 on desktop. Arrow buttons and swipe; no autoplay.

```
 ┌──────────────────────┐ ┌──────────────────────┐ ┌──────────────────────┐
 │ ★★★★★                │ │ ★★★★★                │ │ ★★★★☆                │
 │ “Super fresh and     │ │ “The SMS updates are │ │ “Picked up at 9,     │
 │ folded so neatly…”   │ │ a lifesaver…”        │ │ back the next day…”  │
 │ (MS) Maria S.        │ │ (JD) Juan D.         │ │ (AR) Ana R.          │
 │      October 2026    │ │      October 2026    │ │      September 2026  │
 └──────────────────────┘ └──────────────────────┘ └──────────────────────┘
                              ‹   ›
```

- Eyebrow: **Reviews**
- H2: **Loved by busy neighbors**
- Lead: "Real reviews from customers, sent after their order was done."
- Card: stars (`aria-label="Rated 5 out of 5"`), the comment in quotes, Avatar with initials, the display name (first name and last initial) and the month.
- Featured reviews come first (the backend already sorts them).
- Hidden when there are no approved reviews.

### 3.10 FAQ Preview

- Eyebrow: **FAQ**
- H2: **Questions? We've got answers.**
- Content: the five FAQs marked "show on Home", in an Accordion (one open at a time).
- Links below: **See all questions →** · "Still unsure? **Message us on Messenger**" (or "Call us at {phone}" when Messenger is not set).

### 3.11 CTA Banner

```
 ┌──────────────────────────────────────────────────────────────────────────┐
 │  (blue panel, rounded-3xl, soft aqua glow in the corner)                  │
 │  Ready for fresh laundry?                                                 │
 │  Book a pickup in under a minute. We'll text you when our rider is        │
 │  on the way.                                                              │
 │  [ Book a Pickup ]   [ 📞 Call 0917 123 4567 ]                            │
 └──────────────────────────────────────────────────────────────────────────┘
```

- H2: **Ready for fresh laundry?**
- Text: "Book a pickup in under a minute. We'll text you when our rider is on the way."
- Buttons: **Book a Pickup** (`secondary`, white) · **Call {phone}** (`ghost`, white text)

The same banner closes the Pricing, About and FAQ pages.

---

## 4. Services & Pricing (`/pricing`)

```
 Home › Services & Pricing
 Simple, honest pricing
 Prices per kilo for everyday laundry and per piece for special items…
 ┌─────────────────────────────────────────────┬─────────────────────────────┐
 │ [All] [Per kilo] [Per piece]                │ Estimate your cost          │
 │ ┌─────────────────────────────────────────┐ │ Service   [Wash, Dry & Fold]│
 │ │ 🫧 Wash, Dry & Fold            ₱35/kg   │ │ Weight    [ 5 ] kg          │
 │ │ Everyday clothes washed, tumble-dried…  │ │ [ ] Express (+50%)          │
 │ │ Min. 3 kg · Ready in 24 h · Express 8 h │ │ [ ] Pickup & delivery       │
 │ └─────────────────────────────────────────┘ │ ─────────────────────────── │
 │ ┌─────────────────────────────────────────┐ │ Estimated total    ₱175     │
 │ │ …one row per active service…            │ │ Final price after weighing  │
 │ └─────────────────────────────────────────┘ │ [ Book a Pickup ]           │
 ├─────────────────────────────────────────────┴─────────────────────────────┤
 │ Good to know: 4 note cards (minimum, express, delivery, discounts)         │
 │ CTA banner                                                                 │
 └────────────────────────────────────────────────────────────────────────────┘
```

**Copy**

- H1: **Simple, honest pricing**
- Lead: "Per kilo for everyday laundry, per piece for special items. Prices are always up to date — what you see is what you pay."
- Tabs: **All** · **Per kilo** · **Per piece** (a tab with no services is hidden)
- Each service row: icon, name, description (from the database), price and unit, and a meta line: "Min. 3 kg · Ready in 24 h · Express in 8 h". A service without express shows "No express option".
- Estimator card:
    - Title: **Estimate your cost**
    - Fields: **Service** (Select) · **Weight (kg)** or **Pieces**, depending on the service · **Express (+{express_pct}%)** checkbox (hidden for services without express) · **Pickup & delivery** checkbox (adds two trips: pickup + return)
    - Result: **Estimated total {amount}**, then "Final price is based on the actual weight or piece count at the shop."
    - Button: **Book a Pickup** (opens `/book` with the chosen service and quantity pre-filled)
- "Good to know" cards:
    - **Minimum load** — "Each per-kilo service has a minimum (shown on its row). Smaller loads are charged at the minimum."
    - **Express service** — "Need it fast? Express adds {express_pct}% and gets most orders back in {express_hours} hours."
    - **Pickup & delivery** — "{delivery_fee} per trip within our service area. Drop-off and pick-up at the shop are always free."
    - **Discounts** — "Senior citizens and PWDs get 20% off with a valid ID."

**Customer-friendly service descriptions** (the seeder text is written for staff; the owner can paste these in Services & Pricing, and Phase 5 updates the seeder for new installs):

| Service                 | Public description                                                              |
| ----------------------- | ------------------------------------------------------------------------------- |
| Wash, Dry & Fold        | Everyday clothes washed, tumble-dried and neatly folded, ready for your closet. |
| Wash Only               | Washed and spun dry. You dry and fold at home.                                  |
| Dry Only                | Tumble-drying for clothes you've already washed.                                |
| Wash, Dry & Press       | Washed, dried and steam-pressed, returned on hangers.                           |
| Ironing / Pressing      | Per-piece pressing for polos, slacks, uniforms and dresses.                     |
| Bedsheets & Pillowcases | Washed separately in a hot cycle for fresher, cleaner sleep.                    |
| Comforter / Blanket     | Bulky items washed one at a time so they come out fluffy.                       |
| Curtains                | Gentle wash for curtains and drapes. Please remove the hooks first.             |
| Dry Cleaning            | Gentle care for barong, gowns, suits and delicate fabrics.                      |
| Shoe Cleaning           | Deep clean for sneakers and canvas shoes, inside and out.                       |

---

## 5. Track Order

### 5.1 Form page (`/track`)

```
 Home › Track Order
 ┌───────────────────────────────────────┐  ┌──────────────────────────────┐
 │ Track your order                      │  │ Where's my order number?     │
 │ Enter the order number from your      │  │ It's printed at the top of   │
 │ receipt and your mobile number.       │  │ your receipt and in every    │
 │ Order number [LND-20261023-0012    ]  │  │ SMS we send, e.g.            │
 │ Mobile number [0917 123 4567       ]  │  │ LND-20261023-0012            │
 │ [          Check Status           ]   │  │                              │
 │ 🔒 We only show your first name and   │  │ Got an SMS from us? Tap the  │
 │ order status — never your address.    │  │ link in it to open your      │
 └───────────────────────────────────────┘  │ order directly.              │
                                            └──────────────────────────────┘
```

- H1: **Track your order**
- Lead: "Enter the order number from your receipt and the mobile number you gave us."
- Privacy note: "We only show your first name and order status — never your address or full name."
- Help card title: **Where's my order number?** Text as in the wireframe, plus "Lost it? **Call us at {phone}** and we'll look it up."
- Errors: the same two server messages as the quick tracker (§3.3).
- `?order=` in the URL pre-fills the order number (used by receipt QR codes).

### 5.2 Result page (`/track/{code}`)

```
 ┌───────────────────────────────────────────────────────────────┐
 │ LND-20261023-0042                              [⚡ Express]    │
 │ Hi, Maria! Your laundry is in the washer.     [🌀 Washing]    │
 │ ●━━━━━━━━●━━━━━━━━◐────────○────────○────────○                │
 │ Received Washing  Drying  Folding  Ready   Done              │
 ├───────────────────────────────┬───────────────────────────────┤
 │ Received    Wed, Oct 23 9:12 AM│ Total         ₱420.00        │
 │ Ready by    Thu, Oct 24 5:00 PM│ Balance due   ₱245.00        │
 │ Delivery    Thu, Oct 24 4–6 PM │ Pay with cash, GCash or Maya │
 ├───────────────────────────────┴───────────────────────────────┤
 │ Items: Wash, Dry & Fold 6 kg · Comforter 1 pc                 │
 │ History: Washing 10:05 AM · Received 9:12 AM                  │
 ├───────────────────────────────────────────────────────────────┤
 │ Questions about this order? [📞 Call us] [💬 Messenger]       │
 └───────────────────────────────────────────────────────────────┘
```

The page refreshes itself every 60 seconds while the order is in progress.

**Status messages** (the line under the order number)

| Status           | Message                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------- |
| For Pickup       | Your pickup is booked. Our rider will collect your laundry on {pickup date and window}. |
| Received         | We've got your laundry. It's tagged, counted and in line for washing.                   |
| Washing          | Your laundry is in the washer.                                                          |
| Drying           | Your laundry is in the dryer.                                                           |
| Folding          | Almost done — we're folding and packing your laundry.                                   |
| Ready            | Your laundry is ready! Pick it up any time during shop hours: {hours}.                  |
| Out for Delivery | Our rider is on the way with your laundry.                                              |
| Completed        | Picked up — thank you for choosing {shop_name}!                                         |
| Delivered        | Delivered — thank you for choosing {shop_name}!                                         |
| Cancelled        | This order was cancelled. Questions? Call us at {phone}.                                |

Completed and delivered orders also show "**How did we do?** Rate your laundry →" (links to `/feedback/{code}`).

---

## 6. Book a Pickup (`/book`)

One page, three numbered steps, with a sticky summary on desktop. On phones the summary becomes a bar above the submit button.

```
 Home › Book a Pickup
 Book a pickup
 Tell us when and where. We'll confirm by SMS.
 ┌──────────────────────────────────────────────┬────────────────────────────┐
 │ ① When should we come?                       │ Your pickup                │
 │ [Today] [Tue 24] [Wed 25] [Thu 26] [More 📅]  │ 📅 Thu, Oct 24             │
 │ ○ 9:00 – 11:00 AM          3 slots left      │ 🕐 1:00 – 3:00 PM          │
 │ ● 1:00 – 3:00 PM           2 slots left      │ 🫧 Wash, Dry & Fold ~6 kg  │
 │ ⊘ 4:00 – 6:00 PM           Fully booked      │ ⚡ Express                  │
 │                                              │ ────────────────────────── │
 │ ② Your details                               │ Estimated total     ₱415   │
 │ Full name     [                ]             │ Final price after weighing │
 │ Mobile number [                ]             │                            │
 │ Email (opt.)  [                ]             │ ✓ Free SMS updates         │
 │ Pickup address [                         ]   │ ✓ Pay on delivery          │
 │                                              │                            │
 │ ③ Your laundry                               │                            │
 │ Service       [Wash, Dry & Fold  ▾]          │                            │
 │ Est. weight   [ 6 ] kg                       │                            │
 │ [ ] Express (+50%)   [✓] Deliver it back     │                            │
 │ Special instructions [               ]       │                            │
 │                                              │                            │
 │ [✓] I agree that {shop_name} may use my      │                            │
 │     details for this pickup. Privacy Notice  │                            │
 │ [          Request Pickup            ]       │                            │
 └──────────────────────────────────────────────┴────────────────────────────┘
```

**Behavior**

- **Date:** a scrollable row of day chips (ToggleGroup) for the next 7 days, plus **More dates**, which opens the existing Date Picker (Popover + Calendar) limited to the 14-day booking window.
- **Slots:** a RadioGroup of three slot cards. Choosing another date reloads only the slots (Inertia partial reload). Full or too-late slots are disabled and say why. If every slot that day is gone, an Alert suggests the next day.
- **Prefill:** `?service=` and `?qty=` from the Pricing estimator pre-fill step 3.
- **Hidden fields:** the honeypot (`website`) and the form token (decision D5). Visitors never see them.
- **Submit:** Inertia `useForm`. Errors appear under each field; the page scrolls to the first one.
- **Success:** a Dialog with the reference number. The form resets.

**Copy**

- H1: **Book a pickup**
- Lead: "Tell us when and where. Our rider comes to your door, and we'll confirm by SMS."
- Step titles: **When should we come?** · **Your details** · **Your laundry**
- Day chips: **Today**, **Tomorrow**, then short dates ("Thu 26"). Button: **More dates**
- Slot labels: the window from the server ("1:00 – 3:00 PM"), plus "{n} slots left", "1 slot left", **Fully booked** or **Too late to book today**.
- All-full alert: "All pickup times on {date} are taken. Try {next date}, or call us at {phone} — we'll try to fit you in."

| Field                | Label                                                                                            | Placeholder / helper                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| name                 | Full name                                                                                        | Juan Dela Cruz                                                       |
| phone                | Mobile number                                                                                    | 0917 123 4567 · "We'll text your confirmation here."                 |
| email                | Email (optional)                                                                                 | you@example.com · "For a copy of your confirmation."                 |
| address              | Pickup address                                                                                   | House no., street, barangay, landmark                                |
| service_id           | Service                                                                                          | Select a service · "Not sure? Leave it — we'll sort it at the shop." |
| estimated_quantity   | Estimated weight (kg) / Number of pieces                                                         | "A full laundry bag is usually 5–7 kg."                              |
| is_express           | Express (+{express_pct}%)                                                                        | "Ready in as little as {express_hours} hours."                       |
| wants_delivery       | Deliver it back to me                                                                            | "+{delivery_fee} per trip. Untick to pick it up at the shop."        |
| special_instructions | Special instructions                                                                             | e.g. separate the whites, no fabric softener, call when outside      |
| consent              | I agree that {shop_name} may use my details to arrange this pickup. Read our **Privacy Notice**. |                                                                      |

- Summary title: **Your pickup**. Empty state: "Choose a date and time to see your summary."
- Estimate line: **Estimated total {amount}**, with "Final price after weighing at the shop."
- Reassurance under the summary: "✓ Free SMS updates" · "✓ Pay when your laundry is delivered" · "✓ Free to cancel — just call us"
- Submit button: **Request Pickup**
- Signed-in customers never see this page: they go to the portal booking page (already built in Phase 3).

**Confirmation dialog**

```
 ┌──────────────────────────────────────────┐
 │            ✓ (green check)               │
 │      Pickup request received!            │
 │      Reference BKG-20261024-0007  [Copy] │
 │ We'll text 0917 123 4567 to confirm your │
 │ pickup on Thursday, October 24,          │
 │ 1:00 – 3:00 PM.                          │
 │ [ Done ]   [ Create an account ]         │
 └──────────────────────────────────────────┘
```

- Title: **Pickup request received!**
- Text: "We'll text {phone} to confirm your pickup on {date}, {window}. Keep your reference number in case you need to call us."
- Buttons: **Done** · **Create an account** ("See all your orders in one place.")

---

## 7. About Us (`/about`)

```
 PageHero: About us / Clean clothes, less stress
 ┌──────────────────────────────┬───────────────────────────┐
 │ Our story (about_text)       │  shop-front photo (4:3)   │
 └──────────────────────────────┴───────────────────────────┘
 Stats row (same as the trust bar)
 What we stand for: 3 value cards
 How we look after your clothes: 4 numbered points + team photo
 Reviews (3 cards) · CTA banner
```

**Copy**

- Eyebrow: **About us**
- H1: **Clean clothes, less stress**
- Lead: "We're a neighborhood laundry in {city}, serving students, families and working professionals since {founded_year}."
- **Our story** (H2), body from Settings → about text (the owner edits it). Sample:
    > {shop_name} started as a two-machine shop for busy neighbors who needed clean clothes without losing their weekend. Today we wash, dry, fold and press for students, families and working professionals — with every order tagged, tracked and texted to you, so nothing gets lost and you always know when your laundry is ready.
- **What we stand for** (H2), three cards:
    - `ShieldCheck` **Care you can see** — "Every load is sorted, checked and handled like it's our own."
    - `Clock` **On time, every time** — "We give you a ready time and we keep it. If anything changes, you'll hear it from us first."
    - `Wallet` **Honest pricing** — "Our full price list is online. No surprise charges at the counter."
- **How we look after your clothes** (H2), four numbered points:
    1. **Tagged at drop-off.** Every bag gets a QR tag and a piece count on your receipt.
    2. **Sorted before washing.** Whites, colors and delicates never share a machine.
    3. **Checked before folding.** We look for stains, loose buttons and anything left in pockets.
    4. **Packed and sealed.** Your laundry is folded, bagged and labeled with your order number.
- Reviews: H2 **What our customers say** (three cards; hidden if none).
- CTA banner (§3.11).

---

## 8. FAQ (`/faq`)

```
 PageHero: FAQ / Frequently asked questions
 [🔍 Search questions…                ]
 [All] [Services] [Pricing] [Pickup & Delivery] [Payments] [Care & Policies]
 Accordion grouped by category
 ┌──────────────────────────────────────────────────────────┐
 │ Still have a question?                                   │
 │ Messenger is the fastest way to reach us in shop hours.  │
 │ [Message us on Messenger]  [Send a message]  [Call us]   │
 └──────────────────────────────────────────────────────────┘
```

- H1: **Frequently asked questions**
- Lead: "Turnaround times, prices, pickup and delivery, payments and garment care — quick answers to what customers ask most."
- Search placeholder: "Search questions…". No match: "No questions match "{term}". Try another word, or **ask us directly**."
- Tabs: **All** plus one per category that has published questions.
- Closing card: **Still have a question?** · "Messenger is the fastest way to reach us during shop hours." · **Message us on Messenger** · **Send a Message** · **Call Us**

**Questions** (already written and seeded in Phase 2; the owner edits them in Website → FAQs):

| Category          | Question                                   | On Home |
| ----------------- | ------------------------------------------ | :-----: |
| Services          | How long does a regular wash take?         |    ✓    |
| Pricing           | How much does it cost?                     |    ✓    |
| Pickup & Delivery | Do you pick up and deliver?                |    ✓    |
| Services          | Do you offer same-day or express service?  |    ✓    |
| Pickup & Delivery | How do I track my laundry?                 |    ✓    |
| Payments          | What payment methods do you accept?        |         |
| Care & Policies   | Do you separate whites and colors?         |         |
| Care & Policies   | What if an item is lost or damaged?        |         |
| Care & Policies   | How long can I leave my laundry unclaimed? |         |
| Pickup & Delivery | What areas do you serve?                   |         |
| Payments          | Do you offer discounts?                    |         |
| Services          | Can I create an account?                   |         |

The full answers are in `database/seeders/FaqSeeder.php`.

---

## 9. Contact (`/contact`)

```
 PageHero: Contact / Get in touch
 ┌───────────────────────────────────────┬────────────────────────────┐
 │ Send us a message                     │ 📍 Visit us                │
 │ Name [            ]                   │    123 Rizal Street…       │
 │ Mobile [        ] Email [          ]  │    Get directions →        │
 │ Topic [General question        ▾]     │ 📞 Call or text            │
 │ Message [                        ]    │    0917 123 4567           │
 │ [✓] I agree … Privacy Notice          │ ✉ Email                    │
 │ [         Send Message          ]     │    hello@freshfold.test    │
 │                                       │ 🕐 Opening hours           │
 │                                       │    Mon–Sat 7 AM – 8 PM …   │
 │                                       │ 💬 [Message us on Messenger]│
 └───────────────────────────────────────┴────────────────────────────┘
 ┌────────────────────────────────────────────────────────────────────┐
 │                     Google map (16:9, lazy)                        │
 └────────────────────────────────────────────────────────────────────┘
```

- H1: **Get in touch**
- Lead: "Questions about an order, a big load or a business account? We're happy to help."
- Form card title: **Send us a message**

| Field   | Label                                                                                    | Placeholder / helper                                                                                 |
| ------- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| name    | Your name                                                                                | Juan Dela Cruz                                                                                       |
| phone   | Mobile number                                                                            | 0917 123 4567                                                                                        |
| email   | Email                                                                                    | you@example.com · helper under both: "Give us at least one so we can reply."                         |
| subject | Topic                                                                                    | General question · About an existing order · Pickup & delivery · Business or bulk laundry · Feedback |
| message | Message                                                                                  | How can we help?                                                                                     |
| consent | I agree that {shop_name} may use my details to reply to me. Read our **Privacy Notice**. |                                                                                                      |

- Button: **Send Message**. Success toast (from the server): "Thanks! Your message was sent. We usually reply within one business day."
- Info cards: **Visit us** (address + **Get directions →**) · **Call or text** · **Email** · **Opening hours** (with the open/closed badge) · **Message us on Messenger**.
- Map: the Google Maps embed from Settings, loaded lazily with the title "Map showing {shop_name}". If no embed is set, a card shows the address with **Open in Google Maps**.

---

## 10. Rate Your Laundry (`/feedback/{code}`)

Reached from the "Rate us" link in the order-completed SMS. Centered card, `noindex`.

```
 ┌──────────────────────────────────────────┐
 │ How did we do, Maria?                    │
 │ Order LND-20261023-0042                  │
 │      ☆  ☆  ☆  ☆  ☆                       │
 │      Tap a star to rate                  │
 │ Tell us more                             │
 │ [                                      ] │
 │ [            Send Review             ]   │
 │ Only your first name and last initial    │
 │ are shown if we feature your review.     │
 └──────────────────────────────────────────┘
```

- H1: **How did we do, {first name}?**
- Sub: "Order {order_number}. Your review helps neighbors find us — and helps us get better."
- Stars: a RadioGroup styled as five large stars. Labels read out: 1 **Poor** · 2 **Fair** · 3 **Good** · 4 **Great** · 5 **Excellent**
- Comment label: **Tell us more** (required, at least 10 characters, so every review shown on the website has words), placeholder "What did you like? What could we do better?"
- Button: **Send Review**
- Privacy line: "Only your first name and last initial are shown if we feature your review."
- Thank-you state: **Thank you, {first name}!** · "The owner reads every review, so if anything went wrong, we'll make it right." · **Back to home**
- Already rated: **You've already rated this order** · "Thanks again for your feedback!" · **Book another pickup**

---

## 11. Log in, register and staff login

The existing Fortify pages get the public look: the shop logo and name above the card, the public footer below it, and a link back to the website.

| Page             | Heading                 | Sub-text                                                                                       | Extra links                                             |
| ---------------- | ----------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `/login`         | **Welcome back**        | Log in to see your orders and book pickups faster.                                             | "New here? **Create an account**" · "← Back to website" |
| `/login?staff=1` | **Staff login**         | For {shop_name} staff only. Customers, please use the **customer login**.                      | "← Back to website"                                     |
| `/register`      | **Create your account** | Use the mobile number you gave us at the counter — your past orders will appear automatically. | "Already have an account? **Log in**"                   |

Both logins post to the same secure Fortify route, and the account role decides where the person lands (decision from Phase 1).

---

## 12. Error pages (`errors/error`)

Centered in the public layout, with the navbar and footer, so a lost visitor can carry on.

| Status | Icon             | Title                                  | Text                                                                                           | Buttons                                         |
| ------ | ---------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 404    | `Shirt`          | **This page went missing**             | Like a sock in the dryer — it happens. The page you're looking for doesn't exist or was moved. | **Go to Home** · Track My Order · Book a Pickup |
| 403    | `ShieldCheck`    | **You don't have access to this page** | Log in with an account that has permission, or head back to the home page.                     | **Go to Home** · Log in                         |
| 500    | `WashingMachine` | **Something went wrong on our side**   | We've been notified and are fixing it. Please try again in a minute, or call us at {phone}.    | **Try Again** · Go to Home                      |
| 503    | `Clock`          | **We're doing quick maintenance**      | We'll be back in a few minutes. Need help right now? Call us at {phone}.                       | **Try Again**                                   |

The status number is shown small above the title (`text-sm font-mono text-muted-foreground`), not as a giant "404".

---

## 13. Privacy Notice (`/privacy`) — new, recommended

The booking and contact forms ask for consent under the **Data Privacy Act of 2012 (RA 10173)**, so the consent text should link to a short notice. Phase 5 adds a simple static page (and a sitemap entry).

**Copy**

- H1: **Privacy Notice**
- Lead: "How {shop_name} collects, uses and protects your personal information."
- **What we collect** — "Your name, mobile number, address and, if you give it, your email. For orders, we also keep what you had cleaned, what you paid and your order status."
- **Why we collect it** — "To pick up and deliver your laundry, to send you SMS and email updates about your order, to reply to your messages, and to keep accurate business records."
- **Who sees it** — "Only our staff, and only what they need for their work. Your number is shared with our SMS provider solely to deliver our messages. We never sell or share your information for marketing."
- **On our website** — "The tracking page shows only your first name and order status. Reviews show only your first name and last initial, and only after we approve them."
- **How long we keep it** — "Order records are kept for as long as the law requires for business records. Booking requests and messages are deleted after one year."
- **Your rights** — "You can ask to see, correct or delete your personal information at any time. Contact us at {email} or {phone}, or visit the shop."
- Footer line: "Last updated: {date of publishing}"

The one-year deletion of old booking requests and messages would be a small scheduled command in Phase 5 (`laundry:prune-website-inbox`). If you'd rather not promise that, the line can say "kept only as long as needed" instead.

---

## 14. Staff pages for the website

These live in the admin system, use the existing AppLayout and follow the main design doc (`docs/04-ui-ux-design.md`). They appear in the sidebar under a new **Website** group with count badges.

| Sidebar item     | Badge                        | Who            |
| ---------------- | ---------------------------- | -------------- |
| Booking requests | pending requests             | Admin, Cashier |
| Messages         | new messages                 | Admin, Cashier |
| FAQs             |                              | Admin          |
| Reviews          | reviews waiting for approval | Admin          |

### 14.1 Booking requests (`/booking-requests`)

```
 Booking requests
 [Pending 3] [Confirmed] [Declined] [Cancelled]   [🔍 Search name, mobile, ref]
 ┌─────────────────────────────────────────────────────────────────────────────┐
 │ BKG-20261024-0007  Maria Santos · 0917 555 0101       Thu Oct 24 · 1–3 PM   │
 │ 12 Mabini St, Brgy. San Roque · Wash, Dry & Fold ~6 kg · ⚡ Express           │
 │ "Please call when outside"           Received 12 min ago  [Decline] [Confirm]│
 └─────────────────────────────────────────────────────────────────────────────┘
```

- **Confirm** opens a Sheet: customer match ("Existing customer: Maria Santos, 14 orders" or "New customer will be created"), date and slot (editable), rider (Select, optional), then **Confirm & Create Order**. Afterwards a toast links to the new order.
- **Decline** opens a Dialog with quick reasons ("Outside our service area", "Fully booked — please choose another time", "Couldn't reach you by phone") plus a free-text reason. The reason is sent to the guest by SMS.
- **Cancel** (for confirmed-by-phone cancellations) asks for a reason; nothing is sent.
- Empty state: "No pending requests. New website bookings will appear here."

### 14.2 Messages (`/contact-messages`)

A list on the left and the selected message on the right (one column with a Sheet on phones). Unread messages are bold. Actions: **Call**, **Reply by email** (mailto with the subject pre-filled), **Mark as resolved**, **Mark as unread**. Opening a message marks it read.

### 14.3 FAQs (`/website/faqs`)

A table: question, category, Published switch, "On Home" switch (at most 5 can be on), sort order. **Add question** opens a Dialog: question, answer, category (Combobox with existing categories), published, show on Home. A preview link opens `/faq` in a new tab.

### 14.4 Reviews (`/website/testimonials`)

Cards with stars, comment, name, order number and date. Tabs **Waiting** · **Approved** · **Featured**. Actions: **Approve**, **Feature on Home** (switch), **Hide**, **Delete**. **Add review** lets the owner type in a review received on Facebook or paper (source: "Manual").

### 14.5 Shop settings → Website

A new card on the existing Shop settings page:

- **Logo** (upload with preview; PNG, JPG or WebP, square, at least 256 px).
- Tagline · City · Business hours (display text) · Opening hours for Google (with the format hint "Mo-Sa 07:00-20:00, Su 08:00-17:00").
- Facebook, Messenger and Instagram links · Google Maps embed URL (with a short "How to get this" help text) · Google Maps link.
- About text · Founding year · Service area · Pickups per time slot.

---

## 15. SEO: titles and descriptions

Already produced by the backend (`SeoService`). Listed here so the copy stays consistent.

| Page                      | Title                                     | Description                                                                                                                         |
| ------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Home                      | {shop_name}                               | {tagline} Wash, dry & fold, ironing and dry cleaning with free SMS updates, online order tracking, and pickup & delivery in {city}. |
| Pricing                   | Services & Pricing \| {shop_name}         | Laundry prices from {kg_from} per kilo. Wash, dry & fold, ironing, comforters, dry cleaning and express service in {city}.          |
| Book                      | Book a Pickup \| {shop_name}              | Schedule a laundry pickup online in under a minute. Choose a time slot and our rider collects your laundry at your door.            |
| Track                     | Track Your Order \| {shop_name}           | Check your laundry's status with your order number and mobile number — no account needed.                                           |
| About                     | About Us \| {shop_name}                   | Meet {shop_name} — a neighborhood laundry shop in {city} that tags, tracks and texts every order.                                   |
| FAQ                       | Frequently Asked Questions \| {shop_name} | Turnaround times, prices, pickup and delivery, payments and garment care — answers to common laundry questions.                     |
| Contact                   | Contact Us \| {shop_name}                 | Call, message or visit {shop_name} in {city}. {hours}.                                                                              |
| Privacy                   | Privacy Notice \| {shop_name}             | How {shop_name} collects, uses and protects your personal information.                                                              |
| Feedback, tracking result | (noindex)                                 |                                                                                                                                     |

---

## 16. Image list

**Approach.** The code points to fixed image paths (below). Until a real photo is saved at that path, `SiteImage` shows a branded fallback: a soft blue-to-aqua gradient panel with a large line icon. The site therefore looks finished on day one, and adding a photo is just saving a file with the right name, with no code change.

**Use real photos of your own shop.** Stock photos of a laundry that isn't yours hurt trust once a customer visits. Phone photos are fine: daylight, a tidy counter, no customer faces or names on bags.

| #   | File (in `public/`)           | Where                             | Size (px)          | Format                   | Max size | What to shoot                                                                                                                         | Alt text                                                 |
| --- | ----------------------------- | --------------------------------- | ------------------ | ------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | `images/site/hero.webp`       | Home hero (loads first, not lazy) | 1200 × 900 (4:3)   | WebP                     | 150 KB   | Neat stacks of folded laundry on the counter, or a staff member handing over a sealed laundry bag                                     | "Freshly folded laundry ready for pickup at {shop_name}" |
| 2   | `images/site/why-us.webp`     | Home → Why Choose Us              | 1000 × 1000 (1:1)  | WebP                     | 120 KB   | Hands sorting clothes by color, or tagging a bag with the QR tag                                                                      | "Staff sorting laundry by color before washing"          |
| 3   | `images/site/shop-front.webp` | About → Our story                 | 1200 × 900 (4:3)   | WebP                     | 150 KB   | The storefront from across the street with the signage readable                                                                       | "{shop_name} storefront in {city}"                       |
| 4   | `images/site/team.webp`       | About → How we look after clothes | 1200 × 800 (3:2)   | WebP                     | 150 KB   | The team inside the shop, smiling, in uniform (ask their permission)                                                                  | "The {shop_name} team"                                   |
| 5   | `images/og-image.jpg`         | Facebook/Messenger link previews  | 1200 × 630         | JPG                      | 300 KB   | **Generated automatically in Phase 5** (shop name, tagline and phone on the brand gradient). Replace with a branded photo if you like | (not shown on the page)                                  |
| 6   | Logo (upload in Settings)     | Navbar, footer, login, receipts   | 512 × 512 square   | PNG or WebP, transparent | 1 MB     | Your logo on a transparent background                                                                                                 | "{shop_name}" (decorative next to the name)              |
| 7   | `favicon.svg`, `favicon.ico`  | Browser tab                       | 32 × 32 (ICO), SVG | SVG + ICO                | 10 KB    | Simplified logo mark. **Phase 5 replaces the Laravel starter icons** with a washing-machine mark in Laundry Blue                      |                                                          |
| 8   | `apple-touch-icon.png`        | iPhone home screen                | 180 × 180          | PNG                      | 30 KB    | Logo mark on a solid blue square                                                                                                      |                                                          |

**Preparing photos**

- Export at exactly the size above (crop, don't stretch). Convert to WebP at quality 75–80 (free: squoosh.app).
- Images 2–4 load lazily (`loading="lazy"`) with width and height set, so the page doesn't jump. The hero uses `fetchpriority="high"`.
- No photos of customers, receipts or bags with names on them (privacy).
- Testimonials use initials avatars, not photos.

---

## 17. Phase 5 build list

**New front-end files**

| File                                                                                       | Contents                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `layouts/public-site-layout.tsx`                                                           | Info bar, navbar, footer, mobile action bar, skip link, toaster                                                                                                                                                                                                                                                                                |
| `components/public/*.tsx`                                                                  | `site-navbar`, `site-footer`, `info-bar`, `mobile-action-bar`, `section-header`, `page-hero`, `hero`, `quick-tracker`, `trust-bar`, `service-card`, `step-card`, `feature-card`, `pricing-preview`, `price-estimator`, `testimonial-card`, `testimonial-carousel`, `faq-list`, `cta-banner`, `site-image`, `reveal`, `seo-head`, `open-status` |
| `lib/public-site.ts`                                                                       | Service groups and icons, stat rounding, opening-hours parser, price estimate                                                                                                                                                                                                                                                                  |
| `pages/public/*.tsx`                                                                       | `home`, `pricing`, `track`, `book`, `about`, `faq`, `contact`, `feedback`, `privacy`                                                                                                                                                                                                                                                           |
| `pages/errors/error.tsx`                                                                   | All error statuses                                                                                                                                                                                                                                                                                                                             |
| `pages/website/*`                                                                          | `booking-requests/index`, `contact-messages/index`, `faqs/index`, `testimonials/index`                                                                                                                                                                                                                                                         |
| Updated: `pages/track/show.tsx`, auth pages, `pages/settings/shop.tsx`, sidebar navigation | Public look, staff-login heading, Website settings card, Website sidebar group                                                                                                                                                                                                                                                                 |

**Small backend additions**

- `PublicStats`: average rating and review count (for the hero rating line).
- `SiteSettings`: include `opening_hours_schema` (for the open/closed badge).
- `/privacy` route, page and sitemap entry; optional `laundry:prune-website-inbox` command (§13).
- Generate `public/images/og-image.jpg` with PHP GD (already installed) from the shop name and tagline.
- Replace the starter-kit favicons.
- `ServiceSeeder`: the customer-friendly descriptions from §4 (new installs only; existing descriptions are not overwritten).
- Tests switch from `component(..., false)` to real page checks, now that the pages exist.

---

## 18. Decisions to confirm

| #   | Decision                                                                                                       | Recommendation |
| --- | -------------------------------------------------------------------------------------------------------------- | -------------- |
| P1  | Fresh Aqua accent (icons, eyebrows, section tint) next to Laundry Blue (buttons and links)                     | Yes            |
| P2  | Home service cards are six fixed groups with live "from" prices; the Pricing page lists every active service   | Yes            |
| P3  | Branded fallback panels until real photos are saved, instead of stock photos                                   | Yes            |
| P4  | Add a Privacy Notice page, linked from both forms and the footer                                               | Yes            |
| P5  | Promise in the notice that booking requests and messages are deleted after one year (with a scheduled cleanup) | Yes            |
| P6  | Price estimator on the Pricing page and booking summary (clearly labeled "estimate")                           | Yes            |
| P7  | Mobile bottom action bar (Call + Book a Pickup) on Home and Pricing                                            | Yes            |
| P8  | Trust-bar numbers hidden while they're small (under 100 orders / 50 customers), replaced by feature facts      | Yes            |
