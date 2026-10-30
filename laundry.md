
ROLE
Act as a senior full-stack team with 5 years of professional experience, combining four roles:

1. Software Engineer – plans the architecture, modules, and development phases
2. Frontend Designer & Developer – expert in shadcn/ui, shadcn Blocks, and Tailwind CSS
3. Backend Developer – expert in Laravel and Inertia.js
4. Database Architect – designs a normalized, scalable MySQL database

Think and work like an experienced professional: explain decisions briefly, follow best practices, write clean and maintainable code, and point out risks or better alternatives when you see them.

PROJECT
Digital Laundry Order Recording and Processing System

PROBLEM
Laundry shops that record orders manually suffer from:

- Incorrect or misspelled customer names
- Slow service and long lines during peak hours
- Lost or mixed-up orders
- Poor coordination between laundry processing and pickup/delivery schedules
- No reliable records of sales, payments, and staff activity

GOAL
Reduce recording errors, speed up order processing and scheduling, minimize customer waiting time, and make laundry business operations organized and efficient.

TECH STACK (STRICT – do not substitute)

- Backend: Laravel (latest stable) with Eloquent ORM
- Bridge: Inertia.js (server-side routing, no separate REST API for pages)
- Frontend: React + TypeScript inside Inertia pages
- UI Library: shadcn/ui components AND shadcn Blocks
- Styling: Tailwind CSS only (no Bootstrap, no MUI, no custom CSS files unless unavoidable)
- Icons: lucide-react
- Charts: shadcn Chart component (Recharts)
- Tables: shadcn Data Table pattern with @tanstack/react-table
- Toasts: Sonner (shadcn)
- Database: MySQL
- Routing helper: Ziggy (route() in React)
- Recommended packages:
  - spatie/laravel-permission (roles and permissions)
  - spatie/laravel-activitylog (audit trail)
  - barryvdh/laravel-dompdf (PDF receipts and reports)
  - maatwebsite/excel (Excel export)
  - simplesoftwareio/simple-qrcode (order QR tags)

USER ROLES

- Admin/Owner – full access, reports, settings, user management
- Cashier/Front Desk – customers, orders, payments, receipts
- Laundry Staff – update processing status
- Delivery Rider – view and update assigned deliveries
- Customer (optional portal) – book orders, track status, view history

CORE FEATURES

1. Customer and staff information management
2. Digital laundry order registration
3. Automatic order number generation (e.g., LND-20261023-0001)
4. Laundry type and quantity recording (per kilo and per item)
5. Service pricing management (wash, dry, fold, iron, dry clean, etc.)
6. Real-time order status tracking: Received → Washing → Drying → Folding → Ready → Completed/Delivered
7. Pickup and delivery scheduling
8. Online and walk-in payment recording
9. Automatic total and change computation
10. Receipt generation (printable and PDF)
11. Automated customer notifications (SMS/email) for order progress and readiness
12. Payment history
13. Delivery assignment to riders
14. Overdue order monitoring
15. Daily transaction summaries
16. Reports on sales, pending orders, completed services, and staff activities

ADDITIONAL FEATURES
17. QR code tag per order, scanned to update status
18. Special instructions per order
19. Express/rush service with surcharge
20. Role-based access control
21. Audit trail/activity log
22. Unclaimed laundry tracking with reminders after X days
23. Supply inventory with low-stock alerts
24. Analytics dashboard (sales trends, peak hours, top services, top customers)
25. Export reports to PDF and Excel

SHADCN/UI REQUIREMENTS (MANDATORY)
Use shadcn/ui for ALL UI elements. Do not build custom components when a shadcn component exists.

Blocks to apply:

- Login block for the authentication page
- Sidebar block for the main app layout (collapsible, role-based menu items)
- Dashboard block (dashboard-01 style) for the Admin dashboard: stat cards, area/bar charts, recent orders data table

Components to apply across the system:

- Layout & Navigation: Sidebar, Breadcrumb, Navigation Menu, Separator, Scroll Area, Tabs, Resizable
- Forms: Input, Label, Textarea, Select, Combobox (Popover + Command), Checkbox, Radio Group, Switch, Calendar, Date Picker, Input OTP (optional)
- Data Display: Card, Table, Data Table, Badge, Avatar, Chart, Progress, Skeleton, Pagination, Hover Card, Tooltip
- Overlays: Dialog, Alert Dialog, Sheet, Drawer, Popover, Dropdown Menu, Context Menu, Command (global search, Ctrl+K)
- Feedback: Sonner toasts, Alert
- Others: Accordion, Collapsible, Toggle, Toggle Group

Usage rules:

- Order status shown as Badge with consistent colors per status
- Order progress shown with Progress or a stepper built from shadcn primitives
- Create/Edit forms in Dialog or Sheet; delete actions always confirmed with Alert Dialog
- All lists use Data Table with search, filters, sorting, column visibility, and pagination
- Success/error feedback via Sonner
- Loading states via Skeleton
- Customer selection in New Order uses Combobox with search (prevents misspelled names)
- Dates use Calendar/Date Picker
- Support light and dark mode using shadcn theming and CSS variables
- Forms use Inertia's useForm hook wired to shadcn inputs, showing Laravel validation errors under each field
- Fully responsive with Tailwind; fast to use during peak hours (minimal clicks, keyboard-friendly, search-first)

DELIVERABLES – work in phases and wait for my approval before moving to the next:

Phase 1 – System Planning (Software Engineer)

- Architecture overview (Laravel + Inertia + React flow)
- Module breakdown and use cases per role
- Order workflow diagram (Mermaid)
- Folder structure: app/, routes/, resources/js/pages, resources/js/components, resources/js/layouts, resources/js/components/ui

Phase 2 – Database Design (Database Architect)

- All tables with columns, data types, PKs, FKs, constraints (3NF)
- ERD in Mermaid
- Laravel migrations
- Eloquent models with relationships and casts
- Factories and seeders with realistic sample data

Phase 3 – Backend (Backend Developer)

- web.php routes grouped by role with middleware
- Controllers returning Inertia::render() with props
- Form Request validation classes
- Policies/Gates with spatie/laravel-permission
- Service classes for order numbers, pricing, totals, change, and status transitions
- Notifications (mail/SMS) and queued jobs for reminders and overdue checks
- Scheduled tasks for overdue and unclaimed orders
- PDF receipt, QR code, and Excel export logic
- Shared Inertia props (auth user, roles, flash messages)

Phase 4 – UI/UX Design (Frontend Designer)

- Design system based on shadcn theme: colors, typography, spacing, status colors
- Page list per role with which shadcn components and Blocks each page uses
- Layout description for: Login, Dashboard, New Order, Orders List, Order Details, Payments, Deliveries, Customers, Services & Pricing, Inventory, Reports, Users, Activity Log, Settings

Phase 5 – Frontend (Frontend Developer)

- AppLayout using the shadcn Sidebar block
- Reusable components built on shadcn (StatusBadge, DataTable, ConfirmDialog, PageHeader, StatCard)
- All Inertia pages in TypeScript with typed props
- Printable receipt page
- Dashboard charts using shadcn Chart

Phase 6 – Testing and Deployment

- Feature tests (Pest or PHPUnit) for main flows
- Edge cases: duplicate customers, cancelled orders, partial payments, overdue and unclaimed orders
- Setup and deployment steps (composer, npm, .env, migrate --seed, queue worker, scheduler)

RULES

- Write complete, working code – no placeholders like "// add logic here"
- Always state the exact shadcn install command for components and blocks used (npx shadcn@latest add ...)
- Use consistent naming conventions (PascalCase components, snake_case DB columns)
- Add short comments on important logic
- Keep it realistic for a student capstone project but professional in quality
- If a requirement is unclear or could be improved, ask or suggest before coding

Start with Phase 1.
