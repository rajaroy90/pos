# PropertyOS — RLS smoke-test checklist

Run against **your own** Supabase project after migrations **001 → 013**.
Do not use the demo project for these tests.

## Accounts

| Label | Role | Notes |
|-------|------|--------|
| A-Owner | Org A owner | Create workspace |
| A-Manager | Org A manager | Invite from A-Owner |
| A-Tenant | Org A tenant | Invite + link to tenant + active lease |
| B-Owner | Org B owner | Separate workspace |

## Matrix

| # | Action | Expected |
|---|--------|----------|
| 1 | A-Owner: property + unit + tenant + active lease | Succeeds |
| 2 | A-Owner: generate rent for current month | Charges only in Org A |
| 3 | A-Manager: record partial payment, then reverse | Succeeds; A-Owner sees both |
| 4 | A-Tenant: home / rent / repairs | Only own lease data; no other tenants |
| 5 | A-Tenant: try record payment / adjust charge / invite | Denied |
| 6 | B-Owner: any Org A data or Org A receipt token misuse | Empty / denied |
| 7 | A-Manager: list team / revoke A-Owner | Only owner may list/revoke appropriately |
| 8 | Logged out + B-Owner: open `?receipt=<token>` | Single receipt only; no extra data |
| 9 | Public listing + inquiry on published property | Inquiry only in Org A; rate limit after repeated submits |
| 10 | A-Tenant: draft agreement / wrong-unit utility bill | Blocked (after 012/013) |
| 11 | Archive property/unit with active lease | Blocked by trigger |
| 12 | A-Owner revokes A-Manager | Manager loses access immediately |

## Also smoke-test

- [ ] Sign out clears session; sensitive UI gone
- [ ] Offline: shell still loads
- [ ] Camera permission only on explicit Scan
- [ ] Create agreement as draft → Send to tenant → both can sign → status signed

## Pass criteria

All rows behave as “Expected.” Any cross-org read/write or tenant elevation is a **fail** — fix before real data.
