-- 006: workspace-wide UPI ID (so tenants can pay by UPI) and rent generation for the current or next month.
alter table public.organizations add column if not exists upi_id text not null default '' check(upi_id='' or upi_id ~ '^[A-Za-z0-9._-]{2,256}@[A-Za-z]{2,64}$');
create or replace function public.set_upi_id(p_org uuid,p_upi text) returns void language plpgsql security definer set search_path=public as $$begin
 if member_role(p_org) is distinct from 'owner' then raise exception 'Permission denied';end if;
 update organizations set upi_id=coalesce(trim(p_upi),'') where id=p_org;end$$;
create or replace function public.generate_rent_for(p_org uuid,p_month date) returns integer language plpgsql security definer set search_path=public as $$declare first_day date:=date_trunc('month',p_month)::date;this_month date:=date_trunc('month',now() at time zone 'Asia/Kolkata')::date;count_rows integer;begin
 if not is_manager(p_org) then raise exception 'Permission denied';end if;
 if first_day<this_month or first_day>(this_month+interval '1 month')::date then raise exception 'Choose the current month or the next month';end if;
 insert into charges(org_id,lease_id,month,due_on,amount) select org_id,id,first_day,greatest(first_day+4,starts_on),rent from leases where org_id=p_org and status='active' and starts_on<=(first_day+interval '1 month - 1 day')::date and ends_on>=first_day on conflict(lease_id,month) do nothing;
 get diagnostics count_rows=row_count;return count_rows;end$$;
revoke all on function public.set_upi_id(uuid,text),public.generate_rent_for(uuid,date) from public;
grant execute on function public.set_upi_id(uuid,text),public.generate_rent_for(uuid,date) to authenticated;
