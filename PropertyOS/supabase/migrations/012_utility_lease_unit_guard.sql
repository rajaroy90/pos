-- 012: Ensure utility_bills.lease_id (when set) belongs to the same unit as utility_bills.unit_id.
-- Safe to re-run.

create or replace function public.guard_utility_bill_lease_unit() returns trigger
language plpgsql set search_path=public as $$
declare u uuid;
begin
  if new.lease_id is null then
    return new;
  end if;
  select unit_id into u from public.leases where id = new.lease_id and org_id = new.org_id;
  if u is null then
    raise exception 'Lease not found in this workspace';
  end if;
  if u is distinct from new.unit_id then
    raise exception 'Lease does not belong to the selected unit';
  end if;
  return new;
end$$;

drop trigger if exists guard_utility_bill_lease_unit on public.utility_bills;
create trigger guard_utility_bill_lease_unit
  before insert or update of unit_id, lease_id
  on public.utility_bills
  for each row execute function public.guard_utility_bill_lease_unit();

revoke all on function public.guard_utility_bill_lease_unit() from public;
