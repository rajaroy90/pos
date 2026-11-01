# PropertyOS

A Liquid Glass web app (PWA) for Indian landlords, tenants and gate staff. It runs like a phone OS: lock screen, home widgets, dock, Control Centre, notifications.

**What is in this first build**

| Area | What it does |
| --- | --- |
| Glass shell | Welcome screen, home widgets, dock, Control Centre, notification panel, optional PIN app lock, English and Hindi, light and dark |
| Rent | Landlord board by month, tenant "I paid" flow with UPI deep link and QR, cash recording, confirm or reject, receipts with a verify QR, WhatsApp reminders, CSV export |
| Repairs | Tenant requests with a photo, landlord assigns a plumber or electrician, status timeline and messages |
| Visitor pass | Resident makes a QR pass with a 6 digit backup code, the gate scans it or types the code, walk-in requests the resident can allow or deny |
| Properties | Add buildings and flats, import flats from CSV, invite tenants and gate staff by link or code |

PropertyOS never holds money. Rent goes straight from tenant to landlord by cash or UPI. The app only keeps the record.

## Run it on your computer

Needs Node 22.5 or newer. No packages to install.

```bash
npm run dev          # http://localhost:8787 with an in-memory database
npm test             # backend tests (API flows and the privacy and security checks)
npm run i18n         # checks every English and Hindi string is present
```

Set `DB_FILE=dev/.data/dev.db` to keep data between restarts. Open the site and tap one of the three demo buttons (Landlord, Tenant, Gate staff) to look around with sample data.

## Put it online (free, about 10 minutes)

You need a GitHub account and a Cloudflare account. Everything below is clicking in the browser.

1. **Code on GitHub.** Push this folder to a new GitHub repository.
2. **Create the database.** Cloudflare dashboard → Storage & databases → D1 → Create database. Name it `propertyos`. You do not need to create any tables, the app creates them on first use.
3. **Create the site.** Workers & Pages → Create → Pages → Connect to Git → choose your repository.
   - Framework preset: None
   - Build command: leave empty
   - Build output directory: `public`
4. **Connect the database.** Open the new Pages project → Settings → Bindings → Add → D1 database. Variable name `DB` (capital letters), choose `propertyos`.
5. **Add the secret.** Settings → Variables and secrets → Add → type Secret, name `APP_SECRET`, value is a long random string. Make one with `openssl rand -hex 32`, or any 32 or more random characters. Keep a copy somewhere safe: if it is lost, everyone is signed out and old invite codes stop working.
6. **Deploy again.** Deployments → the latest one → Retry deployment, so the binding and secret are picked up.
7. **Check.** Open `https://YOUR-PROJECT.pages.dev/api/health`. You should see `"ok":true,"secret_set":true`. Then open the site, tap Landlord under the demo buttons.

Add the app to a phone: open the site in Chrome on Android, then menu → Install app (or use the Install button in the Control Centre).

### When you change the code

Run `npm run stamp` before you commit. It refreshes the list of files the phone keeps for offline use, so phones pick up the new version.

## How it is built

- No build step and no runtime packages. Plain ES modules in `public/`, one Cloudflare Pages Function in `functions/api/` and a D1 (SQLite) database.
- Passwords are stretched on the phone (PBKDF2, 210,000 rounds) and only the derived key is sent. The server hashes it again.
- Strict Content Security Policy in `public/_headers`: no inline scripts or styles, no third party code.
- Glass quality adapts: Solid, Frosted (default) and Refraction (Chromium only, opt-in). Slow phones fall back to solid on their own.
- Android back closes the top sheet or app first. Every screen works offline from its last saved copy.

```
public/            the whole app (HTML, CSS, JS, icons, service worker)
  js/core/         shared parts: API client, UI kit, i18n, QR encoder, layer manager
  js/shell/        the OS: home, widgets, panels, PIN lock
  js/apps/         Rent, Repairs, Visitors, Gate, Properties, Settings, Join, Verify
functions/api/     Cloudflare Pages entry point
server/            API: auth, access rules, routes, schema
dev/               local server, SQLite shim, i18n checker, SW stamp script
test/              backend tests
```

## Things to know before real use

- **Not legal advice.** PropertyOS does not do rent agreements, police verification or tax. Rules differ by state.
- **Privacy.** The privacy notice is in the app (Settings → Privacy notice). It is a plain-language summary written for this build. Have it reviewed before you publish to the public. Users can download or delete their data in Settings.
- **Rate limits** are kept in the database, per IP and per account, so a shared mobile network can hit them. They are in `server/routes/*.js`.
- **Demo data** is erased after 3 hours. Demo sign-ups are limited to 20 an hour per network address, and demo accounts cannot join real invites.
- **Excel files:** save as CSV first (File → Save as → CSV). Real `.xlsx` import is not in this build.
- **Gate scanner** uses the phone's built-in QR detector (Chrome on Android). If a phone lacks it, the guard types the 6 digit code instead.
- **Tenant privacy.** When a flat is vacated, the next tenant never sees the earlier tenant's payments, repair requests or receipts. The landlord keeps the rent records. If a tenant deletes their account, their name and notes are removed from those records.
- **Rent changes** apply from a month the landlord picks; earlier months keep the rent that was agreed then.
- **Database upgrades** run by themselves the first time the new code receives a request (see `MIGRATIONS` in `server/schema.js`). Add new steps at the end, never edit old ones.
- **Recovery:** there is no email service (zero budget). Someone who forgets the password uses the recovery code shown at sign-up, or a tenant asks the landlord for a one-time help code.
