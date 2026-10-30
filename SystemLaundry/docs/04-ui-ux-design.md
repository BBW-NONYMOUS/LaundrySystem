# Phase 4 — UI/UX Design

The look, behavior and component plan for every screen. Phase 5 builds exactly this.

**Design goals, in priority order**

1. **Fast at the counter during peak hours.** A walk-in order is recorded in under 30 seconds, mostly from the keyboard.
2. **No misread data.** Order numbers in a monospace font, money right-aligned with tabular digits, and every status with a color, an icon _and_ a label.
3. **Each role sees only its own work.** The rider gets a phone screen, staff get a scan screen, the owner gets analytics.
4. **Everything from shadcn/ui.** No custom CSS files; light and dark mode through theme tokens.

---

## 1. Design system

### 1.1 Color

The base is shadcn's `neutral` theme with one brand color, **Laundry Blue**, used for primary actions, focus rings and the active sidebar item. Everything else stays neutral, so status colors stand out.

| Token           | Light                               | Dark                   | Used for                                       |
| --------------- | ----------------------------------- | ---------------------- | ---------------------------------------------- |
| `--primary`     | `oklch(0.52 0.17 252)`              | `oklch(0.72 0.14 245)` | Primary buttons, links, active nav, focus ring |
| `--success`     | green-700                           | green-400              | Paid, saved, stock OK                          |
| `--warning`     | amber-700                           | amber-400              | Partial payment, low stock, due soon           |
| `--destructive` | shadcn default                      | shadcn default         | Unpaid, overdue, cancel, void, delete          |
| `--info`        | blue-600                            | blue-400               | Neutral notices                                |
| `--chart-1…5`   | blue · cyan · amber · violet · rose | lighter versions       | Charts; same order on every chart              |

The tokens are defined in `resources/css/app.css` and usable as Tailwind classes (`bg-success/10 text-success`).

### 1.2 Status colors

Every status has its own token (`--status-<value>`, underscores written as hyphens: `out_for_delivery` → `status-out-for-delivery`). Badges use a soft style: `bg-status-x/12 text-status-x border-status-x/25`. That stays readable in both themes and passes WCAG AA contrast, because the text uses the strong shade.

| Status                | Token                     | Color   | Icon (lucide)    | Meaning to the user         |
| --------------------- | ------------------------- | ------- | ---------------- | --------------------------- |
| For Pickup            | `status-pending`          | slate   | `CalendarClock`  | Booked, not in the shop yet |
| Received              | `status-received`         | blue    | `Inbox`          | In the shop, waiting        |
| Washing               | `status-washing`          | cyan    | `WashingMachine` | In the machine              |
| Drying                | `status-drying`           | amber   | `Wind`           | In the dryer                |
| Folding               | `status-folding`          | violet  | `Shirt`          | Being folded/pressed        |
| Ready                 | `status-ready`            | green   | `PackageCheck`   | On the shelf                |
| Out for Delivery      | `status-out-for-delivery` | indigo  | `Truck`          | With the rider              |
| Completed / Delivered | `status-completed`        | emerald | `CircleCheck`    | Done                        |
| Cancelled             | `status-cancelled`        | red     | `CircleX`        | Cancelled                   |

**Payment badges:** Unpaid → `destructive`, Partial → `warning`, Paid → `success`.
**Other badges:** Express is a solid amber badge with a `Zap` icon. Overdue is a destructive outline badge with an `AlarmClock` icon.

Color is never the only signal: badges always show an icon and text. That matters for color-blind staff and for faded thermal printouts.

### 1.3 Typography

| Role                                | Style                                                                                     |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| Font                                | **Instrument Sans** (already loaded), system fallback                                     |
| Page title                          | `text-2xl font-semibold tracking-tight`                                                   |
| Section / card title                | `text-base font-semibold`                                                                 |
| Body, tables, forms                 | `text-sm` (dense admin UI)                                                                |
| Helper / muted                      | `text-xs text-muted-foreground`                                                           |
| KPI numbers                         | `text-3xl font-semibold tabular-nums`                                                     |
| Order numbers, tracking codes, SKUs | `font-mono text-sm`                                                                       |
| Money                               | `tabular-nums`, right-aligned in tables, always `₱1,234.50` (2 decimals, comma thousands) |
| Dates                               | `Oct 23, 2:30 PM`; relative ("in 3 h", "2 days ago") with the full date in a Tooltip      |

### 1.4 Spacing, shape, motion

- **4 px grid.** Page padding `p-4 md:p-6`; gap between cards `gap-4 md:gap-6`; form fields `gap-4`; field label to input `gap-2`.
- **Radius** `0.625rem` (shadcn default) for cards and inputs; badges `rounded-md`.
- **Touch targets:** at least 44 px on the Scan, Rider and Portal pages (`h-11`, big buttons `h-14 text-base`).
- **Motion:** only shadcn's built-in transitions (dialogs, sheets, accordion). Nothing decorative; it must feel instant on cheap counter PCs.
- **Dark mode:** Settings → Appearance (Light / Dark / System), already in the starter kit.

### 1.5 Interaction patterns (applied on every page)

| Situation                           | Pattern                                                                                                                                                       |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create / edit a record              | **Sheet** from the right for long forms (order edit, customer, user); **Dialog** for short ones (service, payment, stock movement)                            |
| Delete / void / cancel / deactivate | **AlertDialog**; requires a reason where the server needs one                                                                                                 |
| Success / failure after saving      | **Sonner** toast (flashed by the server) plus field errors under each input                                                                                   |
| Loading                             | **Skeleton** rows/cards (charts use deferred props); button shows a Spinner and is disabled                                                                   |
| Empty list                          | Icon + one sentence + primary action ("No orders yet — Create the first order")                                                                               |
| Lists                               | **Data Table**: search, faceted filters, sorting, column visibility and pagination, all server-side through URL query parameters (shareable, survive refresh) |
| Customer selection                  | **Combobox** (Popover + Command) with live search, never free-typing a name                                                                                   |
| Dates                               | **Date Picker** (Popover + Calendar); time as slot **ToggleGroup** (9 AM / 1 PM / 4 PM)                                                                       |
| Row actions                         | **DropdownMenu** (⋯ button) and the same actions on right-click (**ContextMenu**)                                                                             |
| Live screens                        | Board, dashboard counts and rider list refresh every 15 s (Inertia `usePoll`)                                                                                 |

### 1.6 Keyboard shortcuts

| Keys                 | Action                                                                      | Where                      |
| -------------------- | --------------------------------------------------------------------------- | -------------------------- |
| `Ctrl/⌘ + K`         | Command palette: search orders and customers, jump to any page, "New order" | Everywhere                 |
| `Alt + N`            | New order                                                                   | Everywhere (cashier/admin) |
| `Alt + S`            | Scan page                                                                   | Everywhere (staff)         |
| `/`                  | Focus the table search box                                                  | Lists                      |
| `Ctrl + Enter`       | Save (and print)                                                            | New Order, all forms       |
| `Esc`                | Close dialog/sheet                                                          | Overlays                   |
| `Enter` after a scan | Open the scanned order (barcode scanners type and press Enter)              | Scan                       |

Shortcuts appear in Tooltips and in the command palette (`<CommandShortcut>`).

---

## 2. Layouts

| Layout           | Used by                | Built from                                             |
| ---------------- | ---------------------- | ------------------------------------------------------ |
| **AppLayout**    | Admin, Cashier, Staff  | `sidebar-07` block (collapses to icons) + header bar   |
| **RiderLayout**  | Rider                  | Slim top bar + single column; no sidebar (phone-first) |
| **PortalLayout** | Customer               | Top NavigationMenu (My Orders · Book Pickup · Account) |
| **AuthLayout**   | Login, register, reset | `login-03` block                                       |
| **PublicLayout** | Tracking page          | Centered single Card                                   |
| **PrintLayout**  | Receipt                | No chrome; Print button hidden with `print:hidden`     |

### 2.1 AppLayout

```
┌──────────────┬───────────────────────────────────────────────────────────────┐
│ [≡] Fresh    │ ◧  Orders / LND-20261023-0012        [🔍 Search… Ctrl K] 🔔3 ◐ (RV)│
│     Fold     ├───────────────────────────────────────────────────────────────┤
│ [+ New order]│                                                               │
│ OPERATIONS   │   Page content (max-w-7xl, p-4 md:p-6)                        │
│  ▣ Dashboard │                                                               │
│  ☰ Orders    │                                                               │
│  ▤ Board     │                                                               │
│  ⌗ Scan      │                                                               │
│ CUSTOMERS    │                                                               │
│  ☺ Customers │                                                               │
│  ₱ Payments  │                                                               │
│  🚚 Deliveries│                                                               │
│ MONITORING   │                                                               │
│  ⏰ Overdue 7 │                                                               │
│  📦 Unclaimed 9│                                                              │
│ MANAGEMENT   │                                                               │
│  … (admin)   │                                                               │
│──────────────│                                                               │
│ (RV) Rosa ▾  │                                                               │
└──────────────┴───────────────────────────────────────────────────────────────┘
```

- **Sidebar groups** are built from `auth.user.permissions`; groups without visible items are hidden.
    - _Operations:_ Dashboard, Orders, Status Board, Scan.
    - _Customers & Money:_ Customers, Payments, Deliveries.
    - _Monitoring:_ Overdue, Unclaimed (count badges).
    - _Management:_ Services & Pricing, Inventory (low-stock badge), Reports, Users, Activity Log, Settings.
- **"+ New order"** is a full-width primary button at the top of the sidebar (cashier/admin). When collapsed it becomes an icon with a Tooltip.
- **Header:**
    - SidebarTrigger and Breadcrumb.
    - Search button that opens the Command palette.
    - Notification bell: Popover with the latest alerts and "Mark all read".
    - Theme toggle (DropdownMenu).
    - User menu (Avatar → Profile, Settings, Log out).
- **Mobile:** the sidebar becomes a Sheet (built into shadcn Sidebar). The header keeps search and the bell.

---

## 3. Pages per role

✅ = full access · 👁 = view only · — = no access.

| Page                                    | Route                        |   Admin   | Cashier |   Staff    | Rider | Customer |
| --------------------------------------- | ---------------------------- | :-------: | :-----: | :--------: | :---: | :------: |
| Login / Register                        | `/login`, `/register`        |    ✅     |   ✅    |     ✅     |  ✅   |    ✅    |
| Dashboard (analytics)                   | `/dashboard`                 |    ✅     |    —    |     —      |   —   |    —     |
| Dashboard (operations)                  | `/dashboard`                 |     —     |   ✅    |     ✅     |   —   |    —     |
| New Order                               | `/orders/create`             |    ✅     |   ✅    |     —      |   —   |    —     |
| Orders list                             | `/orders`                    |    ✅     |   ✅    |     👁      |   —   |    —     |
| Order details                           | `/orders/{id}`               |    ✅     |   ✅    | 👁 + status |   —   |    —     |
| Status board                            | `/orders/board`              |    ✅     |   ✅    |     ✅     |   —   |    —     |
| Scan                                    | `/scan`                      |    ✅     |   ✅    |     ✅     |   —   |    —     |
| Receipt (print)                         | `/orders/{id}/receipt`       |    ✅     |   ✅    |     ✅     |   —   |    —     |
| Customers + details                     | `/customers`                 |    ✅     |   ✅    |     👁      |   —   |    —     |
| Payments                                | `/payments`                  | ✅ (void) |   ✅    |     —      |   —   |    —     |
| Deliveries                              | `/deliveries`                |    ✅     |   ✅    |     —      |   —   |    —     |
| Overdue / Unclaimed                     | `/monitoring/*`              |    ✅     |   ✅    |     👁      |   —   |    —     |
| Services & Pricing                      | `/services`                  |    ✅     |    —    |     —      |   —   |    —     |
| Inventory + item                        | `/inventory`                 |    ✅     |    👁    | stock-out  |   —   |    —     |
| Reports                                 | `/reports`, `/reports/staff` |    ✅     |    —    |     —      |   —   |    —     |
| Daily summary                           | `/reports/daily`             |    ✅     |   ✅    |     —      |   —   |    —     |
| Users                                   | `/users`                     |    ✅     |    —    |     —      |   —   |    —     |
| Activity log                            | `/activity-log`              |    ✅     |    —    |     —      |   —   |    —     |
| Settings: profile, security, appearance | `/settings/*`                |    ✅     |   ✅    |     ✅     |  ✅   |    ✅    |
| Settings: shop                          | `/settings/shop`             |    ✅     |    —    |     —      |   —   |    —     |
| My trips                                | `/rider/deliveries`          |     —     |    —    |     —      |  ✅   |    —     |
| Portal home / book / order              | `/portal/*`                  |     —     |    —    |     —      |   —   |    ✅    |
| Public tracking                         | `/track/{code}`              |  anyone   |         |            |       |          |

### 3.1 shadcn components and blocks per page

| Page                | Blocks                                                             | Components                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login               | `login-03`                                                         | Card, Input, Label, Checkbox, Button, Separator, Alert                                                                                                                                                    |
| Dashboard           | `dashboard-01` (section cards, interactive area chart, data table) | Card, Badge, Chart (Area, Bar, Pie), ToggleGroup, Tabs, Skeleton, Data Table, Tooltip                                                                                                                     |
| New Order           | —                                                                  | Combobox (Popover + Command), Input, Select, Textarea, Switch, RadioGroup, ToggleGroup, Calendar/Date Picker, Collapsible, Card, Separator, Alert, Badge, Button, Kbd hints via Tooltip                   |
| Orders list         | —                                                                  | Data Table, Tabs, Badge, Input, faceted filter (Popover + Command + Checkbox), Date range picker, DropdownMenu, ContextMenu, Pagination, Skeleton                                                         |
| Order details       | —                                                                  | Card, Badge, Progress + stepper, Table, Sheet (edit items), Dialog (payment, schedule), AlertDialog (cancel, void), DropdownMenu, Accordion (notification log), HoverCard (customer), Tooltip, ScrollArea |
| Status board        | —                                                                  | ScrollArea (horizontal), Card, Badge, Button, Toggle (express/overdue filters), Tooltip                                                                                                                   |
| Scan                | —                                                                  | Input (autofocus), Card, Badge, Button (large), Alert, Progress                                                                                                                                           |
| Receipt             | —                                                                  | Card, Separator, Table, ToggleGroup (80 mm / A4), Button                                                                                                                                                  |
| Customers           | —                                                                  | Data Table, Avatar, Sheet (add/edit), HoverCard                                                                                                                                                           |
| Customer details    | —                                                                  | Card, Tabs, Data Table, AlertDialog, Tooltip, Avatar                                                                                                                                                      |
| Payments            | —                                                                  | Data Table, Card (stat), Badge, AlertDialog + Textarea (void), Date range picker, Select                                                                                                                  |
| Deliveries          | —                                                                  | **Resizable** (unassigned / by rider), Calendar, Tabs, Card, Select (rider), Dialog (reschedule), Badge, Alert                                                                                            |
| Overdue / Unclaimed | —                                                                  | Data Table, Badge, Alert, Button, Tooltip                                                                                                                                                                 |
| Services & Pricing  | —                                                                  | Data Table, Dialog, RadioGroup, Switch, Input, Textarea, AlertDialog, Alert                                                                                                                               |
| Inventory           | —                                                                  | Data Table, Progress (stock level), Card, Dialog (movement) + ToggleGroup (in/out/adjust), Alert, Badge                                                                                                   |
| Reports             | —                                                                  | Tabs, Chart (Area, Bar, Pie), Card, Data Table, ToggleGroup (presets), Date range picker, DropdownMenu (export)                                                                                           |
| Users               | —                                                                  | Data Table, Avatar, Badge, Sheet, RadioGroup (role), Switch, AlertDialog                                                                                                                                  |
| Activity log        | —                                                                  | Data Table, Collapsible (before/after diff), HoverCard, Select, Combobox, Date range picker                                                                                                               |
| Settings: shop      | —                                                                  | Card, Input, Textarea, Switch, Separator, Badge, Alert, Resizable (live receipt preview, desktop)                                                                                                         |
| My trips (rider)    | —                                                                  | Card, Badge, Button, **Drawer** (complete with COD / fail with reason), ToggleGroup, Input                                                                                                                |
| Portal              | —                                                                  | NavigationMenu, Card, Progress, Calendar, ToggleGroup, Checkbox, Switch, Textarea, Table                                                                                                                  |
| Public tracking     | —                                                                  | Card, Progress + stepper, Badge, Separator                                                                                                                                                                |
| Global              | `sidebar-07`                                                       | Sidebar, Breadcrumb, Command (Ctrl+K), Popover (bell), DropdownMenu, Avatar, Sonner, Tooltip                                                                                                              |

---

## 4. Page layouts

### 4.1 Login (`login-03`)

- Muted full-screen background. Shop logo and name sit centered above a `max-w-sm` Card.
- Card contents:
    - Email and password fields, and a "Remember me" checkbox.
    - "Forgot password?" link at the right of the password label.
    - Primary "Log in" button (full width).
    - Separator, then "Sign in with passkey" outline button.
- A deactivated account shows a destructive **Alert** above the form, using the server's message.
- Footer links: "New customer? **Create an account**" · "**Track an order**" (opens a small tracking-code field).

### 4.2 Dashboard

**Owner (`dashboard-01` style):**

```
[Dashboard]                                        [Last 30 days ▾] [+ New order]
┌ Sales today ──┐┌ Orders today ┐┌ In process ───┐┌ Receivables ──┐
│ ₱1,805  ▼55% │ │ 10   ▲11%    │ │ 15            │ │ ₱3,482.45     │
│ vs yesterday  │ │ vs yesterday  │ │ 7 overdue ⚠   │ │ 18 ready      │
└───────────────┘└───────────────┘└───────────────┘└───────────────┘
┌ Sales trend (area chart) ── [7d][30d][90d] ┐┌ Peak hours (bar) ───┐
│                                             ││ 7a … 5p ███ 6p ███  │
└─────────────────────────────────────────────┘└─────────────────────┘
┌ Top services (bar) ┐┌ Payment methods (donut) ┐┌ Top customers ─────┐
└────────────────────┘└─────────────────────────┘└────────────────────┘
┌ Recent orders (Data Table, 8 rows, "View all") ──────────────────────┐
```

- **Stat cards** use dashboard-01's `SectionCards`: the trend Badge (`TrendingUp` / `TrendingDown`) compares with yesterday, and each card links to a filtered list.
- **Charts** come in through deferred props, so the stat cards render first and the chart areas show Skeletons until their data arrives.

**Cashier / staff (operations):**

- **Quick actions:** large buttons for New Order (cashier), Scan, and Status Board.
- **Counters:** In process · Ready · Overdue · Unclaimed · Pickups today.
- **Today's trips:** a short list of today's pickups and deliveries.
- **Recent orders:** the same table as the owner sees.
- The page refreshes every 15 s.

### 4.3 New Order (the most important screen)

```
[New order]                                                     Esc to cancel
┌ 1 Customer ───────────────────────────────┐ ┌ Summary (sticky) ───────────┐
│ [🔍 Name or mobile number…        ▾]       │ │ Wash, Dry & Fold  5.2kg  182 │
│  Maria Santos · 0917 555 0101 · 12 orders │ │ Comforter ×1           180   │
│  + Add "Maria S" as new customer          │ │ Express (+50%)          181  │
├ 2 Items ──────────────────────────────────┤ │ Delivery                 50  │
│ Quick: [WDF] [Comforter] [Ironing] [+]    │ │ Discount (Senior)       -36  │
│ Service ▾        Qty     Pcs   Line       │ │ ─────────────────────────── │
│ Wash, Dry & Fold 5.2 kg  24    ₱182.00 ✕  │ │ TOTAL               ₱557.00  │
│  min 3 kg · ready by Fri 9:30 AM          │ │ ─────────────────────────── │
│ [+ Add item]                              │ │ (•) Pay now  ( ) Pay later   │
├ 3 Options ────────────────────────────────┤ │ [Cash][GCash][Maya][Bank]    │
│ Express  [  ●] +50% · ready by 5:30 PM    │ │ Received  [ 600      ]       │
│ Notes [Separate whites][No bleach]…       │ │ [Exact][₱600][₱1000]         │
│ ▸ Add discount                            │ │ Change           ₱43.00      │
├ 4 Pickup & delivery ──────────────────────┤ │                              │
│ (•) Walk-in ( ) Pickup ( ) Delivery       │ │ [Save & print  Ctrl+↵]       │
└───────────────────────────────────────────┘ │ [Save only]                  │
                                              └──────────────────────────────┘
```

Layout: two columns on large screens (`lg:grid-cols-[1fr_380px]`), with the summary sticky at `top-4`. On mobile the summary collapses into a sticky bottom bar showing the total and the Save button.

**1. Customer**

- A Combobox that searches `/search` as you type (200 ms debounce). Each result shows name, mobile number and number of orders.
- The last item is always **"+ Add '…' as new customer"**. Choosing it reveals an inline name + mobile form; no modal.
- If the typed mobile number already belongs to someone, a warning **Alert** offers "Use Maria Santos instead". This is the main guard against duplicate and misspelled customers.

**2. Items**

- **Quick-add chips:** the 5 most-used services are one click away.
- **Service field:** a Combobox where typing the code ("WDF") also matches.
- **Quantity:** input with a unit suffix (kg / pc). When the quantity is below the minimum, a muted hint says "billed as 3 kg (minimum)".
- **Pieces:** optional field (prevents lost items).
- **Live line total** for each row.

**3. Options**

- **Express:** a Switch that shows the surcharge and the new "ready by" time. It is disabled with a Tooltip when a selected service has no express option.
- **Notes:** a Textarea with quick-insert chips.
- **Add discount:** a Collapsible with an amount field and a reason Select (Senior Citizen/PWD 20%, Loyalty, Other…).

**4. Pickup & delivery**

- A RadioGroup: Walk-in / Pickup / Delivery.
- Pickup or Delivery reveals a Date Picker, a time-slot ToggleGroup, the address (prefilled from the customer) and an optional rider Select.

**Summary** (computed live in the browser with the same formula as `OrderTotals`, then recalculated by the server on save)

- _Pay now / Pay later_ RadioGroup.
- Payment method ToggleGroup.
- Cash: "Received" field plus quick-cash buttons, and the **change shown large in `text-success`**.
- E-wallets: a reference-number field instead.

**Save**

- `Ctrl+Enter` = **Save & print**: opens the receipt in a new tab and lands on the order details page.
- Server validation errors appear under each field, the first invalid field is scrolled into view, and Sonner confirms "Order LND-… saved".

### 4.4 Orders list

- **PageHeader:** title, count, "+ New order", and an Export DropdownMenu (Pending orders PDF/Excel).
- **Tabs (quick views):** All · In process · Ready · Unpaid · Overdue · Cancelled, each with a count Badge (from `statusCounts`).
- **Toolbar:**
    - Search (placeholder "Order #, name or mobile…", shortcut `/`).
    - Faceted filters: Status, Payment, Express.
    - Date range picker.
    - "Reset" button.
    - Column View options.
- **Columns:**
    - Order # (mono, links to the order).
    - Customer (name, plus mobile in muted text).
    - Status (StatusBadge), Payment (Badge).
    - Items.
    - Total and Balance (right-aligned; balance red when above 0).
    - Due (relative time; red with `AlarmClock` when overdue).
    - Created.
    - ⋯ actions.
- **Row actions** (DropdownMenu, also on right-click): View, Move to next status, Record payment, Print receipt, Print tag.
- **Pagination:** rows-per-page Select (15/25/50) and page buttons; state lives in the URL.

### 4.5 Order details

```
LND-20261023-0012 ⧉   [Washing] [Partial] [⚡ Express]      [Move to Drying ▸][₱ Payment][🖨 ▾][⋯]
Received ●───● Washing ───○ Drying ───○ Folding ───○ Ready ───○ Completed     due in 5 h
┌ Items ───────────────────────────────┐ ┌ Customer ───────────────┐
│ Service           Qty   Pcs   Amount │ │ (MS) Maria Santos        │
├ Payments ────────────────────────────┤ │ 0917 555 0101 ⧉  📞      │
│ Cash  Oct 23 9:31  ₱100  Carla  [Void]│ ├ Summary ────────────────┤
├ Timeline ────────────────────────────┤ │ Total ₱557 · Paid ₱100   │
│ 9:31 Received by Carla               │ │ BALANCE  ₱457.00         │
│ 10:40 Washing by Ben                 │ ├ Pickup & delivery ──────┤
├ ▸ Messages sent (3)                  │ │ Delivery Fri 1 PM · Dodong│
└──────────────────────────────────────┘ ├ Bag tag (QR) ───────────┤
                                          │ [QR]  Print tag          │
                                          └──────────────────────────┘
```

- **Primary button:** "Move to {next}" for the most likely next status. When several moves are possible, a split DropdownMenu lists the rest.
- **Stepper** (shadcn primitives: circles, connecting lines, labels, timestamps). On small screens it becomes a **Progress** bar with the current step label.
- **Balance rule:** when a balance remains, the _Completed_ button is disabled with a Tooltip ("Collect ₱457.00 first"). The owner instead sees an override that asks for a reason.
- **⋯ menu:**
    - Edit items: a **Sheet**, only while Pending/Received.
    - Schedule pickup/delivery: a **Dialog**.
    - Send reminder.
    - Cancel order: an **AlertDialog** with a required reason; it is blocked while payments exist.
- **Record payment:** a **Dialog** with the same method/received/change block as New Order.
- **Messages sent:** an **Accordion** listing every SMS/email with its status Badge (sent / failed + error).

### 4.6 Status board

- One column per status: For Pickup → Received → Washing → Drying → Folding → Ready → Out for Delivery.
- The columns scroll horizontally in a ScrollArea; each header shows a count Badge.
- **Cards** show: order # (mono), customer, items count, ⚡ when express, and a due countdown (turns `warning` within 2 h, `destructive` when overdue).
- Each card has a **"→ Next"** icon button that moves the order on with no extra click.
- **Filters:** Toggles for "Express only" and "Overdue only".
- The board auto-refreshes every 15 s.

### 4.7 Scan

- **Scan page:** a huge autofocused Input ("Scan a bag tag or type an order number"), plus the list of recent scans.
- **After a scan:**
    - Large StatusBadge, order #, customer, items and piece count, and a "Separate whites" style Alert for the special instructions.
    - **Giant next-status buttons** (`h-16 text-lg`, colored with the target status token).
    - After a successful tap, a toast appears and the page returns to the scan input after 2 s, so staff can scan continuously.

### 4.8 Payments

- **Stat cards:** Collected (in the filter range), Cash, E-wallet, Voided.
- **Data Table columns:** Paid at, Order #, Customer, Method Badge, Reference, Amount, Received by, status (Valid / Voided with a strike-through amount).
- **Filters:** search, method, voided, date range.
- **Void** (owner only): an AlertDialog with a required reason that explains "The order's balance will go back up by ₱x".

### 4.9 Deliveries

- **Header:** date navigator (◀ Today ▶ + Calendar popover), Tabs (All / Pickups / Deliveries) and a status filter.
- **Late trips:** a destructive **Alert** lists trips from earlier days that never happened.
- **Body:** a **ResizablePanelGroup**.
    - **Left panel — Unassigned:** a trip list with time, type Badge, customer, address and a rider Select (assigns immediately).
    - **Right panel — By rider:** one Card per rider with their trips in time order and status badges.
- A trip opens a **Dialog** to reschedule (Date Picker + slot + address).

### 4.10 Customers

- **List:** a Data Table with Avatar (initials) + name, mobile, orders, total spent, last order, and a "Portal" badge.
- **Adding:** an **"+ Add customer" Sheet** with name, mobile (live duplicate check), email, address and notes.
- **Details page:**
    - Header with "+ New order for this customer".
    - Stat cards: orders, total spent, balance owed.
    - **Tabs:** Orders · Payments · Details (edit form).
    - **Delete** sits in an AlertDialog. It is disabled with a Tooltip while the customer has open orders.

### 4.11 Services & Pricing

- **Data Table columns:** Code (mono), Name, Unit Badge, Price, Minimum, Turnaround, Express turnaround, and an Active **Switch** that saves inline. Rows are sortable by display order.
- **Add / edit:** a **Dialog**.
    - Pricing unit is a RadioGroup (Per kilo / Per item).
    - Price, minimum, turnaround and express inputs, with "Leave express empty = not offered".
    - An info **Alert** explains: "Existing orders keep the price they were charged."
- **Delete:** an AlertDialog. It explains that services used on past orders are deactivated instead of deleted.

### 4.12 Inventory

- **Stat cards:** Items, Low stock (warning), Stock value.
- **Low stock:** a warning **Alert** names the items that are low.
- **Data Table:**
    - SKU (mono), Name, On hand (with a **Progress** bar against 3× the reorder level, turning `warning` or `destructive`), Reorder level, Unit cost, Updated.
    - Actions: Stock in / Stock out / Adjust.
- **Movement Dialog:**
    - A ToggleGroup chooses In / Out / Adjust.
    - Fields: quantity with the unit shown, optional order #, and remarks (required for Adjust).
    - Staff only see "Stock out".
- **Item page:** item header plus the ledger Data Table (date, type, change with +/- color, balance after, by, order #, remarks).

### 4.13 Reports

- **Header:**
    - Date range picker.
    - Presets ToggleGroup: Today · 7 days · 30 days · This month.
    - Export DropdownMenu: Sales, Services, Staff, Pending — each as PDF or Excel.
- **Tabs:**
    - _Overview:_ stat cards (Collected, Billed, Orders, Average order, Discounts), a Sales **Area chart** (collected vs billed), a Peak hours **Bar chart**, a Payment methods **Pie**, and Top services / Top customers tables.
    - _Sales:_ daily table with totals row.
    - _Services:_ completed services by quantity and revenue.
    - _Pending:_ open orders grouped by status.
    - _Staff:_ links to the staff activity page.
- **Daily summary page:** date picker, closing cards (Collected, Cash on hand, Released, Received), and tables by payment method and by cashier. Buttons: "Print / PDF".

### 4.14 Users

- **Data Table columns:** Avatar + name, email, mobile, role Badge, Active badge, last login (relative).
- **Filters:** role and active.
- **Add / edit Sheet:**
    - Name, email and mobile.
    - **Role RadioGroup with a one-line description** per role ("Laundry Staff — updates processing status, records supply usage").
    - Password + confirm; optional when editing.
- **Deactivate / reactivate:** an AlertDialog. The owner's own row has these actions disabled.

### 4.15 Activity log

- **Filters:** module Select (orders, payments, services…), user Combobox, search, date range.
- **Rows:** time, user (HoverCard with role), action description, record (order #/name link), and an expand chevron.
- **Expanded row:** a **Collapsible** showing a before → after table of changed fields, with old values struck through in muted text and new values in bold.

### 4.16 Settings

- **Existing:** the settings layout (Profile, Security, Appearance) keeps its left nav.
- **New: "Shop" (owner only):** Card sections.
    1. _Shop profile:_ name, address, phone, email.
    2. _Pricing rules:_ express surcharge %, delivery fee per trip, currency symbol.
    3. _Unclaimed laundry:_ remind after X days, then every Y days.
    4. _Notifications:_ SMS and Email Switches, plus a Badge showing the SMS driver ("Log only — set SEMAPHORE_API_KEY to send real SMS").
    5. _Receipt:_ footer Textarea with a live 80 mm receipt preview beside it (Resizable on desktop).
- A sticky "Save changes" bar appears when the form is dirty.

### 4.17 Rider: My trips (phone)

- **Header:** "Today · 6 trips" with a ToggleGroup: To do / Done.
- **One Card per trip:**
    - Time slot, Pickup/Delivery Badge, customer name.
    - Address as a link that opens Google Maps.
    - **📞 Call** (`tel:`) button and the amount to collect (large).
    - Main button changes with the state: **Start** → **Delivered / Picked up** · **Failed**.
- **Delivered** opens a **Drawer**: "Collect ₱457.00" with method, received amount, and big change display, then Confirm.
- **Failed** opens a **Drawer** with reason chips (Not home, Wrong address, Refused) and a text field.

### 4.18 Customer portal

- **Home:** active orders as Cards, each with a Progress stepper, due date and balance. History table below.
- **Book a pickup:**
    - Date (Calendar), time slot ToggleGroup, address (prefilled) and mobile.
    - Services Checkboxes, an Express Switch, and a "Deliver back to me" Switch.
    - Notes.
    - A note explains: "We'll weigh your laundry and text you the total."
- **Order page:** read-only version of the order details: stepper, items, payments, schedule.

### 4.19 Public tracking & receipt

- **Tracking:** a centered Card with the shop name, order #, the customer's first name only, the stepper, "Ready by …", the balance, and the shop's phone and address. No staff names and no full customer details.
- **Receipt:**
    - On screen: an 80 mm preview Card with a ToggleGroup (80 mm / A4) and Print / Download PDF buttons.
    - When printing, `@media print` hides everything except the receipt.

---

## 5. Responsive rules

| Breakpoint                            | Behavior                                                                                                                                                                                                             |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `< 768 px` (phone)                    | Sidebar becomes a Sheet. Tables hide secondary columns (column visibility defaults per breakpoint) and keep Order #, Customer, Status, Balance. Forms are a single column; New Order uses a sticky bottom total bar. |
| `768–1279 px` (tablet / small laptop) | Collapsed icon sidebar by default; two-column grids.                                                                                                                                                                 |
| `≥ 1280 px` (counter PC)              | Full sidebar, multi-column dashboard, sticky order summary.                                                                                                                                                          |

The rider and portal pages are designed phone-first. The admin pages are designed desktop-first but stay usable on a phone.

## 6. Accessibility checklist

- Text contrast is at least 4.5:1 in both themes. Status badges use the strong shade for text.
- Visible focus ring (`ring-ring` = brand blue) on every interactive element. Every action works by keyboard (shadcn/Radix provides focus traps and arrow keys).
- Icon-only buttons have `aria-label` + Tooltip. Badges include text, not color alone.
- Form errors are linked with `aria-describedby` (the `InputError` pattern); the first error gets focus.
- Live regions: Sonner toasts announce results; the board's auto-refresh does not steal focus.

## 7. Install commands (run in Phase 5)

```bash
# Blocks
npx shadcn@latest add login-03 sidebar-07 dashboard-01

# Components not yet in resources/js/components/ui
npx shadcn@latest add table command popover calendar chart tabs textarea radio-group switch \
  progress pagination hover-card scroll-area resizable alert-dialog drawer context-menu accordion

# Data tables
npm install @tanstack/react-table
```
