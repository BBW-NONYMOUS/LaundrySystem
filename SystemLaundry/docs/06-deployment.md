# Phase 6 — Deployment (Shared Hosting)

How to put the laundry system online on shared hosting. The steps use **Hostinger hPanel** as the example because it's common in the Philippines; other cPanel hosts work the same way with different menu names.

The app is a normal Laravel 13 + Inertia/React site. The server runs PHP and MySQL only — the React frontend is **built on your computer** and uploaded, so the host doesn't need Node.js.

---

## 1. What you need

| Item | Notes |
| --- | --- |
| Hosting plan with **SSH access** and **PHP 8.4** | Hostinger *Premium* or *Business* (the *Single* plan has no SSH). `composer.lock` needs PHP ≥ 8.4.1. |
| A domain | Usually included free for a year with the plan. |
| A MySQL database | Created in hPanel (step 2). |
| An email account on the domain | For password resets and customer emails, e.g. `no-reply@yourdomain.com`. |
| Semaphore account + API key | Only for real SMS. Without it, set `SMS_DRIVER=log` and SMS is written to the log instead. |
| This computer | To build the frontend (`npm run build`). PHP, Composer and Node are already set up here. |

---

## 2. Prepare the hosting (hPanel)

1. **Advanced → PHP Configuration**: choose **PHP 8.4**. Under *PHP Extensions*, make sure these are on: `curl`, `fileinfo`, `gd`, `intl`, `mbstring`, `openssl`, `pdo_mysql`, `zip`, `sockets`.
2. **Databases → MySQL Databases**: create a database and user. Write down the three values hPanel shows (they look like `u123456789_laundry`):
   - database name
   - username
   - password
3. **Advanced → SSH Access**: enable SSH and note the command shown, e.g. `ssh -p 65002 u123456789@123.45.67.89`.
4. **Security → SSL**: install the free SSL certificate for the domain.
5. **Emails**: create `no-reply@yourdomain.com` and note its password.

---

## 3. Build the frontend (on this computer)

```powershell
cd C:\Users\User\Documents\LaundrySystem\SystemLaundry
npm run build
Compress-Archive -Path public\build -DestinationPath build.zip -Force
```

`build.zip` (about 1 MB) is uploaded in step 5. Run this again every time the React code changes.

---

## 4. Get the code onto the server

Connect with the SSH command from step 2.3 (PowerShell or Git Bash), then:

```bash
cd ~/domains/YOURDOMAIN.com
git clone https://github.com/BBW-NONYMOUS/LaundrySystem.git laundry
cd laundry/SystemLaundry
php -v                      # must say 8.4.x — see Troubleshooting if not
composer install --no-dev --optimize-autoloader
```

> The repository is private? GitHub will ask for a password: use a **personal access token** (GitHub → Settings → Developer settings → Personal access tokens), not your account password.

The app lives in `~/domains/YOURDOMAIN.com/laundry/SystemLaundry` from here on.

---

## 5. Upload the built frontend

hPanel → **Files → File Manager** → open `domains/YOURDOMAIN.com/laundry/SystemLaundry/public` → upload `build.zip` → right-click → **Extract** (so you get `public/build/manifest.json`) → delete `build.zip`.

---

## 6. Create the production `.env`

```bash
cp .env.example .env
nano .env
```

Change these lines (leave the rest as they are):

```dotenv
APP_NAME="Your Laundry Shop Name"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://yourdomain.com

LOG_LEVEL=error

DB_CONNECTION=mysql
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=u123456789_laundry
DB_USERNAME=u123456789_laundry
DB_PASSWORD="the database password"

SESSION_SECURE_COOKIE=true

# No queue worker on shared hosting: the cron sends queued SMS/email
QUEUE_VIA_SCHEDULER=true

MAIL_MAILER=smtp
MAIL_SCHEME=smtps
MAIL_HOST=smtp.hostinger.com
MAIL_PORT=465
MAIL_USERNAME=no-reply@yourdomain.com
MAIL_PASSWORD="the email password"
MAIL_FROM_ADDRESS=no-reply@yourdomain.com

SMS_DRIVER=semaphore            # or "log" until you have a Semaphore key
SEMAPHORE_API_KEY=your-key
SEMAPHORE_SENDER_NAME=          # leave empty unless Semaphore approved a sender name

SEED_ADMIN_EMAIL=owner@yourdomain.com
SEED_ADMIN_PASSWORD="a long password you will change after first login"
```

Save with `Ctrl+O`, `Enter`, `Ctrl+X`.

> **Never** set `APP_DEBUG=true` on the live site — error pages would show passwords from `.env`.

---

## 7. Set up the app

```bash
php artisan key:generate --force
php artisan migrate --force
php artisan db:seed --force      # roles, settings, services, FAQs and the owner account only — no demo data
php artisan storage:link
php artisan optimize
chmod -R 775 storage bootstrap/cache
```

In production the seeder creates **only** the owner account from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`. Remove `SEED_ADMIN_PASSWORD` from `.env` after this step.

---

## 8. Point the domain at the app

The website must serve the `public` folder, not the project root (otherwise `.env` could be downloaded).

```bash
cd ~/domains/YOURDOMAIN.com
mv public_html public_html_old
ln -s ~/domains/YOURDOMAIN.com/laundry/SystemLaundry/public public_html
```

Open `https://yourdomain.com` — the public website should load. Once everything works you can delete `public_html_old`.

---

## 9. Cron job (scheduler + SMS/email queue)

hPanel → **Advanced → Cron Jobs** → *Custom*, every minute (`* * * * *`):

```bash
cd /home/u123456789/domains/YOURDOMAIN.com/laundry/SystemLaundry && /opt/alt/php84/usr/bin/php artisan schedule:run >> /dev/null 2>&1
```

- Replace `u123456789` and the domain with yours (`pwd` over SSH shows the full path).
- The PHP path must be **8.4**. On Hostinger it's normally `/opt/alt/php84/usr/bin/php`; check with `ls /opt/alt/php84/usr/bin/php`.

This one cron runs everything in `routes/console.php`: overdue alerts, unclaimed reminders, log cleanup, inbox pruning, and — because `QUEUE_VIA_SCHEDULER=true` — sends queued customer SMS/email within about a minute.

---

## 10. Go-live checklist

- [ ] Log in at `https://yourdomain.com/login` with the owner account and **change the password** (Settings → Security).
- [ ] **Settings → Shop**: replace the sample business details (name, address, phone, hours, prices, social links) with the real ones.
- [ ] **Users**: create the cashier, staff and rider accounts.
- [ ] Create a test order with your own phone number and check the SMS arrives (or appears in `storage/logs/laravel.log` with `SMS_DRIVER=log`).
- [ ] Book a pickup from the public site and from the customer portal; reschedule it from **Deliveries** and confirm the reschedule SMS.
- [ ] Use **Forgot password** once to confirm email sending works.
- [ ] Share the website link on Facebook and check the preview image and text.

---

## 11. Updating the live site later

On this computer: push your changes to GitHub, then `npm run build` and zip `public\build` again if the frontend changed.

On the server:

```bash
cd ~/domains/YOURDOMAIN.com/laundry/SystemLaundry
php artisan down
git pull
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan optimize
php artisan up
```

Then upload and extract the new `build.zip` into `public` (replacing the old `build` folder).

---

## 12. Troubleshooting

| Problem | Fix |
| --- | --- |
| `Your Composer dependencies require a PHP version ">= 8.4.1"` | SSH is using an older PHP. Run commands with `/opt/alt/php84/usr/bin/php` instead of `php`, and for Composer: `/opt/alt/php84/usr/bin/php $(which composer) install --no-dev --optimize-autoloader`. |
| **500 Server Error** | Read the end of `storage/logs/laravel.log`. Usually a wrong DB value in `.env` (then `php artisan optimize` again) or folder permissions (`chmod -R 775 storage bootstrap/cache`). |
| `Vite manifest not found` | `public/build` wasn't uploaded or was extracted into the wrong folder (step 5). |
| Changed `.env` but nothing changes | Config is cached: run `php artisan optimize` after every `.env` edit. |
| Shop logo doesn't show | `php artisan storage:link` (step 7). |
| SMS/email never arrive | Check the cron job is saved and its PHP path is 8.4; check `SMS_DRIVER` and the Semaphore key; failed jobs are listed by `php artisan queue:failed`. |
| Page shows the old version after an update | Upload the new `build.zip`, then hard-refresh the browser (`Ctrl+F5`). |
