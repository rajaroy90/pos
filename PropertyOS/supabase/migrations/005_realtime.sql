-- Live updates: lets open sessions refresh automatically when records change (row-level security still applies).
alter publication supabase_realtime add table public.properties, public.units, public.tenants, public.leases, public.charges, public.payments, public.maintenance, public.inquiries, public.activity;
