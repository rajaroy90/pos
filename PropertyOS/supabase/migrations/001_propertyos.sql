-- PropertyOS: organization isolation, immutable financial history, private files.
create extension if not exists pgcrypto;
create extension if not exists btree_gist;
create table public.organizations (
 id uuid primary key default gen_random_uuid(), name text not null check(length(name) between 2 and 100),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) between 3 and 60),
 payment_connected boolean not null default false, created_at timestamptz not null default now()
);
create table public.memberships (
 org_id uuid not null references public.organizations(id), user_id uuid not null references auth.users(id),
 role text not null check(role in ('owner','manager','tenant')), created_at timestamptz not null default now(), primary key(org_id,user_id)
);
create function public.member_role(p_org uuid) returns text language sql stable security definer set search_path=public as $$select role from memberships where org_id=p_org and user_id=auth.uid()$$;
create function public.is_manager(p_org uuid) returns boolean language sql stable security definer set search_path=public as $$select coalesce(member_role(p_org) in ('owner','manager'),false)$$;
create table public.properties (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id),
 name text not null check(length(name) between 2 and 200), address text not null, city text not null,
 description text not null default '', image_url text not null default '/images/property-1.jpg' check(image_url ~ '^(/images/|https://)'),
 published boolean not null default false, archived boolean not null default false, created_at timestamptz not null default now(), unique(org_id,id)
);
create table public.units (
 id uuid primary key default gen_random_uuid(), org_id uuid not null references public.organizations(id),property_id uuid not null,
 name text not null, bedrooms integer not null check(bedrooms between 0 and 20), rent bigint not null check(rent>0 and rent<=10000000000),
 archived boolean not null default false,created_at timestamptz not null default now(),unique(org_id,id),unique(property_id,name),foreign key(org_id,property_id) references public.properties(org_id,id)
);
create table public.tenants (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),user_id uuid references auth.users(id),
 name text not null,email text not null check(email=lower(email)),phone text not null default '',archived boolean not null default false,created_at timestamptz not null default now(),unique(org_id,id),unique(org_id,email),unique(org_id,user_id)
);
create table public.leases (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),unit_id uuid not null,tenant_id uuid not null,
 starts_on date not null,ends_on date not null check(ends_on>=starts_on),rent bigint not null check(rent>0 and rent<=10000000000),deposit bigint not null default 0 check(deposit>=0 and deposit<=10000000000),
 status text not null default 'active' check(status in ('active','ended')),file_path text,created_at timestamptz not null default now(),unique(org_id,id),
 foreign key(org_id,unit_id) references public.units(org_id,id),foreign key(org_id,tenant_id) references public.tenants(org_id,id),
 exclude using gist(unit_id with =,daterange(starts_on,ends_on,'[]') with &&) where(status='active')
);
create table public.charges (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),lease_id uuid not null,
 month date not null check(extract(day from month)=1),due_on date not null,amount bigint not null check(amount>0 and amount<=10000000000),description text not null default 'Monthly rent',
 created_at timestamptz not null default now(),unique(org_id,id),unique(lease_id,month),foreign key(org_id,lease_id) references public.leases(org_id,id)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),charge_id uuid not null,amount bigint not null check(amount>0),
 reference text not null,method text not null check(method in ('manual','razorpay')),provider_payment_id text unique,created_at timestamptz not null default now(),
 reversed_at timestamptz,reversal_reason text,created_by uuid references auth.users(id),reversed_by uuid references auth.users(id),
 foreign key(org_id,charge_id) references public.charges(org_id,id),unique(org_id,reference),check((reversed_at is null)=(reversal_reason is null))
);
create table public.maintenance (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),unit_id uuid not null,tenant_id uuid,
 title text not null,description text not null,status text not null default 'Open' check(status in ('Open','In progress','Resolved')),
 priority text not null check(priority in ('Low','Medium','High')),file_path text,created_at timestamptz not null default now(),
 foreign key(org_id,unit_id) references public.units(org_id,id),foreign key(org_id,tenant_id) references public.tenants(org_id,id)
);
create table public.inquiries (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),property_id uuid not null,
 name text not null,email text not null,phone text not null,message text not null,status text not null default 'New' check(status in ('New','Contacted','Closed')),
 created_at timestamptz not null default now(),foreign key(org_id,property_id) references public.properties(org_id,id)
);
create table public.activity (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),title text not null,detail text not null default '',kind text not null,created_at timestamptz not null default now()
);
create table public.invitations (
 id uuid primary key default gen_random_uuid(),org_id uuid not null references public.organizations(id),email text not null,role text not null check(role in ('manager','tenant')),
 token_hash text not null unique,expires_at timestamptz not null default now()+interval '7 days',accepted_at timestamptz,created_at timestamptz not null default now()
);
create table public.payment_connections (
 org_id uuid primary key references public.organizations(id),key_id text not null,key_secret text not null,webhook_secret text not null,verified_at timestamptz not null default now()
);
create table public.payment_orders (
 id text primary key,org_id uuid not null references public.organizations(id),charge_id uuid not null,amount bigint not null check(amount>0),currency text not null default 'INR' check(currency='INR'),
 status text not null default 'created' check(status in ('created','captured')),provider_payment_id text,created_at timestamptz not null default now(),foreign key(org_id,charge_id) references public.charges(org_id,id)
);
create table public.rate_limits(key text primary key,hits integer not null,expires_at timestamptz not null);
-- Helpers bypass recursive RLS queries, but return only access decisions.
create function public.owns_tenant(p_org uuid,p_tenant uuid) returns boolean language sql stable security definer set search_path=public as $$select exists(select 1 from tenants where org_id=p_org and id=p_tenant and user_id=auth.uid()) and member_role(p_org)='tenant'$$;
create function public.read_unit(p_org uuid,p_unit uuid) returns boolean language sql stable security definer set search_path=public as $$select is_manager(p_org) or exists(select 1 from leases where org_id=p_org and unit_id=p_unit and owns_tenant(p_org,tenant_id))$$;
create function public.read_charge(p_org uuid,p_charge uuid) returns boolean language sql stable security definer set search_path=public as $$select is_manager(p_org) or exists(select 1 from charges c join leases l on l.id=c.lease_id where c.org_id=p_org and c.id=p_charge and owns_tenant(p_org,l.tenant_id))$$;
-- Public views deliberately expose only listing fields, never rental or tenant records.
create view public.public_portfolios as select o.id,o.name,o.slug from public.organizations o where exists(select 1 from public.properties p where p.org_id=o.id and p.published and not p.archived);
create view public.public_unit_listings as select u.id,u.org_id,u.property_id,u.name,u.bedrooms,u.rent,u.archived from public.units u join public.properties p on p.id=u.property_id where p.published and not p.archived and not u.archived and not exists(select 1 from public.leases l where l.unit_id=u.id and l.status='active' and l.starts_on<=(now() at time zone 'Asia/Kolkata')::date and l.ends_on>=(now() at time zone 'Asia/Kolkata')::date);
grant select on public.public_portfolios,public.public_unit_listings to anon,authenticated;
-- Explicit grants: financial records and connection credentials have no client writes.
do $$declare t text;begin foreach t in array array['organizations','memberships','properties','units','tenants','leases','charges','payments','maintenance','inquiries','activity','invitations','payment_connections','payment_orders','rate_limits'] loop execute format('alter table public.%I enable row level security',t);execute format('revoke all on public.%I from anon,authenticated',t);end loop;end$$;
grant select on public.organizations,public.memberships,public.properties,public.units,public.tenants,public.leases,public.charges,public.payments,public.maintenance,public.inquiries,public.activity to authenticated;
grant select on public.properties to anon;
grant insert on public.properties,public.units,public.tenants,public.leases,public.maintenance,public.invitations to authenticated;
grant update(name,address,city,description,image_url,published,archived) on public.properties to authenticated;
grant update(name,bedrooms,rent,archived) on public.units to authenticated;
grant update(name,email,phone,archived) on public.tenants to authenticated;
grant update(status,file_path) on public.leases to authenticated;
grant update(status,file_path) on public.maintenance to authenticated;
grant update(status) on public.inquiries to authenticated;
create policy org_read on public.organizations for select to authenticated using(member_role(id) is not null);
create policy membership_read on public.memberships for select to authenticated using(user_id=auth.uid() or is_manager(org_id));
create function public.read_property(p_org uuid,p_property uuid) returns boolean language sql stable security definer set search_path=public as $$select is_manager(p_org) or exists(select 1 from units u join leases l on l.unit_id=u.id where u.org_id=p_org and u.property_id=p_property and owns_tenant(p_org,l.tenant_id))$$;
revoke all on function public.read_property(uuid,uuid) from public;
grant execute on function public.read_property(uuid,uuid) to anon,authenticated;
create policy property_read on public.properties for select using((published and not archived) or read_property(org_id,id));
create policy property_insert on public.properties for insert to authenticated with check(is_manager(org_id));
create policy property_update on public.properties for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy unit_read on public.units for select to authenticated using(read_unit(org_id,id));
create policy unit_insert on public.units for insert to authenticated with check(is_manager(org_id));
create policy unit_update on public.units for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy tenant_read on public.tenants for select to authenticated using(is_manager(org_id) or owns_tenant(org_id,id));
create policy tenant_insert on public.tenants for insert to authenticated with check(is_manager(org_id) and user_id is null);
create policy tenant_update on public.tenants for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy lease_read on public.leases for select to authenticated using(is_manager(org_id) or owns_tenant(org_id,tenant_id));
create policy lease_insert on public.leases for insert to authenticated with check(is_manager(org_id));
create policy lease_update on public.leases for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy charge_read on public.charges for select to authenticated using(read_charge(org_id,id));
create policy payment_read on public.payments for select to authenticated using(read_charge(org_id,charge_id));
create policy maintenance_read on public.maintenance for select to authenticated using(is_manager(org_id) or owns_tenant(org_id,tenant_id));
create policy maintenance_insert on public.maintenance for insert to authenticated with check(is_manager(org_id) or (owns_tenant(org_id,tenant_id) and status='Open' and exists(select 1 from leases l where l.org_id=maintenance.org_id and l.unit_id=maintenance.unit_id and l.tenant_id=maintenance.tenant_id and l.status='active' and l.starts_on<=(now() at time zone 'Asia/Kolkata')::date and l.ends_on>=(now() at time zone 'Asia/Kolkata')::date)));
create policy maintenance_update on public.maintenance for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy inquiry_read on public.inquiries for select to authenticated using(is_manager(org_id));
create policy inquiry_update on public.inquiries for update to authenticated using(is_manager(org_id)) with check(is_manager(org_id));
create policy activity_read on public.activity for select to authenticated using(is_manager(org_id));
create policy invitation_insert on public.invitations for insert to authenticated with check(member_role(org_id)='owner');
-- Atomic onboarding; no client may grant itself a role.
create function public.create_organization(p_name text,p_slug text) returns uuid language plpgsql security definer set search_path=public as $$declare org uuid;begin
 if auth.uid() is null or not exists(select 1 from auth.users where id=auth.uid() and email_confirmed_at is not null) then raise exception 'Verify your email before creating a workspace';end if;
 insert into organizations(name,slug) values(p_name,p_slug) returning id into org;insert into memberships(org_id,user_id,role) values(org,auth.uid(),'owner');return org;end$$;
create function public.accept_invitation(p_hash text) returns void language plpgsql security definer set search_path=public as $$declare invite invitations;account_email text;begin
 select lower(email) into account_email from auth.users where id=auth.uid() and email_confirmed_at is not null;if account_email is null then raise exception 'Sign in with a verified email to accept this invitation';end if;
 select * into invite from invitations where token_hash=p_hash and accepted_at is null and expires_at>now() for update;if not found or lower(invite.email)<>account_email then raise exception 'Invitation invalid, expired, or for a different email';end if;
 if invite.role='tenant' then
  if not exists(select 1 from tenants where org_id=invite.org_id and email=account_email and not archived) then raise exception 'A tenant record with this email is required';end if;
  update tenants set user_id=auth.uid() where org_id=invite.org_id and email=account_email and not archived;
 end if;
 insert into memberships(org_id,user_id,role) values(invite.org_id,auth.uid(),invite.role) on conflict(org_id,user_id) do nothing;
 update invitations set accepted_at=now() where id=invite.id;end$$;
create function public.generate_rent(p_org uuid) returns integer language plpgsql security definer set search_path=public as $$declare first_day date:=date_trunc('month',now() at time zone 'Asia/Kolkata')::date;count_rows integer;begin
 if not is_manager(p_org) and coalesce(auth.role(),'')<>'service_role' then raise exception 'Permission denied';end if;
 insert into charges(org_id,lease_id,month,due_on,amount) select org_id,id,first_day,greatest(first_day+4,starts_on),rent from leases where org_id=p_org and status='active' and starts_on<=(first_day+interval '1 month - 1 day')::date and ends_on>=first_day on conflict(lease_id,month) do nothing;
 get diagnostics count_rows=row_count;return count_rows;end$$;
create function public.record_payment(p_charge uuid,p_amount bigint,p_reference text) returns uuid language plpgsql security definer set search_path=public as $$declare c charges;paid bigint;payment_id uuid;begin
 select * into c from charges where id=p_charge for update;if not found or not is_manager(c.org_id) then raise exception 'Permission denied';end if;
 select coalesce(sum(amount),0) into paid from payments where charge_id=c.id and reversed_at is null;
 if p_amount<=0 or p_amount>c.amount-paid or length(trim(p_reference))<2 then raise exception 'Payment must be positive and cannot exceed the outstanding balance';end if;
 if exists(select 1 from payment_orders where charge_id=c.id and status='created') then raise exception 'An online payment is pending. Reconcile it before recording a manual payment';end if;
 insert into payments(org_id,charge_id,amount,reference,method,created_by) values(c.org_id,c.id,p_amount,p_reference,'manual',auth.uid()) returning id into payment_id;return payment_id;end$$;
create function public.reverse_payment(p_id uuid,p_reason text) returns void language plpgsql security definer set search_path=public as $$declare p payments;begin
 select * into p from payments where id=p_id for update;if not found or not is_manager(p.org_id) then raise exception 'Permission denied';end if;
 if p.method<>'manual' then raise exception 'Online payments must be resolved through the payment provider';end if;
 if length(trim(p_reason))<2 then raise exception 'A reversal reason is required';end if;
 update payments set reversed_at=now(),reversal_reason=p_reason,reversed_by=auth.uid() where id=p_id and reversed_at is null;end$$;
-- Capture is server-only, locks the charge, and accepts duplicate events safely.
create function public.capture_payment(p_order text,p_payment text,p_amount bigint,p_currency text) returns uuid language plpgsql security definer set search_path=public as $$declare o payment_orders;payment_id uuid;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Permission denied';end if;
 select * into o from payment_orders where id=p_order for update;if not found or o.amount<>p_amount or o.currency<>p_currency then raise exception 'Payment does not match order';end if;
 perform 1 from charges where id=o.charge_id for update;
 select id into payment_id from payments where provider_payment_id=p_payment;if payment_id is not null then return payment_id;end if;
 if o.status='captured' then raise exception 'Order already paid';end if;
 insert into payments(org_id,charge_id,amount,reference,method,provider_payment_id) values(o.org_id,o.charge_id,p_amount,p_payment,'razorpay',p_payment) returning id into payment_id;
 update payment_orders set status='captured',provider_payment_id=p_payment where id=p_order;return payment_id;end$$;
create function public.consume_rate_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path=public as $$declare n integer;begin
 if coalesce(auth.role(),'')<>'service_role' then raise exception 'Permission denied';end if;
 insert into rate_limits(key,hits,expires_at) values(p_key,1,now()+make_interval(secs=>p_seconds)) on conflict(key) do update set hits=case when rate_limits.expires_at<now() then 1 else rate_limits.hits+1 end,expires_at=case when rate_limits.expires_at<now() then now()+make_interval(secs=>p_seconds) else rate_limits.expires_at end returning hits into n;return n<=p_limit;end$$;
create function public.log_activity() returns trigger language plpgsql security definer set search_path=public as $$begin
 insert into activity(org_id,title,detail,kind) values(new.org_id,case TG_TABLE_NAME when 'properties' then 'Property added' when 'tenants' then 'Tenant added' when 'leases' then 'Lease created' when 'payments' then 'Payment received' else 'Maintenance requested' end,coalesce(to_jsonb(new)->>'name',to_jsonb(new)->>'title',to_jsonb(new)->>'reference',''),case TG_TABLE_NAME when 'payments' then 'payment' when 'tenants' then 'tenant' when 'leases' then 'lease' else TG_TABLE_NAME end);return new;end$$;
do $$declare t text;begin foreach t in array array['properties','tenants','leases','payments','maintenance'] loop execute format('create trigger activity_insert after insert on public.%I for each row execute function public.log_activity()',t);end loop;end$$;
-- Private objects are scoped to an existing authorized record, not just an org prefix.
create function public.can_access_file(p_path text) returns boolean language plpgsql stable security definer set search_path=public as $$declare org uuid;record_id uuid;kind text;begin
 org:=split_part(p_path,'/',1)::uuid;kind:=split_part(p_path,'/',2);record_id:=split_part(p_path,'/',3)::uuid;
 if kind='leases' then return exists(select 1 from leases where id=record_id and org_id=org and (is_manager(org) or owns_tenant(org,tenant_id)));end if;
 if kind='maintenance' then return exists(select 1 from maintenance where id=record_id and org_id=org and (is_manager(org) or owns_tenant(org,tenant_id)));end if;return false;
 exception when invalid_text_representation then return false;end$$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('private-files','private-files',false,5242880,array['application/pdf','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
create policy file_select on storage.objects for select to authenticated using(bucket_id='private-files' and can_access_file(name));
create policy file_insert on storage.objects for insert to authenticated with check(bucket_id='private-files' and can_access_file(name) and (split_part(name,'/',2)<>'leases' or is_manager(split_part(name,'/',1)::uuid)));
-- No object deletion or overwrite: attachments retain their history.
do $$declare f record;begin for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' and p.proname in ('member_role','is_manager','owns_tenant','read_unit','read_charge','create_organization','accept_invitation','generate_rent','record_payment','reverse_payment','capture_payment','consume_rate_limit','log_activity','can_access_file') loop execute format('revoke all on function %s from public',f.signature);end loop;end$$;
grant execute on function public.member_role(uuid),public.is_manager(uuid),public.read_unit(uuid,uuid),public.owns_tenant(uuid,uuid),public.read_charge(uuid,uuid) to anon,authenticated;
grant execute on function public.create_organization(text,text),public.accept_invitation(text),public.generate_rent(uuid),public.record_payment(uuid,bigint,text),public.reverse_payment(uuid,text),public.can_access_file(text) to authenticated;
grant execute on function public.capture_payment(text,text,bigint,text),public.consume_rate_limit(text,integer,integer),public.generate_rent(uuid) to service_role;
-- Indexes support policy predicates and operational queries.
create index memberships_user on memberships(user_id);
create index properties_org on properties(org_id);
create index units_org on units(org_id);
create index tenants_user on tenants(user_id);
create index leases_tenant on leases(org_id,tenant_id);
create index charges_org on charges(org_id);
create index payments_charge on payments(charge_id) where reversed_at is null;
create index maintenance_org on maintenance(org_id);
create index inquiries_org on inquiries(org_id);
create index activity_org on activity(org_id,created_at desc);
create index orders_charge on payment_orders(charge_id);
