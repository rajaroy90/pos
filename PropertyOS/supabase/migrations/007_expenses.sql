-- Expenses (manager-only). Amounts in paise, like the rest of the schema. Free-tier friendly: one small table.
create table if not exists public.expenses (
 id uuid primary key default gen_random_uuid(),
 org_id uuid not null references public.organizations(id),
 property_id uuid references public.properties(id) on delete set null,
 category text not null check(category in ('Repairs','Utilities','Tax','Insurance','Salary','Cleaning','Other')),
 amount bigint not null check(amount>0),
 note text not null default '',
 spent_on date not null default (now() at time zone 'Asia/Kolkata')::date,
 created_at timestamptz not null default now()
);
create index if not exists expenses_org_date on public.expenses(org_id,spent_on desc);
alter table public.expenses enable row level security;
create policy expense_read on public.expenses for select to authenticated using(is_manager(org_id));
create policy expense_insert on public.expenses for insert to authenticated with check(is_manager(org_id));
create policy expense_update on public.expenses for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy expense_delete on public.expenses for delete to authenticated using(is_manager(org_id));
alter publication supabase_realtime add table public.expenses;
