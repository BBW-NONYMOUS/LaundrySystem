# Phase 5 — Frontend

React 19 + TypeScript pages on Inertia v3, built only from shadcn/ui and Tailwind, following the design in `04-ui-ux-design.md`.

## 1. Shared building blocks

| Component                                                                  | File                                                                   | Used for                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell (sidebar-07 block)                                               | `components/app-sidebar.tsx`, `nav-main.tsx`, `app-sidebar-header.tsx` | Role-based menu built from permissions; count badges (overdue, unclaimed, low stock); header with search, bell and theme                                                                 |
| Command palette                                                            | `components/command-menu.tsx`                                          | Ctrl/⌘+K search for orders, customers and pages; Alt+N (new order), Alt+S (scan)                                                                                                         |
| DataTable                                                                  | `components/data-table/*`                                              | Search (`/` to focus), faceted filters, sorting, column visibility (remembered per browser), pagination. List state lives in the URL, so the server pages it and views can be bookmarked |
| StatusBadge, PaymentBadge, DeliveryStatusBadge, ExpressBadge, OverdueBadge | `components/status-badge.tsx`                                          | Color + icon + label from the status tokens                                                                                                                                              |
| PageHeader / PageBody                                                      | `components/page-header.tsx`                                           | Title row and standard page padding                                                                                                                                                      |
| StatCard                                                                   | `components/stat-card.tsx`                                             | KPI card in the dashboard-01 style, with a trend badge                                                                                                                                   |
| ConfirmDialog                                                              | `components/confirm-dialog.tsx`                                        | Every delete / void / cancel / deactivate; optional required reason. Stays open when the server rejects the action                                                                       |
| OrderStepper                                                               | `components/order-stepper.tsx`                                         | Received → … → Completed/Delivered with times; a Progress bar on phones                                                                                                                  |
| CustomerCombobox                                                           | `components/customer-combobox.tsx`                                     | Search-first customer picker with "Add as new customer"                                                                                                                                  |
| PaymentFields                                                              | `components/payment-fields.tsx`                                        | Method toggle, cash received with quick-cash buttons, change, e-wallet reference                                                                                                         |
| DatePicker / DateRangePicker                                               | `components/date-picker.tsx`                                           | Calendar in a Popover                                                                                                                                                                    |
| EmptyState, NotificationBell, AppearanceToggle                             | `components/*.tsx`                                                     | Empty lists, in-app alerts, light/dark/system theme                                                                                                                                      |

Helpers:

- `lib/format.ts`: money, quantities, dates.
- `lib/status.ts`: status design tokens.
- `lib/navigation.ts`: menu definitions.
- `hooks/use-permissions.ts`, `use-hotkey.ts`, `use-debounce.ts`, `use-navigation-loading.ts`.
- Types in `types/models.ts` mirror the Laravel API Resources.

## 2. Layouts

| Layout                           | Pages                                              |
| -------------------------------- | -------------------------------------------------- |
| AppLayout (sidebar)              | Staff pages                                        |
| AppLayout + SettingsLayout       | `settings/*` (Profile, Security, Appearance, Shop) |
| RiderLayout                      | `rider/*`                                          |
| PortalLayout                     | `portal/*`                                         |
| AuthLayout (login-03 card shell) | `auth/*`                                           |
| PublicLayout                     | `track/*`                                          |
| PrintLayout                      | `orders/receipt`                                   |

The layout is chosen per page group in `app.tsx`.

## 3. Pages (39)

| Area              | Pages                                                                                                                   |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Orders            | `orders/index`, `orders/create` (New Order), `orders/show`, `orders/board`, `orders/receipt`, `scan/index`, `scan/show` |
| Customers & money | `customers/index`, `customers/show`, `payments/index`, `deliveries/index`                                               |
| Monitoring        | `monitoring/overdue`, `monitoring/unclaimed`                                                                            |
| Management        | `services/index`, `inventory/index`, `inventory/show`, `users/index`, `activity-log/index`, `settings/shop`             |
| Analytics         | `dashboard` (owner / counter views), `reports/index`, `reports/daily`, `reports/staff`                                  |
| Rider             | `rider/deliveries`                                                                                                      |
| Customer          | `portal/index`, `portal/orders/show`, `portal/bookings/create`, `track/show`                                            |
| Auth & landing    | `auth/*` (restyled with login-03), `welcome`                                                                            |

## 4. Library notes

- **TanStack Table is pinned to v8.21.3.** v9 has a new API that the shadcn Data Table pattern doesn't use yet.
- **TanStack Table and the React Compiler:** v8 mutates its table instance, and the React Compiler would memoize it and render stale rows. The three components that read the table use the `'use no memo'` directive.
- **Missing shadcn files:** the shadcn CLI wrote `import { cn } from "cn"` in new components; it was corrected to `@/lib/utils`. The starter kit's `dialog.tsx` gained `showCloseButton`, and `card.tsx` gained `CardAction`, because newer components need them.
- **Blocks:** login-03, sidebar-07 and dashboard-01 were adapted into the existing structure instead of installed over it, because installing would have overwritten starter-kit files.

## 5. Verification

| Check                                                | Result                                                                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx tsc --noEmit`                                   | 0 errors                                                                                                                                         |
| `npm run check` (lint + format, warnings are errors) | 0 warnings, 152 files formatted                                                                                                                  |
| `npm run build`                                      | Passes                                                                                                                                           |
| `php artisan test`                                   | 140 passing; page tests now also assert that each React page file exists                                                                         |
| Render smoke test                                    | All 35 screens (5 roles + guest) rendered through React's server renderer with real seeded data inside their layouts; 0 errors, 0 React warnings |

**Not yet done: a real browser.** Clicking through the pages, interactions and effects is part of Phase 6 testing.
