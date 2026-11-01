<!-- coderabbit-ai-generated:v1 -->

# PropertyOS One

A unified property workspace using the local-first `propertyos` API and role apps, with the portfolio and collection-management approach of `PropertyOS`.

## Run

Requires Node 22.5 or newer. No dependency installation is needed.

```sh
npm run dev
```

Open http://localhost:8787. The initial view is clearly labeled illustrative data. Start the interactive demo to use an isolated sample portfolio, or sign in/create an account. The existing server stores local data in `propertyos/dev/.data/dev.db`; set `DB_FILE=:memory:` for disposable data.

```sh
npm test
npm run check
npm run stamp
```

Deployment continues to use `propertyos/public` with the existing Cloudflare Pages Function and D1 binding. See `propertyos/README.md` for secrets, database configuration, and deployment steps.

## Included

- New responsive portfolio dashboard with property filters and searchable tenant/unit table.
- Six-month expected versus collected rent chart using authorized rent APIs.
- Occupancy, outstanding balance, pending-payment and urgent-repair insights.
- Collection report with vacancy opportunity and formula-safe CSV export.
- Existing property, tenant invitation, rent, UPI, receipt, reminder, repair, visitor and gate workflows.
- Demo role switch for landlord, tenant and gate staff.
- Existing tenant privacy, permissions, offline cache, Hindi UI and PWA behavior. Hindi and non-landlord roles retain their existing role screens.

## Integration boundaries

The original `PropertyOS` Supabase app is preserved. Its database is separate from the D1-backed unified workspace. Existing Supabase accounts/data are not automatically migrated. Deposits, utility ledgers, agreement signing, public listings and team management from that app still require schema, access-control and migration work before they can be included in this workspace. No live provider, automatic reminder sending or production deployment is enabled by this change.

All amounts in the selected backend are whole rupees. The older Supabase application uses paise; future migration must explicitly convert and reconcile amounts.
