-- PropertyOS · Security deposits, utility bills, and lease agreements with e-signatures.
-- Amounts are in paise like the rest of the schema. Run once in the Supabase SQL editor.
-- Safe to re-run: every object is created only if it does not exist yet.

-- A tenant (or manager) can read a lease-linked record when they are allowed to see that lease.
create or replace function public.read_lease(p_org uuid,p_lease uuid) returns boolean language sql stable security definer set search_path=public as $$
 select is_manager(p_org) or exists(select 1 from leases l where l.org_id=p_org and l.id=p_lease and owns_tenant(p_org,l.tenant_id))$$;
revoke all on function public.read_lease(uuid,uuid) from public;
grant execute on function public.read_lease(uuid,uuid) to authenticated;

-- ============ Security deposits: an append-only ledger per lease ============
create table if not exists public.deposit_entries (
 id uuid primary key default gen_random_uuid(),
 org_id uuid not null references public.organizations(id),
 lease_id uuid not null,
 kind text not null check(kind in ('collected','deduction','refund')),
 amount bigint not null check(amount>0 and amount<=10000000000),
 note text not null default '' check(length(note)<=500),
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 foreign key(org_id,lease_id) references public.leases(org_id,id)
);
create index if not exists deposit_entries_lease on public.deposit_entries(org_id,lease_id,created_at);
alter table public.deposit_entries enable row level security;
drop policy if exists deposit_read on public.deposit_entries;
create policy deposit_read on public.deposit_entries for select to authenticated using(read_lease(org_id,lease_id));
revoke all on public.deposit_entries from anon,authenticated;
grant select on public.deposit_entries to authenticated;   -- writes only through record_deposit()

create or replace function public.record_deposit(p_lease uuid,p_kind text,p_amount bigint,p_note text default '') returns uuid language plpgsql security definer set search_path=public as $$
declare l leases;c bigint;d bigint;r bigint;new_id uuid;
begin
 select * into l from leases where id=p_lease for update;
 if not found or not is_manager(l.org_id) then raise exception 'Permission denied';end if;
 if p_kind not in ('collected','deduction','refund') then raise exception 'Unknown deposit entry';end if;
 if p_amount is null or p_amount<=0 then raise exception 'Amount must be positive';end if;
 select coalesce(sum(amount) filter(where kind='collected'),0),coalesce(sum(amount) filter(where kind='deduction'),0),coalesce(sum(amount) filter(where kind='refund'),0)
  into c,d,r from deposit_entries where lease_id=l.id;
 if p_kind='collected' and c+p_amount>l.deposit then raise exception 'Cannot collect more than the agreed deposit';end if;
 if p_kind<>'collected' and p_amount>c-d-r then raise exception 'Amount exceeds the deposit currently held';end if;
 if p_kind='deduction' and length(trim(coalesce(p_note,'')))<2 then raise exception 'A reason is required for a deduction';end if;
 insert into deposit_entries(org_id,lease_id,kind,amount,note,created_by) values(l.org_id,l.id,p_kind,p_amount,left(coalesce(p_note,''),500),auth.uid()) returning deposit_entries.id into new_id;
 insert into activity(org_id,title,detail,kind) values(l.org_id,'Deposit '||p_kind,left(coalesce(p_note,''),200),'deposit');
 return new_id;
end$$;

-- ============ Utility bills ============
create table if not exists public.utility_bills (
 id uuid primary key default gen_random_uuid(),
 org_id uuid not null references public.organizations(id),
 unit_id uuid not null,
 lease_id uuid,
 kind text not null check(kind in ('Electricity','Water','Gas','Internet','Maintenance','Other')),
 month date not null check(extract(day from month)=1),
 amount bigint not null check(amount>0 and amount<=10000000000),
 reading_prev numeric check(reading_prev>=0),
 reading_curr numeric check(reading_curr>=0),
 due_on date not null,
 paid_at timestamptz,
 paid_ref text,
 note text not null default '' check(length(note)<=500),
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 foreign key(org_id,unit_id) references public.units(org_id,id),
 foreign key(org_id,lease_id) references public.leases(org_id,id)
);
create index if not exists utility_bills_org_due on public.utility_bills(org_id,due_on);
alter table public.utility_bills enable row level security;
drop policy if exists ub_read on public.utility_bills;drop policy if exists ub_insert on public.utility_bills;drop policy if exists ub_delete on public.utility_bills;
create policy ub_read on public.utility_bills for select to authenticated using(is_manager(org_id) or (lease_id is not null and read_lease(org_id,lease_id)));
create policy ub_insert on public.utility_bills for insert to authenticated with check(is_manager(org_id) and paid_at is null and paid_ref is null);
create policy ub_delete on public.utility_bills for delete to authenticated using(is_manager(org_id) and paid_at is null);
revoke all on public.utility_bills from anon,authenticated;
grant select,insert,delete on public.utility_bills to authenticated;   -- paying/unpaying goes through the functions below

create or replace function public.pay_utility_bill(p_id uuid,p_reference text) returns void language plpgsql security definer set search_path=public as $$
declare b utility_bills;
begin
 select * into b from utility_bills where id=p_id for update;
 if not found or not is_manager(b.org_id) then raise exception 'Permission denied';end if;
 if b.paid_at is not null then raise exception 'This bill is already marked paid';end if;
 if length(trim(coalesce(p_reference,'')))<2 then raise exception 'Add a payment reference';end if;
 update utility_bills set paid_at=now(),paid_ref=left(p_reference,120) where id=p_id;
 insert into activity(org_id,title,detail,kind) values(b.org_id,'Utility bill paid',b.kind,'utility');
end$$;
create or replace function public.unpay_utility_bill(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$
declare b utility_bills;
begin
 select * into b from utility_bills where id=p_id for update;
 if not found or not is_manager(b.org_id) then raise exception 'Permission denied';end if;
 if length(trim(coalesce(p_reason,'')))<2 then raise exception 'A reason is required';end if;
 update utility_bills set paid_at=null,paid_ref=null where id=p_id;
 insert into activity(org_id,title,detail,kind) values(b.org_id,'Utility bill reopened',left(p_reason,200),'utility');
end$$;

-- ============ Agreements with e-signatures ============
create table if not exists public.documents (
 id uuid primary key default gen_random_uuid(),
 org_id uuid not null references public.organizations(id),
 lease_id uuid not null,
 title text not null check(length(title) between 2 and 200),
 body text not null check(length(body) between 20 and 30000),
 status text not null default 'sent' check(status in ('draft','sent','signed')),
 tenant_sig text check(tenant_sig is null or length(tenant_sig)<200000),
 tenant_signed_at timestamptz,
 manager_sig text check(manager_sig is null or length(manager_sig)<200000),
 manager_signed_at timestamptz,
 manager_signer uuid,
 created_at timestamptz not null default now(),
 created_by uuid default auth.uid(),
 foreign key(org_id,lease_id) references public.leases(org_id,id)
);
create index if not exists documents_lease on public.documents(org_id,lease_id);
alter table public.documents enable row level security;
drop policy if exists doc_read on public.documents;drop policy if exists doc_insert on public.documents;drop policy if exists doc_delete on public.documents;
create policy doc_read on public.documents for select to authenticated using(read_lease(org_id,lease_id));
create policy doc_insert on public.documents for insert to authenticated with check(is_manager(org_id) and tenant_sig is null and manager_sig is null and status in ('draft','sent'));
create policy doc_delete on public.documents for delete to authenticated using(is_manager(org_id) and tenant_sig is null and manager_sig is null);
revoke all on public.documents from anon,authenticated;
grant select,insert,delete on public.documents to authenticated;   -- no UPDATE grant: text is immutable, signatures only via sign_document()

create or replace function public.sign_document(p_id uuid,p_sig text) returns void language plpgsql security definer set search_path=public as $$
declare d documents;
begin
 select * into d from documents where id=p_id for update;
 if not found or not read_lease(d.org_id,d.lease_id) then raise exception 'Permission denied';end if;
 if p_sig is null or length(p_sig)<40 or length(p_sig)>=200000 or p_sig !~ '^data:image/(png|jpeg|svg\+xml)[;,]' then raise exception 'Signature is not valid';end if;
 if is_manager(d.org_id) then
  if d.manager_sig is not null then raise exception 'Already signed';end if;
  update documents set manager_sig=p_sig,manager_signed_at=now(),manager_signer=auth.uid() where id=p_id;
 else
  if d.tenant_sig is not null then raise exception 'Already signed';end if;
  update documents set tenant_sig=p_sig,tenant_signed_at=now() where id=p_id;
 end if;
 update documents set status='signed' where id=p_id and tenant_sig is not null and manager_sig is not null;
 insert into activity(org_id,title,detail,kind) values(d.org_id,'Agreement signed',left(d.title,200),'document');
end$$;

revoke all on function public.record_deposit(uuid,text,bigint,text),public.pay_utility_bill(uuid,text),public.unpay_utility_bill(uuid,text),public.sign_document(uuid,text) from public;
grant execute on function public.record_deposit(uuid,text,bigint,text),public.pay_utility_bill(uuid,text),public.unpay_utility_bill(uuid,text),public.sign_document(uuid,text) to authenticated;

-- live updates (ignore if a table is already published)
do $$declare t text;begin foreach t in array array['deposit_entries','utility_bills','documents'] loop
 begin execute format('alter publication supabase_realtime add table public.%I',t);exception when duplicate_object then null;end;
end loop;end$$;
